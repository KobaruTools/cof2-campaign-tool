import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Character } from './types';
import {
  animalFormManaCostFeature,
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

describe('animalFormManaCostFeature', () => {
  const feature = { id: 'animaux-r5', manaCost: undefined } as { id: string; manaCost?: number };

  it('inchangé sans personnage', () => {
    expect(animalFormManaCostFeature(undefined, feature)).toBe(feature);
  });

  it("inchangé pour une capacité qui n'est pas Forme animale", () => {
    const character = makeCharacter({
      effectInputs: { 'animaux-r5': 'cheval' },
      transformationDerivedStats: { 'animaux-r5': { nc: 1, size: 'grande' } },
    });
    expect(animalFormManaCostFeature(character, { id: 'autre-capacite' })).toEqual({ id: 'autre-capacite' });
  });

  it('inchangé sans forme active (aucune saisie)', () => {
    const character = makeCharacter({ transformationDerivedStats: { 'animaux-r5': { nc: 1, size: 'grande' } } });
    expect(animalFormManaCostFeature(character, feature)).toBe(feature);
  });

  it('inchangé pour une forme Petite/Moyenne (RAW ne formule le coût que pour Grande/Énorme)', () => {
    const character = makeCharacter({
      effectInputs: { 'animaux-r5': 'loup' },
      transformationDerivedStats: { 'animaux-r5': { nc: 1, size: 'moyenne' } },
    });
    expect(animalFormManaCostFeature(character, feature)).toBe(feature);
  });

  it('2 + NC pour un cheval (Grande, NC 1) — exemple verbatim p. 170 : 3 PM', () => {
    const character = makeCharacter({
      effectInputs: { 'animaux-r5': 'cheval' },
      transformationDerivedStats: { 'animaux-r5': { nc: 1, size: 'grande' } },
    });
    expect(animalFormManaCostFeature(character, feature)).toEqual({ ...feature, manaCost: 3 });
  });

  it('2 + NC pour un loup géant (Grande, NC 4) — exemple verbatim p. 170 : 6 PM', () => {
    const character = makeCharacter({
      effectInputs: { 'animaux-r5': 'loup-geant' },
      transformationDerivedStats: { 'animaux-r5': { nc: 4, size: 'grande' } },
    });
    expect(animalFormManaCostFeature(character, feature)).toEqual({ ...feature, manaCost: 6 });
  });

  it('2 + NC pour une forme Énorme (r8, « mêmes règles »)', () => {
    const character = makeCharacter({
      effectInputs: { 'animaux-r5': 'elephant' },
      transformationDerivedStats: { 'animaux-r5': { nc: 6, size: 'enorme' } },
    });
    expect(animalFormManaCostFeature(character, feature)).toEqual({ ...feature, manaCost: 8 });
  });

  it('même règle pour la carte prestige-changeforme-r5 (druide + changeforme, même clé effectInputs)', () => {
    const changeformeFeature = { id: 'prestige-changeforme-r5', manaCost: undefined } as {
      id: string;
      manaCost?: number;
    };
    const character = makeCharacter({
      featureIds: ['animaux-r1', 'animaux-r5', 'prestige-changeforme-r5', 'prestige-changeforme-r7'],
      effectInputs: { 'animaux-r5': 'cheval' },
      transformationDerivedStats: { 'animaux-r5': { nc: 1, size: 'grande' } },
    });
    expect(animalFormManaCostFeature(character, changeformeFeature)).toEqual({
      ...changeformeFeature,
      manaCost: 3,
    });
  });
});
