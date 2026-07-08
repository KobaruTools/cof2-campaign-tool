import { describe, expect, it } from 'vitest';
import { ONLINE_WINDOW_MS, presenceState } from './presenceStatus';

describe('presenceState', () => {
  const now = new Date('2026-07-08T12:00:00Z').getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('« never » tant que le lien n’a jamais été activé', () => {
    expect(presenceState({ firstJoinedAt: null, lastSeenAt: null }, now)).toBe('never');
    // lastSeenAt sans firstJoinedAt ne devrait pas arriver, mais reste « never ».
    expect(presenceState({ firstJoinedAt: null, lastSeenAt: ago(0) }, now)).toBe('never');
  });

  it('« online » quand l’activité est dans la fenêtre', () => {
    expect(
      presenceState({ firstJoinedAt: ago(86_400_000), lastSeenAt: ago(30_000) }, now),
    ).toBe('online');
    expect(
      presenceState({ firstJoinedAt: ago(86_400_000), lastSeenAt: ago(ONLINE_WINDOW_MS - 1) }, now),
    ).toBe('online');
  });

  it('« seen » quand l’activité est hors fenêtre', () => {
    expect(
      presenceState({ firstJoinedAt: ago(86_400_000), lastSeenAt: ago(ONLINE_WINDOW_MS + 1) }, now),
    ).toBe('seen');
  });

  it('« seen » quand le joueur a rejoint mais n’a pas d’activité récente enregistrée', () => {
    expect(presenceState({ firstJoinedAt: ago(3_600_000), lastSeenAt: null }, now)).toBe('seen');
  });
});
