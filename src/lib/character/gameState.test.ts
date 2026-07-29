import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, type Character } from './types';
import {
  applyRemoteGameStatePatch,
  broadcastableGameStateSlice,
  containsGameStateKey,
  isBroadcastableGameStatePatch,
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
    companionInstances: {},
    mounts: [],
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

describe('isGameStatePatch', () => {
  it('accepte un patch dont TOUTES les clés sont dans l’allowlist', () => {
    expect(isGameStatePatch({ depletion: {} })).toBe(true);
    expect(isGameStatePatch({ effectToggles: {}, usageCounters: {} })).toBe(true);
    expect(isGameStatePatch({ mountedKey: 'm1' })).toBe(true);
    expect(isGameStatePatch({ mounts: [] })).toBe(true);
  });

  it('rejette un patch de construction ou MIXTE (une clé hors allowlist)', () => {
    expect(isGameStatePatch({ name: 'X' })).toBe(false);
    expect(isGameStatePatch({ equipment: [] })).toBe(false);
    // createElixir : usageCounters (allowlist) + equipment (hors) → mixte → verrou.
    expect(isGameStatePatch({ usageCounters: {}, equipment: [] })).toBe(false);
    // openCoinPouch : purse hors allowlist.
    expect(isGameStatePatch({ purse: { platinum: 0, gold: 0, silver: 1, copper: 0 } })).toBe(false);
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
    // repos long avec perte d'élixirs : depletion + equipment → mixte mais routé état de jeu
    expect(containsGameStateKey({ depletion: {}, equipment: [] })).toBe(true);
    expect(containsGameStateKey({ usageCounters: {}, equipment: [] })).toBe(true);
    expect(containsGameStateKey({ name: 'X', identity: {} })).toBe(false);
    expect(containsGameStateKey({})).toBe(false);
  });
});

describe('broadcastableGameStateSlice', () => {
  const c = makeCharacter({ mounts: [{ id: 'a', catalogId: 'cheval', hp: {} }] });

  it('extrait la part état de jeu d’un patch mixte (repos long avec élixirs)', () => {
    const patch = { depletion: { mana: 0 }, usageCounters: {}, equipment: [] } as never;
    expect(broadcastableGameStateSlice(c, patch)).toEqual({ depletion: { mana: 0 }, usageCounters: {} });
  });

  it('inclut mounts seulement si hp-only', () => {
    const hpOnly = { mounts: [{ id: 'a', catalogId: 'cheval', hp: { hp: { lethal: 2, temp: 0 } } }] };
    expect(broadcastableGameStateSlice(c, hpOnly)?.mounts).toBeDefined();
    const structurel = { mounts: [...c.mounts, { id: 'b', catalogId: 'mule', hp: {} }] };
    expect(broadcastableGameStateSlice(c, structurel)).toBeNull(); // ajout → rien à diffuser
  });

  it('null pour un patch sans part diffusable (construction pure)', () => {
    expect(broadcastableGameStateSlice(c, { equipment: [] } as never)).toBeNull();
  });
});

describe('isHpOnlyMountsPatch / isBroadcastableGameStatePatch', () => {
  const c = makeCharacter({
    mounts: [
      { id: 'a', catalogId: 'cheval', name: 'Bucéphale', bardeId: 'barde', hp: {} },
      { id: 'b', catalogId: 'mule', hp: {} },
    ],
  });

  it('hp-only (dégâts/soin sur une monture existante) est diffusable', () => {
    const patch = { mounts: [{ ...c.mounts[0], hp: { hp: { lethal: 3, temp: 0 } } }, c.mounts[1]] };
    expect(isHpOnlyMountsPatch(c.mounts, patch.mounts)).toBe(true);
    expect(isBroadcastableGameStatePatch(c, patch)).toBe(true);
  });

  it('ajout de monture N’EST PAS diffusable (construction → verrou)', () => {
    const patch = { mounts: [...c.mounts, { id: 'z', catalogId: 'poney', hp: {} }] };
    expect(isHpOnlyMountsPatch(c.mounts, patch.mounts)).toBe(false);
    expect(isBroadcastableGameStatePatch(c, patch)).toBe(false);
  });

  it('retrait de monture N’EST PAS diffusable', () => {
    const patch = { mounts: [c.mounts[0]] };
    expect(isBroadcastableGameStatePatch(c, patch)).toBe(false);
  });

  it('changement de barde N’EST PAS diffusable', () => {
    const patch = { mounts: [{ ...c.mounts[0], bardeId: 'autre-barde' }, c.mounts[1]] };
    expect(isBroadcastableGameStatePatch(c, patch)).toBe(false);
  });

  it('un patch sans mounts est diffusable (les autres clés sont fidèles)', () => {
    expect(isBroadcastableGameStatePatch(c, { depletion: { mana: 2 } })).toBe(true);
    expect(isBroadcastableGameStatePatch(c, { mountedKey: 'a' })).toBe(true);
  });
});

describe('applyRemoteGameStatePatch', () => {
  it('remplace directement les clés top-level (état absolu → LWW)', () => {
    const c = makeCharacter({ depletion: { hp: { lethal: 2, temp: 0 } } });
    const next = applyRemoteGameStatePatch(c, { depletion: { hp: { lethal: 7, temp: 0 } } });
    expect(next.depletion).toEqual({ hp: { lethal: 7, temp: 0 } });
  });

  it('fusionne mounts finement par id (n’écrase pas une construction divergente)', () => {
    const c = makeCharacter({
      mounts: [{ id: 'a', catalogId: 'cheval', name: 'Local', hp: {} }],
    });
    // Le pair diffuse le tableau complet ; on ne prend que le hp de 'a', notre name reste 'Local'.
    const next = applyRemoteGameStatePatch(c, {
      mounts: [{ id: 'a', catalogId: 'cheval', name: 'Distant', hp: { hp: { lethal: 4, temp: 0 } } }],
    });
    expect(next.mounts[0]).toEqual({ id: 'a', catalogId: 'cheval', name: 'Local', hp: { hp: { lethal: 4, temp: 0 } } });
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
