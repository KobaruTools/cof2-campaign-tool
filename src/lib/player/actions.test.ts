import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  playersOwnsMaybeSingleMock,
  playersUpdateEqMock,
  playersDeleteEqMock,
  sessionsByPlayerMock,
  sessionsByAuthUserMock,
  sessionsDeleteMock,
  deleteUserMock,
} = vi.hoisted(() => ({
  playersOwnsMaybeSingleMock: vi.fn(),
  playersUpdateEqMock: vi.fn(),
  playersDeleteEqMock: vi.fn(),
  sessionsByPlayerMock: vi.fn(),
  sessionsByAuthUserMock: vi.fn(),
  sessionsDeleteMock: vi.fn(),
  deleteUserMock: vi.fn(),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminSupabaseClient: () => ({
    from: (table: string) => {
      if (table === 'players') {
        return {
          update: () => ({ eq: playersUpdateEqMock }),
          delete: () => ({ eq: playersDeleteEqMock }),
        };
      }
      if (table === 'player_auth_sessions') {
        return {
          // `select('auth_user_id').eq('player_id', X)` (sessions du joueur révoqué)
          // vs `select('player_id').eq('auth_user_id', Y)` (memberships de l'identité) —
          // distingués par la colonne sélectionnée.
          select: (columns: string) => ({
            eq: (_col: string, value: string) =>
              columns === 'auth_user_id'
                ? sessionsByPlayerMock(value)
                : sessionsByAuthUserMock(value),
          }),
          delete: () => ({
            eq: (_col1: string, authUserId: string) => ({
              eq: (_col2: string, playerId: string) => sessionsDeleteMock(authUserId, playerId),
            }),
          }),
        };
      }
      throw new Error(`table Supabase admin inattendue dans le test : ${table}`);
    },
    auth: { admin: { deleteUser: deleteUserMock } },
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: playersOwnsMaybeSingleMock }) }),
    }),
  }),
}));

const { regeneratePlayerLink, deletePlayer } = await import('./actions');

beforeEach(() => {
  playersOwnsMaybeSingleMock.mockReset().mockResolvedValue({ data: { id: 'player-1' }, error: null });
  playersUpdateEqMock.mockReset().mockResolvedValue({ error: null });
  playersDeleteEqMock.mockReset().mockResolvedValue({ error: null });
  sessionsByPlayerMock.mockReset();
  sessionsByAuthUserMock.mockReset();
  sessionsDeleteMock.mockReset().mockResolvedValue({ error: null });
  deleteUserMock.mockReset().mockResolvedValue({ error: null });
});

describe('revokePlayerSessions (via regeneratePlayerLink/deletePlayer)', () => {
  it('refuse si le MJ courant ne possède pas le joueur', async () => {
    playersOwnsMaybeSingleMock.mockResolvedValue({ data: null, error: null });

    await expect(regeneratePlayerLink('player-1')).rejects.toThrow(/introuvable|refusé/);
  });

  it('identité mono-campagne : supprime l’utilisateur (comportement historique inchangé)', async () => {
    sessionsByPlayerMock.mockResolvedValue({ data: [{ auth_user_id: 'anon-1' }], error: null });
    sessionsByAuthUserMock.mockResolvedValue({ data: [{ player_id: 'player-1' }], error: null });

    await regeneratePlayerLink('player-1');

    expect(deleteUserMock).toHaveBeenCalledWith('anon-1');
    expect(sessionsDeleteMock).not.toHaveBeenCalled();
    expect(playersUpdateEqMock).toHaveBeenCalledWith('id', 'player-1');
  });

  it("identité multi-campagnes (PER-499) : ne retire QUE la liaison à ce joueur, garde l'accès aux autres campagnes", async () => {
    sessionsByPlayerMock.mockResolvedValue({ data: [{ auth_user_id: 'anon-1' }], error: null });
    sessionsByAuthUserMock.mockResolvedValue({
      data: [{ player_id: 'player-1' }, { player_id: 'player-other' }],
      error: null,
    });

    await regeneratePlayerLink('player-1');

    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(sessionsDeleteMock).toHaveBeenCalledWith('anon-1', 'player-1');
  });

  it('deletePlayer applique la même règle multi-campagnes avant de supprimer la ligne', async () => {
    sessionsByPlayerMock.mockResolvedValue({ data: [{ auth_user_id: 'anon-1' }], error: null });
    sessionsByAuthUserMock.mockResolvedValue({
      data: [{ player_id: 'player-1' }, { player_id: 'player-other' }],
      error: null,
    });

    await deletePlayer('player-1');

    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(sessionsDeleteMock).toHaveBeenCalledWith('anon-1', 'player-1');
    expect(playersDeleteEqMock).toHaveBeenCalledWith('id', 'player-1');
  });
});
