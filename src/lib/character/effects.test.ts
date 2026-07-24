import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import type { AbilityId } from '@/data/schema';
import type { Character, EquipmentLine } from './types';
import { createBlankCharacter } from './factory';
import { effectiveFeatureIdsForMods } from './choices';
import {
  abilityBonusDiceFromFeatures,
  abilityModSources,
  borrowedPowerUsedKey,
  borrowedPowerIntegrityKey,
  inflictedStateKey,
  pruneUsageCounters,
  abilityModsFromFeatures,
  abilityTestBonusSources,
  abilityTestBonusByAbility,
  activeConditionalTestDice,
  aggregateImmunities,
  armorPenaltyDivisor,
  capacityResourceGauges,
  conditionalEffectsOf,
  conditionalEffectBonuses,
  criticalRangeSources,
  familiarPowerUsedKey,
  resolveFamiliarGrantedPower,
  damageReductionSources,
  stackedDamageReductions,
  creatureBonusDiceForPath,
  defenseAbility,
  disabledFeatureIds,
  disabledFeatureReasons,
  effectContext,
  effectiveAbilities,
  featureModSources,
  hpAbilitySwapSources,
  escalatingManaSurcharge,
  isEffectActive,
  isTemporaryActivationShortRestLocked,
  shortRestLockKey,
  manaCastingAbility,
  modsFromFeatures,
  optionStatBonusSources,
  pathRanksFromFeatures,
  pruneEffectToggles,
  resetUsageCounters,
  resolveValue,
  setEffectToggle,
  testBonusSources,
  universalTestBonus,
  usageCounterMaximum,
  type EffectContext,
} from './effects';

/** Contexte d'effets de test (FOR 3, niveau 5, aucun interrupteur). */
const ctx = (over: Partial<EffectContext> = {}): EffectContext => ({
  level: 5,
  abilities: { AGI: 0, CON: 0, FOR: 3, PER: 0, CHA: 0, INT: 0, VOL: 0 } as Record<AbilityId, number>,
  toggles: {},
  ...over,
});

/** Personnage minimal pour tester les helpers d'interrupteurs (lecture seule). */
const charWith = (toggles: Record<string, boolean[]>): Character =>
  ({
    level: 5,
    abilities: ctx().abilities,
    featureIds: [] as string[],
    effectToggles: toggles,
    featureChoices: {},
  }) as Character;

describe('modsFromFeatures — bonus plats constants (PER-63)', () => {
  it('aucune capacité → sac vide', () => {
    expect(modsFromFeatures([])).toEqual({});
  });

  it('ignore les ids inconnus et les capacités sans effects', () => {
    expect(modsFromFeatures(['id-inexistant', 'air-r2'])).toEqual({});
  });

  it('agrège un bonus plat unique (Murmures dans le vent, air r1 : +1 Init, +1 DEF)', () => {
    expect(modsFromFeatures(['air-r1'])).toEqual({ initiative: 1, def: 1 });
  });

  it('agrège la part plate de Réflexes éclair (pourfendeur r1 : +3 Init ; DEF scalante omise sans contexte)', () => {
    // Depuis PER-127, le +1 DEF de pourfendeur-r1 est SCALANT (stepped path-rank {1:1,5:2}) :
    // sans contexte, seule la part plate +3 Init est résoluble (la DEF est résolue avec contexte,
    // cf. le bloc « valeurs scalantes » et le cas en or Lhagva dans derived.test.ts).
    expect(modsFromFeatures(['pourfendeur-r1'])).toEqual({ initiative: 3 });
  });

  it('somme les bonus de plusieurs capacités, par stat (cas Lhagva, parts plates)', () => {
    // DEF de pourfendeur-r1 désormais scalante (omise sans contexte) ; restent les parts plates.
    expect(modsFromFeatures(['pourfendeur-r1', 'humain-r1'])).toEqual({
      initiative: 3,
      luckPoints: 1,
    });
  });
});

describe('modsFromFeatures — valeurs scalantes (PER-67)', () => {
  it('sans contexte, une valeur scalante est ignorée (non résoluble)', () => {
    // Argument de taille (brute r1) : maxHp += FOR — non résoluble sans contexte.
    expect(modsFromFeatures(['brute-r1'])).toEqual({});
  });

  it('résout une valeur = caractéristique (brute r1 : maxHp += FOR)', () => {
    expect(modsFromFeatures(['brute-r1'], ctx())).toEqual({ maxHp: 3 });
  });

  it('résout la DEF scalante de Réflexes éclair (pourfendeur r1 : +1 DEF, +2 au rang 5)', () => {
    // Au rang 1, la DEF stepped vaut 1 ; au rang 5 (voie complétée), elle passe à 2 (PER-127).
    expect(modsFromFeatures(['pourfendeur-r1'], ctx())).toEqual({ initiative: 3, def: 1 });
    expect(modsFromFeatures(['pourfendeur-r1', 'pourfendeur-r5'], ctx())).toEqual({
      initiative: 3,
      def: 2,
    });
  });
});

describe('abilityTestBonusByAbility — bonus à une carac via option (PER-125)', () => {
  it('le tatouage retenu octroie +3 aux tests de sa caractéristique', () => {
    const result = abilityTestBonusByAbility(
      ['pagne-r3'],
      ctx({ featureChoices: { 'pagne-r3': ['bull'] } }),
    );
    expect(result.FOR).toEqual([{ featureId: 'pagne-r3', name: 'Tatouages', value: 3 }]);
    expect(result.CON).toBeUndefined();
  });

  it('sans sélection (ni contexte), aucun bonus', () => {
    expect(abilityTestBonusByAbility(['pagne-r3'], ctx())).toEqual({});
    expect(abilityTestBonusByAbility(['pagne-r3'])).toEqual({});
  });
});

describe('setEffectToggle — exclusion mutuelle d’interrupteurs (PER-130)', () => {
  it('activer la Furie du berserk éteint l’interrupteur de la Rage du berserk', () => {
    const c = charWith({ 'rage-r3': [true] });
    const next = setEffectToggle(c, 'rage-r5', 0, true);
    expect(next['rage-r5']?.[0]).toBe(true);
    expect(next['rage-r3']?.[0]).toBe(false);
  });

  it('et réciproquement : activer la Rage éteint la Furie', () => {
    const c = charWith({ 'rage-r5': [true] });
    const next = setEffectToggle(c, 'rage-r3', 0, true);
    expect(next['rage-r3']?.[0]).toBe(true);
    expect(next['rage-r5']?.[0]).toBe(false);
  });

  it('ne désactive PAS les capacités (basculement ON/OFF, pas un grisage)', () => {
    const c = charWith({ 'rage-r3': [true], 'rage-r5': [true] });
    const reasons = disabledFeatureReasons({ ...c, featureIds: ['rage-r3', 'rage-r5'] });
    expect(reasons.has('rage-r3')).toBe(false);
    expect(reasons.has('rage-r5')).toBe(false);
  });
});

describe('capacityResourceGauges — ressources de capacité en jauges (PER-150)', () => {
  const make = (over: Partial<Character>): Character =>
    ({ level: 5, featureIds: [], usageCounters: {}, ...over }) as Character;

  it('aucune capacité à réserve → aucune jauge', () => {
    expect(capacityResourceGauges(make({ featureIds: ['brute-r1'] }))).toEqual([]);
  });

  it('fusionne la réserve de rage cross-voie en UNE seule jauge', () => {
    const gauges = capacityResourceGauges(
      make({ featureIds: ['rage-r3', 'rage-r5', 'brute-r4'], usageCounters: { rage: 1 } }),
    );
    expect(gauges).toHaveLength(1);
    expect(gauges[0]).toMatchObject({ key: 'rage', label: 'Rages', current: 1 });
    // max = base 1 + une capacité de rang 4 barbare (brute-r4) = 2.
    expect(gauges[0].max).toBe(2);
  });

  it('compteur plein par défaut (pas d’entrée) → current = max', () => {
    const [gauge] = capacityResourceGauges(make({ featureIds: ['rage-r3'] }));
    expect(gauge.current).toBe(gauge.max);
    expect(gauge.max).toBe(1);
  });

  it('libellé générique « Usages restants » remplacé par le nom de la capacité', () => {
    const [gauge] = capacityResourceGauges(make({ featureIds: ['fauve-r5'] }));
    expect(gauge.label).toBe(featureById.get('fauve-r5')?.name);
    expect(gauge.max).toBe(6);
  });

  it('rattache la ressource à son profil (rage → barbare)', () => {
    const [gauge] = capacityResourceGauges(make({ featureIds: ['rage-r3'] }));
    expect(gauge.classId).toBe('barbare');
  });

  // PER-157 : charges explosives de la voie des explosifs (arquebusier).
  it('charges explosives : réserve PARTAGÉE r2/r4/r5 en une seule jauge, profil arquebusier', () => {
    const gauges = capacityResourceGauges(
      make({ featureIds: ['explosifs-r2', 'explosifs-r4', 'explosifs-r5'], usageCounters: { 'explosifs-charges': 2 } }),
    );
    expect(gauges).toHaveLength(1);
    expect(gauges[0]).toMatchObject({
      key: 'explosifs-charges',
      label: 'Charges explosives',
      classId: 'arquebusier',
      current: 2,
    });
  });

  it('charges explosives : max = rang le plus haut atteint dans la voie (scalant)', () => {
    expect(capacityResourceGauges(make({ featureIds: ['explosifs-r2'] }))[0].max).toBe(2);
    expect(capacityResourceGauges(make({ featureIds: ['explosifs-r2', 'explosifs-r4'] }))[0].max).toBe(4);
    expect(
      capacityResourceGauges(make({ featureIds: ['explosifs-r2', 'explosifs-r4', 'explosifs-r5'] }))[0].max,
    ).toBe(5);
  });

  // Pool d'élixirs (forgesort) : suivi dans l'en-tête de la voie, PAS en jauge d'état.
  it('réserve « poolInPathHeader » (élixirs) exclue des jauges d’état', () => {
    expect(capacityResourceGauges(make({ featureIds: ['elixirs-r1', 'elixirs-r5'] }))).toEqual([]);
  });

  // PER-150 : compteur « visibleWhenEffectActive » (Absorption d'Armure de pierre).
  it('Absorption d’Armure de pierre : jauge masquée hors sort, visible sort actif', () => {
    // Interrupteur OFF (aucun toggle) → pas de jauge d'état.
    expect(
      capacityResourceGauges(make({ featureIds: ['magie-elementaire-r5'], effectToggles: {} })),
    ).toEqual([]);
    // Interrupteur ON (effet index 0 actif) → jauge présente, max = niveau 5 × 3.
    const [gauge] = capacityResourceGauges(
      make({ featureIds: ['magie-elementaire-r5'], effectToggles: { 'magie-elementaire-r5': [true] } }),
    );
    expect(gauge).toMatchObject({ label: 'Absorption restante (DM)', max: 15 });
  });
});

describe('usageCounterMaximum — réserve de rage cross-voie (PER-130)', () => {
  const rageFeature = featureById.get('rage-r3');
  const counter = rageFeature?.usageCounter;

  it('max = 1 + nombre de capacités de rang 4 de barbare acquises', () => {
    expect(rageFeature && counter).toBeTruthy();
    if (!rageFeature || !counter) return;
    const base = charWith({});
    // 1 rage de base ; +1 par capacité de rang 4 de barbare (brute-r4, pagne-r4, rage-r4…).
    expect(usageCounterMaximum(counter, { ...base, featureIds: ['rage-r3'] }, rageFeature)).toBe(1);
    expect(
      usageCounterMaximum(counter, { ...base, featureIds: ['rage-r3', 'brute-r4'] }, rageFeature),
    ).toBe(2);
    expect(
      usageCounterMaximum(
        counter,
        { ...base, featureIds: ['rage-r3', 'brute-r4', 'pagne-r4', 'rage-r4'] },
        rageFeature,
      ),
    ).toBe(4);
  });

  it('maxByLevel : absorption d’Armure de pierre = niveau × 3 (PER-137)', () => {
    const feature = featureById.get('magie-elementaire-r5');
    const counter = feature?.usageCounter;
    expect(feature && counter).toBeTruthy();
    if (!feature || !counter) return;
    expect(usageCounterMaximum(counter, { ...charWith({}), level: 7 }, feature)).toBe(21);
    expect(usageCounterMaximum(counter, { ...charWith({}), level: 10 }, feature)).toBe(30);
  });
});

