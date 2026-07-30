import { describe, expect, it } from 'vitest';

import {
  EMPTY_COMBAT_STATE,
  adjustStatusIntensity,
  applyStatusTo,
  clearStatusesOf,
  removeStatusFrom,
  resetCombat,
  rollTieBreakSeed,
  setRoundNumber,
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
      roundNumber: 4,
      statuses: { 'c-1': [{ id: 'blinded' }], 'char-9': [{ id: 'invalidating-attack', intensity: 2 }] },
      tieBreakSeed: 123456,
    };
    expect(reviveStateObject(state)).toEqual(state);
  });

  it('déduit nextInstanceId quand il manque (format courant partiel)', () => {
    const revived = reviveStateObject({ creatures: [{ id: 'c-1', slug: 'rat' }] });
    expect(revived.nextInstanceId).toBe(2);
    expect(revived.depletions).toEqual({});
    expect(revived.currentTurnKey).toBeNull();
  });

  it('défaute roundNumber à 0 pour un combat antérieur (absent ou invalide)', () => {
    expect(reviveStateObject({ creatures: [{ id: 'c-1', slug: 'rat' }] }).roundNumber).toBe(0);
    expect(reviveStateObject({ creatures: [], roundNumber: -3 }).roundNumber).toBe(0);
    expect(reviveStateObject({ creatures: [], roundNumber: 2.7 }).roundNumber).toBe(2);
    expect(reviveStateObject({ banditIds: [1] }).roundNumber).toBe(0);
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

  it('défaute statuses à {} pour un combat antérieur à PER-278 (migration douce)', () => {
    const revived = reviveStateObject({ creatures: [{ id: 'c-1', slug: 'rat' }] });
    expect(revived.statuses).toEqual({});
  });

  it('défaute statuses à {} en migrant l’ancien format « bandits »', () => {
    const revived = reviveStateObject({ banditIds: [1] });
    expect(revived.statuses).toEqual({});
  });

  it('assainit statuses : écarte les entrées mal formées et les combattants sans état', () => {
    const revived = reviveStateObject({
      creatures: [],
      statuses: {
        'char-1': [
          { id: 'blinded' },
          { id: 'invalidating-attack', intensity: 3 },
          { id: 42 }, // id non-chaîne → écarté
          'nope', // entrée non-objet → écartée
        ],
        'char-2': [], // combattant sans état → écarté
        'char-3': 'boom', // valeur non-tableau → écartée
      },
    });
    expect(revived.statuses).toEqual({
      'char-1': [{ id: 'blinded' }, { id: 'invalidating-attack', intensity: 3 }],
    });
  });

  it('normalise l’intensité : omet les valeurs ≤ 1 et tronque les décimales', () => {
    const revived = reviveStateObject({
      creatures: [],
      statuses: { 'char-1': [{ id: 'blinded', intensity: 1 }, { id: 'invalidating-attack', intensity: 2.9 }] },
    });
    expect(revived.statuses['char-1']).toEqual([{ id: 'blinded' }, { id: 'invalidating-attack', intensity: 2 }]);
  });
});

