import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const {
  playersLookupMock,
  playerAuthUpsertMock,
  playersPresenceUpdateMock,
  updateUserByIdMock,
  getUserMock,
  signInAnonymouslyMock,
  refreshSessionMock,
} = vi.hoisted(() => ({
  playersLookupMock: vi.fn(),
  playerAuthUpsertMock: vi.fn(),
  playersPresenceUpdateMock: vi.fn(),
  updateUserByIdMock: vi.fn(),
  getUserMock: vi.fn(),
  signInAnonymouslyMock: vi.fn(),
  refreshSessionMock: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'players') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: playersLookupMock }) }),
          update: () => ({ eq: playersPresenceUpdateMock }),
        };
      }
      if (table === 'player_auth_sessions') {
        return { upsert: playerAuthUpsertMock };
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
      signInAnonymously: signInAnonymouslyMock,
      refreshSession: refreshSessionMock,
    },
  }),
}));

const { redeemJoinSecret } = await import('./joinLink');

const SECRET_A = '11111111-1111-1111-1111-111111111111';
const SECRET_B = '22222222-2222-2222-2222-222222222222';

/** Ligne `players` minimale renvoyée par le lookup admin. */
const player = (id: string, campaignId: string) => ({
  id,
  campaign_id: campaignId,
  first_joined_at: null,
});

beforeEach(() => {
  playersLookupMock.mockReset();
  playerAuthUpsertMock.mockReset().mockResolvedValue({ error: null });
  playersPresenceUpdateMock.mockReset().mockResolvedValue({ error: null });
  updateUserByIdMock.mockReset().mockResolvedValue({ error: null });
  getUserMock.mockReset();
  signInAnonymouslyMock.mockReset();
  refreshSessionMock.mockReset().mockResolvedValue({ error: null });
});

describe('redeemJoinSecret', () => {
  it('secret mal formé → invalid, sans toucher la base', async () => {
    const result = await redeemJoinSecret('pas-un-uuid');
    expect(result).toEqual({ status: 'invalid' });
    expect(playersLookupMock).not.toHaveBeenCalled();
  });

  it('secret inconnu → invalid', async () => {
    playersLookupMock.mockResolvedValue({ data: null, error: null });
    const result = await redeemJoinSecret(SECRET_A);
    expect(result).toEqual({ status: 'invalid' });
  });

  it('visiteur sans session : crée une session anonyme fraîche (comportement inchangé)', async () => {
    playersLookupMock.mockResolvedValue({ data: player('p1', 'camp-1'), error: null });
    getUserMock.mockResolvedValue({ data: { user: null } });
    signInAnonymouslyMock.mockResolvedValue({ data: { user: { id: 'anon-1' } }, error: null });

    const result = await redeemJoinSecret(SECRET_A);

    expect(result).toEqual({ status: 'ok' });
    expect(signInAnonymouslyMock).toHaveBeenCalledTimes(1);
    expect(playerAuthUpsertMock).toHaveBeenCalledWith(
      { auth_user_id: 'anon-1', player_id: 'p1' },
      { onConflict: 'auth_user_id,player_id', ignoreDuplicates: true },
    );
    expect(updateUserByIdMock).toHaveBeenCalledWith('anon-1', {
      app_metadata: { player_id: 'p1', campaign_id: 'camp-1' },
    });
  });

  it('identité déjà ouverte : attache la campagne sans créer de nouvelle session anonyme', async () => {
    playersLookupMock.mockResolvedValue({ data: player('p2', 'camp-2'), error: null });
    getUserMock.mockResolvedValue({ data: { user: { id: 'existing-1' } } });

    const result = await redeemJoinSecret(SECRET_B);

    expect(result).toEqual({ status: 'ok' });
    expect(signInAnonymouslyMock).not.toHaveBeenCalled();
    expect(playerAuthUpsertMock).toHaveBeenCalledWith(
      { auth_user_id: 'existing-1', player_id: 'p2' },
      { onConflict: 'auth_user_id,player_id', ignoreDuplicates: true },
    );
  });

  it('rejoindre 2 campagnes avec la même session : la 1re reste accessible', async () => {
    // 1er lien : aucune session → session anonyme fraîche.
    playersLookupMock.mockResolvedValueOnce({ data: player('p1', 'camp-1'), error: null });
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    signInAnonymouslyMock.mockResolvedValue({ data: { user: { id: 'anon-1' } }, error: null });

    const first = await redeemJoinSecret(SECRET_A);
    expect(first).toEqual({ status: 'ok' });

    // 2e lien : MÊME session (celle tout juste créée) → attache, ne remplace pas.
    playersLookupMock.mockResolvedValueOnce({ data: player('p2', 'camp-2'), error: null });
    getUserMock.mockResolvedValueOnce({ data: { user: { id: 'anon-1' } } });

    const second = await redeemJoinSecret(SECRET_B);
    expect(second).toEqual({ status: 'ok' });

    expect(signInAnonymouslyMock).toHaveBeenCalledTimes(1); // pas de 2e session créée
    expect(playerAuthUpsertMock).toHaveBeenNthCalledWith(
      1,
      { auth_user_id: 'anon-1', player_id: 'p1' },
      { onConflict: 'auth_user_id,player_id', ignoreDuplicates: true },
    );
    expect(playerAuthUpsertMock).toHaveBeenNthCalledWith(
      2,
      { auth_user_id: 'anon-1', player_id: 'p2' },
      { onConflict: 'auth_user_id,player_id', ignoreDuplicates: true },
    );
    // Les claims actifs pointent désormais la 2e campagne (celle qu'on vient de
    // rejoindre) — l'accès à la 1re reste garanti par la ligne `player_auth_sessions`,
    // pas par ces claims (voir migration 0043).
    expect(updateUserByIdMock).toHaveBeenLastCalledWith('anon-1', {
      app_metadata: { player_id: 'p2', campaign_id: 'camp-2' },
    });
  });

  it('recliquer un lien déjà joint par la même identité est idempotent (pas d’erreur, pas de doublon)', async () => {
    playersLookupMock.mockResolvedValue({ data: player('p1', 'camp-1'), error: null });
    getUserMock.mockResolvedValue({ data: { user: { id: 'existing-1' } } });

    const first = await redeemJoinSecret(SECRET_A);
    const second = await redeemJoinSecret(SECRET_A);

    expect(first).toEqual({ status: 'ok' });
    expect(second).toEqual({ status: 'ok' });
    expect(playerAuthUpsertMock).toHaveBeenCalledTimes(2);
    expect(playerAuthUpsertMock).toHaveBeenNthCalledWith(
      2,
      { auth_user_id: 'existing-1', player_id: 'p1' },
      { onConflict: 'auth_user_id,player_id', ignoreDuplicates: true },
    );
  });
});
