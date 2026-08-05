/**
 * PER-74 — Voie de prestige du DANSEUR DE GUERRE (p. 150), 7ᵉ voie de la catégorie COMBATTANT.
 *
 * Le test charge la RECETTE livrée (`examples/characters/recette-per74-danseur-de-guerre.json`)
 * plutôt que de fabriquer un personnage à la main : ce que le propriétaire recette dans l'app est
 * exactement ce que ces tests vérifient. Fichier DÉDIÉ (patron `colossusPath.recette.test.ts`) —
 * aucun conflit avec les autres sessions.
 *
 * Couverture : le rang 4 (attaque en finesse AGI↔FOR et son énumération d'armes), le rang 5 (DEF par
 * palier + bonus de tests), les interrupteurs des rangs 7 et 8, et surtout le NOUVEAU plafond
 * d'armure porté par la VOIE (`Path.maxArmorId`).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { migrateCharacter } from '@/lib/engine/migrations';
import { featureById, pathById } from '@/data';
import {
  activeFeatureIdsForMods,
  effectContext,
  featureModSources,
  finesseAttackChoice,
  isEffectActive,
  testBonusSources,
} from './effects';
import { pathArmorDisabledFeatureIds, pathArmorDisabledReasons, armorRestrictionViolations } from './armorRestrictions';
import { rulesContext } from './rulesContext';
import { wornMeleeWeapon } from './equipment';
import { weaponDamageBonuses } from './weaponDamageBonus';
import type { Character, EquipmentLine } from './types';

const PATH_ID = 'prestige-danseur-de-guerre';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R7 = `${PATH_ID}-r7`;
const R8 = `${PATH_ID}-r8`;
const RANKS = [4, 5, 6, 7, 8].map((r) => `${PATH_ID}-r${r}`);

const recette = (): Character =>
  migrateCharacter(
    JSON.parse(
      readFileSync(join(process.cwd(), 'examples', 'characters', 'recette-per74-danseur-de-guerre.json'), 'utf-8'),
    ),
  ) as Character;

/** La recette, mais avec une seule arme en main principale (prise précisée) et sa chemise de mailles. */
const wielding = (itemId: string, grip: 'oneHand' | 'twoHands'): Character => {
  const equipment: EquipmentLine[] = [
    { itemId, quantity: 1, worn: { slot: 'mainHand', grip } },
    { itemId: 'chemise-de-mailles', quantity: 1, worn: { slot: 'armor' } },
  ];
  return { ...recette(), equipment };
};

/** La recette avec la cotte de mailles (DEF 5) enfilée : au-dessus du plafond de la voie (DEF 4). */
const inHeavyArmor = (): Character => ({
  ...recette(),
  equipment: [
    { itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand', grip: 'oneHand' } },
    { itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } },
  ],
});

describe('PER-74 — Voie du danseur de guerre : données (p. 150)', () => {
  it('la voie porte son intro RP, son prérequis verbatim et son plafond d’armure', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.sourcePage).toBe(150);
    expect(path.type).toBe('prestige');
    if (path.type !== 'prestige') throw new Error('voie de prestige attendue');
    expect(path.category).toBe('fighter'); // habillage prestige ROUGE
    expect(path.note).toContain("Populaire chez certaines tribus d'elfes sauvages");
    expect(path.prerequisites).toContain("plus encombrante qu'une chemise de mailles");
    expect(path.maxArmorId).toBe('chemise-de-mailles');
  });

  it('les 5 rangs sont sourcés p. 150 et seul le rang 8 porte un balisage (le seul à contenir un dé)', () => {
    for (const id of RANKS) expect(featureById.get(id)?.sourcePage).toBe(150);
    for (const id of [R4, R5, `${PATH_ID}-r6`, R7]) expect(featureById.get(id)?.richText).toBeUndefined();
    expect(featureById.get(R8)?.richText).toContain('{1d4°}');
  });
});

