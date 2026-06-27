import { describe, expect, it } from 'vitest';
import { ABILITY_IDS } from '@/data/schema';
import { featureById } from '@/data';
import { modsFromFeatures } from './effects';
import { SCHEMA_VERSION, type Character } from './types';
import {
  allowedAbilitiesForChoice,
  borrowedFeatureIds,
  effectiveFeatureIdsForMods,
  eligibleDivineHostPaths,
  eligibleFeaturesForChoice,
  featureChoiceDefs,
  featuresWithUnmadeChoices,
  getOptionSelections,
  getSelection,
  getSelections,
  hasActionableChoice,
  hasRepeatableOption,
  hasUnmadeChoice,
  isChoiceActionable,
  pendingDivineAcquisition,
  pruneFeatureChoices,
  repeatableChoiceCount,
  setFeatureChoice,
  splitRepeatableSelections,
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

// Prêtre spécialiste d'un dieu dont la capacité divine est de RANG 2 (basile →
// survie-r2), au niveau 1 avec deux voies de prêtre au rang 1 (foi, guerre-sainte).
function makeSpecialistPriest(over: Partial<Character> = {}): Character {
  return makeCharacter({
    classId: 'pretre',
    ancestryId: 'humain',
    ancestryPathId: 'humain',
    priestVocation: { mode: 'specialist', godId: 'basile' },
    featureIds: ['foi-r1', 'guerre-sainte-r1', 'humain-r1'],
    ...over,
  });
}

describe('pendingDivineAcquisition', () => {
  it('expose la capacité divine de rang ≥ 2 restant à acquérir', () => {
    const pending = pendingDivineAcquisition(makeSpecialistPriest());
    expect(pending?.feature.id).toBe('survie-r2');
    expect(pending?.rank).toBe(2);
    expect(pending?.godName).toBeTruthy();
  });

  it('renvoie null une fois la capacité divine acquise', () => {
    const char = makeSpecialistPriest({
      featureIds: ['foi-r1', 'guerre-sainte-r1', 'humain-r1', 'survie-r2'],
    });
    expect(pendingDivineAcquisition(char)).toBeNull();
  });

  it('renvoie null pour un prêtre généraliste', () => {
    const char = makeSpecialistPriest({ priestVocation: { mode: 'generalist' } });
    expect(pendingDivineAcquisition(char)).toBeNull();
  });
});

describe('eligibleDivineHostPaths', () => {
  it('ne retient que les voies de prêtre dont le rang précédent est acquis et le slot libre', () => {
    const hosts = eligibleDivineHostPaths(makeSpecialistPriest(), 2).map((p) => p.id);
    // foi et guerre-sainte ont leur rang 1 → éligibles ; les autres voies (sans rang 1)
    // ne le sont pas.
    expect(hosts).toEqual(expect.arrayContaining(['foi', 'guerre-sainte']));
    expect(hosts).not.toContain('priere');
    expect(hosts).not.toContain('soins');
    expect(hosts).not.toContain('spiritualite');
  });

  it('exclut une voie dont le slot du rang de la divine est déjà occupé', () => {
    const char = makeSpecialistPriest({
      featureIds: ['foi-r1', 'foi-r2', 'guerre-sainte-r1', 'humain-r1'],
    });
    const hosts = eligibleDivineHostPaths(char, 2).map((p) => p.id);
    expect(hosts).not.toContain('foi'); // rang 2 déjà pris
    expect(hosts).toContain('guerre-sainte');
  });
});

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
    // pourfendeur-r1 = Réflexes éclair : +3 Init (part plate) ; sa DEF est scalante (PER-127),
    // donc omise ici faute de contexte — l'emprunt de la part plate reste vérifié par le +3 Init.
    expect(modsFromFeatures(effectiveFeatureIdsForMods(c))).toEqual({ initiative: 3 });
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

  // Régression : Langage des animaux (druide). Le choix répétable « catégorie d'animaux »
  // ne se débloque qu'au rang 4 d'une voie de druide. Tant qu'aucun palier n'est atteint
  // (rang 1 → allowed 0), le choix n'est NI proposé (UI/wizard) NI « à faire » (pas de
  // blocage ni de puce). Une fois un rang 4 atteint, il redevient actionnable et dû.
  const druid = (over: Partial<Character> = {}) =>
    makeCharacter({ classId: 'druide', ancestryId: 'humain', ancestryPathId: 'humain', featureIds: ['animaux-r1'], ...over });
  const animauxChoice = featureChoiceDefs('animaux-r1')[0] as OptionFeatureChoice;

  it('un répétable sans palier atteint (allowed === 0) n’est ni proposé ni « à faire »', () => {
    const d = druid();
    expect(repeatableChoiceCount(d, animauxChoice)).toBe(0);
    expect(isChoiceActionable(d, animauxChoice)).toBe(false);
    expect(hasActionableChoice(d, 'animaux-r1')).toBe(false);
    expect(unmadeChoiceIndexes(d, 'animaux-r1')).toEqual([]);
    expect(hasUnmadeChoice(d, 'animaux-r1')).toBe(false);
  });

  it('un répétable redevient proposé et dû une fois le palier (rang 4) atteint', () => {
    const d = druid({ featureIds: ['animaux-r1', 'animaux-r2', 'animaux-r3', 'animaux-r4'] });
    expect(repeatableChoiceCount(d, animauxChoice)).toBe(1);
    expect(isChoiceActionable(d, animauxChoice)).toBe(true);
    expect(hasActionableChoice(d, 'animaux-r1')).toBe(true);
    expect(unmadeChoiceIndexes(d, 'animaux-r1')).toEqual([0]); // palier atteint, rien choisi
  });
});

