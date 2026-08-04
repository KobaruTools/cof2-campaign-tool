import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { equipmentById, featureById, pathById } from '@/data';
import { migrateCharacter } from '@/lib/engine/migrations';
import {
  aggregateImmunities,
  capacityResourceGauges,
  damageReductionSources,
  effectContext,
  featureModSources,
  isEffectActive,
  testBonusSources,
} from '@/lib/character/effects';
import { weaponDamageBonuses } from '@/lib/character/weaponDamageBonus';
import { parseRichText } from '@/lib/ui/featureRichText';
import type { Character } from '@/lib/character/types';

const PATH_ID = 'prestige-combat-du-mal';
const R4 = `${PATH_ID}-r4`;
const R5 = `${PATH_ID}-r5`;
const R8 = `${PATH_ID}-r8`;

function loadFixture(name: string): Character {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

const sword = equipmentById.get('epee-a-deux-mains') as Parameters<typeof weaponDamageBonuses>[2];

describe('PER-74 — voie du combat du mal (p. 149, recette end-to-end)', () => {
  const character = loadFixture('recette-per74-combat-du-mal');

  it('la voie est une voie de prestige de la famille des combattants, sans prérequis, avec sa présentation', () => {
    const path = pathById.get(PATH_ID)!;
    expect(path.type).toBe('prestige');
    // `category: 'fighter'` → habillage prestige ROUGE.
    expect('category' in path && path.category).toBe('fighter');
    expect(path.sourcePage).toBe(149);
    // Le livre ne donne AUCUN prérequis à cette voie (contraste avec le colosse, +3 en Force).
    expect('prerequisites' in path && path.prerequisites).toBe('');
    expect('note' in path && path.note).toMatch(/pourfendeur de créatures maléfiques/);
  });

  it("r4 Juste courroux : « Attaque sournoise » est une PUCE vers la capacité de l'assassin", () => {
    const feature = featureById.get(R4)!;
    const chips = parseRichText(feature.richText!).filter((s) => s.kind === 'capabilityRef');
    expect(chips).toHaveLength(1);
    expect(chips[0]).toMatchObject({ featureId: 'assassin-r2' });
    expect(featureById.get('assassin-r2')?.name).toBe('Attaque sournoise');
    // « Attaque mortelle » est une capacité de CRÉATURE : aucune capacité de voie ne porte ce nom,
    // elle reste donc en texte littéral.
    expect(feature.richText).toContain('Attaque mortelle (capacité de créature)');
    // Le verbatim imprimé reste la source, sans balisage.
    expect(feature.text).not.toContain('[&');
  });

  it.each([R4, `${PATH_ID}-r6`, `${PATH_ID}-r7`])(
    '%s reste en verbatim : aucun effet, aucun compteur, aucun état infligeable',
    (id) => {
      const feature = featureById.get(id)!;
      expect(feature.effects ?? []).toEqual([]);
      expect(feature.usageCounter).toBeUndefined();
      expect(feature.damageReduction).toBeUndefined();
      // « privé de magie » (r7) n'existe pas au glossaire des états préjudiciables de CO2.
      expect(feature.inflictableStates).toBeUndefined();
    },
  );

  it("r5 Épée de lumière : interrupteur temporaire éteint par défaut, sans stat dérivée touchée", () => {
    const [toggle] = featureById.get(R5)!.effects!;
    expect(toggle.kind).toBe('conditional-stat-bonus');
    if (toggle.kind !== 'conditional-stat-bonus') return;
    expect(toggle.activation).toMatchObject({
      kind: 'temporary',
      label: 'épée de lumière',
      activeByDefault: false,
    });
    // Marqueur d'état pur : l'illumination n'ajoute que des DM.
    expect(toggle.bonuses).toEqual([]);
    expect(isEffectActive(character, R5, 0)).toBe(false);
  });

  it("r5 Épée de lumière : interrupteur allumé → puce de DM situationnelle sur l'attaque au contact", () => {
    expect(weaponDamageBonuses(character, 'melee', sword).situational.some((b) => b.featureId === R5)).toBe(false);
    const lit: Character = { ...character, effectToggles: { [R5]: [true] } };
    expect(isEffectActive(lit, R5, 0)).toBe(true);
    const bonus = weaponDamageBonuses(lit, 'melee', sword).situational.find((b) => b.featureId === R5);
    expect(bonus?.conditionLabel).toBe('épée de lumière (morts-vivants, créatures démoniaques, animaux corrompus)');
    // Le dé évolutif sort DÉJÀ RÉSOLU par le niveau : à 16, un `1d4°` s'affiche en d12.
    expect(bonus?.dice).toEqual({ count: 1, die: 'd12', evolving: true });
    // L'arme qui brille est celle au contact : rien à distance.
    expect(weaponDamageBonuses(lit, 'ranged', null).situational.some((b) => b.featureId === R5)).toBe(false);
    // Aucune fréquence dans le livre → aucun compteur.
    expect(featureById.get(R5)?.usageCounter).toBeUndefined();
  });

  it("r5 Épée de lumière : la puce cohabite avec celle de « Rage du berserk »", () => {
    const both: Character = { ...character, effectToggles: { [R5]: [true], 'rage-r3': [true] } };
    const melee = weaponDamageBonuses(both, 'melee', sword);
    const all = [...melee.situational, ...melee.addedFlat, ...melee.addedAbilities];
    expect(all.some((b) => b.featureId === 'rage-r3')).toBe(true);
    expect(melee.situational.some((b) => b.featureId === R5)).toBe(true);
  });

  it('r8 Résister à la corruption : un usage rechargé à la récupération rapide, suivi sur la carte', () => {
    expect(featureById.get(R8)?.usageCounter).toEqual({
      max: 1,
      resetOn: 'short-rest',
      hideFromStatusPanel: true,
    });
    // Règle d'office des voies de prestige : aucune barre issue de la voie dans « État du personnage »
    // (la jauge « Rages » de la recette vient de la voie de la rage, vraie réserve tactique).
    expect(capacityResourceGauges(character).some((g) => g.key.startsWith(PATH_ID))).toBe(false);
  });

  it("r8 Résister à la corruption : immunité empoisonnement/maladie restreinte à sa source", () => {
    const source = damageReductionSources(character).find((s) => s.featureId === R8);
    expect(source?.reduction.kind).toBe('immunity');
    expect(source?.reduction.scopes).toEqual(['poison', 'disease']);
    // La restriction à la SOURCE n'est pas exprimable par une portée typée : elle passe par `note`,
    // pour qu'un badge ne laisse pas croire à une immunité générale au poison.
    expect(source?.reduction.note).toMatch(/Seulement si provoqués par les morts-vivants/);
    // Drain / affaiblissement / pourriture n'ont aucun type au catalogue → verbatim, aucune immunité d'état.
    expect(aggregateImmunities(character.featureIds)).toEqual([]);
  });

  it('la voie ne touche ni la DEF ni les compétences', () => {
    const ctx = effectContext(character);
    expect((featureModSources(character.featureIds, ctx).def ?? []).some((s) => s.featureId.startsWith(PATH_ID))).toBe(
      false,
    );
    expect(
      testBonusSources(character.featureIds, ctx).some((b) => b.sources.some((s) => s.featureId.startsWith(PATH_ID))),
    ).toBe(false);
  });
});