describe('PER-74 — r4 Vent des lames : attaque en finesse AGI↔FOR', () => {
  it('la recette est livrée sur « AGI aux DM » et la substitution n’est pas automatique', () => {
    const choice = finesseAttackChoice(recette());
    expect(choice?.featureId).toBe(R4);
    expect(choice?.mode).toBe('damage');
    expect(choice?.ability).toBe('AGI');
    expect(choice?.replaces).toBe('FOR');
    // Deux modes offerts (touche OU DM) = vrai arbitrage à la table, jamais appliqué d'office.
    expect(choice?.automatic).toBe(false);
  });

  it('bascule sur « AGI en attaque » → la touche change de caractéristique', () => {
    const attack: Character = { ...recette(), effectInputs: { [R4]: 'attack' } };
    expect(finesseAttackChoice(attack)?.mode).toBe('attack');
  });

  it('les armes de l’énumération sont éligibles, y compris à deux mains pour la lance et la vivelame', () => {
    for (const id of ['dague', 'epee-courte', 'epee-longue', 'lance']) {
      expect(finesseAttackChoice(wielding(id, 'oneHand'))).not.toBeNull();
    }
    // « Dans le cas d'une arme à une main » : la restriction ne vise QUE les armes à une main, donc
    // une arme employée à deux mains reste couverte.
    expect(finesseAttackChoice(wielding('lance', 'twoHands'))).not.toBeNull();
    expect(finesseAttackChoice(wielding('vivelame', 'twoHands'))).not.toBeNull();
  });

  it('une arme hors énumération n’ouvre aucun droit (hache, épée bâtarde, épée longue à deux mains)', () => {
    expect(finesseAttackChoice(wielding('hache', 'oneHand'))).toBeNull();
    expect(finesseAttackChoice(wielding('epee-batarde', 'oneHand'))).toBeNull();
    expect(finesseAttackChoice(wielding('epee-longue', 'twoHands'))).toBeNull();
  });

  it('sans arme en main ou sans mode retenu, la finesse est inactive', () => {
    expect(finesseAttackChoice({ ...recette(), equipment: [] })).toBeNull();
    expect(finesseAttackChoice({ ...recette(), effectInputs: {} })).toBeNull();
  });
});

describe('PER-74 — r5 Pirouettes : DEF par palier et bonus de tests', () => {
  it('+1 en DEF au rang 5, +2 une fois le rang 8 atteint', () => {
    const full = recette();
    const defFull = featureModSources(activeFeatureIdsForMods(full), effectContext(full)).def ?? [];
    expect(defFull.find((s) => s.featureId === R5)?.value).toBe(2);

    const upToR7: Character = { ...full, featureIds: full.featureIds.filter((id) => id !== `${PATH_ID}-r8`) };
    const defR7 = featureModSources(activeFeatureIdsForMods(upToR7), effectContext(upToR7)).def ?? [];
    expect(defR7.find((s) => s.featureId === R5)?.value).toBe(1);
  });

  it('+5 aux tests de danse ET d’acrobaties (valeur du livre, pas le repli des voies de prestige)', () => {
    const c = recette();
    const tests = testBonusSources(activeFeatureIdsForMods(c), effectContext(c));
    for (const domain of ['dance', 'acrobatics']) {
      const source = tests.find((t) => t.domain === domain)?.sources.find((s) => s.featureId === R5);
      expect(source?.value).toBe(5);
    }
  });
});

