import { describe, expect, it } from 'vitest';

import { STATUS_DURATION_MAX } from '@/lib/character/statusEffects';
import {
  CREATURE_ADD_COUNT_MAX,
  CREATURE_NAME_MAX_LENGTH,
  EMPTY_COMBAT_STATE,
  addCreatures,
  addCustomCreatures,
  adjustStatusDuration,
  adjustStatusIntensity,
  applyStatusTo,
  applyStatusToKeys,
  clampAddCount,
  clearAllStatuses,
  clearStatusesOf,
  creatureInfoEquals,
  duplicateCreature,
  labelCreatureInstances,
  normalizeCreatureName,
  removeStatusFrom,
  removeStatusFromKeys,
  resetCombat,
  restartRounds,
  rollTieBreakSeed,
  setRoundNumber,
  reviveState,
  reviveStateObject,
  storageKey,
  updateCreature,
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
      creatureInfo: { gobelin: { name: 'Gobelin', initiative: 12, agility: 2 } },
    };
    expect(reviveStateObject(state)).toEqual(state);
  });

  it('déduit nextInstanceId quand il manque (format courant partiel)', () => {
    const revived = reviveStateObject({ creatures: [{ id: 'c-1', slug: 'rat' }] });
    expect(revived.nextInstanceId).toBe(2);
    expect(revived.depletions).toEqual({});
    expect(revived.currentTurnKey).toBeNull();
  });

  it('défaute roundNumber à 1 pour un combat antérieur (absent, invalide ou 0)', () => {
    expect(reviveStateObject({ creatures: [{ id: 'c-1', slug: 'rat' }] }).roundNumber).toBe(1);
    expect(reviveStateObject({ creatures: [], roundNumber: 0 }).roundNumber).toBe(1);
    expect(reviveStateObject({ creatures: [], roundNumber: -3 }).roundNumber).toBe(1);
    expect(reviveStateObject({ creatures: [], roundNumber: 2.7 }).roundNumber).toBe(2);
    expect(reviveStateObject({ banditIds: [1] }).roundNumber).toBe(1);
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

  it('relit le compteur de tours, décimales tronquées et valeurs non finies écartées (PER-305)', () => {
    const revived = reviveStateObject({
      creatures: [],
      statuses: {
        'char-1': [
          { id: 'dazed', untilRound: 7.9 },
          { id: 'blinded', untilRound: 'trois' }, // non-nombre → pas de compteur
          { id: 'slowed', untilRound: Number.NaN }, // non fini → pas de compteur
          { id: 'prone', untilRound: 2 }, // manche déjà dépassée : expiré, mais CONSERVÉ
        ],
      },
    });
    expect(revived.statuses['char-1']).toEqual([
      { id: 'dazed', untilRound: 7 },
      { id: 'blinded' },
      { id: 'slowed' },
      { id: 'prone', untilRound: 2 },
    ]);
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

  it('conserve le compteur de tours d’un état déjà posé (PER-305)', () => {
    const timed: GmCombatState = {
      ...EMPTY_COMBAT_STATE,
      roundNumber: 5,
      statuses: { 'c-1': [{ id: 'invalidating-attack', intensity: 1, untilRound: 7 }] },
    };
    expect(applyStatusTo(timed, 'c-1', 'invalidating-attack', 3).statuses['c-1']).toEqual([
      { id: 'invalidating-attack', intensity: 3, untilRound: 7 },
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

// POSE DE GROUPE (PER-104) : « ses alliés et lui » se pose en UNE fois — un seul nouvel état, donc
// une seule écriture et une seule diffusion Realtime (poser N fois de suite en déclencherait N).
describe('applyStatusToKeys (buff de groupe)', () => {
  const base: GmCombatState = { ...EMPTY_COMBAT_STATE, roundNumber: 3 };

  it('pose l’état sur tous les combattants listés, en un seul état', () => {
    const next = applyStatusToKeys(base, ['char-1', 'char-2', 'c-3'], 'heroes-song');
    expect(next.statuses).toEqual({
      'char-1': [{ id: 'heroes-song' }],
      'char-2': [{ id: 'heroes-song' }],
      'c-3': [{ id: 'heroes-song' }],
    });
  });

  it('applique le palier (intensité) à tout le camp, plafonné par le catalogue', () => {
    const next = applyStatusToKeys(base, ['char-1', 'char-2'], 'heroes-song', { intensity: 2 });
    expect(next.statuses['char-1']).toEqual([{ id: 'heroes-song', intensity: 2 }]);
    expect(next.statuses['char-2']).toEqual([{ id: 'heroes-song', intensity: 2 }]);
    // Plafond de « Chant des héros » : 2 paliers (+1 / +2 au rang 5).
    expect(
      applyStatusToKeys(base, ['char-1'], 'heroes-song', { intensity: 9 }).statuses['char-1'],
    ).toEqual([{ id: 'heroes-song', intensity: 2 }]);
  });

  it('sans durée, aucun compteur : le buff dure jusqu’à ce que le MJ le retire', () => {
    const next = applyStatusToKeys(base, ['char-1'], 'blessing');
    expect(next.statuses['char-1'][0].untilRound).toBeUndefined();
  });

  it('avec une durée en tours, écrit la manche de FIN (bornes incluses)', () => {
    // 4 tours à partir de la manche 3 → dernière manche couverte : 6.
    const next = applyStatusToKeys(base, ['char-1', 'char-2'], 'blessing', { rounds: 4 });
    expect(next.statuses['char-1']).toEqual([{ id: 'blessing', untilRound: 6 }]);
    expect(next.statuses['char-2']).toEqual([{ id: 'blessing', untilRound: 6 }]);
  });

  it('borne la durée au garde-fou de saisie', () => {
    const next = applyStatusToKeys(base, ['char-1'], 'blessing', { rounds: 999 });
    expect(next.statuses['char-1'][0].untilRound).toBe(3 + STATUS_DURATION_MAX - 1);
  });

  it('conserve les autres états déjà posés sur les mêmes combattants', () => {
    const hurt: GmCombatState = { ...base, statuses: { 'char-1': [{ id: 'prone' }] } };
    expect(applyStatusToKeys(hurt, ['char-1'], 'heroes-song').statuses['char-1']).toEqual([
      { id: 'prone' },
      { id: 'heroes-song' },
    ]);
  });

  it('reposer le buff ajuste le palier sans dupliquer, et conserve un compteur déjà posé', () => {
    const once = applyStatusToKeys(base, ['char-1'], 'heroes-song', { rounds: 2 });
    const twice = applyStatusToKeys(once, ['char-1'], 'heroes-song', { intensity: 2 });
    expect(twice.statuses['char-1']).toEqual([
      { id: 'heroes-song', intensity: 2, untilRound: 4 },
    ]);
  });

  it('une durée fournie à la repose REMPLACE le compteur en place (geste délibéré du MJ)', () => {
    const once = applyStatusToKeys(base, ['char-1'], 'heroes-song', { rounds: 2 });
    const twice = applyStatusToKeys(once, ['char-1'], 'heroes-song', { rounds: 5 });
    expect(twice.statuses['char-1']).toEqual([{ id: 'heroes-song', untilRound: 7 }]);
  });

  it('no-op (même référence) sur une liste vide de combattants', () => {
    expect(applyStatusToKeys(base, [], 'heroes-song')).toBe(base);
  });

  it('no-op quand la pose ne change rien (évite une écriture + une diffusion pour rien)', () => {
    const once = applyStatusToKeys(base, ['char-1', 'char-2'], 'heroes-song');
    expect(applyStatusToKeys(once, ['char-1', 'char-2'], 'heroes-song')).toBe(once);
  });

  it('ignore les doublons de clés (le même combattant coché deux fois)', () => {
    const next = applyStatusToKeys(base, ['char-1', 'char-1'], 'heroes-song');
    expect(next.statuses['char-1']).toEqual([{ id: 'heroes-song' }]);
  });

  it('ne mute pas l’état source (pur)', () => {
    applyStatusToKeys(base, ['char-1'], 'heroes-song');
    expect(base.statuses).toEqual({});
  });
});

describe('removeStatusFromKeys (retrait de groupe)', () => {
  const posed: GmCombatState = {
    ...EMPTY_COMBAT_STATE,
    statuses: {
      'char-1': [{ id: 'prone' }, { id: 'heroes-song' }],
      'char-2': [{ id: 'heroes-song' }],
      'c-3': [{ id: 'blinded' }],
    },
  };

  it('retire l’état de tous les combattants listés, en une fois', () => {
    const next = removeStatusFromKeys(posed, ['char-1', 'char-2', 'c-3'], 'heroes-song');
    expect(next.statuses).toEqual({ 'char-1': [{ id: 'prone' }], 'c-3': [{ id: 'blinded' }] });
  });

  it('ne touche pas aux combattants non listés', () => {
    const next = removeStatusFromKeys(posed, ['char-1'], 'heroes-song');
    expect(next.statuses['char-2']).toEqual([{ id: 'heroes-song' }]);
  });

  it('no-op (même référence) si aucun des combattants ne porte l’état', () => {
    expect(removeStatusFromKeys(posed, ['c-3', 'absent'], 'heroes-song')).toBe(posed);
    expect(removeStatusFromKeys(posed, [], 'heroes-song')).toBe(posed);
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

  it('conserve le compteur de tours (PER-305)', () => {
    const timed: GmCombatState = {
      ...withStacking,
      statuses: { 'c-1': [{ id: 'invalidating-attack', intensity: 2, untilRound: 9 }] },
    };
    expect(adjustStatusIntensity(timed, 'c-1', 'invalidating-attack', -1).statuses['c-1']).toEqual([
      { id: 'invalidating-attack', untilRound: 9 },
    ]);
  });
});

describe('adjustStatusDuration (PER-305)', () => {
  /** Combat à la manche 5 avec un Étourdi posé sans compteur de tours. */
  const round5: GmCombatState = {
    ...EMPTY_COMBAT_STATE,
    roundNumber: 5,
    statuses: { 'c-1': [{ id: 'dazed' }] },
  };

  it('amorce le compteur à 1 tour (la manche courante) quand il n’y en a pas', () => {
    expect(adjustStatusDuration(round5, 'c-1', 'dazed', 1).statuses['c-1']).toEqual([
      { id: 'dazed', untilRound: 5 },
    ]);
  });

  it('allonge la durée d’un tour, en manche de FIN absolue', () => {
    const twice = adjustStatusDuration(adjustStatusDuration(round5, 'c-1', 'dazed', 1), 'c-1', 'dazed', 1);
    // 2 tours restants à la manche 5 → couvre les manches 5 et 6.
    expect(twice.statuses['c-1']).toEqual([{ id: 'dazed', untilRound: 6 }]);
  });

  it('raccourcit la durée d’un tour', () => {
    const state: GmCombatState = { ...round5, statuses: { 'c-1': [{ id: 'dazed', untilRound: 7 }] } };
    expect(adjustStatusDuration(state, 'c-1', 'dazed', -1).statuses['c-1']).toEqual([
      { id: 'dazed', untilRound: 6 },
    ]);
  });

  it('descendre sous 1 RETIRE le compteur sans retirer l’état', () => {
    const state: GmCombatState = { ...round5, statuses: { 'c-1': [{ id: 'dazed', untilRound: 5 }] } };
    expect(adjustStatusDuration(state, 'c-1', 'dazed', -1).statuses['c-1']).toEqual([{ id: 'dazed' }]);
  });

  it('relance d’un tour un compteur EXPIRÉ (il repart de 0)', () => {
    const expired: GmCombatState = { ...round5, statuses: { 'c-1': [{ id: 'dazed', untilRound: 2 }] } };
    expect(adjustStatusDuration(expired, 'c-1', 'dazed', 1).statuses['c-1']).toEqual([
      { id: 'dazed', untilRound: 5 },
    ]);
  });

  it('borne la durée au garde-fou de saisie', () => {
    const long: GmCombatState = { ...round5, statuses: { 'c-1': [{ id: 'dazed', untilRound: 103 }] } };
    // 99 tours restants au maximum, comptés depuis la manche courante.
    expect(adjustStatusDuration(long, 'c-1', 'dazed', 1).statuses['c-1']).toEqual([
      { id: 'dazed', untilRound: 5 + STATUS_DURATION_MAX - 1 },
    ]);
  });

  it('conserve l’intensité d’un état cumulatif', () => {
    const stacking: GmCombatState = {
      ...round5,
      statuses: { 'c-1': [{ id: 'invalidating-attack', intensity: 2 }] },
    };
    expect(adjustStatusDuration(stacking, 'c-1', 'invalidating-attack', 2).statuses['c-1']).toEqual([
      { id: 'invalidating-attack', intensity: 2, untilRound: 6 },
    ]);
  });

  it('no-op si l’état n’est pas posé, ou si le compteur ne bouge pas', () => {
    expect(adjustStatusDuration(round5, 'c-1', 'blinded', 1)).toBe(round5);
    expect(adjustStatusDuration(round5, 'absent', 'dazed', 1)).toBe(round5);
    // Sans compteur, retirer un tour ne change rien (pas d’écriture, donc pas de diffusion).
    expect(adjustStatusDuration(round5, 'c-1', 'dazed', -1)).toBe(round5);
  });

  it('laisse les autres combattants et les autres états intacts', () => {
    const state: GmCombatState = {
      ...round5,
      statuses: { 'c-1': [{ id: 'dazed' }, { id: 'blinded' }], 'c-2': [{ id: 'slowed' }] },
    };
    const next = adjustStatusDuration(state, 'c-1', 'dazed', 1);
    expect(next.statuses['c-1']).toEqual([{ id: 'dazed', untilRound: 5 }, { id: 'blinded' }]);
    expect(next.statuses['c-2']).toEqual([{ id: 'slowed' }]);
  });

  it('ne mute pas l’état source (pur)', () => {
    adjustStatusDuration(round5, 'c-1', 'dazed', 1);
    expect(round5.statuses['c-1']).toEqual([{ id: 'dazed' }]);
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

describe('clearAllStatuses', () => {
  it('retire les états de tous les combattants sans toucher au reste de la scène', () => {
    const state: GmCombatState = {
      ...EMPTY_COMBAT_STATE,
      currentTurnKey: 'c-1',
      roundNumber: 4,
      depletions: { 'c-1': { hp: { lethal: 3, temp: 0 } } },
      statuses: { 'c-1': [{ id: 'blinded' }], 'c-2': [{ id: 'slowed', intensity: 2 }] },
    };
    const cleared = clearAllStatuses(state);
    expect(cleared.statuses).toEqual({});
    expect(cleared.currentTurnKey).toBe('c-1');
    expect(cleared.roundNumber).toBe(4);
    expect(cleared.depletions).toEqual({ 'c-1': { hp: { lethal: 3, temp: 0 } } });
  });

  it('no-op si plus aucun état n’est posé', () => {
    const state: GmCombatState = { ...EMPTY_COMBAT_STATE, roundNumber: 2 };
    expect(clearAllStatuses(state)).toBe(state);
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
    creatureInfo: {},
  };

  it('vide les états, restaure les PV des créatures, recommence à la manche 1 et met le tour courant à null', () => {
    const reset = resetCombat(inCombat);
    expect(reset.statuses).toEqual({});
    expect(reset.currentTurnKey).toBeNull();
    expect(reset.roundNumber).toBe(1);
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

describe('restartRounds', () => {
  const inCombat: GmCombatState = {
    creatures: [{ id: 'c-1', slug: 'gobelin', side: 'enemy' }],
    nextInstanceId: 2,
    depletions: { 'c-1': { hp: { lethal: 4, temp: 0 } } },
    currentTurnKey: 'c-1',
    roundNumber: 5,
    statuses: { 'c-1': [{ id: 'blinded' }] },
    tieBreakSeed: 0,
    creatureInfo: {},
  };

  it('recommence à la manche 1 et repositionne le tour courant sur le premier fourni', () => {
    const restarted = restartRounds(inCombat, 'char-7');
    expect(restarted.roundNumber).toBe(1);
    expect(restarted.currentTurnKey).toBe('char-7');
  });

  it('met le tour courant à null quand aucun premier n’est fourni (roster vide)', () => {
    expect(restartRounds(inCombat).currentTurnKey).toBeNull();
  });

  it('ne retire NI états NI PV (contrairement à resetCombat)', () => {
    const restarted = restartRounds(inCombat, 'c-1');
    expect(restarted.statuses).toEqual(inCombat.statuses);
    expect(restarted.depletions).toEqual(inCombat.depletions);
  });

  it('recale les compteurs de tours sur la manche 1, à tours restants constants (PER-305)', () => {
    // À la manche 5, `untilRound: 6` = 2 tours restants → doit rester 2 tours après le recalage.
    const state: GmCombatState = { ...inCombat, statuses: { 'c-1': [{ id: 'dazed', untilRound: 6 }] } };
    expect(restartRounds(state, 'c-1').statuses['c-1']).toEqual([{ id: 'dazed', untilRound: 2 }]);
  });

  it('retire les compteurs déjà expirés, sans retirer l’état (PER-305)', () => {
    const state: GmCombatState = { ...inCombat, statuses: { 'c-1': [{ id: 'dazed', untilRound: 3 }] } };
    expect(restartRounds(state, 'c-1').statuses['c-1']).toEqual([{ id: 'dazed' }]);
  });

  it('laisse la carte des états par référence quand aucun compteur n’est en jeu', () => {
    expect(restartRounds(inCombat, 'c-1').statuses).toBe(inCombat.statuses);
  });

  it('ne mute pas l’état source (pur)', () => {
    restartRounds(inCombat, 'char-7');
    expect(inCombat.roundNumber).toBe(5);
    expect(inCombat.currentTurnKey).toBe('c-1');
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

  it('borne à ≥ 1 et tronque les décimales', () => {
    expect(setRoundNumber(EMPTY_COMBAT_STATE, 0).roundNumber).toBe(1);
    expect(setRoundNumber(EMPTY_COMBAT_STATE, -1).roundNumber).toBe(1);
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

describe('creatureInfoEquals (PER-293)', () => {
  it('vrai pour deux cartes de même contenu (nom/init/AGI), ordre des clés indifférent', () => {
    const a = { gobelin: { name: 'Gobelin', initiative: 12, agility: 2 }, orc: { name: 'Orc', initiative: 8 } };
    const b = { orc: { name: 'Orc', initiative: 8 }, gobelin: { name: 'Gobelin', initiative: 12, agility: 2 } };
    expect(creatureInfoEquals(a, b)).toBe(true);
  });

  it('vrai pour deux cartes vides', () => {
    expect(creatureInfoEquals({}, {})).toBe(true);
  });

  it('faux si un slug est ajouté, un champ change, ou l’AGI diffère', () => {
    const base = { gobelin: { name: 'Gobelin', initiative: 12, agility: 2 } };
    expect(creatureInfoEquals(base, {})).toBe(false);
    expect(creatureInfoEquals(base, { gobelin: { name: 'Gobelin', initiative: 13, agility: 2 } })).toBe(false);
    expect(creatureInfoEquals(base, { gobelin: { name: 'Gobelin', initiative: 12 } })).toBe(false);
    expect(creatureInfoEquals(base, { gobelin: { name: 'Gobelin', initiative: 12, agility: 3 } })).toBe(false);
  });

  it('robuste au NaN : deux NaN sont ÉGAUX (sinon le garde d’écriture boucle à l’infini)', () => {
    // Régression : `NaN !== NaN` ferait renvoyer « différent » à chaque appel → `setCreatureInfo`
    // à chaque rendu → boucle + rafale de broadcast pendant une session. `Object.is` fixe ça.
    const a = { x: { name: 'X', initiative: NaN, agility: NaN } };
    const b = { x: { name: 'X', initiative: NaN, agility: NaN } };
    expect(creatureInfoEquals(a, b)).toBe(true);
  });
});

describe('reviveCreatureInfo (via reviveStateObject, PER-293)', () => {
  it('défaut à {} quand absent (migration douce)', () => {
    expect(reviveStateObject({ creatures: [] }).creatureInfo).toEqual({});
  });

  it('écarte les entrées mal formées (nom non chaîne, initiative non finie) et tronque les nombres', () => {
    const revived = reviveStateObject({
      creatures: [],
      creatureInfo: {
        ok: { name: 'Orc', initiative: 8.9, agility: 1.2 },
        badName: { name: 42, initiative: 5 },
        badInit: { name: 'X', initiative: 'nope' },
        noAgi: { name: 'Loup', initiative: 10 },
      },
    });
    expect(revived.creatureInfo).toEqual({
      ok: { name: 'Orc', initiative: 8, agility: 1 },
      noAgi: { name: 'Loup', initiative: 10 },
    });
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

describe('normalizeCreatureName (PER-295)', () => {
  it('retire les espaces de bord', () => {
    expect(normalizeCreatureName('  Grishnak le borgne  ')).toBe('Grishnak le borgne');
  });

  it('renvoie undefined pour un nom absent, vide ou d’espaces seuls', () => {
    expect(normalizeCreatureName(undefined)).toBeUndefined();
    expect(normalizeCreatureName('')).toBeUndefined();
    expect(normalizeCreatureName('   ')).toBeUndefined();
    expect(normalizeCreatureName(42)).toBeUndefined();
  });

  it('tronque au plafond de saisie', () => {
    const long = 'a'.repeat(CREATURE_NAME_MAX_LENGTH + 10);
    expect(normalizeCreatureName(long)).toHaveLength(CREATURE_NAME_MAX_LENGTH);
  });
});

describe('clampAddCount (PER-295)', () => {
  it('défaute à 1 pour une valeur absente, invalide ou < 1', () => {
    expect(clampAddCount(undefined)).toBe(1);
    expect(clampAddCount(NaN)).toBe(1);
    expect(clampAddCount('5')).toBe(1);
    expect(clampAddCount(0)).toBe(1);
    expect(clampAddCount(-3)).toBe(1);
  });

  it('tronque les décimales et plafonne au maximum', () => {
    expect(clampAddCount(4.9)).toBe(4);
    expect(clampAddCount(CREATURE_ADD_COUNT_MAX + 5)).toBe(CREATURE_ADD_COUNT_MAX);
  });
});

describe('addCreatures (PER-247, PER-295)', () => {
  it('ajoute une instance visible + adversaire par défaut, sans nom personnalisé', () => {
    const next = addCreatures(EMPTY_COMBAT_STATE, 'gobelin');
    expect(next.creatures).toEqual([
      { id: 'c-1', slug: 'gobelin', visible: true, side: 'enemy' },
    ]);
    expect(next.nextInstanceId).toBe(2);
  });

  it('ajoute N instances d’un coup avec des ids monotones', () => {
    const next = addCreatures(EMPTY_COMBAT_STATE, 'bandit-de-base', { count: 5 });
    expect(next.creatures.map((c) => c.id)).toEqual(['c-1', 'c-2', 'c-3', 'c-4', 'c-5']);
    expect(next.nextInstanceId).toBe(6);
  });

  it('applique le nom personnalisé, la visibilité et le camp à chaque instance', () => {
    const next = addCreatures(EMPTY_COMBAT_STATE, 'bandit-de-base', {
      count: 2,
      name: '  Garde du corps  ',
      visible: false,
      side: 'ally',
    });
    expect(next.creatures).toEqual([
      { id: 'c-1', slug: 'bandit-de-base', visible: false, side: 'ally', name: 'Garde du corps' },
      { id: 'c-2', slug: 'bandit-de-base', visible: false, side: 'ally', name: 'Garde du corps' },
    ]);
  });

  it('n’écrit PAS de nom vide (absence = nom du bestiaire)', () => {
    const next = addCreatures(EMPTY_COMBAT_STATE, 'orc', { name: '   ' });
    expect(next.creatures[0]).not.toHaveProperty('name');
  });

  it('poursuit la numérotation des ids et ne mute pas l’état source (pur)', () => {
    const state: GmCombatState = { ...EMPTY_COMBAT_STATE, nextInstanceId: 7 };
    const next = addCreatures(state, 'orc', { count: 2 });
    expect(next.creatures.map((c) => c.id)).toEqual(['c-7', 'c-8']);
    expect(next.nextInstanceId).toBe(9);
    expect(state.creatures).toEqual([]);
    expect(state.nextInstanceId).toBe(7);
  });
});

describe('duplicateCreature', () => {
  const custom = { initiative: 3, hitPoints: 12, defense: 13 };

  it('insère la copie JUSTE APRÈS l’originale, avec un id frais', () => {
    const state = addCreatures(addCreatures(EMPTY_COMBAT_STATE, 'gobelin'), 'orc');
    const next = duplicateCreature(state, 'c-1');
    expect(next.creatures.map((c) => c.id)).toEqual(['c-1', 'c-3', 'c-2']);
    expect(next.creatures.map((c) => c.slug)).toEqual(['gobelin', 'gobelin', 'orc']);
    expect(next.nextInstanceId).toBe(4);
  });

  it('recopie nom personnalisé, camp, visibilité et bloc manuel', () => {
    const state = addCustomCreatures(EMPTY_COMBAT_STATE, custom, {
      name: 'Grishnak le borgne',
      side: 'ally',
      visible: false,
    });
    const next = duplicateCreature(state, 'c-1');
    expect(next.creatures[1]).toEqual({
      id: 'c-2',
      slug: 'custom',
      visible: false,
      side: 'ally',
      name: 'Grishnak le borgne',
      custom,
    });
  });

  it('n’hérite NI du manque de PV NI des états posés (le double entre intact)', () => {
    const added = addCreatures(EMPTY_COMBAT_STATE, 'gobelin');
    const state: GmCombatState = {
      ...applyStatusTo(added, 'c-1', 'blinded'),
      depletions: { 'c-1': { hp: { lethal: 5, temp: 0 } } },
    };
    const next = duplicateCreature(state, 'c-1');
    expect(next.depletions['c-2']).toBeUndefined();
    expect(next.statuses['c-2']).toBeUndefined();
    // L'originale, elle, garde ses PV entamés et ses états.
    expect(next.depletions['c-1']).toEqual({ hp: { lethal: 5, temp: 0 } });
    expect(next.statuses['c-1']).toHaveLength(1);
  });

  it('ne fait rien sur une instance introuvable et ne mute pas l’état source (pur)', () => {
    const state = addCreatures(EMPTY_COMBAT_STATE, 'gobelin');
    expect(duplicateCreature(state, 'c-404')).toBe(state);
    expect(state.creatures).toHaveLength(1);
    expect(state.nextInstanceId).toBe(2);
  });
});

describe('updateCreature', () => {
  const custom = { initiative: 3, hitPoints: 12, defense: 13 };

  it('change le nom, le camp et la visibilité', () => {
    const state = addCreatures(EMPTY_COMBAT_STATE, 'gobelin');
    const next = updateCreature(state, 'c-1', {
      name: '  Chef gobelin  ',
      side: 'ally',
      visible: false,
    });
    expect(next.creatures[0]).toEqual({
      id: 'c-1',
      slug: 'gobelin',
      visible: false,
      side: 'ally',
      name: 'Chef gobelin',
    });
  });

  it('un nom vidé RETIRE le nom personnalisé (retour au nom du bestiaire)', () => {
    const state = addCreatures(EMPTY_COMBAT_STATE, 'gobelin', { name: 'Chef gobelin' });
    const next = updateCreature(state, 'c-1', { name: '   ' });
    expect(next.creatures[0]).not.toHaveProperty('name');
  });

  it('une clé absente laisse la valeur en place', () => {
    const state = addCreatures(EMPTY_COMBAT_STATE, 'gobelin', {
      name: 'Chef gobelin',
      side: 'ally',
      visible: false,
    });
    const next = updateCreature(state, 'c-1', { visible: true });
    expect(next.creatures[0]).toEqual({
      id: 'c-1',
      slug: 'gobelin',
      visible: true,
      side: 'ally',
      name: 'Chef gobelin',
    });
  });

  it('remplace le bloc d’une créature créée à la main', () => {
    const state = addCustomCreatures(EMPTY_COMBAT_STATE, custom, { name: 'PNJ' });
    const next = updateCreature(state, 'c-1', {
      custom: { initiative: 8, hitPoints: 30, defense: 16 },
    });
    expect(next.creatures[0].custom).toEqual({ initiative: 8, hitPoints: 30, defense: 16 });
  });

  it('IGNORE un bloc manuel sur une créature du bestiaire (bloc = contenu de livre)', () => {
    const state = addCreatures(EMPTY_COMBAT_STATE, 'gobelin');
    const next = updateCreature(state, 'c-1', { custom });
    expect(next.creatures[0]).not.toHaveProperty('custom');
  });

  it('IGNORE un bloc manuel au socle incomplet (l’ancien reste en place)', () => {
    const state = addCustomCreatures(EMPTY_COMBAT_STATE, custom, { name: 'PNJ' });
    const next = updateCreature(state, 'c-1', {
      custom: { initiative: 8, hitPoints: 30 } as never,
    });
    expect(next.creatures[0].custom).toEqual(custom);
  });

  it('conserve PV entamés et états posés (on modifie en place)', () => {
    const added = addCreatures(EMPTY_COMBAT_STATE, 'gobelin');
    const state: GmCombatState = {
      ...applyStatusTo(added, 'c-1', 'blinded'),
      depletions: { 'c-1': { hp: { lethal: 5, temp: 0 } } },
    };
    const next = updateCreature(state, 'c-1', { name: 'Chef gobelin' });
    expect(next.depletions['c-1']).toEqual({ hp: { lethal: 5, temp: 0 } });
    expect(next.statuses['c-1']).toHaveLength(1);
  });

  it('ne fait rien sur une instance introuvable et ne mute pas l’état source (pur)', () => {
    const state = addCreatures(EMPTY_COMBAT_STATE, 'gobelin', { name: 'Chef gobelin' });
    expect(updateCreature(state, 'c-404', { name: 'Autre' })).toBe(state);
    expect(state.creatures[0].name).toBe('Chef gobelin');
  });
});

describe('labelCreatureInstances (PER-295)', () => {
  const names = new Map([
    ['gobelin', 'Gobelin'],
    ['bandit-de-base', 'Bandit de base'],
  ]);

  it('n’ajoute PAS de numéro à une créature unique', () => {
    const labels = labelCreatureInstances([{ id: 'c-1', slug: 'gobelin' }], names);
    expect(labels.get('c-1')).toBe('Gobelin');
  });

  it('numérote les homonymes dans l’ordre d’ajout', () => {
    const labels = labelCreatureInstances(
      [
        { id: 'c-1', slug: 'gobelin' },
        { id: 'c-2', slug: 'gobelin' },
        { id: 'c-3', slug: 'gobelin' },
      ],
      names,
    );
    expect([...labels.values()]).toEqual(['Gobelin 1', 'Gobelin 2', 'Gobelin 3']);
  });

  it('préfère le nom personnalisé au nom du bestiaire, sans numéro s’il est unique', () => {
    const labels = labelCreatureInstances(
      [
        { id: 'c-1', slug: 'bandit-de-base', name: 'Grishnak le borgne' },
        { id: 'c-2', slug: 'bandit-de-base' },
      ],
      names,
    );
    expect(labels.get('c-1')).toBe('Grishnak le borgne');
    expect(labels.get('c-2')).toBe('Bandit de base');
  });

  it('numérote indépendamment deux noms distincts issus du même slug', () => {
    const labels = labelCreatureInstances(
      [
        { id: 'c-1', slug: 'bandit-de-base', name: 'Garde du corps' },
        { id: 'c-2', slug: 'bandit-de-base' },
        { id: 'c-3', slug: 'bandit-de-base', name: 'Garde du corps' },
        { id: 'c-4', slug: 'bandit-de-base' },
      ],
      names,
    );
    expect([...labels.values()]).toEqual([
      'Garde du corps 1',
      'Bandit de base 1',
      'Garde du corps 2',
      'Bandit de base 2',
    ]);
  });

  it('retombe sur le slug quand le nom du bestiaire est inconnu', () => {
    const labels = labelCreatureInstances([{ id: 'c-1', slug: 'creature-payante' }], names);
    expect(labels.get('c-1')).toBe('creature-payante');
  });

  it('ignore un nom personnalisé vide (repli sur le bestiaire)', () => {
    const labels = labelCreatureInstances([{ id: 'c-1', slug: 'gobelin', name: '  ' }], names);
    expect(labels.get('c-1')).toBe('Gobelin');
  });
});
