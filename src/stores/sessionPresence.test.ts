import { beforeEach, describe, expect, it } from 'vitest';

import type { SessionPresenceEntry } from '@/lib/session/presence';
import { presentPlayerIds, useSessionPresenceStore } from './sessionPresence';

const GM: SessionPresenceEntry = { key: 'gm', kind: 'gm', playerId: null, name: 'MJ' };
const ARIA: SessionPresenceEntry = {
  key: 'player:p1',
  kind: 'player',
  playerId: 'p1',
  name: 'Aria',
};
const BRANN: SessionPresenceEntry = {
  key: 'player:p2',
  kind: 'player',
  playerId: 'p2',
  name: 'Brann',
};

beforeEach(() => {
  useSessionPresenceStore.setState({ byCampaign: {} });
});

describe('presentPlayerIds', () => {
  it('ne retient que les joueurs de roster (le MJ n’en est pas un)', () => {
    expect(presentPlayerIds([GM, ARIA, BRANN])).toEqual(['p1', 'p2']);
  });

  it('renvoie une liste vide quand personne n’est connecté', () => {
    expect(presentPlayerIds([])).toEqual([]);
  });
});

describe('useSessionPresenceStore', () => {
  it('publie la présence d’une campagne sans toucher aux autres', () => {
    useSessionPresenceStore.getState().setPresence('camp-1', [GM, ARIA]);
    useSessionPresenceStore.getState().setPresence('camp-2', [BRANN]);
    const { byCampaign } = useSessionPresenceStore.getState();
    expect(byCampaign['camp-1']).toEqual([GM, ARIA]);
    expect(byCampaign['camp-2']).toEqual([BRANN]);
  });

  it('remplace la présence à chaque publication (instantané, pas cumul)', () => {
    useSessionPresenceStore.getState().setPresence('camp-1', [GM, ARIA]);
    useSessionPresenceStore.getState().setPresence('camp-1', [GM]);
    expect(useSessionPresenceStore.getState().byCampaign['camp-1']).toEqual([GM]);
  });

  it('oublie une campagne au décrochage du canal', () => {
    useSessionPresenceStore.getState().setPresence('camp-1', [GM, ARIA]);
    useSessionPresenceStore.getState().clearPresence('camp-1');
    expect('camp-1' in useSessionPresenceStore.getState().byCampaign).toBe(false);
  });

  it('renvoie le MÊME état quand il n’y avait rien à oublier (aucun rendu inutile)', () => {
    const before = useSessionPresenceStore.getState().byCampaign;
    useSessionPresenceStore.getState().clearPresence('camp-inconnue');
    expect(useSessionPresenceStore.getState().byCampaign).toBe(before);
  });
});