describe('usageCounterMaximum — formules /jour dynamiques (PER-73)', () => {
  const base = charWith({});
  const maxOf = (id: string, featureIds: string[]) => {
    const f = featureById.get(id)!;
    return usageCounterMaximum(f.usageCounter!, { ...base, featureIds }, f);
  };

  it('moine (base 0) : max = nombre de capacités de rang 5 de moine acquises', () => {
    expect(maxOf('maitrise-r5', ['maitrise-r5'])).toBe(1);
    expect(maxOf('maitrise-r5', ['maitrise-r5', 'meditation-r5'])).toBe(2);
    expect(maxOf('meditation-r5', ['maitrise-r5', 'meditation-r5', 'vent-r5'])).toBe(3);
  });

  it('soins-r1 : rang(soins) + rang 3 des AUTRES voies de prêtre (excludeHostPath)', () => {
    expect(maxOf('soins-r1', ['soins-r1'])).toBe(1);
    // soins au rang 3, mais sa PROPRE capacité de rang 3 ne compte pas (voie hôte exclue).
    expect(maxOf('soins-r1', ['soins-r1', 'soins-r2', 'soins-r3'])).toBe(3);
    // + une autre voie de prêtre à rang 3 (foi) → +1.
    expect(
      maxOf('soins-r1', ['soins-r1', 'soins-r2', 'soins-r3', 'foi-r1', 'foi-r2', 'foi-r3']),
    ).toBe(4);
  });

  it('élixirs (pool partagé) : rang(elixirs) + rang 3 des voies de forgesort (voie incluse)', () => {
    expect(maxOf('elixirs-r1', ['elixirs-r1'])).toBe(1);
    // elixirs au rang 3 : rang 3 + sa propre capacité de rang 3 comptée (voie hôte incluse) = 4.
    expect(maxOf('elixirs-r1', ['elixirs-r1', 'elixirs-r2', 'elixirs-r3'])).toBe(4);
    // + une autre voie de forgesort à rang 3 (métal) → +1 = 5.
    expect(
      maxOf('elixirs-r1', [
        'elixirs-r1',
        'elixirs-r2',
        'elixirs-r3',
        'metal-r1',
        'metal-r2',
        'metal-r3',
      ]),
    ).toBe(5);
  });
});

describe('modsFromFeatures — effets conditionnels / temporaires (PER-67)', () => {
  it('un effet conditionnel inactif par défaut ne compte pas', () => {
    // Rage du berserk (rage r3) : -2 DEF temporaire, inactif par défaut.
    expect(modsFromFeatures(['rage-r3'])).toEqual({});
    expect(modsFromFeatures(['rage-r3'], ctx())).toEqual({});
  });

  it("compte l'effet quand l'interrupteur l'active (rage r3 : -2 DEF)", () => {
    expect(modsFromFeatures(['rage-r3'], ctx({ toggles: { 'rage-r3': [true] } }))).toEqual({
      def: -2,
    });
  });

  it('résout la valeur scalante par paliers de rang de voie (Parade croisée)', () => {
    const toggles = { 'combat-a-deux-armes-r2': [true] };
    // Rang 2 dans la voie → palier { min: 1 } → +1 en DEF.
    expect(modsFromFeatures(['combat-a-deux-armes-r2'], ctx({ toggles }))).toEqual({ def: 1 });
    // Rang 5 atteint dans la voie → palier { min: 5 } → +2 en DEF.
    expect(
      modsFromFeatures(['combat-a-deux-armes-r2', 'combat-a-deux-armes-r5'], ctx({ toggles })),
    ).toEqual({ def: 2 });
  });
});

describe('modsFromFeatures — paliers de famille CROSS-VOIE (milestone-count + sum)', () => {
  it('Divination : base + palier in-voie + un par voie d’ensorceleur au rang 5', () => {
    // Divination seule (voie au rang 1) : stepped → 1 ; milestone (voies au rang 5) → 0.
    expect(modsFromFeatures(['divination-r1'], ctx())).toEqual({ initiative: 1, def: 1 });
    // 5 voies d’ensorceleur au rang 5 → stepped (rang de voie 5) = 2, milestone = 5 → 7.
    const five = ['divination-r1', 'divination-r5', 'air-r5', 'envouteur-r5', 'illusions-r5', 'invocation-r5'];
    expect(modsFromFeatures(five, ctx())).toEqual({ initiative: 7, def: 7 });
  });

  it('Armure de mana : 4 (rang 3) + 5 (voies de magicien au rang 5) = 9, si interrupteur actif', () => {
    const ids = [
      'magie-protectrice-r1', 'magie-protectrice-r5', 'magie-des-arcanes-r5',
      'magie-destructrice-r5', 'magie-elementaire-r5', 'magie-universelle-r5',
    ];
    expect(modsFromFeatures(ids, ctx({ toggles: { 'magie-protectrice-r1': [true] } }))).toEqual({ def: 9 });
    // Interrupteur inactif → l’effet temporaire ne compte pas.
    expect(modsFromFeatures(ids, ctx())).toEqual({});
  });

  it("Armure d'os : 3 + 5 (voies de sorcier au rang 4) = 8", () => {
    const ids = ['outre-tombe-r2', 'outre-tombe-r4', 'demon-r4', 'mort-r4', 'sang-r4', 'sombre-magie-r4'];
    // demon-r4 (Aspect du démon, +5 DEF) est conditionnel inactif → exclu.
    expect(modsFromFeatures(ids, ctx())).toEqual({ def: 8 });
  });
});

describe('manaCastingAbility (Charisme héroïque, PER-101)', () => {
  const abil = (cha: number, vol: number) =>
    ({ AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: cha, INT: 0, VOL: vol }) as Record<AbilityId, number>;
  it('retient le CHA quand CHA > VOL (et nomme la capacité source)', () => {
    expect(manaCastingAbility(['seduction-r4'], abil(5, 2))).toEqual({ ability: 'CHA', source: 'Charisme héroïque' });
  });
  it('reste sur la VOL quand CHA ≤ VOL', () => {
    expect(manaCastingAbility(['seduction-r4'], abil(2, 4))).toEqual({ ability: 'VOL' });
  });
  it('VOL par défaut sans capacité de substitution', () => {
    expect(manaCastingAbility(['escrime-r1'], abil(5, 2))).toEqual({ ability: 'VOL' });
  });
});

describe('universalTestBonus (Éclectique, PER-102)', () => {
  it('vaut 1 (base) quand aucune voie de barde n’a atteint le rang 4', () => {
    expect(universalTestBonus(['vagabond-r2'])).toMatchObject({ value: 1, name: 'Éclectique' });
  });
  it('vaut 1 + nombre de voies de barde au rang 4 (voie hôte comprise)', () => {
    const ids = ['vagabond-r2', 'vagabond-r4', 'escrime-r4', 'musicien-r4', 'saltimbanque-r4', 'seduction-r4'];
    expect(universalTestBonus(ids)).toMatchObject({ value: 6 });
  });
  it('null sans capacité de bonus universel', () => {
    expect(universalTestBonus(['escrime-r1'])).toBeNull();
  });
});

describe('testBonusSources — plancher universel (Éclectique, PER-102)', () => {
  const ctxHighlander = ctx({ featureChoices: { 'humain-r1': ['highlander'] } });
  it('ajoute le plancher à un domaine sans bonus de profil (cumul avec le peuple)', () => {
    const out = testBonusSources(['humain-r1', 'vagabond-r2'], ctxHighlander);
    // cold-resistance : peuple +3 (origine Montagnard) + plancher +1 = 4.
    expect(out.find((b) => b.domain === 'cold-resistance')?.total).toBe(4);
  });
  it('ne se cumule pas avec un bonus de profil PLUS ÉLEVÉ (le profil l’emporte)', () => {
    const out = testBonusSources(['humain-r1', 'saltimbanque-r1', 'vagabond-r2'], ctxHighlander);
    // climbing : peuple +3 + max(Éclectique 1, profil saltimbanque-r1 = 3) = 3 → 6.
    expect(out.find((b) => b.domain === 'climbing')?.total).toBe(6);
  });
  it('PRIME (max) sur un bonus de profil plus faible — cas hybride', () => {
    // Hybride : assassin (voleur) au rang 2 → stealth +4 (profil). 4 voies de barde au rang 4
    // → Éclectique = 1 + 4 = 5. Sur stealth : max(5, 4) = 5 (Éclectique l'emporte).
    const ids = ['vagabond-r2', 'vagabond-r4', 'escrime-r4', 'musicien-r4', 'saltimbanque-r4', 'assassin-r1', 'assassin-r2'];
    const stealth = testBonusSources(ids, ctx()).find((b) => b.domain === 'stealth');
    expect(stealth?.total).toBe(5);
    expect(stealth?.sources.some((s) => s.name === 'Éclectique')).toBe(true);
  });
});

describe('aggregateImmunities (Liberté d’action, PER-103)', () => {
  it('agrège les immunités d’une capacité, dans l’ordre du catalogue', () => {
    const src = [{ featureId: 'saltimbanque-r4', name: "Liberté d'action" }];
    expect(aggregateImmunities(['saltimbanque-r4'])).toEqual([
      { id: 'fear', label: 'Peur', sources: src },
      { id: 'mind-control', label: 'Charme / possession', sources: src },
      { id: 'slowed', label: 'Ralenti', sources: src },
      { id: 'immobilized', label: 'Immobilisé', sources: src },
    ]);
  });
  it('vide sans capacité d’immunité', () => {
    expect(aggregateImmunities(['escrime-r1'])).toEqual([]);
  });
});

describe('featureModSources', () => {
  it('marque les contributions conditionnelles actives', () => {
    const sources = featureModSources(['rage-r3'], ctx({ toggles: { 'rage-r3': [true] } }));
    expect(sources.def).toEqual([
      { featureId: 'rage-r3', name: 'Rage du berserk', value: -2, conditional: true },
    ]);
  });

  it("n'inclut pas une contribution conditionnelle inactive", () => {
    expect(featureModSources(['rage-r3'], ctx())).toEqual({});
  });
});

describe('pathRanksFromFeatures', () => {
  it('retient le rang le plus élevé par voie', () => {
    expect(
      pathRanksFromFeatures(['combat-a-deux-armes-r2', 'combat-a-deux-armes-r5', 'rage-r3']),
    ).toEqual({ 'combat-a-deux-armes': 5, rage: 3 });
  });
});

