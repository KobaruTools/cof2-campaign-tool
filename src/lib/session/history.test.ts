import { describe, expect, it } from 'vitest';
import type { Database } from '@/lib/supabase/types';
import { buildSessionHistory } from './history';

type GameSessionRow = Database['public']['Tables']['game_sessions']['Row'];
type ParticipantRow = Database['public']['Tables']['game_session_participants']['Row'];

const session = (over: Partial<GameSessionRow> = {}): GameSessionRow => ({
  id: 's1',
  campaign_id: 'c1',
  started_at: '2026-08-01T20:00:00Z',
  ended_at: '2026-08-01T23:00:00Z',
  last_active_at: '2026-08-01T22:58:00Z',
  ended_reason: 'gm',
  created_at: '2026-08-01T20:00:00Z',
  ...over,
});

const participant = (over: Partial<ParticipantRow> = {}): ParticipantRow => ({
  id: 'p1',
  session_id: 's1',
  player_id: null,
  joined_at: '2026-08-01T20:00:00Z',
  left_at: '2026-08-01T23:00:00Z',
  ...over,
});

describe('buildSessionHistory', () => {
  it('ignore les sessions encore actives (ended_at null)', () => {
    const result = buildSessionHistory([session({ ended_at: null, ended_reason: null })], [], new Map());
    expect(result).toEqual([]);
  });

  it('calcule la durée de la partie depuis started_at/ended_at', () => {
    const [entry] = buildSessionHistory([session()], [], new Map());
    expect(entry.durationMs).toBe(3 * 60 * 60 * 1000);
    expect(entry.endedReason).toBe('gm');
  });

  it('regroupe plusieurs entrées du même joueur (multi-onglets) et cumule la présence', () => {
    const rows = [
      participant({ id: 'a', player_id: 'player-1', joined_at: '2026-08-01T20:00:00Z', left_at: '2026-08-01T21:00:00Z' }),
      participant({ id: 'b', player_id: 'player-1', joined_at: '2026-08-01T21:30:00Z', left_at: '2026-08-01T22:00:00Z' }),
    ];
    const [entry] = buildSessionHistory([session()], rows, new Map([['player-1', 'Alice']]));
    const alice = entry.participants.find((p) => p.playerId === 'player-1');
    expect(alice).toEqual({
      playerId: 'player-1',
      name: 'Alice',
      presenceMs: 90 * 60 * 1000,
      entries: 2,
    });
  });

  it('borne à la fin de session une entrée jamais fermée (left_at null)', () => {
    const rows = [
      participant({ player_id: 'player-1', joined_at: '2026-08-01T22:30:00Z', left_at: null }),
    ];
    const [entry] = buildSessionHistory([session()], rows, new Map([['player-1', 'Alice']]));
    const alice = entry.participants.find((p) => p.playerId === 'player-1');
    expect(alice?.presenceMs).toBe(30 * 60 * 1000);
  });

  it('place le MJ (player_id null) en tête, puis les joueurs par nom', () => {
    const rows = [
      participant({ id: 'gm', player_id: null }),
      participant({ id: 'bob', player_id: 'p-bob' }),
      participant({ id: 'alice', player_id: 'p-alice' }),
    ];
    const playerNameById = new Map([
      ['p-bob', 'Bob'],
      ['p-alice', 'Alice'],
    ]);
    const [entry] = buildSessionHistory([session()], rows, playerNameById);
    expect(entry.participants.map((p) => p.name)).toEqual(['MJ', 'Alice', 'Bob']);
  });

  it('trie les parties les plus récentes en premier', () => {
    const result = buildSessionHistory(
      [
        session({ id: 'old', started_at: '2026-07-01T20:00:00Z', ended_at: '2026-07-01T23:00:00Z' }),
        session({ id: 'new', started_at: '2026-08-01T20:00:00Z', ended_at: '2026-08-01T23:00:00Z' }),
      ],
      [],
      new Map(),
    );
    expect(result.map((e) => e.id)).toEqual(['new', 'old']);
  });
});