describe('Armes de prédilection consolidée (maitre-d-armes-r1) : base + jalons débloqués par Spécialisation', () => {
  // Guerrier rang 5 dans les 5 voies (donc r3 acquise) → budget = base 1 + 5 jalons = 6.
  const guerrier = (over: Partial<Character> = {}) =>
    makeCharacter({
      classId: 'guerrier',
      ancestryId: 'humain',
      ancestryPathId: 'humain',
      featureIds: [
        'bouclier-r5',
        'combat-r5',
        'maitre-d-armes-r3',
        'maitre-d-armes-r5',
        'resistance-r5',
        'soldat-r5',
      ],
      ...over,
    });
  const prefChoice = featureChoiceDefs('maitre-d-armes-r1')[0] as OptionFeatureChoice;

  it('le choix porte base 1, un déblocage par r3 et une option `repeatable`', () => {
    expect(prefChoice.repeat).toEqual({
      by: 'paths-at-rank',
      classIds: ['guerrier'],
      rank: 5,
      base: 1,
      requiresFeatureId: 'maitre-d-armes-r3',
    });
    expect(hasRepeatableOption(prefChoice)).toBe(true);
    expect(prefChoice.options.find((o) => o.id === 'dm-bonus')?.repeatable).toBe(true);
  });

  it('budget = base + voies de guerrier au rang 5, une fois Spécialisation acquise', () => {
    expect(repeatableChoiceCount(guerrier(), prefChoice)).toBe(6); // 1 base + 5 jalons
  });

  it('sans Spécialisation (r3), seul le pick de base compte — le système de jalons reste verrouillé', () => {
    // Rang 5 dans une AUTRE voie mais maitre-d-armes encore au rang 1 (pas de r3) → budget = base.
    const noSpec = guerrier({ featureIds: ['maitre-d-armes-r1', 'combat-r5'] });
    expect(repeatableChoiceCount(noSpec, prefChoice)).toBe(1);
  });

  it('avec r3 mais aucune voie au rang 5, budget = base (jalons à 0)', () => {
    const justSpec = guerrier({ featureIds: ['maitre-d-armes-r3'] });
    expect(repeatableChoiceCount(justSpec, prefChoice)).toBe(1);
  });

  it('r3 + 1 voie au rang 5 → budget = base + 1', () => {
    const oneMilestone = guerrier({ featureIds: ['maitre-d-armes-r3', 'maitre-d-armes-r5'] });
    expect(repeatableChoiceCount(oneMilestone, prefChoice)).toBe(2);
  });

  it('getOptionSelections conserve les doublons de « +1 DM » mais dédoublonne les catégories', () => {
    const c = guerrier({
      featureChoices: { 'maitre-d-armes-r1': [['swords', 'swords', 'dm-bonus', 'dm-bonus', 'dm-bonus']] },
    });
    // « swords » apparaît une fois (distincte) ; « dm-bonus » conserve ses 3 instances.
    expect(getOptionSelections(c, 'maitre-d-armes-r1', 0)).toEqual(['swords', 'dm-bonus', 'dm-bonus', 'dm-bonus']);
  });

  it('splitRepeatableSelections décompose catégories vs compteur d’option répétable', () => {
    const c = guerrier({
      featureChoices: { 'maitre-d-armes-r1': [['swords', 'axes', 'dm-bonus', 'dm-bonus', 'dm-bonus', 'dm-bonus']] },
    });
    expect(splitRepeatableSelections(c, 'maitre-d-armes-r1', 0)).toEqual({
      distinct: ['swords', 'axes'],
      repeatCounts: { 'dm-bonus': 4 },
      used: 6,
    });
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
