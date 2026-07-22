import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Character } from './types';
import { animalFormCategories, communicableAnimalCategories } from './animalForms';

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
    companionInstances: {},
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

  it('liste les formes accessibles (mammifères + choix), animaux fantastiques EXCLUS', () => {
    const c = makeCharacter({
      featureIds: ['animaux-r5'],
      featureChoices: { 'animaux-r1': [['birds', 'fantastic-animals']] },
    });
    expect(animalFormCategories(c)).toEqual(['Mammifères', 'Oiseaux']);
  });

  it('mammifères seuls si aucune catégorie supplémentaire choisie', () => {
    expect(animalFormCategories(makeCharacter({ featureIds: ['animaux-r5'] }))).toEqual([
      'Mammifères',
    ]);
  });
});
