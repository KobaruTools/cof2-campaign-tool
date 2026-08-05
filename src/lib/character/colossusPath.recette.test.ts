import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { equipmentById, featureById, pathById } from '@/data';
import { migrateCharacter } from '@/lib/engine/migrations';
import {
  abilityModSources,
  capacityResourceGauges,
  effectContext,
  effectiveAbilities,
  featureModSources,
} from '@/lib/character/effects';
import { deriveStats } from '@/lib/engine/derived';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { unarmedStrike } from '@/lib/character/unarmedStrike';
import {
  equipConflicts,
  isTwoHandedMeleeWeaponWielded,
  oneHandableWeaponFamilies,
  setWornAt,
  wornWeaponGripIsChoosable,
  wornWeaponIsTwoHanded,
} from '@/lib/character/equipment';
import { twoWeaponCombatStatus } from '@/lib/character/twoWeaponCombat';
import { parseRichText } from '@/lib/ui/featureRichText';
import type { Character, EquipmentLine } from '@/lib/character/types';

const PATH_ID = 'prestige-colosse';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R6 = `${PATH_ID}-r6`;
const R7 = `${PATH_ID}-r7`;
const R8 = `${PATH_ID}-r8`;

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

const derived = (c: Character) => deriveStats(buildCharacterDerivedView(c).derivedInput!);
const without = (c: Character, featureId: string): Character => ({
  ...c,
  featureIds: c.featureIds.filter((id) => id !== featureId),
});