describe('interrupteurs des effets conditionnels', () => {
  it('liste les effets conditionnels avec leur index et libellé', () => {
    // Parade croisée porte DEUX interrupteurs (PER-109) : le bonus de base et son doublement.
    const entries = conditionalEffectsOf('combat-a-deux-armes-r2');
    expect(entries).toHaveLength(2);
    expect(entries[0].index).toBe(0);
    expect(entries[0].effect.activation.label).toBe('une arme dans chaque main');
    expect(entries[1].index).toBe(1);
    expect(entries[1].effect.activation.label).toBe("bonus doublé (renonce à l'attaque secondaire)");
  });

  it('renvoie une liste vide pour une capacité sans effet conditionnel', () => {
    expect(conditionalEffectsOf('air-r1')).toEqual([]);
    expect(conditionalEffectsOf('brute-r1')).toEqual([]);
    expect(conditionalEffectsOf('id-inexistant')).toEqual([]);
  });

  it('conditionalEffectBonuses résout les bonus courants (pour l’affichage)', () => {
    // Rage du berserk : -2 DEF, constant.
    expect(conditionalEffectBonuses(charWith({}), 'rage-r3', 0)).toEqual([{ stat: 'def', value: -2 }]);
    // Parade croisée : +1 au rang 2 de la voie, +2 au rang 5 (selon featureIds).
    const rk2 = { featureIds: ['combat-a-deux-armes-r2'] } as Character;
    const rk5 = { featureIds: ['combat-a-deux-armes-r2', 'combat-a-deux-armes-r5'] } as Character;
    expect(conditionalEffectBonuses(rk2, 'combat-a-deux-armes-r2', 0)).toEqual([{ stat: 'def', value: 1 }]);
    expect(conditionalEffectBonuses(rk5, 'combat-a-deux-armes-r2', 0)).toEqual([{ stat: 'def', value: 2 }]);
    // Familier : un seul effet, DEUX bonus résolus (init + def).
    expect(conditionalEffectBonuses(charWith({}), 'magie-universelle-r2', 0)).toEqual([
      { stat: 'initiative', value: 2 },
      { stat: 'def', value: 2 },
    ]);
    // Index ne pointant pas un effet conditionnel → null.
    expect(conditionalEffectBonuses(charWith({}), 'air-r1', 0)).toBeNull();
  });

  it('Familier : « familier en vue » (index 0) pilote +2 Init. ET +2 DEF (marqueur d’invocation à part)', () => {
    // Deux effets conditionnels depuis PER-235 : index 0 « familier en vue » (bonus DEF/Init.),
    // index 1 « Familier invoqué » (marqueur d'invocation temporaire, sans bonus).
    expect(conditionalEffectsOf('magie-universelle-r2')).toHaveLength(2);
    // Seul l'index 0 porte les bonus ; le marqueur d'invocation (index 1) n'ajoute rien.
    expect(modsFromFeatures(['magie-universelle-r2'], ctx({ toggles: { 'magie-universelle-r2': [true] } }))).toEqual({
      initiative: 2,
      def: 2,
    });
    expect(modsFromFeatures(['magie-universelle-r2'], ctx({ toggles: { 'magie-universelle-r2': [false, true] } }))).toEqual({});
    expect(modsFromFeatures(['magie-universelle-r2'], ctx())).toEqual({});
  });

  it("isEffectActive suit l'interrupteur, sinon l'état par défaut", () => {
    expect(isEffectActive(charWith({}), 'rage-r3', 0)).toBe(false);
    expect(isEffectActive(charWith({ 'rage-r3': [true] }), 'rage-r3', 0)).toBe(true);
  });

  it('setEffectToggle fixe une case sans muter le personnage', () => {
    // primitif-r1 (Proche de la nature), effet 1 : interrupteur conditionnel « en milieu naturel »
    // SANS exclusion mutuelle ni désactivation → aucune cascade ; le tableau est complété jusqu'à
    // l'index visé (effet 0 = bonus plat de PV, non basculable → false).
    const next = setEffectToggle(charWith({}), 'primitif-r1', 1, true);
    expect(next).toEqual({ 'primitif-r1': [false, true] });
  });

  it('pruneEffectToggles retire les interrupteurs orphelins', () => {
    expect(pruneEffectToggles({ a: [true], b: [false] }, ['a'])).toEqual({ a: [true] });
  });
});

describe('effectContext', () => {
  it('extrait niveau, caractéristiques et interrupteurs du personnage', () => {
    const c = charWith({ 'rage-r3': [true] });
    expect(effectContext(c)).toEqual({
      level: 5,
      abilities: c.abilities,
      toggles: { 'rage-r3': [true] },
      featureChoices: {},
      // Mapping emprunt → voie A (PER-73) : vide ici (aucune capacité empruntée).
      borrowedHostPaths: new Map(),
      // Armure réellement portée (PER-132) : aucune ici (personnage minimal sans équipement).
      armorWorn: false,
      // Armure lourde portée (PER-236) : aucune non plus.
      heavyArmorWorn: false,
    });
  });
});

describe('capacité empruntée : rang de la voie A + domination (PER-73)', () => {
  // Demi-orc barbare : voie de peuple (A) à 5/5 ; demi-orc-r2 emprunte bouclier-r1 (guerrier),
  // qui donne un bonus de compétence en vigilance « rang + 2 ». Le `rang` doit être celui de la
  // VOIE A (peuple, 5) → 7, pas le rang d'origine de bouclier-r1 (1 → 3).
  const ranks = (path: string, n: number) => Array.from({ length: n }, (_, i) => `${path}-r${i + 1}`);
  const build = (featureIds: string[]): Character => ({
    ...charWith({}),
    level: 20,
    featureIds,
    featureChoices: { 'demi-orc-r2': ['bouclier-r1'] },
  });

  it('résout le rang de la capacité empruntée sur la voie A (bouclier-r1 → rang 5 → +7)', () => {
    const c = build(ranks('demi-orc', 5));
    const mods = effectiveFeatureIdsForMods(c);
    expect(mods).toContain('bouclier-r1');
    const vig = testBonusSources(mods, effectContext(c)).find((b) => b.domain === 'vigilance');
    expect(vig?.total).toBe(7);
    expect(vig?.sources).toEqual([
      { featureId: 'bouclier-r1', name: 'Protéger un allié', category: 'class', value: 7 },
    ]);
  });

  it('marque l’emprunt comme DOMINÉ quand une vraie voie de profil l’égale (Vigilance, primitif-r3)', () => {
    const c = build([...ranks('demi-orc', 5), ...ranks('primitif', 5)]);
    const vig = testBonusSources(effectiveFeatureIdsForMods(c), effectContext(c)).find(
      (b) => b.domain === 'vigilance',
    );
    expect(vig?.total).toBe(7); // pas de cumul : max par catégorie « profil »
    expect(vig?.sources.map((s) => s.featureId)).toEqual(['primitif-r3']);
    expect(vig?.dominated).toEqual([
      {
        source: { featureId: 'bouclier-r1', name: 'Protéger un allié', category: 'class', value: 7 },
        dominatedBy: { featureId: 'primitif-r3', name: 'Vigilance', category: 'class', value: 7 },
      },
    ]);
  });
});

describe('abilityTestBonusSources — buff conditionnel aux tests de carac (Bénédiction, priere-r1)', () => {
  // L'effet conditionnel de Bénédiction est le 2e (index 1) : test-bonus puis conditional.
  const ON = (toggles: Record<string, boolean[]>): EffectContext => ctx({ toggles });

  it('interrupteur éteint ou sans contexte → aucun buff', () => {
    expect(abilityTestBonusSources(['priere-r1'])).toEqual([]);
    expect(abilityTestBonusSources(['priere-r1'], ctx())).toEqual([]);
  });

  it('interrupteur allumé → +1 aux tests de carac au rang 1 de la voie', () => {
    expect(abilityTestBonusSources(['priere-r1'], ON({ 'priere-r1': [false, true] }))).toEqual([
      { featureId: 'priere-r1', name: 'Bénédiction', value: 1 },
    ]);
  });

  it('passe à +2 quand la voie de la prière atteint le rang 5', () => {
    expect(
      abilityTestBonusSources(['priere-r1', 'priere-r5'], ON({ 'priere-r1': [false, true] })),
    ).toEqual([{ featureId: 'priere-r1', name: 'Bénédiction', value: 2 }]);
  });
});

describe('modificateurs permanents de caractéristiques (ability-bonus)', () => {
  it('aucune capacité → aucun modificateur', () => {
    expect(abilityModsFromFeatures([])).toEqual({});
  });

  it('agrège le +1 de carac (Endurer/metal-r5 : +1 CON, Perception héroïque/divination-r4 : +1 PER)', () => {
    expect(abilityModsFromFeatures(['metal-r5'])).toEqual({ CON: 1 });
    expect(abilityModsFromFeatures(['divination-r4'])).toEqual({ PER: 1 });
  });

  it('cumule deux sources sur la même carac (metal-r5 + sombre-magie-r5 : +2 CON)', () => {
    expect(abilityModsFromFeatures(['metal-r5', 'sombre-magie-r5'])).toEqual({ CON: 2 });
  });

  it('détaille les capacités sources (pour le détail de la carac)', () => {
    expect(abilityModSources(['metal-r5']).CON).toEqual([{ featureId: 'metal-r5', name: 'Endurer', value: 1 }]);
  });
});

describe('dés bonus permanents aux tests (ability-bonus-die)', () => {
  it('signale la carac et nomme la capacité source', () => {
    expect(abilityBonusDiceFromFeatures(['sombre-magie-r5'])).toEqual({ CON: ['Pacte ténébreux'] });
  });

  it('aucune capacité concernée → vide', () => {
    expect(abilityBonusDiceFromFeatures(['air-r1'])).toEqual({});
  });
});

describe('ability-bonus-die-from-choice — Combattant héroïque (rôdeur, PER-110)', () => {
  it('choix AGI → +1 AGI ET dé bonus aux tests d’AGI', () => {
    const choices = { 'combat-a-deux-armes-r4': ['AGI'] };
    expect(abilityModsFromFeatures(['combat-a-deux-armes-r4'], choices)).toEqual({ AGI: 1 });
    expect(abilityBonusDiceFromFeatures(['combat-a-deux-armes-r4'], choices)).toEqual({
      AGI: ['Combattant héroïque'],
    });
  });

  it('choix FOR → +1 FOR mais AUCUN dé bonus (onlyIfAbility: AGI)', () => {
    const choices = { 'combat-a-deux-armes-r4': ['FOR'] };
    expect(abilityModsFromFeatures(['combat-a-deux-armes-r4'], choices)).toEqual({ FOR: 1 });
    expect(abilityBonusDiceFromFeatures(['combat-a-deux-armes-r4'], choices)).toEqual({});
  });

  it('choix non fait → ni +1 ni dé bonus', () => {
    expect(abilityBonusDiceFromFeatures(['combat-a-deux-armes-r4'], {})).toEqual({});
  });
});

describe('optionStatBonusSources — Éclaireur (rôdeur, PER-111) : +1 PC ou +1 DR', () => {
  it('option « +1 DR » → recoveryDiceCount +1 et luckPoints −1', () => {
    const out = optionStatBonusSources(['traqueur-r1'], ctx({ featureChoices: { 'traqueur-r1': ['take-recovery'] } }));
    expect(out).toEqual([
      { stat: 'recoveryDiceCount', source: { featureId: 'traqueur-r1', name: 'Éclaireur', value: 1 } },
      { stat: 'luckPoints', source: { featureId: 'traqueur-r1', name: 'Éclaireur', value: -1 } },
    ]);
    // Et l'agrégat `modsFromFeatures` reflète l'échange.
    const mods = modsFromFeatures(['traqueur-r1'], ctx({ featureChoices: { 'traqueur-r1': ['take-recovery'] } }));
    expect(mods.recoveryDiceCount).toBe(1);
    expect(mods.luckPoints).toBe(-1);
  });

  it('option « garder PC » ou aucun choix → aucun bonus de stat dérivée', () => {
    expect(optionStatBonusSources(['traqueur-r1'], ctx({ featureChoices: { 'traqueur-r1': ['keep-luck'] } }))).toEqual([]);
    expect(optionStatBonusSources(['traqueur-r1'], ctx())).toEqual([]);
  });
});

describe('activeConditionalTestDice — Travail d’équipe (rôdeur, PER-108)', () => {
  const charDie = (active: boolean): Character =>
    ({
      ...charWith(active ? { 'compagnon-animal-r2': [true] } : {}),
      featureIds: ['compagnon-animal-r2'],
    }) as Character;

  it('interrupteur actif → dé bonus aux tests de pister et de vigilance', () => {
    const dice = activeConditionalTestDice(charDie(true));
    expect(dice.get('tracking')).toEqual(["Travail d'équipe"]);
    expect(dice.get('vigilance')).toEqual(["Travail d'équipe"]);
  });

  it('interrupteur inactif → aucun dé bonus', () => {
    expect(activeConditionalTestDice(charDie(false)).size).toBe(0);
  });
});

describe('test-bonus CONDITIONNEL « en milieu naturel » (rôdeur, PER-117)', () => {
  it('Survie : interrupteur actif → escalade et survie bonifiées (rang + 2 = 3 au rang 1)', () => {
    const on = ctx({ toggles: { 'survie-r1': [true] } });
    const bonuses = testBonusSources(['survie-r1'], on);
    expect(bonuses.find((b) => b.domain === 'climbing')?.total).toBe(3);
    expect(bonuses.find((b) => b.domain === 'survival')?.total).toBe(3);
  });

  it('Survie : interrupteur inactif → aucun bonus de compétence', () => {
    expect(testBonusSources(['survie-r1'], ctx()).length).toBe(0);
  });

  it('Éclaireur : interrupteur actif → discrétion, vigilance et pister bonifiées', () => {
    const on = ctx({ toggles: { 'traqueur-r1': [true] } });
    const domains = testBonusSources(['traqueur-r1'], on).map((b) => b.domain);
    expect(domains).toEqual(expect.arrayContaining(['stealth', 'vigilance', 'tracking']));
  });
});

