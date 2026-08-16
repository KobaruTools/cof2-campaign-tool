import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Character } from './types';
import {
  applyRemoteGameStatePatch,
  containsGameStateKey,
  gameStateSlice,
  isGameStatePatch,
  isHpOnlyMountsPatch,
  mergeMountHp,
  toWireGameStatePatch,
} from './gameState';

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'guerrier',
    level: 5,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: null,
    playerId: null,
    status: 'active',
    abilities: { AGI: 3, CON: 2, FOR: 3, PER: 1, CHA: 0, INT: 0, VOL: 1 },
    baseAbilities: { AGI: 3, CON: 2, FOR: 3, PER: 1, CHA: 0, INT: 0, VOL: 1 },
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
    companionInstances: {},
    mounts: [],
    purse: { platinum: 0, gold: 0, silver: 0, copper: 0 },
    levelUpHistory: [],
    equipment: [],
    poisonedWeapons: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('isGameStatePatch', () => {
  it('accepte un patch dont TOUTES les clés sont dans l’allowlist', () => {
    expect(isGameStatePatch({ depletion: {} })).toBe(true);
    expect(isGameStatePatch({ effectToggles: {}, usageCounters: {} })).toBe(true);
    expect(isGameStatePatch({ mountedKey: 'm1' })).toBe(true);
    expect(isGameStatePatch({ mounts: [] })).toBe(true);
    // PER-266 (0015) : equipment (port/consommation) et purse (bourse) sont de l'état de jeu.
    expect(isGameStatePatch({ equipment: [] })).toBe(true);
    expect(isGameStatePatch({ usageCounters: {}, equipment: [] })).toBe(true); // createElixir
    expect(isGameStatePatch({ purse: { platinum: 0, gold: 0, silver: 1, copper: 0 } })).toBe(true);
    expect(isGameStatePatch({ equipment: [], purse: { platinum: 0, gold: 0, silver: 0, copper: 0 } })).toBe(true); // openCoinPouch
  });

  it('rejette un patch de CONSTRUCTION pure (clé hors allowlist)', () => {
    expect(isGameStatePatch({ name: 'X' })).toBe(false);
    expect(isGameStatePatch({ identity: {} })).toBe(false);
    expect(isGameStatePatch({ name: 'X', equipment: [] })).toBe(false); // mixte construction+equipment
  });

  it('rejette un patch vide (rien à écrire)', () => {
    expect(isGameStatePatch({})).toBe(false);
  });
});

describe('toWireGameStatePatch', () => {
  it('convertit les undefined en null explicites (mountedKey « à pied »)', () => {
    // setMountedTarget(null) produit { mountedKey: undefined } → doit devenir null sur le fil.
    expect(toWireGameStatePatch({ mountedKey: undefined })).toEqual({ mountedKey: null });
  });

  it('préserve les valeurs définies telles quelles', () => {
    expect(toWireGameStatePatch({ mountedKey: 'm1', depletion: { hp: { lethal: 3, temp: 0 } } })).toEqual({
      mountedKey: 'm1',
      depletion: { hp: { lethal: 3, temp: 0 } },
    });
  });
});

describe('mergeMountHp', () => {
  const current = [
    { id: 'a', catalogId: 'cheval', name: 'Bucéphale', bardeId: 'barde', hp: {} },
    { id: 'b', catalogId: 'mule', hp: { hp: { lethal: 1, temp: 0 } } },
  ];

  it('remplace UNIQUEMENT le hp des montures ciblées, construction préservée', () => {
    const merged = mergeMountHp(current, [{ id: 'a', hp: { hp: { lethal: 5, temp: 0 } } }]);
    // hp de 'a' remplacé ; sa construction (name, bardeId) intacte ; 'b' inchangée.
    expect(merged[0]).toEqual({
      id: 'a',
      catalogId: 'cheval',
      name: 'Bucéphale',
      bardeId: 'barde',
      hp: { hp: { lethal: 5, temp: 0 } },
    });
    expect(merged[1]).toEqual(current[1]);
  });

  it('ignore les ids inconnus du patch (aucun ajout/retrait par ce canal)', () => {
    const merged = mergeMountHp(current, [{ id: 'zzz', hp: { hp: { lethal: 9, temp: 0 } } }]);
    expect(merged).toEqual(current);
  });
});

describe('containsGameStateKey', () => {
  it('vrai dès qu’une clé ∈ allowlist (même patch mixte), faux pour construction pure', () => {
    expect(containsGameStateKey({ depletion: {} })).toBe(true);
    expect(containsGameStateKey({ equipment: [] })).toBe(true);
    // patch mixte construction + état de jeu (rare) : contient au moins une clé état de jeu
    expect(containsGameStateKey({ name: 'X', depletion: {} })).toBe(true);
    expect(containsGameStateKey({ name: 'X', identity: {} })).toBe(false);
    expect(containsGameStateKey({})).toBe(false);
  });
});

