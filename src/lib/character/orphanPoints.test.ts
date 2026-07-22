import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Character, type LevelUpEntry } from './types';
import { applyLevelUp } from './levelUp';
import { mergeMods, orphanMods, orphanRewards, orphanSourceTerms } from './orphanPoints';

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'guerrier',
    level: 1,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: 'default-campaign',
    playerId: 'default-player',
    status: 'active',
    abilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    baseAbilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    ancestryChoices: [],
    ancestryPathId: 'humain',
    featureIds: [],
    featureChoices: {},
    effectToggles: {},
    effectInputs: {},
    usageCounters: {},
    depletion: {},
    companionDepletion: {},
    purse: { platinum: 0, gold: 0, silver: 0, copper: 0 },
    levelUpHistory: [],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const history = (...entries: LevelUpEntry[]): LevelUpEntry[] => entries;

describe('orphanMods', () => {
  it('agrège les conversions de tout l’historique en modificateurs dérivés', () => {
    const c = makeCharacter({
      level: 3,
      levelUpHistory: history(
        { level: 1, chosenFeatureIds: [] },
        { level: 2, chosenFeatureIds: ['x'], orphanRewards: ['luck', 'hp'] },
        { level: 3, chosenFeatureIds: ['y'], orphanRewards: ['recovery-die', 'mana'] },
      ),
    });
    // luck +1, hp +2, recovery-die +1, mana +2.
    expect(orphanMods(c)).toEqual({
      luckPoints: 1,
      maxHp: 2,
      recoveryDiceCount: 1,
      manaPoints: 2,
    });
  });

  it('cumule les récompenses identiques', () => {
    const c = makeCharacter({
      level: 3,
      levelUpHistory: history(
        { level: 2, chosenFeatureIds: [], orphanRewards: ['hp'] },
        { level: 3, chosenFeatureIds: [], orphanRewards: ['hp'] },
      ),
    });
    expect(orphanMods(c)).toEqual({ maxHp: 4 });
  });

  it('aucune conversion → modificateurs vides', () => {
    expect(orphanMods(makeCharacter())).toEqual({});
    expect(orphanRewards(makeCharacter())).toEqual([]);
  });
});

describe('orphanSourceTerms', () => {
  it('détaille chaque point converti avec son niveau d’origine', () => {
    const c = makeCharacter({
      level: 4,
      levelUpHistory: history(
        { level: 2, chosenFeatureIds: [], orphanRewards: ['luck'] },
        { level: 4, chosenFeatureIds: [], orphanRewards: ['luck'] },
      ),
    });
    expect(orphanSourceTerms(c)).toEqual({
      luckPoints: [
        { label: 'Point orphelin (niv. 2)', value: 1 },
        { label: 'Point orphelin (niv. 4)', value: 1 },
      ],
    });
  });
});

describe('mergeMods', () => {
  it('somme clé à clé sans muter les entrées', () => {
    const a = { maxHp: 2, luckPoints: 1 };
    const b = { maxHp: 3, initiative: 1 };
    expect(mergeMods(a, b)).toEqual({ maxHp: 5, luckPoints: 1, initiative: 1 });
    expect(a).toEqual({ maxHp: 2, luckPoints: 1 });
  });
});

describe('applyLevelUp avec points orphelins', () => {
  it('journalise les récompenses sur l’entrée du niveau', () => {
    const c = makeCharacter({ level: 1, levelUpHistory: history({ level: 1, chosenFeatureIds: [] }) });
    const leveled = applyLevelUp(c, ['rage-r1'], ['luck']);
    const last = leveled.levelUpHistory[leveled.levelUpHistory.length - 1];
    expect(last).toEqual({ level: 2, chosenFeatureIds: ['rage-r1'], orphanRewards: ['luck'] });
  });

  it('n’ajoute pas de champ quand aucune récompense', () => {
    const c = makeCharacter({ level: 1, levelUpHistory: history({ level: 1, chosenFeatureIds: [] }) });
    const last = applyLevelUp(c, ['rage-r1']).levelUpHistory.at(-1)!;
    expect(last).toEqual({ level: 2, chosenFeatureIds: ['rage-r1'] });
    expect('orphanRewards' in last).toBe(false);
  });
});