describe('cascade de désactivation intra-capacité (Parade croisée, PER-109)', () => {
  const both = charWith({ 'combat-a-deux-armes-r2': [true, true] });

  it('couper le 1ᵉʳ interrupteur coupe aussi le 2ᵉ (bonus doublé)', () => {
    const next = setEffectToggle(both, 'combat-a-deux-armes-r2', 0, false);
    expect(next['combat-a-deux-armes-r2']).toEqual([false, false]);
  });

  it('couper le 2ᵉ interrupteur laisse le 1ᵉʳ actif (sens unique)', () => {
    const next = setEffectToggle(both, 'combat-a-deux-armes-r2', 1, false);
    expect(next['combat-a-deux-armes-r2']).toEqual([true, false]);
  });
});

describe('creatureBonusDiceForPath — dés bonus du golem selon les options retenues', () => {
  const golemChar = (selection: string[]): Character =>
    ({
      featureIds: ['golem-r2', 'golem-r5'],
      featureChoices: { 'golem-r5': [selection] },
    }) as unknown as Character;

  it("« Forme de félin » octroie un dé bonus en AGI au golem", () => {
    expect(creatureBonusDiceForPath('golem', golemChar(['feline-form']))).toEqual(new Set(['AGI']));
  });

  it('« Puissant » → FOR ; les deux ensemble → AGI + FOR', () => {
    expect(creatureBonusDiceForPath('golem', golemChar(['mighty']))).toEqual(new Set(['FOR']));
    expect(creatureBonusDiceForPath('golem', golemChar(['feline-form', 'mighty']))).toEqual(new Set(['AGI', 'FOR']));
  });

  it('une option sans dé bonus → aucun dé', () => {
    expect(creatureBonusDiceForPath('golem', golemChar(['armor']))).toEqual(new Set());
  });
});

describe('hpAbilitySwapSources — Grosse tête (golem-r1) : PV basés sur l’INT au lieu de la CON', () => {
  // Contexte de test : INT 4, CON 1 → échange net +(4 − 1) = +3 PV, une seule fois.
  const swapCtx = (over: Partial<EffectContext> = {}): EffectContext =>
    ctx({
      abilities: { AGI: 0, CON: 1, FOR: 0, PER: 0, CHA: 0, INT: 4, VOL: 0 } as Record<AbilityId, number>,
      ...over,
    });

  it('sans contexte (catalogue seul) → aucune source (dépend des caracs et du choix)', () => {
    expect(hpAbilitySwapSources(['golem-r1'])).toEqual([]);
  });

  it("option par défaut (PV sur la CON) → aucun échange", () => {
    const c = swapCtx({ featureChoices: { 'golem-r1': ['pv-from-con'] } });
    expect(hpAbilitySwapSources(['golem-r1'], c)).toEqual([]);
  });

  it("choix pas encore fait (null) → aucun échange", () => {
    const c = swapCtx({ featureChoices: { 'golem-r1': [null] } });
    expect(hpAbilitySwapSources(['golem-r1'], c)).toEqual([]);
  });

  it("PV sur l’INT → échange net +(INT − CON), une seule fois", () => {
    const c = swapCtx({ featureChoices: { 'golem-r1': ['pv-from-int'] } });
    expect(hpAbilitySwapSources(['golem-r1'], c)).toEqual([
      { featureId: 'golem-r1', name: 'Grosse tête', value: 3 },
    ]);
  });

  it('INT inférieure à la CON → remplacement appliqué tel quel (delta négatif)', () => {
    const c = swapCtx({
      abilities: { AGI: 0, CON: 4, FOR: 0, PER: 0, CHA: 0, INT: 1, VOL: 0 } as Record<AbilityId, number>,
      featureChoices: { 'golem-r1': ['pv-from-int'] },
    });
    expect(hpAbilitySwapSources(['golem-r1'], c)).toEqual([
      { featureId: 'golem-r1', name: 'Grosse tête', value: -3 },
    ]);
  });

  it('INT égale à la CON → échange net nul, source omise (pas de terme « +0 »)', () => {
    const c = ctx({
      abilities: { AGI: 0, CON: 2, FOR: 0, PER: 0, CHA: 0, INT: 2, VOL: 0 } as Record<AbilityId, number>,
      featureChoices: { 'golem-r1': ['pv-from-int'] },
    });
    expect(hpAbilitySwapSources(['golem-r1'], c)).toEqual([]);
  });

  it("s'agrège au modificateur maxHp de `modsFromFeatures`", () => {
    const c = swapCtx({ featureChoices: { 'golem-r1': ['pv-from-int'] } });
    expect(modsFromFeatures(['golem-r1'], c)).toEqual({ maxHp: 3 });
  });

  it("apparaît dans `featureModSources` sous la stat maxHp (détail de l'infobulle)", () => {
    const c = swapCtx({ featureChoices: { 'golem-r1': ['pv-from-int'] } });
    expect(featureModSources(['golem-r1'], c).maxHp).toEqual([
      { featureId: 'golem-r1', name: 'Grosse tête', value: 3 },
    ]);
  });
});

describe('testBonusSources — bonus de compétence par domaine (PER-89)', () => {
  it('aucune capacité → aucun domaine', () => {
    expect(testBonusSources([])).toEqual([]);
  });

  it('ignore les ids inconnus et les capacités sans bonus de test', () => {
    expect(testBonusSources(['id-inexistant', 'air-r1'])).toEqual([]);
  });

  it('effet statique mage : Injonction (envouteur-r1) → persuasion & séduction, +3 (profil, rang 1)', () => {
    const byDomain = Object.fromEntries(testBonusSources(['envouteur-r1']).map((r) => [r.domain, r.total]));
    expect(byDomain).toEqual({ persuasion: 3, seduction: 3 });
  });

  it('valeur de profil DYNAMIQUE : 2 + rang atteint dans la voie (envouteur au rang 5 → +7)', () => {
    // envouteur-r5 n'octroie aucun bonus de test mais porte le rang de la voie à 5.
    const res = testBonusSources(['envouteur-r1', 'envouteur-r5']);
    expect(res.find((r) => r.domain === 'persuasion')?.total).toBe(7);
  });

  it('détail de provenance : capacité + catégorie + valeur (Ténèbres → érudition occulte)', () => {
    expect(testBonusSources(['sombre-magie-r1'])).toEqual([
      {
        domain: 'occult-lore',
        total: 3,
        capped: false,
        sources: [{ featureId: 'sombre-magie-r1', name: 'Ténèbres', category: 'class', value: 3 }],
      },
    ]);
  });

  it('doublon peuple érudition : elfe haut (érudition +3) + voie du mage (érudition occulte +7) → max, +3 dominé', () => {
    // Cas UNIQUE de subsomption (PER-73) : « érudition occulte » est une spécialisation
    // d'« érudition ». Les deux bonus sont de PEUPLE → « pas de cumul d'une source identique »
    // (p.203) → max, pas de somme. mage-r5 pousse la voie du mage au rang 5 (occult-lore = 2+5 = 7).
    const res = testBonusSources(['elfe-haut-r1', 'mage-r1', 'mage-r5'], ctx());
    const occult = res.find((r) => r.domain === 'occult-lore');
    // L'érudition occulte prend le MAX (mage +7), le +3 de l'elfe haut est dominé (pas additionné).
    expect(occult?.total).toBe(7);
    expect(occult?.sources).toEqual([
      { featureId: 'mage-r1', name: 'Capacité de peuple + occultisme', category: 'ancestry', value: 7 },
    ]);
    expect(occult?.dominated).toEqual([
      {
        source: { featureId: 'elfe-haut-r1', name: 'Lumière intérieure', category: 'ancestry', value: 3 },
        dominatedBy: { featureId: 'mage-r1', name: 'Capacité de peuple + occultisme', category: 'ancestry', value: 7 },
      },
    ]);
    // L'érudition GÉNÉRALE conserve son +3 (le bonus occulte ne remonte pas vers le parent).
    expect(res.find((r) => r.domain === 'erudition')?.total).toBe(3);
    expect(res.find((r) => r.domain === 'erudition')?.dominated).toBeUndefined();
    // L'art (CHA) n'est pas concerné par la subsomption.
    expect(res.find((r) => r.domain === 'art')?.total).toBe(3);
  });

  it('elfe haut SANS voie du mage → pas de seau érudition occulte, érudition & art intacts (+3)', () => {
    const byDomain = Object.fromEntries(testBonusSources(['elfe-haut-r1']).map((r) => [r.domain, r.total]));
    expect(byDomain).toEqual({ erudition: 3, art: 3 });
  });

  it('domaines pilotés par une option (humain-r1 « Montagnard ») → escalade & résist. froid, +3 (peuple)', () => {
    const c = ctx({ featureChoices: { 'humain-r1': ['highlander'] } });
    const byDomain = Object.fromEntries(testBonusSources(['humain-r1'], c).map((r) => [r.domain, r.total]));
    expect(byDomain).toEqual({ climbing: 3, 'cold-resistance': 3 });
    const climbing = testBonusSources(['humain-r1'], c).find((r) => r.domain === 'climbing');
    expect(climbing?.sources[0]).toMatchObject({ category: 'ancestry', name: 'Diversité', value: 3 });
  });

  it('gagne-pain LIBRE (humain-r1 « Libre ») → les 2 domaines saisis reçoivent le +3 de peuple', () => {
    // Sélection custom-skill persistée en [nom, ...domaines] à l'index 1 (le choix d'origine à
    // l'index 0 vaut « custom »). Le nom est décoratif ; seuls les domaines portent le bonus.
    const c = ctx({ featureChoices: { 'humain-r1': ['custom', ['Forgeron', 'smithing', 'commerce']] } });
    const byDomain = Object.fromEntries(testBonusSources(['humain-r1'], c).map((r) => [r.domain, r.total]));
    expect(byDomain).toEqual({ smithing: 3, commerce: 3 });
    const smithing = testBonusSources(['humain-r1'], c).find((r) => r.domain === 'smithing');
    expect(smithing?.sources[0]).toMatchObject({ category: 'ancestry', name: 'Diversité', value: 3 });
  });

  it('gagne-pain LIBRE partiel (1 seul domaine saisi) → seul ce domaine est bonifié', () => {
    const c = ctx({ featureChoices: { 'humain-r1': ['custom', ['Scribe', 'erudition']] } });
    const byDomain = Object.fromEntries(testBonusSources(['humain-r1'], c).map((r) => [r.domain, r.total]));
    expect(byDomain).toEqual({ erudition: 3 });
  });

  it('origine preset retenue → une saisie « Libre » obsolète n’est PAS comptée', () => {
    // Le joueur a rebasculé sur « Montagnard » (index 0) : les domaines custom (index 1) sont
    // masqués/obsolètes → seuls ceux de Montagnard s'appliquent.
    const c = ctx({ featureChoices: { 'humain-r1': ['highlander', ['Forgeron', 'smithing', 'commerce']] } });
    const byDomain = Object.fromEntries(testBonusSources(['humain-r1'], c).map((r) => [r.domain, r.total]));
    expect(byDomain).toEqual({ climbing: 3, 'cold-resistance': 3 });
  });

  it('sans contexte, les domaines pilotés par option ne sont pas résolus', () => {
    expect(testBonusSources(['humain-r1'])).toEqual([]);
  });

  it('origine non choisie (ctx sans sélection) → aucun domaine de peuple', () => {
    expect(testBonusSources(['humain-r1'], ctx())).toEqual([]);
  });

  // NOTE cumul CROSS-CATÉGORIE + plafond +15 : non atteignable avec les seules familles
  // peuplées ici (mages = profil, humain = peuple, sans domaine commun). Couvert quand un
  // ticket de population aval ajoutera un domaine partagé entre catégories (PER-70→74).
});

