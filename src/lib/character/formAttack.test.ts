import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import { activeFormAttacks, formAttackDice, rangedReplacingFormAttack } from './formAttack';

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'guerrier',
    level: 8,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: null,
    playerId: null,
    status: 'active',
    abilities: { AGI: 2, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
    baseAbilities: { AGI: 2, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
    ancestryChoices: [],
    ancestryPathId: 'humain',
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
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

/** Lycanthrope avec « Forme hybride » (r4) acquise ; interrupteur de forme au choix. */
function lycanthrope(hybrid: boolean, extra: string[] = []): Character {
  return makeCharacter({
    featureIds: ['prestige-lycanthrope-r4', ...extra],
    effectToggles: { 'prestige-lycanthrope-r4': [hybrid] },
  });
}

describe('formAttack — morsure de la forme hybride (lycanthrope r4, p. 130)', () => {
  it('aucune attaque de forme sans la capacité', () => {
    expect(activeFormAttacks(makeCharacter())).toEqual([]);
    expect(rangedReplacingFormAttack(makeCharacter())).toBeNull();
  });

  it('capacité acquise mais forme INACTIVE : aucune morsure (l’interrupteur gate tout)', () => {
    expect(activeFormAttacks(lycanthrope(false))).toEqual([]);
    expect(rangedReplacingFormAttack(lycanthrope(false))).toBeNull();
  });

  it('forme hybride ACTIVE : morsure au contact 1d4° + FOR, action gratuite 1×/round', () => {
    const attacks = activeFormAttacks(lycanthrope(true));
    expect(attacks).toHaveLength(1);
    const bite = attacks[0];
    expect(bite.featureId).toBe('prestige-lycanthrope-r4');
    expect(bite.name).toBe('Morsure');
    expect(bite.damage).toEqual({ count: 1, die: 'd4' });
    expect(bite.evolving).toBe(true);
    expect(bite.damageAbilities).toEqual(['FOR']);
    expect(bite.scope).toBe('melee');
    expect(bite.actionTypes).toEqual(['G']);
    expect(bite.frequency).toBe('une fois par round');
    expect(bite.page).toBe(130);
  });

  it('forme hybride ACTIVE : la morsure REMPLACE l’attaque à distance (tir interdit sous cette forme)', () => {
    const bite = rangedReplacingFormAttack(lycanthrope(true));
    expect(bite?.name).toBe('Morsure');
    expect(bite?.replacesRangedAttack).toBe(true);
  });

  it('forme de LOUP active (r5) : aucune morsure conférée ici — c’est la mini-fiche du loup qui la porte', () => {
    const wolf = makeCharacter({
      featureIds: ['prestige-lycanthrope-r4', 'prestige-lycanthrope-r5'],
      effectToggles: { 'prestige-lycanthrope-r5': [true] },
    });
    expect(activeFormAttacks(wolf)).toEqual([]);
    expect(rangedReplacingFormAttack(wolf)).toBeNull();
  });

  it('notation des dés : « 1d4° »', () => {
    const bite = rangedReplacingFormAttack(lycanthrope(true))!;
    expect(formAttackDice(bite)).toBe('1d4°');
  });
});
