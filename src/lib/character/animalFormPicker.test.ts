import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Character } from './types';
import {
  hasGiantOrPrehistoricAnimalFormAccess,
  maxAnimalFormSize,
  sizeWithinLimit,
} from './animalFormPicker';

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

describe('maxAnimalFormSize', () => {
  it('plafonne à moyenne sans la voie de prestige', () => {
    expect(maxAnimalFormSize(makeCharacter({ featureIds: ['animaux-r5'] }))).toBe('moyenne');
  });

  it('grande avec le rang 7 du changeforme', () => {
    expect(
      maxAnimalFormSize(makeCharacter({ featureIds: ['animaux-r5', 'prestige-changeforme-r7'] })),
    ).toBe('grande');
  });

  it('énorme avec le rang 8 du changeforme', () => {
    expect(
      maxAnimalFormSize(makeCharacter({ featureIds: ['animaux-r5', 'prestige-changeforme-r8'] })),
    ).toBe('enorme');
  });
});

describe('sizeWithinLimit', () => {
  it('refuse une créature sans taille', () => {
    expect(sizeWithinLimit(undefined, 'moyenne')).toBe(false);
  });

  it('refuse une taille au-delà du plafond (colossale > énorme)', () => {
    expect(sizeWithinLimit('colossale', 'enorme')).toBe(false);
  });

  it('accepte une taille dans le plafond', () => {
    expect(sizeWithinLimit('petite', 'moyenne')).toBe(true);
  });
});

describe('hasGiantOrPrehistoricAnimalFormAccess', () => {
  it('false sans aucun rang du changeforme', () => {
    expect(hasGiantOrPrehistoricAnimalFormAccess(makeCharacter({ featureIds: ['animaux-r5'] }))).toBe(
      false,
    );
  });

  it('true avec le rang 6', () => {
    expect(
      hasGiantOrPrehistoricAnimalFormAccess(
        makeCharacter({ featureIds: ['animaux-r5', 'prestige-changeforme-r6'] }),
      ),
    ).toBe(true);
  });

  it('true avec le rang 7 (implique r6 en jeu normal, vérifié par sécurité)', () => {
    expect(
      hasGiantOrPrehistoricAnimalFormAccess(
        makeCharacter({ featureIds: ['animaux-r5', 'prestige-changeforme-r7'] }),
      ),
    ).toBe(true);
  });

  it('true avec le rang 8', () => {
    expect(
      hasGiantOrPrehistoricAnimalFormAccess(
        makeCharacter({ featureIds: ['animaux-r5', 'prestige-changeforme-r8'] }),
      ),
    ).toBe(true);
  });
});
