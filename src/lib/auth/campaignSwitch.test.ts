import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  membershipSelectMock,
  membershipListSelectMock,
  playerLookupMock,
  updateUserByIdMock,
  getUserMock,
  refreshSessionMock,
} = vi.hoisted(() => ({
  membershipSelectMock: vi.fn(),
  membershipListSelectMock: vi.fn(),
  playerLookupMock: vi.fn(),
  updateUserByIdMock: vi.fn(),
  getUserMock: vi.fn(),
  refreshSessionMock: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'player_auth_sessions') {
        return {
          select: (columns: string) => {
            // Le select imbriqué de `listMemberCampaigns` ne se filtre que sur
            // `auth_user_id` (pas de 2e `.eq`) ; celui de `switchActiveCampaign`
            // enchaîne deux `.eq` avant `maybeSingle`.
            if (columns.includes('players(')) {
              return { eq: () => ({ returns: () => membershipListSelectMock() }) };
            }
            return { eq: () => ({ eq: () => ({ maybeSingle: membershipSelectMock }) }) };
          },
        };
      }
      if (table === 'players') {
        return { select: () => ({ eq: () => ({ single: playerLookupMock }) }) };
      }
      throw new Error(`table Supabase admin inattendue dans le test : ${table}`);
    },
    auth: { admin: { updateUserById: updateUserByIdMock } },
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: {
      getUser: getUserMock,
      refreshSession: refreshSessionMock,
    },
  }),
}));

const { listMemberCampaigns, switchActiveCampaign } = await import('./campaignSwitch');

beforeEach(() => {
  membershipSelectMock.mockReset();
  membershipListSelectMock.mockReset();
  playerLookupMock.mockReset();
  updateUserByIdMock.mockReset().mockResolvedValue({ error: null });
  getUserMock.mockReset();
  refreshSessionMock.mockReset().mockResolvedValue({ error: null });
});

describe('listMemberCampaigns', () => {
  it('aucune session : liste vide sans toucher la base', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await listMemberCampaigns();
    expect(result).toEqual([]);
    expect(membershipListSelectMock).not.toHaveBeenCalled();
  });

  it('renvoie les campagnes membres avec leur player_id respectif', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'anon-1' } } });
    membershipListSelectMock.mockResolvedValue({
      data: [
        { player_id: 'p1', players: { campaign_id: 'camp-1', campaigns: { name: 'Campagne A' } } },
        { player_id: 'p2', players: { campaign_id: 'camp-2', campaigns: { name: 'Campagne B' } } },
      ],
      error: null,
    });

    const result = await listMemberCampaigns();

    expect(result).toEqual([
      { playerId: 'p1', campaignId: 'camp-1', campaignName: 'Campagne A' },
      { playerId: 'p2', campaignId: 'camp-2', campaignName: 'Campagne B' },
    ]);
  });
});

describe('switchActiveCampaign', () => {
  it('refuse de basculer vers une campagne dont l’identité n’est pas membre', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'anon-1' } } });
    membershipSelectMock.mockResolvedValue({ data: null, error: null });

    await expect(switchActiveCampaign('p-etrangere')).rejects.toThrow(
      'Tu n’es pas membre de cette campagne.',
    );
    expect(updateUserByIdMock).not.toHaveBeenCalled();
  });

  it('bascule les claims vers le joueur/campagne ciblés puis réémet le jeton', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'anon-1' } } });
    membershipSelectMock.mockResolvedValue({ data: { player_id: 'p2' }, error: null });
    playerLookupMock.mockResolvedValue({ data: { campaign_id: 'camp-2' }, error: null });

    await switchActiveCampaign('p2');

    expect(updateUserByIdMock).toHaveBeenCalledWith('anon-1', {
      app_metadata: { player_id: 'p2', campaign_id: 'camp-2' },
    });
    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
  });

  it('rebasculer vers la campagne déjà active est un no-op inoffensif (idempotent)', async () => {
    getUserMock.mockResolvedValue({ data: { user: { id: 'anon-1' } } });
    membershipSelectMock.mockResolvedValue({ data: { player_id: 'p1' }, error: null });
    playerLookupMock.mockResolvedValue({ data: { campaign_id: 'camp-1' }, error: null });

    await expect(switchActiveCampaign('p1')).resolves.toBeUndefined();
    await expect(switchActiveCampaign('p1')).resolves.toBeUndefined();
  });
});