describe('PER-74 — voie du colosse (p. 149-150, recette end-to-end)', () => {
  const character = loadFixture('recette-per74-colosse');
  const families = oneHandableWeaponFamilies(character.featureIds);

  it('la voie est une voie de prestige de la famille des combattants, avec son prérequis de Force', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.type).toBe('prestige');
    // `category: 'fighter'` → habillage prestige ROUGE.
    expect('category' in path && path.category).toBe('fighter');
    expect(path.sourcePage).toBe(149);
    expect('prerequisites' in path && path.prerequisites).toMatch(/au moins \+3 en Force/);
    expect('note' in path && path.note).toMatch(/force prodigieuse/);
    // Le personnage de recette respecte le prérequis avec sa FOR DE BASE (avant le +1 du r6).
    expect(character.baseAbilities.FOR).toBeGreaterThanOrEqual(3);
    // Le r8 déborde sur la page suivante.
    expect(featureById.get(R8)?.sourcePage).toBe(150);
  });

  it('balisage : dé fixe au r4, modificateur de CON au r5, dé évolutif au r8', () => {
    const r4Dice = parseRichText(featureById.get(R4)!.richText!).filter((s) => s.kind === 'die');
    expect(r4Dice).toHaveLength(1);
    // « 1d6 DM à mains nues » : dé FIXE, aucun marqueur « ° » (il ne monte pas avec le niveau).
    expect(r4Dice[0]).toMatchObject({ token: { count: 1, die: 'd6', evolving: false } });
    // « auxquels il ajoute sa CON » : la prose garde le déterminant → modificateur `[CON]`, pas `[=CON]`.
    expect(featureById.get(R5)!.richText).toContain('il ajoute sa [CON]');
    const r8Dice = parseRichText(featureById.get(R8)!.richText!).filter((s) => s.kind === 'die');
    expect(r8Dice).toHaveLength(1);
    expect(r8Dice[0]).toMatchObject({ token: { count: 1, die: 'd4', evolving: true } });
    // Le « +5 pour toucher » reste littéral (ce n'est ni un dé ni une quantité calculée).
    expect(featureById.get(R8)!.richText).toContain('bonus de +5 pour toucher');
    // Les verbatim imprimés restent la source, sans balisage.
    for (const id of [R4, R5, R8]) expect(featureById.get(id)!.text).not.toMatch(/[{[]/);
    // r6 et r7 n'ont RIEN à baliser (littéral « +1 » ; 2d6/2d8 sont des DM d'ARME).
    expect(featureById.get(R6)!.richText).toBeUndefined();
    expect(featureById.get(R7)!.richText).toBeUndefined();
  });

  it('r5 Résistance colossale : +5 PV plus la CON, en permanent', () => {
    const source = (featureModSources(character.featureIds, effectContext(character)).maxHp ?? []).find(
      (s) => s.featureId === R5,
    );
    // CON effective 4 (3 de base + « Constitution héroïque » du pagne) → 5 + 4 = 9.
    expect(effectiveAbilities(character).CON).toBe(4);
    expect(source?.value).toBe(9);
    expect(derived(character).maxHp - derived(without(character, R5)).maxHp).toBe(9);
  });

  it('r5 : la somme suit la CON EFFECTIVE, pas la valeur saisie', () => {
    const lowCon = without(character, 'pagne-r4');
    const source = (featureModSources(lowCon.featureIds, effectContext(lowCon)).maxHp ?? []).find(
      (s) => s.featureId === R5,
    );
    expect(source?.value).toBe(8);
  });

  it('r6 Force du titan : +1 en FOR, propagé à tout ce qui dérive de la FOR', () => {
    expect(effectiveAbilities(character).FOR).toBe(5);
    const sources = abilityModSources(character.featureIds, character.featureChoices).FOR ?? [];
    // Seule source de FOR du personnage : la lecture du rang est isolée.
    expect(sources.map((s) => s.featureId)).toEqual([R6]);
    const noR6 = without(character, R6);
    expect(effectiveAbilities(noR6).FOR).toBe(4);
    expect(derived(character).meleeAttack - derived(noR6).meleeAttack).toBe(1);
  });

  it('r4 Stature de géant : les mains nues passent de 1d3 à 1d6, FOR conservée', () => {
    const view = unarmedStrike(character);
    expect(view.damage).toMatchObject({ count: 1, die: 'd6' });
    // Dé FIXE et DM non létaux (défaut du livre, p. 219 — le colosse n'a pas le choix du moine).
    expect(view.evolving).toBe(false);
    expect(view.damage.nonLethal).toBe(true);
    expect(view.damageAbilities).toEqual(['FOR']);
    expect(view.sources.map((s) => s.featureId)).toContain(R4);
    expect(unarmedStrike(without(character, R4)).damage.die).toBe('d3');
  });

  it('r4 : un colosse aussi moine garde le dé de Poings de fer, toujours supérieur', () => {
    // Sans armure (les voies de moine sont désactivées en armure, PER-83).
    const monk: Character = {
      ...character,
      featureIds: [...character.featureIds, 'poing-r1', 'poing-r2'],
      equipment: character.equipment.map((l) => ({ ...l, worn: undefined })),
    };
    const view = unarmedStrike(monk);
    expect(view.damage).toMatchObject({ count: 1, die: 'd8' });
    expect(view.sources.map((s) => s.featureId)).toEqual(expect.arrayContaining([R4, 'poing-r1']));
  });

  it('r7 Poigne de fer : la capacité DÉCLARE les familles concernées (épées et haches)', () => {
    expect(featureById.get(R7)?.twoHandedInOneHand).toEqual({ weaponFamilies: ['swords', 'axes'] });
    expect(families).toEqual(['swords', 'axes']);
    expect(oneHandableWeaponFamilies(without(character, R7).featureIds)).toEqual([]);
  });

  it("r7 : l'épée à deux mains devient polyvalente, mais seulement pour un colosse", () => {
    const sword = character.equipment[0];
    // Prise notée « deux mains » → toujours deux mains.
    expect(wornWeaponIsTwoHanded(sword, families)).toBe(true);
    const oneHand: EquipmentLine = { ...sword, worn: { slot: 'mainHand', grip: 'oneHand' } };
    expect(wornWeaponIsTwoHanded(oneHand, families)).toBe(false);
    // Sans la capacité, la prise à une main est ignorée : l'arme du livre occupe les deux mains.
    expect(wornWeaponIsTwoHanded(oneHand, [])).toBe(true);
    expect(wornWeaponGripIsChoosable(sword, families)).toBe(true);
    expect(wornWeaponGripIsChoosable(sword, [])).toBe(false);
  });

  it('r7 : le livre énumère « épée ou hache » — bâton, pique et arc restent à deux mains', () => {
    const staff: EquipmentLine = { itemId: 'baton', quantity: 1, worn: { slot: 'mainHand', grip: 'oneHand' } };
    const bow: EquipmentLine = { itemId: 'arc-long', quantity: 1, worn: { slot: 'mainHand', grip: 'oneHand' } };
    for (const line of [staff, bow]) {
      expect(wornWeaponIsTwoHanded(line, families)).toBe(true);
      expect(wornWeaponGripIsChoosable(line, families)).toBe(false);
    }
  });

  it('r7 : à une main, le bouclier cesse d’être un conflit de port', () => {
    // Index 0 = épée à deux mains portée, index 4 = grand bouclier (rangé dans la recette).
    const shielded = (grip: 'oneHand' | 'twoHands'): EquipmentLine[] =>
      character.equipment.map((l, i) =>
        i === 0
          ? { ...l, worn: { slot: 'mainHand' as const, grip } }
          : i === 4
            ? { ...l, worn: { slot: 'shield' as const } }
            : l,
      );
    expect(equipConflicts(shielded('twoHands'), families).map((c) => c.kind)).toContain('hands-overbooked');
    expect(equipConflicts(shielded('oneHand'), families)).toEqual([]);
    // Sans la capacité, la même prise à une main reste un conflit.
    expect(equipConflicts(shielded('oneHand'), []).map((c) => c.kind)).toContain('hands-overbooked');
    // Poser l'arme à une main ne renvoie plus le bouclier au sac ; la repasser à deux mains, si.
    expect(
      setWornAt(shielded('twoHands'), 0, { slot: 'mainHand', grip: 'oneHand' }, families)[4].worn?.slot,
    ).toBe('shield');
    expect(setWornAt(shielded('oneHand'), 0, { slot: 'mainHand', grip: 'twoHands' }, families)[4].worn).toBeUndefined();
  });

  it('r7 : la prise réelle pilote la condition « à deux mains » et le combat à deux armes', () => {
    expect(isTwoHandedMeleeWeaponWielded(character.equipment, families)).toBe(true);
    const oneHanded = character.equipment.map((l, i) =>
      i === 0 ? { ...l, worn: { slot: 'mainHand' as const, grip: 'oneHand' as const } } : l,
    );
    // Écart RAW assumé et voulu : à une main, le bonus de DEF de la voie des armes à deux mains
    // (p. 146) s'éteint, et le combat à deux armes redevient accessible.
    expect(isTwoHandedMeleeWeaponWielded(oneHanded, families)).toBe(false);
    const dual: Character = {
      ...character,
      equipment: oneHanded.map((l, i) => (i === 3 ? { ...l, worn: { slot: 'offHand' as const } } : l)),
    };
    expect(twoWeaponCombatStatus(dual).dualWielding).toBe(true);
  });

  it("r7 : l'arme de taille grande est une VARIANTE d'objet, le catalogue reste à 2d6", () => {
    const variant = character.equipment[1];
    expect('overrides' in variant && variant.overrides).toMatchObject({
      name: 'Épée à deux mains (taille grande)',
      damage: { count: 2, die: 'd8' },
    });
    const printed = equipmentById.get('epee-a-deux-mains');
    expect(printed?.category === 'weapon' && printed.damage).toEqual({ count: 2, die: 'd6' });
  });

  it('r8 Attaque monumentale : un usage par récupération rapide, suivi sur la carte', () => {
    expect(featureById.get(R8)?.usageCounter).toEqual({
      max: 1,
      resetOn: 'short-rest',
      hideFromStatusPanel: true,
    });
    // Règle d'office des voies de prestige : aucune barre issue de la voie dans « État du personnage »
    // (la jauge « Rages » de la recette vient de la voie de la rage, vraie réserve tactique).
    const gauges = capacityResourceGauges(character);
    expect(gauges.some((g) => g.key.startsWith(PATH_ID))).toBe(false);
    expect(gauges.some((g) => g.key.startsWith('rage'))).toBe(true);
  });

  it('r8 : tout le reste de l’attaque reste en verbatim, sans marqueur d’état', () => {
    // Un `attack-bonus` s'ajouterait EN PERMANENCE à la carte d'attaque : le +5 ne porte que sur UNE
    // attaque. Et aucune primitive n'exprime une cadence « par round de combat (maximum 5) ».
    expect(featureById.get(R8)?.effects ?? []).toEqual([]);
    // Aucun marqueur « Affaibli déjà infligé » : le compteur limite DÉJÀ la capacité à un usage par
    // combat, donc l'état ne peut être infligé qu'une fois — le bouton ferait doublon.
    expect(featureById.get(R8)?.inflictableStates).toBeUndefined();
  });

  it('la voie ne touche ni la DEF, ni les compétences, ni les protections', () => {
    const ctx = effectContext(character);
    const def = featureModSources(character.featureIds, ctx).def ?? [];
    expect(def.some((s) => s.featureId.startsWith(PATH_ID))).toBe(false);
    for (const id of pathById.get(PATH_ID)!.featureIds) {
      const feature = featureById.get(id)!;
      expect(feature.damageReduction).toBeUndefined();
      expect((feature.effects ?? []).some((e) => e.kind === 'test-bonus')).toBe(false);
    }
    expect(
      buildCharacterDerivedView(character).defenseBadges.every(
        (b) => !b.sources.some((s) => s.featureId?.startsWith(PATH_ID)),
      ),
    ).toBe(true);
  });
});
