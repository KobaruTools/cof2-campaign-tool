import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Character } from './types';
import { animalFormCategories, communicableAnimalCategories, knownAnimalFormCategoryIds } from './animalForms';
import { disabledFeatureIds, profileFeaturesDisabledByTransformation } from './effects';

function makeCharacter(over: Partial<Character>): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'c',
    name: 'C',
    identity: { sex: 'female', description: '' },
    ancestryId: 'elfe-sylvain',
    classId: 'druide',
    level: 20,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: 'default-campaign',
    playerId: 'default-player',
    status: 'active',
    abilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    baseAbilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    ancestryChoices: [],
    ancestryPathId: 'elfe-sylvain',
    featureIds: [],
    featureChoices: {},
    effectToggles: {},
    effectInputs: {},
    usageCounters: {},
    depletion: {},
    companionDepletion: {},
    transformationDepletion: {},
  transformationAbilities: {},
    transformationDerivedStats: {},
    companionInstances: {},
    mounts: [],
    poisonedWeapons: [],
    purse: { platinum: 0, gold: 0, silver: 0, copper: 0 },
    levelUpHistory: [],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '',
    updatedAt: '',
    ...over,
  };
}

describe('communicableAnimalCategories', () => {
  it('renvoie au minimum les mammifères (rang 1 inné)', () => {
    expect(communicableAnimalCategories(makeCharacter({}))).toEqual(['Mammifères']);
  });

  it('ajoute les catégories choisies dans Langage des animaux, dans l’ordre du catalogue', () => {
    const c = makeCharacter({ featureChoices: { 'animaux-r1': [['fish', 'birds']] } });
    // L'ordre suit le catalogue (oiseaux avant poissons), pas l'ordre de sélection.
    expect(communicableAnimalCategories(c)).toEqual([
      'Mammifères',
      'Oiseaux',
      'Poissons (et mollusques)',
    ]);
  });
});

describe('animalFormCategories', () => {
  it('renvoie null si le personnage ne possède pas Forme animale', () => {
    expect(animalFormCategories(makeCharacter({ featureIds: [] }))).toBeNull();
  });

  it('druide natif : liste les formes accessibles (mammifères + choix), animaux fantastiques EXCLUS', () => {
    const c = makeCharacter({
      featureIds: ['animaux-r1', 'animaux-r5'],
      featureChoices: { 'animaux-r1': [['birds', 'fantastic-animals']] },
    });
    expect(animalFormCategories(c)).toEqual(['Mammifères', 'Oiseaux']);
  });

  it('druide natif : mammifères seuls si aucune catégorie supplémentaire choisie', () => {
    expect(animalFormCategories(makeCharacter({ featureIds: ['animaux-r1', 'animaux-r5'] }))).toEqual([
      'Mammifères',
    ]);
  });

  it('prestige SEUL (sans animaux-r1 natif) : une seule catégorie, PAS de mammifères en plus (p. 170)', () => {
    const c = makeCharacter({
      featureIds: ['animaux-r5'],
      featureChoices: { 'prestige-changeforme-r5': ['fish'] },
    });
    expect(animalFormCategories(c)).toEqual(['Poissons (et mollusques)']);
  });

  it('druide natif + changeforme : union des catégories des deux sources', () => {
    const c = makeCharacter({
      featureIds: ['animaux-r1', 'animaux-r5'],
      featureChoices: {
        'animaux-r1': [['birds']],
        'prestige-changeforme-r5': ['fish'],
      },
    });
    expect(animalFormCategories(c)).toEqual(['Mammifères', 'Oiseaux', 'Poissons (et mollusques)']);
  });
});

describe('knownAnimalFormCategoryIds', () => {
  it('renvoie null si le personnage ne possède pas Forme animale', () => {
    expect(knownAnimalFormCategoryIds(makeCharacter({ featureIds: [] }))).toBeNull();
  });

  it('prestige seul : ids = uniquement la catégorie choisie à prestige-changeforme-r5', () => {
    const c = makeCharacter({
      featureIds: ['animaux-r5'],
      featureChoices: { 'prestige-changeforme-r5': ['reptiles'] },
    });
    expect(knownAnimalFormCategoryIds(c)).toEqual(new Set(['reptiles']));
  });

  it('druide natif : mammals toujours inclus + choix de animaux-r1', () => {
    const c = makeCharacter({
      featureIds: ['animaux-r1', 'animaux-r5'],
      featureChoices: { 'animaux-r1': [['reptiles', 'fantastic-animals']] },
    });
    expect(knownAnimalFormCategoryIds(c)).toEqual(new Set(['mammals', 'reptiles']));
  });
});

