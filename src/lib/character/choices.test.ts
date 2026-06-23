import { describe, expect, it } from 'vitest';
import { ABILITY_IDS } from '@/data/schema';
import { featureById } from '@/data';
import { modsFromFeatures } from './effects';
import { SCHEMA_VERSION, type Character } from './types';
import {
  allowedAbilitiesForChoice,
  borrowedFeatureIds,
  effectiveFeatureIdsForMods,
  eligibleFeaturesForChoice,
  featureChoiceDefs,
  featuresWithUnmadeChoices,
  getOptionSelections,
  getSelection,
  getSelections,
  hasUnmadeChoice,
  pruneFeatureChoices,
  repeatableChoiceCount,
  setFeatureChoice,
  unmadeChoiceIndexes,
} from './choices';
import type { OptionFeatureChoice, PathFeatureChoice } from '@/data/schema';

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'demi-orc',
    classId: 'barbare',
    level: 5,
    priestVocation: null,
    portraitVariant: 'default',
    abilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    baseAbilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    ancestryChoices: [],
    ancestryPathId: 'demi-orc',
    featureIds: ['demi-orc-r1', 'demi-orc-r2'],
    featureChoices: {},
    effectToggles: {},
    effectInputs: {},
    usageCounters: {},
    levelUpHistory: [],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('featureChoiceDefs', () => {
  it('expose les choix définis sur une capacité', () => {
    const defs = featureChoiceDefs('demi-orc-r2');
    expect(defs).toHaveLength(1);
    expect(defs[0].kind).toBe('feature-from-path');
  });

  it('renvoie un tableau vide pour une capacité sans choix ou inconnue', () => {
    expect(featureChoiceDefs('demi-orc-r1')).toEqual([]);
    expect(featureChoiceDefs('id-inexistant')).toEqual([]);
  });
});

describe('lecture/écriture des sélections', () => {
  it('défaut : aucune sélection', () => {
    const c = makeCharacter();
    expect(getSelections(c, 'demi-orc-r2')).toEqual([]);
    expect(getSelection(c, 'demi-orc-r2', 0)).toBeNull();
  });

  it('setFeatureChoice fixe une sélection sans muter le personnage', () => {
    const c = makeCharacter();
    const next = setFeatureChoice(c, 'demi-orc-r2', 0, 'pourfendeur-r1');
    expect(next['demi-orc-r2']).toEqual(['pourfendeur-r1']);
    // Immuable : l'original n'a pas changé.
    expect(c.featureChoices).toEqual({});
  });

  it('setFeatureChoice complète par des null jusqu’à l’index visé', () => {
    const c = makeCharacter();
    const next = setFeatureChoice(c, 'demi-orc-r2', 2, 'x');
    expect(next['demi-orc-r2']).toEqual([null, null, 'x']);
  });

  it('pruneFeatureChoices retire les choix de capacités non acquises', () => {
    const fc = { 'demi-orc-r2': ['pourfendeur-r1'], 'maitre-d-armes-r1': ['swords'] };
    expect(pruneFeatureChoices(fc, ['demi-orc-r2'])).toEqual({
      'demi-orc-r2': ['pourfendeur-r1'],
    });
  });
});

describe('allowedAbilitiesForChoice', () => {
  it('toutes les caractéristiques par défaut', () => {
    expect(allowedAbilitiesForChoice({})).toEqual(ABILITY_IDS);
  });
  it('restreint au domaine fourni', () => {
    expect(allowedAbilitiesForChoice({ allowed: ['FOR', 'CON'] })).toEqual(['FOR', 'CON']);
  });
});

describe('eligibleFeaturesForChoice', () => {
  it('demi-orc r2 : capacités de rang 1 des voies de barbare/guerrier', () => {
    const c = makeCharacter();
    const choice = featureChoiceDefs('demi-orc-r2')[0] as PathFeatureChoice;
    const eligible = eligibleFeaturesForChoice(c, 'demi-orc-r2', choice);
    expect(eligible.length).toBeGreaterThan(0);
    // Toutes de rang 1.
    expect(eligible.every((f) => f.rank === 1)).toBe(true);
    // pourfendeur-r1 (voie du pourfendeur, barbare) en fait partie.
    expect(eligible.map((f) => f.id)).toContain('pourfendeur-r1');
    // Aucune capacité déjà acquise n'est proposée.
    expect(eligible.map((f) => f.id)).not.toContain('demi-orc-r1');
  });

  it('familyScope same-family : voies des profils de la famille du personnage', () => {
    // prestige-expert-r4 : rang 1 d'un profil de la même famille.
    const mage = makeCharacter({ classId: 'magicien', featureIds: ['prestige-expert-r4'] });
    const choice = featureChoiceDefs('prestige-expert-r4')[0] as PathFeatureChoice;
    const eligible = eligibleFeaturesForChoice(mage, 'prestige-expert-r4', choice);
    expect(eligible.length).toBeGreaterThan(0);
    // Toutes issues de voies de profils de la famille des mages.
    expect(eligible.every((f) => f.rank === 1)).toBe(true);
    expect(eligible.map((f) => f.id)).toContain('air-r1'); // voie de l'air (magicien)
  });
});

