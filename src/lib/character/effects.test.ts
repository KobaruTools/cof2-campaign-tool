import { describe, expect, it } from 'vitest';
import type { AbilityId } from '@/data/schema';
import type { Character } from './types';
import {
  conditionalEffectsOf,
  conditionalEffectValue,
  effectContext,
  featureModSources,
  isEffectActive,
  modsFromFeatures,
  pathRanksFromFeatures,
  pruneEffectToggles,
  setEffectToggle,
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
  ({ level: 5, abilities: ctx().abilities, featureIds: [] as string[], effectToggles: toggles }) as Character;

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

  it('agrège la part plate de Réflexes éclair (pourfendeur r1 : +3 Init, +1 DEF)', () => {
    expect(modsFromFeatures(['pourfendeur-r1'])).toEqual({ initiative: 3, def: 1 });
  });

  it('somme les bonus de plusieurs capacités, par stat (cas Lhagva)', () => {
    expect(modsFromFeatures(['pourfendeur-r1', 'humain-r1'])).toEqual({
      initiative: 3,
      def: 1,
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
    const entries = conditionalEffectsOf('combat-a-deux-armes-r2');
    expect(entries).toHaveLength(1);
    expect(entries[0].index).toBe(0);
    expect(entries[0].effect.activation.label).toBe('une arme dans chaque main');
  });

  it('renvoie une liste vide pour une capacité sans effet conditionnel', () => {
    expect(conditionalEffectsOf('air-r1')).toEqual([]);
    expect(conditionalEffectsOf('brute-r1')).toEqual([]);
    expect(conditionalEffectsOf('id-inexistant')).toEqual([]);
  });

  it('conditionalEffectValue résout la valeur courante (pour l’affichage)', () => {
    // Rage du berserk : -2 DEF, constant.
    expect(conditionalEffectValue(charWith({}), 'rage-r3', 0)).toBe(-2);
    // Parade croisée : +1 au rang 2 de la voie, +2 au rang 5 (selon featureIds).
    const rk2 = { featureIds: ['combat-a-deux-armes-r2'] } as Character;
    const rk5 = { featureIds: ['combat-a-deux-armes-r2', 'combat-a-deux-armes-r5'] } as Character;
    expect(conditionalEffectValue(rk2, 'combat-a-deux-armes-r2', 0)).toBe(1);
    expect(conditionalEffectValue(rk5, 'combat-a-deux-armes-r2', 0)).toBe(2);
    // Index ne pointant pas un effet conditionnel → null.
    expect(conditionalEffectValue(charWith({}), 'air-r1', 0)).toBeNull();
  });

  it("isEffectActive suit l'interrupteur, sinon l'état par défaut", () => {
    expect(isEffectActive(charWith({}), 'rage-r3', 0)).toBe(false);
    expect(isEffectActive(charWith({ 'rage-r3': [true] }), 'rage-r3', 0)).toBe(true);
  });

  it('setEffectToggle fixe une case sans muter le personnage', () => {
    const next = setEffectToggle(charWith({}), 'rage-r3', 0, true);
    expect(next).toEqual({ 'rage-r3': [true] });
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
    });
  });
});
