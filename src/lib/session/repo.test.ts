import { describe, expect, it } from 'vitest';
import type { Database } from '@/lib/supabase/types';
import { rowToSession } from './repo';

type GameSessionRow = Database['public']['Tables']['game_sessions']['Row'];

/** Ligne SQL minimale d'une session ACTIVE, surchargeable par test. */
const row = (over: Partial<GameSessionRow> = {}): GameSessionRow => ({
  id: 's1',
  campaign_id: 'c1',
  started_at: '2026-07-29T20:00:00Z',
  ended_at: null,
  last_active_at: '2026-07-29T20:02:00Z',
  ended_reason: null,
  created_at: '2026-07-29T20:00:00Z',
  ...over,
});

describe('rowToSession', () => {
  it('mappe une session active vers l’entité GameSession', () => {
    expect(rowToSession(row())).toEqual({
      id: 's1',
      campaignId: 'c1',
      startedAt: '2026-07-29T20:00:00Z',
      endedAt: null,
      lastActiveAt: '2026-07-29T20:02:00Z',
      endedReason: null,
    });
  });

  it('mappe une session close en conservant ended_at + ended_reason', () => {
    const s = rowToSession(
      row({ ended_at: '2026-07-29T23:00:00Z', ended_reason: 'gm' }),
    );
    expect(s.endedAt).toBe('2026-07-29T23:00:00Z');
    expect(s.endedReason).toBe('gm');
  });

  it('reflète les raisons de fermeture paresseuse (empty / expired)', () => {
    expect(rowToSession(row({ ended_at: 'x', ended_reason: 'empty' })).endedReason).toBe('empty');
    expect(rowToSession(row({ ended_at: 'x', ended_reason: 'expired' })).endedReason).toBe(
      'expired',
    );
  });
});