describe('PER-74 — r7 Danse des lames et r8 Volte-face : interrupteurs', () => {
  it('r7 : compteur d’un usage par récupération rapide, masqué du panneau d’état', () => {
    const counter = featureById.get(R7)?.usageCounter;
    expect(counter?.max).toBe(1);
    expect(counter?.resetOn).toBe('short-rest');
    expect(counter?.hideFromStatusPanel).toBe(true);
  });

  it('r7 : la transe est un marqueur pur, éteint par défaut', () => {
    const effect = featureById.get(R7)?.effects?.[0];
    expect(effect?.kind).toBe('conditional-stat-bonus');
    if (effect?.kind === 'conditional-stat-bonus') {
      expect(effect.bonuses).toHaveLength(0);
      expect(effect.activation?.kind).toBe('temporary');
    }
    expect(isEffectActive(recette(), R7, 0)).toBe(false);
    expect(isEffectActive({ ...recette(), effectToggles: { [R7]: [true] } }, R7, 0)).toBe(true);
  });

  it('r8 : la puce de DM n’apparaît que l’interrupteur allumé, et reste situationnelle', () => {
    const off = recette();
    expect(
      weaponDamageBonuses(off, 'melee', wornMeleeWeapon(off.equipment)).situational.some((b) => b.featureId === R8),
    ).toBe(false);

    const on: Character = { ...off, effectToggles: { [R8]: [true] } };
    const bonuses = weaponDamageBonuses(on, 'melee', wornMeleeWeapon(on.equipment));
    const puce = bonuses.situational.find((b) => b.featureId === R8);
    expect(puce).toBeDefined();
    expect(puce?.dice?.evolving).toBe(true); // 1d4° → face résolue au niveau, marqueur ° conservé
    expect(puce?.conditionLabel).toContain('volte-face');
    // Jamais dans les DM permanents de l'arme : la fiche ne connaît ni le round ni la cible.
    expect(bonuses.addedFlat.some((b) => b.featureId === R8)).toBe(false);
    expect(bonuses.addedAbilities.some((b) => b.featureId === R8)).toBe(false);
  });

  it('r8 : le dé bonus en attaque reste verbatim (aucun bonus d’attaque permanent)', () => {
    expect((featureById.get(R8)?.effects ?? []).some((e) => e.kind === 'attack-bonus')).toBe(false);
  });
});

describe('PER-74 — plafond d’armure porté par la VOIE (Path.maxArmorId)', () => {
  it('à la chemise de mailles (au plafond), les 5 rangs restent actifs', () => {
    const c = recette();
    expect(pathArmorDisabledFeatureIds(c, rulesContext).size).toBe(0);
    const active = new Set(activeFeatureIdsForMods(c));
    for (const id of RANKS) expect(active.has(id)).toBe(true);
  });

  it('à la cotte de mailles, les 5 rangs sont désactivés et leurs effets retirés', () => {
    const heavy = inHeavyArmor();
    const disabled = pathArmorDisabledFeatureIds(heavy, rulesContext);
    for (const id of RANKS) expect(disabled.has(id)).toBe(true);

    const active = new Set(activeFeatureIdsForMods(heavy));
    for (const id of RANKS) expect(active.has(id)).toBe(false);
    expect((featureModSources(activeFeatureIdsForMods(heavy), effectContext(heavy)).def ?? []).some((s) => s.featureId === R5)).toBe(false);
    expect(testBonusSources(activeFeatureIdsForMods(heavy), effectContext(heavy)).some((t) => t.sources.some((s) => s.featureId === R5))).toBe(false);
    expect(finesseAttackChoice(heavy)).toBeNull();
  });

  it('seule la voie de prestige est gatée : les capacités de profil restent actives', () => {
    expect(new Set(activeFeatureIdsForMods(inHeavyArmor())).has('combat-r1')).toBe(true);
  });

  it('la restriction vient de la VOIE, pas du profil : le guerrier a le droit de porter la cotte', () => {
    expect(armorRestrictionViolations(inHeavyArmor(), rulesContext)).toHaveLength(0);
  });

  it('chaque capacité désactivée porte une notice nommant l’armure plafond et sa page', () => {
    const reasons = pathArmorDisabledReasons(inHeavyArmor(), rulesContext);
    expect(reasons.size).toBe(RANKS.length);
    for (const message of reasons.values()) {
      expect(message).toContain('chemise de mailles');
      expect(message).toContain('(p. 150)'); // parenthèse AUTONOME → parsée par PageRefText/SourceRef
    }
  });

  it('sans armure portée, rien n’est désactivé', () => {
    const naked: Character = {
      ...recette(),
      equipment: [{ itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand', grip: 'oneHand' } }],
    };
    expect(pathArmorDisabledFeatureIds(naked, rulesContext).size).toBe(0);
  });
});