describe('effectiveAbilities — saisie + modificateurs permanents de capacités', () => {
  const charWithFeatures = (
    abilities: Record<AbilityId, number>,
    featureIds: string[],
    featureChoices: Record<string, (string | string[] | null)[]> = {},
  ): Character => ({ level: 5, abilities, featureIds, featureChoices, effectToggles: {} }) as Character;

  const ABILITIES_3 = { AGI: 0, CON: 3, FOR: 0, PER: 0, CHA: 0, INT: 3, VOL: 0 } as Record<AbilityId, number>;

  it('sans capacité à bonus → caractéristiques inchangées', () => {
    expect(effectiveAbilities(charWithFeatures(ABILITIES_3, ['air-r1']))).toEqual(ABILITIES_3);
  });

  it('replie le +1 CON permanent (Endurer/metal-r5) sur la saisie', () => {
    const eff = effectiveAbilities(charWithFeatures(ABILITIES_3, ['metal-r5']));
    expect(eff.CON).toBe(4);
    expect(eff.INT).toBe(3);
  });

  it('effectContext expose les caractéristiques effectives', () => {
    expect(effectContext(charWithFeatures(ABILITIES_3, ['metal-r5'])).abilities.CON).toBe(4);
  });

  it("scénario test-forgesort-nain : Endurer (+1 CON) rend l'échange Grosse tête→INT non nul", () => {
    // Saisie CON 3 / INT 3 ; Endurer porte la CON effective à 4 → échange = INT 3 − CON 4 = −1.
    const c = charWithFeatures(ABILITIES_3, ['metal-r5', 'golem-r1'], { 'golem-r1': ['pv-from-int'] });
    expect(modsFromFeatures(['metal-r5', 'golem-r1'], effectContext(c)).maxHp).toBe(-1);
  });
});

describe('disabledFeatureReasons — grisage des capacités (exclusion / remplacement)', () => {
  const char = (featureIds: string[], toggles: Record<string, boolean[]> = {}): Character =>
    ({ level: 5, abilities: ctx().abilities, featureIds, effectToggles: toggles, featureChoices: {} }) as Character;

  it('Grand félin (fauve-r4) remplace définitivement la Panthère (fauve-r2)', () => {
    const reasons = disabledFeatureReasons(char(['fauve-r2', 'fauve-r4']));
    expect(reasons.get('fauve-r2')).toEqual({
      byFeatureId: 'fauve-r4',
      byFeatureName: 'Grand félin',
      kind: 'replaced',
    });
    expect(disabledFeatureIds(char(['fauve-r2', 'fauve-r4']))).toEqual(new Set(['fauve-r2']));
  });

  it('sans Grand félin, la Panthère n’est pas grisée', () => {
    expect(disabledFeatureReasons(char(['fauve-r2'])).size).toBe(0);
  });

  it('exclusion mutuelle : Aspect du démon ACTIF grise Beauté de la succube (demon-r2)', () => {
    const reasons = disabledFeatureReasons(char(['demon-r2', 'demon-r4'], { 'demon-r4': [true] }));
    expect(reasons.get('demon-r2')).toEqual({
      byFeatureId: 'demon-r4',
      byFeatureName: 'Aspect du démon',
      kind: 'excluded',
    });
  });

  it('exclusion mutuelle : interrupteur éteint → aucun grisage', () => {
    expect(disabledFeatureReasons(char(['demon-r2', 'demon-r4'])).size).toBe(0);
  });
});

describe('criticalRangeSources — plage de critique élargie (PER-133/136)', () => {
  const char = (featureIds: string[], toggles: Record<string, boolean[]> = {}): Character =>
    ({ level: 7, abilities: ctx().abilities, featureIds, effectToggles: toggles, featureChoices: {} }) as Character;

  it('Briseur d’os (brute-r5) : plage passive +1 au contact, toujours active', () => {
    expect(criticalRangeSources(char(['brute-r5']))).toEqual([
      { featureId: 'brute-r5', name: 'Briseur d’os', scope: 'melee', value: 1 },
    ]);
  });

  it('Écuyer (noblesse-r2) : plage +1 au contact, active par défaut (écuyer en vie)', () => {
    // L'interrupteur « écuyer en vie » est ACTIVÉ par défaut → plage retenue sans toggle explicite.
    const src = criticalRangeSources(char(['noblesse-r2']));
    expect(src).toEqual([{ featureId: 'noblesse-r2', name: 'Écuyer', scope: 'melee', value: 1 }]);
  });

  it('Écuyer (noblesse-r2) : écuyer mort (interrupteur coupé) → plus de plage de critique', () => {
    // Le joueur coupe l'interrupteur (écuyer mort) → `criticalRangeSources` cesse de retenir la plage.
    expect(criticalRangeSources(char(['noblesse-r2'], { 'noblesse-r2': [false] }))).toEqual([]);
  });

  it('Tir précis (precision-r3) : plage à distance SCALANTE — +1 au rang 3, +2 au rang 5 de la voie', () => {
    expect(criticalRangeSources(char(['precision-r3']))).toEqual([
      { featureId: 'precision-r3', name: 'Tir précis', scope: 'ranged', value: 1 },
    ]);
    // Rang 5 atteint dans la voie de précision → la plage passe à 18-20 (value 2).
    expect(criticalRangeSources(char(['precision-r3', 'precision-r5']))).toContainEqual({
      featureId: 'precision-r3',
      name: 'Tir précis',
      scope: 'ranged',
      value: 2,
    });
  });

  it('Science du critique (maitre-d-armes-r2) : AUTO selon l’arme de prédilection portée (PER-136)', () => {
    // Guerrier maître d'armes ayant choisi « épées » comme catégorie de prédilection (maitre-d-armes-r1).
    const guerrier = (equipment: EquipmentLine[]): Character =>
      ({
        level: 7,
        abilities: ctx().abilities,
        featureIds: ['maitre-d-armes-r1', 'maitre-d-armes-r2'],
        effectToggles: {},
        featureChoices: { 'maitre-d-armes-r1': [['swords']] },
        equipment,
      }) as unknown as Character;
    // Épée longue (famille 'swords') en main → plage +1 activée automatiquement, sans interrupteur.
    expect(
      criticalRangeSources(guerrier([{ itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } }])),
    ).toEqual([{ featureId: 'maitre-d-armes-r2', name: 'Science du critique', scope: 'melee', value: 1 }]);
    // Masse (famille 'maces', NON choisie) en main → aucune plage.
    expect(criticalRangeSources(guerrier([{ itemId: 'masse', quantity: 1, worn: { slot: 'mainHand' } }]))).toEqual([]);
    // Aucune arme de contact portée → aucune plage (l'arme de prédilection n'est pas en main).
    expect(criticalRangeSources(guerrier([]))).toEqual([]);
  });

  it('Science du critique de l’arquebusier (maitre-des-arbaletes-r2) : AUTO dès qu’une ARBALÈTE est portée (PER-236)', () => {
    // Arbalète légère (rangedKind 'crossbow') en main → plage +1 À DISTANCE activée automatiquement.
    expect(
      criticalRangeSources(
        charEquip(['maitre-des-arbaletes-r2'], [{ itemId: 'arbalete-legere', quantity: 1, worn: { slot: 'mainHand' } }]),
      ),
    ).toEqual([{ featureId: 'maitre-des-arbaletes-r2', name: 'Science du critique', scope: 'ranged', value: 1 }]);
    // Arc (sous-type 'bow', pas 'crossbow') en main → aucune plage (le sous-type ne correspond pas).
    expect(
      criticalRangeSources(
        charEquip(['maitre-des-arbaletes-r2'], [{ itemId: 'arc-court', quantity: 1, worn: { slot: 'mainHand' } }]),
      ),
    ).toEqual([]);
    // Arbalète RANGÉE (non portée en main) → aucune plage : la puce ne dépend que du port.
    expect(
      criticalRangeSources(charEquip(['maitre-des-arbaletes-r2'], [{ itemId: 'arbalete-legere', quantity: 1 }])),
    ).toEqual([]);
    // Aucune arme portée → aucune plage.
    expect(criticalRangeSources(charEquip(['maitre-des-arbaletes-r2'], []))).toEqual([]);
  });

  it('Archer émérite de l’elfe (elfe-sylvain-r3) : AUTO dès qu’un ARC est porté ; jamais avec une arbalète (PER-236)', () => {
    // Arc long (rangedKind 'bow') en main → plage +1 à distance activée automatiquement.
    expect(
      criticalRangeSources(
        charEquip(['elfe-sylvain-r3'], [{ itemId: 'arc-long', quantity: 1, worn: { slot: 'mainHand' } }]),
      ),
    ).toEqual([{ featureId: 'elfe-sylvain-r3', name: 'Archer émérite', scope: 'ranged', value: 1 }]);
    // Arbalète (sous-type 'crossbow', pas 'bow') en main → aucune plage.
    expect(
      criticalRangeSources(
        charEquip(['elfe-sylvain-r3'], [{ itemId: 'arbalete-legere', quantity: 1, worn: { slot: 'mainHand' } }]),
      ),
    ).toEqual([]);
  });

  it('Frappe chirurgicale (spadassin-r3) : AUTO +2 (18-20) dès qu’une arme LÉGÈRE est portée (PER-136)', () => {
    // Rapière (arme légère) en main → +2 automatiquement (+ sa plage intrinsèque d'arme, PER-225).
    expect(
      criticalRangeSources(
        charEquip(['spadassin-r3'], [{ itemId: 'rapiere', quantity: 1, worn: { slot: 'mainHand' } }]),
      ),
    ).toContainEqual({ featureId: 'spadassin-r3', name: 'Frappe chirurgicale', scope: 'melee', value: 2 });
    // Épée longue (à une main, NON légère) en main → aucune plage de Frappe.
    expect(
      criticalRangeSources(
        charEquip(['spadassin-r3'], [{ itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } }]),
      ),
    ).toEqual([]);
    // Aucune arme portée → aucune plage.
    expect(criticalRangeSources(charEquip(['spadassin-r3'], []))).toEqual([]);
  });

  it('Morsure du serpent (maitrise-r3) : IGNORÉE par la vue « arme » (rendue par la vue mains nues, PER-136)', () => {
    // La plage à mains nues (weaponCondition unarmed) n'apparaît jamais dans `criticalRangeSources` —
    // même sans arme portée — car elle est décrite par `unarmedStrike` (vue mains nues de la carte).
    expect(criticalRangeSources(char(['maitrise-r3']))).toEqual([]);
  });

  // --- PER-225 : plage de critique INTRINSÈQUE de l'arme ÉQUIPÉE ---
  const charEquip = (
    featureIds: string[],
    equipment: EquipmentLine[],
    toggles: Record<string, boolean[]> = {},
  ): Character =>
    ({
      level: 7,
      abilities: ctx().abilities,
      featureIds,
      effectToggles: toggles,
      featureChoices: {},
      equipment,
    }) as Character;

  it('Rapière tenue en main : plage intrinsèque 19-20 au contact (source d’arme, sans capacité)', () => {
    const src = criticalRangeSources(
      charEquip([], [{ itemId: 'rapiere', quantity: 1, worn: { slot: 'mainHand' } }]),
    );
    expect(src).toEqual([{ name: 'Rapière', scope: 'melee', value: 1 }]);
  });

  it('Rapière RANGÉE (non portée en main) : aucune plage — la puce ne dépend que du port', () => {
    expect(criticalRangeSources(charEquip([], [{ itemId: 'rapiere', quantity: 1 }]))).toEqual([]);
  });

  it('Vivelame tenue à deux mains : plage intrinsèque 19-20 au contact', () => {
    const src = criticalRangeSources(
      charEquip([], [{ itemId: 'vivelame', quantity: 1, worn: { slot: 'mainHand', grip: 'twoHands' } }]),
    );
    expect(src).toEqual([{ name: 'Vivelame', scope: 'melee', value: 1 }]);
  });

  it('Épée longue (sans critique intrinsèque) tenue en main : aucune plage d’arme', () => {
    expect(
      criticalRangeSources(charEquip([], [{ itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } }])),
    ).toEqual([]);
  });

  it('CUMUL (PER-225/136) : voleur/spadassin demi-orc portant une rapière → arme + Frappe chirurgicale + Critique brutal', () => {
    // Rapière (arme légère) tenue en main → Frappe chirurgicale AUTO (arme légère, PER-136) + plage
    // intrinsèque de la rapière (PER-225) + Critique brutal du demi-orc (passif). Les trois sources
    // melee remontent, prêtes au cumul — sans aucun interrupteur manuel.
    const src = criticalRangeSources(
      charEquip(['spadassin-r3', 'demi-orc-r3'], [{ itemId: 'rapiere', quantity: 1, worn: { slot: 'mainHand' } }]),
    );
    expect(src).toContainEqual({ featureId: 'spadassin-r3', name: 'Frappe chirurgicale', scope: 'melee', value: 2 });
    expect(src).toContainEqual({ featureId: 'demi-orc-r3', name: 'Critique brutal', scope: 'melee', value: 1 });
    expect(src).toContainEqual({ name: 'Rapière', scope: 'melee', value: 1 });
    // Total cumulé au contact = 2 + 1 + 1 = 4 (borné à 16-20 au formatage). Pas de double comptage.
    const total = src.filter((s) => s.scope === 'melee').reduce((acc, s) => acc + s.value, 0);
    expect(total).toBe(4);
  });
});