describe('applyStatusTo', () => {
  const base: GmCombatState = { ...EMPTY_COMBAT_STATE, statuses: {} };

  it('pose un état binaire sans intensité (convention « absent = 1 »)', () => {
    const next = applyStatusTo(base, 'char-1', 'blinded');
    expect(next.statuses).toEqual({ 'char-1': [{ id: 'blinded' }] });
  });

  it('borne l’intensité d’un état binaire à 1 (plafond du catalogue)', () => {
    const next = applyStatusTo(base, 'char-1', 'blinded', 5);
    expect(next.statuses['char-1']).toEqual([{ id: 'blinded' }]);
  });

  it('pose un état cumulatif à l’intensité demandée, plafonnée', () => {
    expect(applyStatusTo(base, 'c-1', 'invalidating-attack', 2).statuses['c-1']).toEqual([
      { id: 'invalidating-attack', intensity: 2 },
    ]);
    // Au-delà du plafond (max 3) → borné à 3.
    expect(applyStatusTo(base, 'c-1', 'invalidating-attack', 9).statuses['c-1']).toEqual([
      { id: 'invalidating-attack', intensity: 3 },
    ]);
  });

  it('est idempotent par (combattant, état) : ré-appliquer fixe l’intensité sans dupliquer', () => {
    const once = applyStatusTo(base, 'c-1', 'invalidating-attack', 1);
    const twice = applyStatusTo(once, 'c-1', 'invalidating-attack', 3);
    expect(twice.statuses['c-1']).toEqual([{ id: 'invalidating-attack', intensity: 3 }]);
  });

  it('cumule des états distincts sur le même combattant', () => {
    const next = applyStatusTo(applyStatusTo(base, 'c-1', 'blinded'), 'c-1', 'invalidating-attack', 2);
    expect(next.statuses['c-1']).toEqual([
      { id: 'blinded' },
      { id: 'invalidating-attack', intensity: 2 },
    ]);
  });

  it('ne mute pas l’état source (pur)', () => {
    applyStatusTo(base, 'c-1', 'blinded');
    expect(base.statuses).toEqual({});
  });
});

describe('removeStatusFrom', () => {
  const withStatuses: GmCombatState = {
    ...EMPTY_COMBAT_STATE,
    statuses: { 'c-1': [{ id: 'blinded' }, { id: 'invalidating-attack', intensity: 2 }] },
  };

  it('retire un état et conserve les autres', () => {
    expect(removeStatusFrom(withStatuses, 'c-1', 'blinded').statuses['c-1']).toEqual([
      { id: 'invalidating-attack', intensity: 2 },
    ]);
  });

  it('nettoie la clé du combattant quand il ne reste aucun état', () => {
    const only: GmCombatState = { ...EMPTY_COMBAT_STATE, statuses: { 'c-1': [{ id: 'blinded' }] } };
    expect(removeStatusFrom(only, 'c-1', 'blinded').statuses).toEqual({});
  });

  it('no-op si l’état n’est pas posé', () => {
    expect(removeStatusFrom(withStatuses, 'c-1', 'slowed')).toBe(withStatuses);
    expect(removeStatusFrom(withStatuses, 'absent', 'blinded')).toBe(withStatuses);
  });
});

describe('adjustStatusIntensity', () => {
  const withStacking: GmCombatState = {
    ...EMPTY_COMBAT_STATE,
    statuses: { 'c-1': [{ id: 'invalidating-attack', intensity: 2 }] },
  };

  it('incrémente l’intensité, plafonnée', () => {
    expect(adjustStatusIntensity(withStacking, 'c-1', 'invalidating-attack', 1).statuses['c-1']).toEqual([
      { id: 'invalidating-attack', intensity: 3 },
    ]);
    // Déjà à 2, +5 → borné à 3.
    expect(adjustStatusIntensity(withStacking, 'c-1', 'invalidating-attack', 5).statuses['c-1']).toEqual([
      { id: 'invalidating-attack', intensity: 3 },
    ]);
  });

  it('décrémente jusqu’à 1 (omission de l’intensité), sans retirer l’état', () => {
    const down = adjustStatusIntensity(withStacking, 'c-1', 'invalidating-attack', -5);
    expect(down.statuses['c-1']).toEqual([{ id: 'invalidating-attack' }]);
  });

  it('no-op si l’état n’est pas posé', () => {
    expect(adjustStatusIntensity(withStacking, 'c-1', 'blinded', 1)).toBe(withStacking);
    expect(adjustStatusIntensity(withStacking, 'absent', 'invalidating-attack', 1)).toBe(withStacking);
  });
});

