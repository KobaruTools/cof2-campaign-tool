import { describe, expect, it } from 'vitest';

import {
  EMPTY_COMBAT_STATE,
  reviveState,
  reviveStateObject,
  storageKey,
  type GmCombatState,
} from './combatState';

describe('storageKey', () => {
  it('dérive la clé localStorage dédiée par campagne', () => {
    expect(storageKey('abc')).toBe('gm-combat:abc');
  });
});

describe('reviveStateObject', () => {
  it('renvoie l’état vide pour une valeur non-objet', () => {
    expect(reviveStateObject(null)).toBe(EMPTY_COMBAT_STATE);
    expect(reviveStateObject(42)).toBe(EMPTY_COMBAT_STATE);
    expect(reviveStateObject('nope')).toBe(EMPTY_COMBAT_STATE);
  });

  it('conserve le format courant (creatures) tel quel', () => {
    const state: GmCombatState = {
      creatures: [
        { id: 'c-1', slug: 'gobelin', visible: false, side: 'enemy' },
        { id: 'c-2', slug: 'loup', side: 'ally' },
      ],
      nextInstanceId: 3,
      depletions: { 'c-1': { hp: { lethal: 2, temp: 0 } } },
      currentTurnKey: 'c-2',
    };
    expect(reviveStateObject(state)).toEqual(state);
  });

  it('déduit nextInstanceId quand il manque (format courant partiel)', () => {
    const revived = reviveStateObject({ creatures: [{ id: 'c-1', slug: 'rat' }] });
    expect(revived.nextInstanceId).toBe(2);
    expect(revived.depletions).toEqual({});
    expect(revived.currentTurnKey).toBeNull();
  });

  it('migre l’ancien format « bandits » en instances bandit-de-base', () => {
    const revived = reviveStateObject({
      banditIds: [1, 2],
      nextBanditId: 3,
      banditDepletions: { 1: { hp: { lethal: 4, temp: 0 } } },
      currentTurnKey: 'bandit-2',
    });
    expect(revived.creatures).toEqual([
      { id: 'bandit-1', slug: 'bandit-de-base' },
      { id: 'bandit-2', slug: 'bandit-de-base' },
    ]);
    expect(revived.nextInstanceId).toBe(3);
    expect(revived.depletions).toEqual({ 'bandit-1': { hp: { lethal: 4, temp: 0 } } });
    expect(revived.currentTurnKey).toBe('bandit-2');
  });

  it('renvoie l’état vide pour un objet non reconnu', () => {
    expect(reviveStateObject({ foo: 'bar' })).toBe(EMPTY_COMBAT_STATE);
  });
});

describe('reviveState (chaîne JSON)', () => {
  it('parse une chaîne valide', () => {
    const revived = reviveState(JSON.stringify({ creatures: [{ id: 'c-1', slug: 'orc' }] }));
    expect(revived.creatures).toHaveLength(1);
    expect(revived.creatures[0].slug).toBe('orc');
  });

  it('renvoie l’état vide pour une chaîne invalide', () => {
    expect(reviveState('{not json')).toBe(EMPTY_COMBAT_STATE);
  });
});