describe('damageReductionSources — réduction de dégâts (PER-137)', () => {
  const char = (
    featureIds: string[],
    over: Partial<Character> = {},
  ): Character =>
    ({
      level: 7,
      abilities: ctx().abilities,
      featureIds,
      effectToggles: {},
      featureChoices: {},
      ...over,
    }) as Character;

  it('Endurer (metal-r5) : RD passive ÷2 sur le feu, toujours active', () => {
    expect(damageReductionSources(char(['metal-r5']))).toEqual([
      { featureId: 'metal-r5', name: 'Endurer', reduction: { kind: 'divide', value: 2, scopes: ['fire'] } },
    ]);
  });

  it('Fils du roc (nain-r4) : RD plate scalante par niveau — 2, puis 3 au niveau 10', () => {
    const at9 = damageReductionSources(char(['nain-r4'], { level: 9 }));
    expect(at9[0].reduction).toMatchObject({ kind: 'flat', value: 2 });
    const at10 = damageReductionSources(char(['nain-r4'], { level: 10 }));
    expect(at10[0].reduction).toMatchObject({ kind: 'flat', value: 3 });
  });

  it('Résistance au feu (prestige-chevalier-dragon-r5) : RD feu scalante par rang de voie — 5, puis 10 au rang 7', () => {
    const r5 = damageReductionSources(char(['prestige-chevalier-dragon-r5']));
    expect(r5[0].reduction).toMatchObject({ kind: 'flat', value: 5, scopes: ['fire'] });
    const r7 = damageReductionSources(char(['prestige-chevalier-dragon-r5', 'prestige-chevalier-dragon-r7']));
    expect(r7[0].reduction).toMatchObject({ kind: 'flat', value: 10, scopes: ['fire'] });
  });

  it('Ascendance draconique (prestige-sang-dragon-r4) : RD sur l’énergie du CHOIX PERMANENT, 5 puis 10 au rang 8', () => {
    // Aucune énergie choisie (choix de construction non fait) → pas de RD.
    expect(damageReductionSources(char(['prestige-sang-dragon-r4']))).toEqual([]);
    // Énergie « feu » retenue au choix permanent (featureChoices), rang 4 de la voie → RD plate 5 sur le feu.
    const r4 = damageReductionSources(
      char(['prestige-sang-dragon-r4'], { featureChoices: { 'prestige-sang-dragon-r4': ['fire'] } }),
    );
    expect(r4).toHaveLength(1);
    expect(r4[0].reduction).toMatchObject({ kind: 'flat', value: 5, scopes: ['fire'] });
    // Rang 8 de la voie (Écailles acquise) → la RD du r4 passe à 10 ; Écailles reste masquée
    // (conditionnelle « sous la moitié des PV », interrupteur éteint) → pas de double comptage.
    const r8 = damageReductionSources(
      char(['prestige-sang-dragon-r4', 'prestige-sang-dragon-r8'], {
        featureChoices: { 'prestige-sang-dragon-r4': ['cold'] },
      }),
    );
    expect(r8).toHaveLength(1);
    expect(r8[0].reduction).toMatchObject({ kind: 'flat', value: 10, scopes: ['cold'] });
    // Choix invalide → ignoré (pas de RD).
    expect(
      damageReductionSources(
        char(['prestige-sang-dragon-r4'], { featureChoices: { 'prestige-sang-dragon-r4': ['xyz'] } }),
      ),
    ).toEqual([]);
  });

  it('Magnétisme (metal-r3) : RD conditionnelle masquée tant que l’interrupteur est éteint', () => {
    expect(damageReductionSources(char(['metal-r3']))).toEqual([]);
    const on = damageReductionSources(char(['metal-r3'], { effectToggles: { 'metal-r3': [true] } }));
    expect(on[0].reduction).toMatchObject({ kind: 'divide', value: 2, scopes: ['metallic-projectile'] });
  });

  it('stackedDamageReductions : Fils du roc + Peau d’acier CUMULENT en RD 6 (tous DM) avec breakdown', () => {
    // Nain niveau 10 (Fils du roc = RD 3) + barbare Peau d’acier (RD 3), toutes deux plates sur tous
    // les DM → une seule entrée cumulée de 6, détaillant les deux capacités sources.
    const stacked = stackedDamageReductions(char(['nain-r4', 'pagne-r5'], { level: 10 }));
    const flatAll = stacked.find((r) => r.kind === 'flat' && r.scope === undefined);
    expect(flatAll?.total).toBe(6);
    expect(flatAll?.sources).toEqual(
      expect.arrayContaining([
        { featureId: 'nain-r4', name: 'Fils du roc', value: 3 },
        { featureId: 'pagne-r5', name: 'Peau d’acier', value: 3 },
      ]),
    );
  });

  it('Insensible au feu (prestige-elementaire-du-feu-r6) : deux entrées — immunité feu + ÷2 froid', () => {
    const src = damageReductionSources(char(['prestige-elementaire-du-feu-r6']));
    expect(src.map((s) => s.reduction)).toEqual([
      { kind: 'immunity', scopes: ['fire'] },
      { kind: 'divide', value: 2, scopes: ['cold'] },
    ]);
  });

  it('Maîtrise des éléments (magie-elementaire-r2) : RD sur l’élément CHOISI à la table, masquée sans choix', () => {
    // Aucun élément choisi → pas de RD affichée.
    expect(damageReductionSources(char(['magie-elementaire-r2']))).toEqual([]);
    // Élément « feu » choisi (état de jeu effectInputs) → RD plate rang+2 (= 4 au rang 2) sur le feu.
    const fire = damageReductionSources(
      char(['magie-elementaire-r2'], { effectInputs: { 'magie-elementaire-r2': 'fire' } }),
    );
    expect(fire).toHaveLength(1);
    expect(fire[0].reduction).toMatchObject({ kind: 'flat', value: 4, scopes: ['fire'] });
    // Choix invalide → ignoré (pas de RD).
    expect(
      damageReductionSources(char(['magie-elementaire-r2'], { effectInputs: { 'magie-elementaire-r2': 'xyz' } })),
    ).toEqual([]);
  });

  it('Invulnérable (energie-vitale) : poison/maladie en ÷2 au rang 3, en IMMUNITÉ au rang 5', () => {
    const r3 = damageReductionSources(char(['energie-vitale-r3']));
    // Rang 3 : ÷2 éléments + ÷2 poison/maladie ; pas encore d'immunité.
    expect(r3.map((s) => s.reduction.kind)).toEqual(['divide', 'divide']);
    expect(r3.some((s) => s.reduction.kind === 'immunity')).toBe(false);

    const r5 = damageReductionSources(char(['energie-vitale-r3', 'energie-vitale-r5']));
    // Rang 5 : ÷2 éléments + IMMUNITÉ poison/maladie (l'entrée ÷2 poison/maladie disparaît).
    const immunity = r5.find((s) => s.reduction.kind === 'immunity');
    expect(immunity?.reduction.scopes).toEqual(['poison', 'disease']);
    expect(r5.filter((s) => s.reduction.kind === 'divide').flatMap((s) => s.reduction.scopes ?? [])).toEqual([
      'fire',
      'cold',
      'lightning',
      'acid',
    ]);
  });
});

describe('resetUsageCounters — réinitialisation par repos (PER-151)', () => {
  it('repos long (day) réinitialise les compteurs « day » (défaut), pas les « manual »', () => {
    // rage-r3 : resetOn par défaut ('day') ; fauve-r5 : resetOn 'manual'.
    const next = resetUsageCounters(
      { rage: 0, 'fauve-r5': 2 },
      ['rage-r3', 'fauve-r5'],
      new Set(['day', 'short-rest', 'combat'] as const),
    );
    expect(next).toEqual({ 'fauve-r5': 2 });
  });

  it('repos court (short-rest/combat) ne touche pas un compteur « day »', () => {
    const next = resetUsageCounters({ rage: 0 }, ['rage-r3'], new Set(['short-rest', 'combat'] as const));
    expect(next).toEqual({ rage: 0 });
  });

  it('préserve les clés inconnues (capacité non possédée)', () => {
    expect(resetUsageCounters({ mystere: 1 }, ['rage-r3'], new Set(['day'] as const))).toEqual({ mystere: 1 });
  });

  it('PER-146 : le repos long réinitialise le compteur synthétique du gnome (« Don étrange »)', () => {
    // Compteur synthétique 1/jour (clé partagée dédiée), non déclaré sur une Feature : le reset
    // journalier doit tout de même le vider dès que « Don étrange » (gnome-r1) est acquise.
    const next = resetUsageCounters(
      { 'gnome-don-etrange-armor': 0 },
      ['gnome-r1'],
      new Set(['day', 'short-rest', 'combat'] as const),
    );
    expect(next).toEqual({});
  });

  it('PER-146 : un repos court ne réinitialise PAS le compteur synthétique du gnome (cycle « day »)', () => {
    const next = resetUsageCounters(
      { 'gnome-don-etrange-armor': 0 },
      ['gnome-r1'],
      new Set(['short-rest', 'combat'] as const),
    );
    expect(next).toEqual({ 'gnome-don-etrange-armor': 0 });
  });
});

describe('usageCounterMaximum — max scalant par paliers de rang (PER-159)', () => {
  const feature = featureById.get('deplacement-r2')!;
  const counter = feature.usageCounter!;
  const base = { level: 5, usageCounters: {} } as Character;

  it('Réflexes félins : 1 usage/combat, puis 2 au rang 5 de la voie', () => {
    expect(usageCounterMaximum(counter, { ...base, featureIds: ['deplacement-r2'] }, feature)).toBe(1);
    expect(
      usageCounterMaximum(counter, { ...base, featureIds: ['deplacement-r2', 'deplacement-r4'] }, feature),
    ).toBe(1);
    expect(
      usageCounterMaximum(counter, { ...base, featureIds: ['deplacement-r2', 'deplacement-r5'] }, feature),
    ).toBe(2);
  });
});

describe('resetUsageCounters — verrou « oncePerShortRest » (PER-160)', () => {
  // meditation-r2 : pool 'meditation-r2' (3/jour) + verrou 'meditation-r2::sr-lock' (oncePerShortRest).
  const ids = ['meditation-r2'];
  const lock = 'meditation-r2::sr-lock'; // = shortRestLockKey('meditation-r2')

  it('repos court lève le verrou mais garde le pool quotidien', () => {
    const next = resetUsageCounters(
      { 'meditation-r2': 0, [lock]: 1 },
      ids,
      new Set(['short-rest', 'combat'] as const),
    );
    expect(next).toEqual({ 'meditation-r2': 0 });
  });

  it('repos long lève le verrou ET réinitialise le pool', () => {
    const next = resetUsageCounters(
      { 'meditation-r2': 0, [lock]: 1 },
      ids,
      new Set(['day', 'short-rest', 'combat'] as const),
    );
    expect(next).toEqual({});
  });
});