describe('borrowedFeatureIds & moteur', () => {
  it('liste les capacités empruntées par un choix feature-from-path', () => {
    const c = makeCharacter({ featureChoices: { 'demi-orc-r2': ['pourfendeur-r1'] } });
    expect(borrowedFeatureIds(c)).toEqual(['pourfendeur-r1']);
  });

  it('ignore les choix de type option (pas une capacité empruntée)', () => {
    const c = makeCharacter({
      featureIds: ['maitre-d-armes-r1'],
      featureChoices: { 'maitre-d-armes-r1': ['swords'] },
    });
    expect(borrowedFeatureIds(c)).toEqual([]);
  });

  it('ignore une sélection dont la capacité hôte n’est pas acquise', () => {
    const c = makeCharacter({ featureIds: [], featureChoices: { 'demi-orc-r2': ['pourfendeur-r1'] } });
    expect(borrowedFeatureIds(c)).toEqual([]);
  });

  it('le bonus plat d’une capacité empruntée s’applique via les ids effectifs', () => {
    const c = makeCharacter({ featureChoices: { 'demi-orc-r2': ['pourfendeur-r1'] } });
    // pourfendeur-r1 = Réflexes éclair : +3 Init, +1 DEF (cf. effects.test).
    expect(modsFromFeatures(effectiveFeatureIdsForMods(c))).toEqual({ initiative: 3, def: 1 });
  });

  it('sans choix fait, aucune capacité empruntée et aucun bonus', () => {
    const c = makeCharacter();
    expect(effectiveFeatureIdsForMods(c)).toEqual(['demi-orc-r1', 'demi-orc-r2']);
    expect(borrowedFeatureIds(c)).toEqual([]);
  });
});

describe('état « choix à faire »', () => {
  it('signale un choix non encore fait sur une capacité acquise', () => {
    const c = makeCharacter(); // demi-orc-r2 acquise, choix non fait
    expect(unmadeChoiceIndexes(c, 'demi-orc-r2')).toEqual([0]);
    expect(hasUnmadeChoice(c, 'demi-orc-r2')).toBe(true);
    expect(featuresWithUnmadeChoices(c)).toEqual(['demi-orc-r2']);
  });

  it('un choix résolu ne figure plus dans les choix à faire', () => {
    const c = makeCharacter({ featureChoices: { 'demi-orc-r2': ['pourfendeur-r1'] } });
    expect(unmadeChoiceIndexes(c, 'demi-orc-r2')).toEqual([]);
    expect(featuresWithUnmadeChoices(c)).toEqual([]);
  });

  it('une capacité sans choix n’est jamais « à faire »', () => {
    expect(hasUnmadeChoice(makeCharacter(), 'demi-orc-r1')).toBe(false);
  });
});

describe('choix `option` répétable (Golem supérieur)', () => {
  const forgesort = (over: Partial<Character> = {}) =>
    makeCharacter({
      classId: 'forgesort',
      ancestryId: 'nain',
      ancestryPathId: 'nain',
      featureIds: ['golem-r5'],
      ...over,
    });
  const golemChoice = featureChoiceDefs('golem-r5')[0] as OptionFeatureChoice;

  it('golem-r5 porte bien un choix `option` répétable', () => {
    expect(golemChoice.kind).toBe('option');
    expect(golemChoice.repeat).toEqual({ by: 'paths-at-rank', classIds: ['forgesort'], rank: 5 });
  });

  it('getOptionSelections normalise chaîne / tableau / absence', () => {
    expect(getOptionSelections(forgesort({ featureChoices: { 'golem-r5': ['mighty'] } }), 'golem-r5', 0)).toEqual([
      'mighty',
    ]);
    expect(
      getOptionSelections(forgesort({ featureChoices: { 'golem-r5': [['mighty', 'ballista']] } }), 'golem-r5', 0),
    ).toEqual(['mighty', 'ballista']);
    expect(getOptionSelections(forgesort(), 'golem-r5', 0)).toEqual([]);
  });

  it('repeatableChoiceCount = nombre de voies de forgesort au rang 5', () => {
    expect(repeatableChoiceCount(forgesort({ featureIds: ['golem-r5'] }), golemChoice)).toBe(1);
    expect(
      repeatableChoiceCount(forgesort({ featureIds: ['golem-r5', 'metal-r5', 'runes-r5'] }), golemChoice),
    ).toBe(3);
    // Une voie d'une AUTRE famille au rang 5 ne compte pas (rage = barbare).
    expect(repeatableChoiceCount(forgesort({ featureIds: ['golem-r5', 'rage-r5'] }), golemChoice)).toBe(1);
  });

  it('un choix répétable est « à faire » si vide, fait dès une option retenue', () => {
    expect(unmadeChoiceIndexes(forgesort(), 'golem-r5')).toEqual([0]); // null
    expect(unmadeChoiceIndexes(forgesort({ featureChoices: { 'golem-r5': [[]] } }), 'golem-r5')).toEqual([0]); // []
    expect(
      unmadeChoiceIndexes(forgesort({ featureChoices: { 'golem-r5': [['mighty']] } }), 'golem-r5'),
    ).toEqual([]);
  });
});

describe('cohérence du catalogue', () => {
  it('toutes les options d’un choix `option` ont un id et un libellé', () => {
    for (const feature of featureById.values()) {
      for (const choice of feature.choices ?? []) {
        if (choice.kind === 'option') {
          expect(choice.options.length).toBeGreaterThan(0);
          for (const opt of choice.options) {
            expect(opt.id).toBeTruthy();
            expect(opt.label).toBeTruthy();
          }
        }
      }
    }
  });
});