describe('Forme animale (animaux-r5/prestige-changeforme-r5) désactive les capacités de profil (p. 114)', () => {
  it("forme INACTIVE : aucune capacité désactivée", () => {
    const c = makeCharacter({
      featureIds: ['animaux-r1', 'animaux-r5', 'fauve-r1'],
    });
    expect(profileFeaturesDisabledByTransformation(c).size).toBe(0);
  });

  it('druide natif, forme ACTIVE : les AUTRES voies de profil (fauve) sont désactivées', () => {
    const c = makeCharacter({
      featureIds: ['animaux-r1', 'animaux-r5', 'fauve-r1'],
      effectInputs: { 'animaux-r5': 'chat' },
    });
    const disabled = profileFeaturesDisabledByTransformation(c);
    expect(disabled.has('fauve-r1')).toBe(true);
  });

  it("druide natif, forme ACTIVE : Forme animale (animaux-r5) ELLE-MÊME reste utilisable (self-exemption), mais PAS les autres rangs de sa propre voie (retour propriétaire 2026-08-19, bug corrigé : exceptPathIds excluait TOUTE la voie)", () => {
    const c = makeCharacter({
      featureIds: ['animaux-r1', 'animaux-r5', 'fauve-r1'],
      effectInputs: { 'animaux-r5': 'chat' },
    });
    const disabled = profileFeaturesDisabledByTransformation(c);
    expect(disabled.has('animaux-r5')).toBe(false);
    // RAW p. 114 : « ne peut... utiliser ses propres capacités sous cette forme » — Langage des
    // animaux (r1) EST une capacité de profil comme une autre, elle doit être grisée.
    expect(disabled.has('animaux-r1')).toBe(true);
  });

  it("changeforme SEUL (pas druide), transformation ACTIVE : les autres voies de profil sont désactivées", () => {
    const c = makeCharacter({
      featureIds: ['combat-r1', 'prestige-changeforme-r4', 'prestige-changeforme-r5'],
      effectInputs: { 'animaux-r5': 'chat' },
    });
    const disabled = profileFeaturesDisabledByTransformation(c);
    expect(disabled.has('combat-r1')).toBe(true);
    // La voie du changeforme (PRESTIGE) n'est jamais visée par `disablesProfileFeatures` (réservé
    // aux voies de PROFIL, `Path.type === 'class'`) — Forme de voyage (r4) est bien désactivée,
    // mais par `disablesFeatures` (exclusion explicite), pas par ce mécanisme-ci.
    expect(disabled.has('prestige-changeforme-r4')).toBe(false);
    expect(disabled.has('prestige-changeforme-r5')).toBe(false);
    expect(disabledFeatureIds(c).has('prestige-changeforme-r4')).toBe(true);
  });

  it('druide ET changeforme (dédoublonné), forme ACTIVE : le changeforme (voie de prestige) reste utilisable, la voie des animaux (sauf animaux-r5) et Forme de voyage sont désactivées', () => {
    const c = makeCharacter({
      featureIds: [
        'animaux-r1',
        'animaux-r5',
        'fauve-r1',
        'prestige-changeforme-r4',
        'prestige-changeforme-r5',
        'prestige-changeforme-r7',
      ],
      effectInputs: { 'animaux-r5': 'ours' },
      transformationDerivedStats: { 'animaux-r5': { nc: 4, size: 'grande' } },
    });
    const disabled = profileFeaturesDisabledByTransformation(c);
    expect(disabled.has('fauve-r1')).toBe(true);
    expect(disabled.has('animaux-r1')).toBe(true);
    expect(disabled.has('animaux-r5')).toBe(false);
    // Les rangs 6/7/8 du changeforme (qui modifient l'usage de Forme animale) restent aussi utilisables
    // — voies de PRESTIGE, jamais ciblées par `disablesProfileFeatures`.
    expect(disabled.has('prestige-changeforme-r7')).toBe(false);
    // Forme de voyage (r4) : deux transformations animales à la fois n'ont aucun sens RAW —
    // désactivée par `disablesFeatures`, pas par `profileFeaturesDisabledByTransformation`.
    expect(disabled.has('prestige-changeforme-r4')).toBe(false);
    expect(disabledFeatureIds(c).has('prestige-changeforme-r4')).toBe(true);
  });
});