describe('escalatingManaSurcharge — Foudres divines (foi-r5, PER-162)', () => {
  const withCounters = (usageCounters: Record<string, number>): Character =>
    ({
      level: 5,
      abilities: ctx().abilities,
      featureIds: ['foi-r5'],
      effectToggles: {},
      featureChoices: {},
      usageCounters,
    }) as Character;

  const foiR5 = featureById.get('foi-r5')!;

  it('0 lancement (clé absente) → surcoût 0', () => {
    expect(escalatingManaSurcharge(withCounters({}), foiR5)).toBe(0);
  });

  it('N lancements → +N PM (step 1 par défaut)', () => {
    expect(escalatingManaSurcharge(withCounters({ 'foi-r5': 3 }), foiR5)).toBe(3);
  });

  it('capacité sans escalatingManaCost → 0', () => {
    const rageR3 = featureById.get('rage-r3')!;
    expect(escalatingManaSurcharge(withCounters({ 'rage-r3': 2 }), rageR3)).toBe(0);
  });
});

describe('resetUsageCounters — cadenas « débloquer sans repos » restreint à UNE capacité (PER-160/161)', () => {
  const SR = new Set(['short-rest', 'combat'] as const);

  it('Transe (meditation-r2) : lève le verrou mais garde la réserve /jour (comme un vrai repos court)', () => {
    const next = resetUsageCounters(
      { 'meditation-r2': 1, [shortRestLockKey('meditation-r2')]: 1 },
      ['meditation-r2'],
      SR,
    );
    // resetOn 'day' non déclenché → le 1 restant est conservé ; seul le verrou saute.
    expect(next).toEqual({ 'meditation-r2': 1 });
  });

  it('Sanctuaire (priere-r2) : lève le verrou ET recharge la charge (resetOn short-rest)', () => {
    const next = resetUsageCounters(
      { 'priere-r2': 0, [shortRestLockKey('priere-r2')]: 1 },
      ['priere-r2'],
      SR,
    );
    expect(next).toEqual({});
  });

  it('ne touche pas aux autres capacités (portée limitée à l’id fourni)', () => {
    const next = resetUsageCounters(
      { 'priere-r2': 0, [shortRestLockKey('priere-r2')]: 1, rage: 0 },
      ['priere-r2'],
      SR,
    );
    // La rage (autre capacité) est préservée : le cadenas n'agit que sur la capacité ciblée.
    expect(next).toEqual({ rage: 0 });
  });
});

describe('resetUsageCounters — surcoût mana croissant (foi-r5, PER-162)', () => {
  it('repos court (short-rest) remet le surcoût croissant à 0', () => {
    expect(resetUsageCounters({ 'foi-r5': 4 }, ['foi-r5'], new Set(['short-rest', 'combat'] as const))).toEqual({});
  });

  it('un déclencheur qui ne matche pas laisse le surcoût intact', () => {
    // resetOn de foi-r5 = 'short-rest' → un reset limité à 'combat' ne le touche pas.
    expect(resetUsageCounters({ 'foi-r5': 4 }, ['foi-r5'], new Set(['combat'] as const))).toEqual({ 'foi-r5': 4 });
  });
});

describe('isTemporaryActivationShortRestLocked — Sanctuaire (priere-r2, PER-161)', () => {
  const mkChar = (featureIds: string[], usageCounters: Record<string, number>): Character =>
    ({
      level: 5,
      abilities: ctx().abilities,
      featureIds,
      effectToggles: {},
      featureChoices: {},
      usageCounters,
    }) as Character;

  it('interrupteur temporaire + oncePerShortRest verrouillé → réactivation bloquée', () => {
    const char = mkChar(['priere-r2'], { 'priere-r2': 0, [shortRestLockKey('priere-r2')]: 1 });
    expect(isTemporaryActivationShortRestLocked(char, 'priere-r2', 0)).toBe(true);
  });

  it('sans verrou posé → réactivation libre', () => {
    expect(isTemporaryActivationShortRestLocked(mkChar(['priere-r2'], {}), 'priere-r2', 0)).toBe(false);
  });

  it('un état temporaire SANS oncePerShortRest (Rage) n’est jamais verrouillé', () => {
    const rage = mkChar(['rage-r3'], { rage: 0, [shortRestLockKey('rage')]: 1 });
    expect(isTemporaryActivationShortRestLocked(rage, 'rage-r3', 0)).toBe(false);
  });
});

describe('pouvoirs empruntés — Artefact étrange (artefacts-r5, PER-163)', () => {
  const HOST = 'artefacts-r5';
  const SPELL = 'magie-universelle-r5';
  const usedKey = borrowedPowerUsedKey(HOST, SPELL);
  const integrityKey = borrowedPowerIntegrityKey(HOST, SPELL);

  describe('resetUsageCounters', () => {
    it('repos long (day) recharge l’usage quotidien ET répare (retire les deux clés)', () => {
      const next = resetUsageCounters(
        { [usedKey]: 0, [integrityKey]: 0 },
        [HOST],
        new Set(['day', 'short-rest', 'combat'] as const),
      );
      expect(next).toEqual({});
    });

    it('repos court (short-rest) répare SANS recharger l’usage quotidien', () => {
      const next = resetUsageCounters(
        { [usedKey]: 0, [integrityKey]: 0 },
        [HOST],
        new Set(['short-rest', 'combat'] as const),
      );
      // L'intégrité est réparée (clé retirée) ; l'usage quotidien reste consommé.
      expect(next).toEqual({ [usedKey]: 0 });
    });

    it('un reset limité à « combat » ne touche ni l’usage ni l’intégrité', () => {
      const state = { [usedKey]: 0, [integrityKey]: 0 };
      expect(resetUsageCounters(state, [HOST], new Set(['combat'] as const))).toEqual(state);
    });
  });

  describe('pruneUsageCounters', () => {
    it('préserve les clés d’état tant que la capacité hôte est possédée', () => {
      const state = { [usedKey]: 0, [integrityKey]: 0 };
      expect(pruneUsageCounters(state, [HOST])).toEqual(state);
    });

    it('élague les clés d’état quand la capacité hôte n’est plus acquise', () => {
      expect(pruneUsageCounters({ [usedKey]: 0, [integrityKey]: 0 }, [])).toEqual({});
    });
  });
});

describe('états préjudiciables infligeables — Botte secrète (spadassin-r5, PER-206)', () => {
  const HOST = 'spadassin-r5';
  const immobilizedKey = inflictedStateKey(HOST, 'immobilized');
  const blindedKey = inflictedStateKey(HOST, 'blinded');

  it('spadassin-r5 porte bien les 5 états et non un usageCounter', () => {
    const feature = featureById.get(HOST)!;
    expect(feature.usageCounter).toBeUndefined();
    expect(feature.inflictableStates?.stateIds).toEqual([
      'weakened',
      'blinded',
      'dazed',
      'immobilized',
      'slowed',
    ]);
    expect(feature.inflictableStates?.resetOn).toBe('combat');
  });

  describe('resetUsageCounters', () => {
    it('un repos court (combat) réinitialise les marqueurs infligés (retire les clés)', () => {
      const next = resetUsageCounters(
        { [immobilizedKey]: 0, [blindedKey]: 0 },
        [HOST],
        new Set(['short-rest', 'combat'] as const),
      );
      expect(next).toEqual({});
    });

    it('un reset limité à « day » ne touche pas les marqueurs « par combat »', () => {
      const state = { [immobilizedKey]: 0 };
      expect(resetUsageCounters(state, [HOST], new Set(['day'] as const))).toEqual(state);
    });
  });

  describe('pruneUsageCounters', () => {
    it('préserve les marqueurs tant que la capacité est possédée', () => {
      const state = { [immobilizedKey]: 0, [blindedKey]: 0 };
      expect(pruneUsageCounters(state, [HOST])).toEqual(state);
    });

    it('élague les marqueurs quand la capacité n’est plus acquise', () => {
      expect(pruneUsageCounters({ [immobilizedKey]: 0, [blindedKey]: 0 }, [])).toEqual({});
    });
  });
});

// ---------------------------------------------------------------------------
// PER-131 — Peau de pierre (barbare, pagne-r2) : CON pour la DEF, ou bonus plat
// ---------------------------------------------------------------------------

describe('defenseAbility — caractéristique de calcul de la DEF (PER-131)', () => {
  const choiceCtx = (choice?: string): EffectContext =>
    ctx({ featureChoices: choice ? { 'pagne-r2': [choice] } : {} });

  it('AGI par défaut quand aucune capacité ne la remplace', () => {
    expect(defenseAbility([])).toBe('AGI');
    expect(defenseAbility(['pourfendeur-r1'], ctx())).toBe('AGI');
  });

  it('CON quand Peau de pierre retient « con-for-def »', () => {
    expect(defenseAbility(['pagne-r2'], choiceCtx('con-for-def'))).toBe('CON');
  });

  it('AGI quand Peau de pierre retient « def-bonus »', () => {
    expect(defenseAbility(['pagne-r2'], choiceCtx('def-bonus'))).toBe('AGI');
  });

  it('AGI sans contexte de choix (catalogue seul)', () => {
    expect(defenseAbility(['pagne-r2'])).toBe('AGI');
  });
});