describe('gameStateSlice', () => {
  const c = makeCharacter({ mounts: [{ id: 'a', catalogId: 'cheval', hp: {} }] });

  it('extrait la part état de jeu, écarte la construction pure (ex. name)', () => {
    const patch = { depletion: { mana: 0 }, equipment: [], name: 'X' } as never;
    expect(gameStateSlice(patch)).toEqual({ depletion: { mana: 0 }, equipment: [] });
  });

  it('inclut equipment et purse (PER-266 0015)', () => {
    const patch = { equipment: [], purse: { platinum: 0, gold: 0, silver: 5, copper: 0 } };
    expect(gameStateSlice(patch)).toEqual(patch);
  });

  it('inclut mounts tel quel, même structurel (le flag replaceMounts décide chez le pair)', () => {
    const structurel = { mounts: [...c.mounts, { id: 'b', catalogId: 'mule', hp: {} }] };
    expect(gameStateSlice(structurel)?.mounts).toHaveLength(2);
  });

  it('null pour un patch de construction pure', () => {
    expect(gameStateSlice({ name: 'X' })).toBeNull();
    expect(gameStateSlice({ identity: {} })).toBeNull();
  });
});

describe('isHpOnlyMountsPatch', () => {
  const c = makeCharacter({
    mounts: [
      { id: 'a', catalogId: 'cheval', name: 'Bucéphale', bardeId: 'barde', hp: {} },
      { id: 'b', catalogId: 'mule', hp: {} },
    ],
  });

  it('hp-only (dégâts/soin sur une monture existante) → fusion fine (true)', () => {
    const mounts = [{ ...c.mounts[0], hp: { hp: { lethal: 3, temp: 0 } } }, c.mounts[1]];
    expect(isHpOnlyMountsPatch(c.mounts, mounts)).toBe(true);
  });

  it('ajout de monture → structurel (false → remplacement)', () => {
    expect(isHpOnlyMountsPatch(c.mounts, [...c.mounts, { id: 'z', catalogId: 'poney', hp: {} }])).toBe(false);
  });

  it('retrait de monture → structurel', () => {
    expect(isHpOnlyMountsPatch(c.mounts, [c.mounts[0]])).toBe(false);
  });

  it('changement de barde → structurel', () => {
    expect(isHpOnlyMountsPatch(c.mounts, [{ ...c.mounts[0], bardeId: 'autre-barde' }, c.mounts[1]])).toBe(false);
  });
});

describe('applyRemoteGameStatePatch', () => {
  it('remplace directement les clés top-level (état absolu → LWW)', () => {
    const c = makeCharacter({ depletion: { hp: { lethal: 2, temp: 0 } } });
    const next = applyRemoteGameStatePatch(c, { depletion: { hp: { lethal: 7, temp: 0 } } });
    expect(next.depletion).toEqual({ hp: { lethal: 7, temp: 0 } });
  });

  it('fusionne mounts finement par id par défaut (n’écrase pas une construction divergente)', () => {
    const c = makeCharacter({
      mounts: [{ id: 'a', catalogId: 'cheval', name: 'Local', hp: {} }],
    });
    // Le pair diffuse le tableau complet ; sans replaceMounts, on ne prend que le hp de 'a'.
    const next = applyRemoteGameStatePatch(c, {
      mounts: [{ id: 'a', catalogId: 'cheval', name: 'Distant', hp: { hp: { lethal: 4, temp: 0 } } }],
    });
    expect(next.mounts[0]).toEqual({ id: 'a', catalogId: 'cheval', name: 'Local', hp: { hp: { lethal: 4, temp: 0 } } });
  });

  it('replaceMounts → remplace le tableau (ajout de monture propagé en direct)', () => {
    const c = makeCharacter({ mounts: [{ id: 'a', catalogId: 'cheval', hp: {} }] });
    // L'émetteur a ajouté 'b' ; avec replaceMounts, le pair adopte le tableau complet reçu.
    const next = applyRemoteGameStatePatch(
      c,
      {
        mounts: [
          { id: 'a', catalogId: 'cheval', hp: {} },
          { id: 'b', catalogId: 'mule', hp: {} },
        ],
      },
      { replaceMounts: true },
    );
    expect(next.mounts).toHaveLength(2);
    expect(next.mounts[1]).toMatchObject({ id: 'b', catalogId: 'mule' });
  });

  it('mountedKey null (fil) → démonte (clé supprimée)', () => {
    const c = makeCharacter({ mountedKey: 'a' });
    const next = applyRemoteGameStatePatch(c, { mountedKey: null });
    expect(next.mountedKey).toBeUndefined();
    expect('mountedKey' in next).toBe(false);
  });

  it('mountedKey valeur → monte', () => {
    const c = makeCharacter({});
    const next = applyRemoteGameStatePatch(c, { mountedKey: 'a' });
    expect(next.mountedKey).toBe('a');
  });

  it('ignore les clés hors allowlist (défensif)', () => {
    const c = makeCharacter({ name: 'Origine' });
    const next = applyRemoteGameStatePatch(c, { name: 'Injecté', depletion: { mana: 3 } });
    expect(next.name).toBe('Origine'); // construction jamais touchée par ce chemin
    expect(next.depletion).toEqual({ mana: 3 });
  });
});
