import { describe, expect, it } from 'vitest';

import {
  presenceKeyFor,
  presenceListFromState,
  type RawPresenceState,
} from './presence';

describe('presenceKeyFor', () => {
  it('fond les onglets d’une même personne sur une clé stable', () => {
    expect(presenceKeyFor('gm', null)).toBe('gm');
    expect(presenceKeyFor('player', 'p1')).toBe('player:p1');
    expect(presenceKeyFor('player', 'p1')).toBe(presenceKeyFor('player', 'p1'));
    expect(presenceKeyFor('projection', null)).toBe('projection');
  });
});

describe('presenceListFromState', () => {
  it('dérive une entrée par clé, MJ en tête puis joueurs par nom (FR)', () => {
    const state: RawPresenceState = {
      'player:p2': [{ kind: 'player', playerId: 'p2', name: 'Zoé', onlineAt: 'x' }],
      gm: [{ kind: 'gm', playerId: null, name: 'MJ', onlineAt: 'x' }],
      'player:p1': [{ kind: 'player', playerId: 'p1', name: 'Élise', onlineAt: 'x' }],
    };

    const list = presenceListFromState(state);

    expect(list.map((e) => e.name)).toEqual(['MJ', 'Élise', 'Zoé']);
    expect(list[0]).toMatchObject({ kind: 'gm', playerId: null });
    expect(list[1]).toMatchObject({ kind: 'player', playerId: 'p1' });
  });

  it('fond le multi-onglets d’une même personne en une seule entrée', () => {
    const state: RawPresenceState = {
      'player:p1': [
        { kind: 'player', playerId: 'p1', name: 'Bob', onlineAt: 'a' },
        { kind: 'player', playerId: 'p1', name: 'Bob', onlineAt: 'b' },
      ],
    };
    expect(presenceListFromState(state)).toHaveLength(1);
  });

  it('exclut la fenêtre projetée de la liste affichée', () => {
    const state: RawPresenceState = {
      projection: [{ kind: 'projection', playerId: null, name: 'Projection', onlineAt: 'x' }],
      gm: [{ kind: 'gm', playerId: null, name: 'MJ', onlineAt: 'x' }],
    };
    const list = presenceListFromState(state);
    expect(list).toHaveLength(1);
    expect(list[0].kind).toBe('gm');
  });

  it('ignore les clés au payload illisible ou vide', () => {
    const state: RawPresenceState = {
      'player:p1': [],
      weird: [{ foo: 'bar' }],
      gm: [{ kind: 'gm', playerId: null, name: 'MJ', onlineAt: 'x' }],
    };
    const list = presenceListFromState(state);
    expect(list).toHaveLength(1);
    expect(list[0].kind).toBe('gm');
  });

  it('replie un nom vide sur « Anonyme »', () => {
    const state: RawPresenceState = {
      'player:p1': [{ kind: 'player', playerId: 'p1', name: '  ', onlineAt: 'x' }],
    };
    expect(presenceListFromState(state)[0].name).toBe('Anonyme');
  });
});