describe('Peau de pierre — bonus plat +1/+2 en DEF (def-bonus, PER-131)', () => {
  const withChoice = (choice: string): EffectContext => ctx({ featureChoices: { 'pagne-r2': [choice] } });

  it('+1 en DEF au rang 2 de la voie du pagne', () => {
    expect(modsFromFeatures(['pagne-r2'], withChoice('def-bonus')).def).toBe(1);
  });

  it('+2 en DEF au rang 4 de la voie du pagne', () => {
    expect(modsFromFeatures(['pagne-r2', 'pagne-r4'], withChoice('def-bonus')).def).toBe(2);
  });

  it('« con-for-def » n’ajoute aucun bonus plat de DEF', () => {
    expect(modsFromFeatures(['pagne-r2'], withChoice('con-for-def')).def ?? 0).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// PER-132 — Armure de vent (barbare, primitif-r2) : DEF selon l'armure portée
// ---------------------------------------------------------------------------

describe('Armure de vent — bonus de DEF selon l’armure portée (PER-132)', () => {
  it('+2 en DEF quand aucune armure n’est portée', () => {
    expect(modsFromFeatures(['primitif-r2'], ctx({ armorWorn: false })).def).toBe(2);
  });

  it('+3 en DEF sans armure au rang 5 de la voie', () => {
    expect(modsFromFeatures(['primitif-r2', 'primitif-r5'], ctx({ armorWorn: false })).def).toBe(3);
  });

  it('+1 en DEF quand une armure est portée', () => {
    expect(modsFromFeatures(['primitif-r2'], ctx({ armorWorn: true })).def).toBe(1);
  });

  it('+1 en DEF avec armure, même au rang 5', () => {
    expect(modsFromFeatures(['primitif-r2', 'primitif-r5'], ctx({ armorWorn: true })).def).toBe(1);
  });

  it('sans contexte (catalogue seul), aucune contribution résoluble', () => {
    expect(modsFromFeatures(['primitif-r2']).def ?? 0).toBe(0);
  });

  it('effectContext expose l’armure réellement portée (worn)', () => {
    const base = createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' });
    const wornArmor: EquipmentLine = { itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } };
    const sansArmure: Character = { ...base, classId: 'barbare', featureIds: ['primitif-r2'] };
    const avecArmure: Character = { ...sansArmure, equipment: [wornArmor] };
    expect(effectContext(sansArmure).armorWorn).toBe(false);
    expect(effectContext(avecArmure).armorWorn).toBe(true);
    // Le bonus suit l'état porté sans interrupteur manuel.
    expect(modsFromFeatures(['primitif-r2'], effectContext(sansArmure)).def).toBe(2);
    expect(modsFromFeatures(['primitif-r2'], effectContext(avecArmure)).def).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// PER-236 — Armure sur mesure (chevalier, guerre-r1) : demi-malus d'armure +
// bonus de DEF par voie de chevalier au rang 5, EN ARMURE LOURDE
// ---------------------------------------------------------------------------

describe('Armure sur mesure — demi-malus + DEF en armure lourde (guerre-r1, PER-236)', () => {
  it('armorPenaltyDivisor vaut 2 avec Armure sur mesure', () => {
    expect(armorPenaltyDivisor(['guerre-r1'])).toBe(2);
  });

  it('armorPenaltyDivisor vaut 1 (aucune réduction) sans la capacité', () => {
    expect(armorPenaltyDivisor([])).toBe(1);
    expect(armorPenaltyDivisor(['guerre-r2'])).toBe(1);
  });

  it('+1 en DEF par voie de chevalier au rang 5, uniquement en armure lourde', () => {
    // guerre atteint le rang 5 → une voie de chevalier au rang 5 → +1.
    expect(modsFromFeatures(['guerre-r1', 'guerre-r5'], ctx({ heavyArmorWorn: true })).def).toBe(1);
    // guerre + cavalier au rang 5 → deux voies → +2.
    expect(
      modsFromFeatures(['guerre-r1', 'guerre-r5', 'cavalier-r5'], ctx({ heavyArmorWorn: true })).def,
    ).toBe(2);
  });

  it('aucun bonus de DEF hors armure lourde', () => {
    expect(modsFromFeatures(['guerre-r1', 'guerre-r5'], ctx({ heavyArmorWorn: false })).def ?? 0).toBe(0);
  });

  it('aucun bonus de DEF en armure lourde sans voie de chevalier au rang 5', () => {
    expect(modsFromFeatures(['guerre-r1'], ctx({ heavyArmorWorn: true })).def ?? 0).toBe(0);
  });

  it('sans contexte (catalogue seul), aucune contribution résoluble', () => {
    expect(modsFromFeatures(['guerre-r1', 'guerre-r5']).def ?? 0).toBe(0);
  });

  it('effectContext expose l’armure lourde réellement portée', () => {
    const base = createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' });
    const heavy: EquipmentLine = { itemId: 'plaque-complete', quantity: 1, worn: { slot: 'armor' } };
    const medium: EquipmentLine = { itemId: 'cotte-de-mailles', quantity: 1, worn: { slot: 'armor' } };
    expect(effectContext({ ...base, equipment: [heavy] }).heavyArmorWorn).toBe(true);
    expect(effectContext({ ...base, equipment: [medium] }).heavyArmorWorn).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PER-106 — valeurs scalantes `path-rank` (rang brut de la voie) et `min`
// ---------------------------------------------------------------------------

describe('resolveValue — path-rank et min (PER-106)', () => {
  it('path-rank rend le rang atteint dans la voie hôte', () => {
    expect(resolveValue({ scale: 'path-rank' }, 'seduction', { seduction: 3 }, ctx())).toBe(3);
  });

  it('path-rank vaut 0 pour une voie absente', () => {
    expect(resolveValue({ scale: 'path-rank' }, 'seduction', {}, ctx())).toBe(0);
  });

  it('path-rank applique le facteur', () => {
    expect(resolveValue({ scale: 'path-rank', factor: 2 }, 'seduction', { seduction: 2 }, ctx())).toBe(4);
  });

  it('path-rank exige le contexte (null en catalogue seul)', () => {
    expect(resolveValue({ scale: 'path-rank' }, 'seduction', { seduction: 3 })).toBeNull();
  });

  it('min rend le plus petit des composants résolus', () => {
    const value = { scale: 'min' as const, parts: [{ scale: 'ability' as const, ability: 'CHA' as const }, { scale: 'path-rank' as const }] };
    // CHA 4 > rang 2 → plafonné à 2.
    expect(resolveValue(value, 'seduction', { seduction: 2 }, ctx({ abilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 4, INT: 0, VOL: 0 } }))).toBe(2);
    // CHA 1 < rang 5 → 1.
    expect(resolveValue(value, 'seduction', { seduction: 5 }, ctx({ abilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 1, INT: 0, VOL: 0 } }))).toBe(1);
  });

  it('min renvoie null si un composant est non résoluble', () => {
    const value = { scale: 'min' as const, parts: [3, { scale: 'path-rank' as const }] };
    expect(resolveValue(value, 'seduction', { seduction: 2 })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// PER-106 — Dentelles et rapière (barde, seduction-r2) : DEF sans armure,
// plafonnée au rang atteint dans la voie, résolue depuis le port effectif
// ---------------------------------------------------------------------------

describe('Dentelles et rapière — DEF += min(CHA, rang) sans armure (PER-106)', () => {
  const cha = (v: number): Record<AbilityId, number> => ({ AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: v, INT: 0, VOL: 0 });

  it('sans armure, ajoute le CHA quand il ne dépasse pas le rang', () => {
    // seduction-r2 → rang 2 dans la voie ; CHA 2 → min(2, 2) = 2.
    expect(modsFromFeatures(['seduction-r2'], ctx({ armorWorn: false, abilities: cha(2) })).def).toBe(2);
  });

  it('sans armure, plafonne le bonus au rang atteint dans la voie', () => {
    // CHA 5, rang 2 → plafonné à 2.
    expect(modsFromFeatures(['seduction-r2'], ctx({ armorWorn: false, abilities: cha(5) })).def).toBe(2);
    // Au rang 5 de la voie, le plafond monte : CHA 5, rang 5 → 5.
    expect(modsFromFeatures(['seduction-r2', 'seduction-r5'], ctx({ armorWorn: false, abilities: cha(5) })).def).toBe(5);
    // CHA 3 sous le rang 5 → 3 (le CHA est en dessous du plafond).
    expect(modsFromFeatures(['seduction-r2', 'seduction-r5'], ctx({ armorWorn: false, abilities: cha(3) })).def).toBe(3);
  });

  it('avec une armure portée, aucun bonus de DEF', () => {
    expect(modsFromFeatures(['seduction-r2'], ctx({ armorWorn: true, abilities: cha(5) })).def ?? 0).toBe(0);
  });

  it('suit le port effectif sans interrupteur manuel', () => {
    const base = createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' });
    const sansArmure: Character = { ...base, classId: 'barde', abilities: cha(3), featureIds: ['seduction-r2'] };
    const avecArmure: Character = {
      ...sansArmure,
      equipment: [{ itemId: 'cuir-simple', quantity: 1, worn: { slot: 'armor' } }],
    };
    expect(modsFromFeatures(['seduction-r2'], effectContext(sansArmure)).def).toBe(2); // min(3, 2)
    expect(modsFromFeatures(['seduction-r2'], effectContext(avecArmure)).def ?? 0).toBe(0);
  });

  it('détaille la capacité dans les sources de DEF sans armure', () => {
    const sources = featureModSources(['seduction-r2'], ctx({ armorWorn: false, abilities: cha(2) })).def ?? [];
    expect(sources.some((s) => s.featureId === 'seduction-r2' && s.value === 2)).toBe(true);
  });
});

describe('Voie du familier fantastique — rangs R5/R6/R7 (PER-74)', () => {
  const R3 = 'prestige-familier-fantastique-r3';
  const R5 = 'prestige-familier-fantastique-r5';
  const R6 = 'prestige-familier-fantastique-r6';
  const R7 = 'prestige-familier-fantastique-r7';
  const char = (featureIds: string[], featureChoices: Record<string, string[]> = {}): Character =>
    ({ level: 8, abilities: ctx().abilities, featureIds, effectToggles: {}, featureChoices }) as Character;

  it('R5 « Résistance » : RD plate = rang atteint dans la voie, tous types (scopes absent)', () => {
    // Voie prise jusqu’au rang 5 → rang de voie 5 → RD 5 sur tous les DM.
    const upTo5 = damageReductionSources(char([R3, 'prestige-familier-fantastique-r4', R5]));
    expect(upTo5).toHaveLength(1);
    expect(upTo5[0].reduction).toMatchObject({ kind: 'flat', value: 5 });
    expect(upTo5[0].reduction.scopes).toBeUndefined();
    // Voie poussée jusqu’au rang 7 → RD 7 (1 par rang).
    const upTo7 = damageReductionSources(char([R3, R5, R6, R7]));
    expect(upTo7[0].reduction).toMatchObject({ kind: 'flat', value: 7 });
  });

  it('R6 « Inséparables » : +1 point de chance (indépendant du familier)', () => {
    expect(modsFromFeatures([R6]).luckPoints).toBe(1);
  });

  it('R7 « Pouvoir supérieur » : +1 à la carac désignée par le familier choisi au R3', () => {
    // Animal céleste → CHA ; Araignée géante → AGI ; Diablotin → INT.
    expect(abilityModsFromFeatures([R7], { [R3]: ['familier-celeste'] }).CHA).toBe(1);
    expect(abilityModsFromFeatures([R7], { [R3]: ['araignee-geante'] }).AGI).toBe(1);
    expect(abilityModsFromFeatures([R7], { [R3]: ['diablotin'] }).INT).toBe(1);
  });

  it('R7 : le choix « fée » (option distincte) partage l’entité fee-ou-lutin → +1 AGI', () => {
    expect(abilityModsFromFeatures([R7], { [R3]: ['fee'] }).AGI).toBe(1);
    expect(abilityModsFromFeatures([R7], { [R3]: ['lutin'] }).AGI).toBe(1);
  });

  it('R7 sans familier choisi (ou option inconnue) : aucun bonus de carac', () => {
    expect(abilityModsFromFeatures([R7], {})).toEqual({});
    expect(abilityModsFromFeatures([R7], { [R3]: ['inexistant'] })).toEqual({});
  });

  it('R7 : le +1 est détaillé dans les sources de la carac visée', () => {
    const sources = abilityModSources([R7], { [R3]: ['stique'] }).CON ?? []; // stique → CON
    expect(sources.some((s) => s.featureId === R7 && s.value === 1)).toBe(true);
  });
});

describe('Pouvoirs conférés par le familier — pilote Dragon féérique (PER-74)', () => {
  const R3 = 'prestige-familier-fantastique-r3';
  const R4 = 'prestige-familier-fantastique-r4';
  const R7 = 'prestige-familier-fantastique-r7';
  const dragon = { [R3]: ['dragon-feerique'] };

  it('R4 résout le pouvoir mineur → Image décalée (illusions-r2), 2×/jour', () => {
    expect(resolveFamiliarGrantedPower(R4, dragon)).toMatchObject({
      slot: 'minor',
      featureId: 'illusions-r2',
      usage: { max: 2, reset: 'day' },
    });
  });

  it('R7 résout le pouvoir supérieur → Mirage (illusions-r1), 1×/combat', () => {
    expect(resolveFamiliarGrantedPower(R7, dragon)).toMatchObject({
      slot: 'superior',
      featureId: 'illusions-r1',
      usage: { max: 1, reset: 'combat' },
    });
  });

  it('null hors capacité hôte ou sans familier choisi', () => {
    expect(resolveFamiliarGrantedPower('brute-r1', dragon)).toBeNull();
    expect(resolveFamiliarGrantedPower(R4, {})).toBeNull();
  });

  it('reset : le compteur 2×/jour (R4) se recharge au repos LONG (day), pas au repos court', () => {
    const key = familiarPowerUsedKey(R4);
    // Repos court (short-rest + combat) : « day » non déclenché → charge restante conservée.
    expect(resetUsageCounters({ [key]: 0 }, [R4], new Set(['short-rest', 'combat']), dragon)).toEqual({ [key]: 0 });
    // Repos long (inclut day) → clé retirée = plein.
    expect(resetUsageCounters({ [key]: 0 }, [R4], new Set(['day', 'short-rest', 'combat']), dragon)).toEqual({});
  });

  it('reset : le compteur 1×/combat (R7) se recharge dès le repos court (combat)', () => {
    const key = familiarPowerUsedKey(R7);
    expect(resetUsageCounters({ [key]: 0 }, [R7], new Set(['short-rest', 'combat']), dragon)).toEqual({});
  });

  it('prune : la clé du compteur survit tant que la capacité hôte est possédée', () => {
    const key = familiarPowerUsedKey(R4);
    expect(pruneUsageCounters({ [key]: 1 }, [R4])).toEqual({ [key]: 1 });
    expect(pruneUsageCounters({ [key]: 1 }, ['brute-r1'])).toEqual({});
  });
});