describe('clearStatusesOf', () => {
  it('retire tous les états d’un combattant', () => {
    const state: GmCombatState = {
      ...EMPTY_COMBAT_STATE,
      statuses: { 'c-1': [{ id: 'blinded' }], 'c-2': [{ id: 'slowed' }] },
    };
    expect(clearStatusesOf(state, 'c-1').statuses).toEqual({ 'c-2': [{ id: 'slowed' }] });
  });

  it('no-op si le combattant n’a aucun état', () => {
    const state: GmCombatState = { ...EMPTY_COMBAT_STATE, statuses: { 'c-1': [{ id: 'blinded' }] } };
    expect(clearStatusesOf(state, 'absent')).toBe(state);
  });
});

describe('resetCombat', () => {
  const inCombat: GmCombatState = {
    creatures: [
      { id: 'c-1', slug: 'gobelin', side: 'enemy' },
      { id: 'c-2', slug: 'loup', side: 'ally' },
    ],
    nextInstanceId: 3,
    depletions: { 'c-1': { hp: { lethal: 4, temp: 0 } } },
    currentTurnKey: 'c-2',
    roundNumber: 5,
    statuses: { 'c-1': [{ id: 'blinded' }], 'char-9': [{ id: 'invalidating-attack', intensity: 2 }] },
    tieBreakSeed: 42,
  };

  it('vide les états, le tour courant, le compteur de manche et les PV des créatures', () => {
    const reset = resetCombat(inCombat);
    expect(reset.statuses).toEqual({});
    expect(reset.currentTurnKey).toBeNull();
    expect(reset.roundNumber).toBe(0);
    expect(reset.depletions).toEqual({});
  });

  it('conserve le roster de créatures (creatures + nextInstanceId)', () => {
    const reset = resetCombat(inCombat);
    expect(reset.creatures).toEqual(inCombat.creatures);
    expect(reset.nextInstanceId).toBe(3);
  });

  it('ne mute pas l’état source (pur)', () => {
    resetCombat(inCombat);
    expect(inCombat.statuses).toEqual({ 'c-1': [{ id: 'blinded' }], 'char-9': [{ id: 'invalidating-attack', intensity: 2 }] });
    expect(inCombat.currentTurnKey).toBe('c-2');
    expect(inCombat.depletions).toEqual({ 'c-1': { hp: { lethal: 4, temp: 0 } } });
  });

  it('conserve la graine de départage (le retirage est explicite, cf. rollTieBreakSeed)', () => {
    expect(resetCombat(inCombat).tieBreakSeed).toBe(42);
  });
});

describe('rollTieBreakSeed', () => {
  it('pose la nouvelle graine sans rien toucher d’autre', () => {
    const state: GmCombatState = { ...EMPTY_COMBAT_STATE, roundNumber: 3, tieBreakSeed: 7 };
    const rolled = rollTieBreakSeed(state, 99);
    expect(rolled.tieBreakSeed).toBe(99);
    expect(rolled.roundNumber).toBe(3);
    expect(state.tieBreakSeed).toBe(7);
  });
});

describe('setRoundNumber', () => {
  it('fixe le compteur de manche', () => {
    expect(setRoundNumber(EMPTY_COMBAT_STATE, 3).roundNumber).toBe(3);
  });

  it('borne à ≥ 0 et tronque les décimales', () => {
    expect(setRoundNumber(EMPTY_COMBAT_STATE, -1).roundNumber).toBe(0);
    expect(setRoundNumber(EMPTY_COMBAT_STATE, 2.9).roundNumber).toBe(2);
  });

  it('renvoie la même référence si la valeur est inchangée (no-op)', () => {
    const state: GmCombatState = { ...EMPTY_COMBAT_STATE, roundNumber: 4 };
    expect(setRoundNumber(state, 4)).toBe(state);
    expect(setRoundNumber(state, 4.2)).toBe(state);
  });

  it('ne mute pas l’état source (pur)', () => {
    const state: GmCombatState = { ...EMPTY_COMBAT_STATE, roundNumber: 1 };
    setRoundNumber(state, 9);
    expect(state.roundNumber).toBe(1);
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
