import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './relativeTime';

describe('formatRelativeTime', () => {
  const now = new Date('2026-07-08T12:00:00Z').getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('rend « à l’instant » sous une minute', () => {
    expect(formatRelativeTime(ago(0), now)).toBe("à l'instant");
    expect(formatRelativeTime(ago(59_000), now)).toBe("à l'instant");
  });

  it('rend les minutes puis les heures', () => {
    expect(formatRelativeTime(ago(5 * 60_000), now)).toBe('il y a 5 min');
    expect(formatRelativeTime(ago(3 * 3_600_000), now)).toBe('il y a 3 h');
  });

  it('rend les jours jusqu’à un mois', () => {
    expect(formatRelativeTime(ago(2 * 86_400_000), now)).toBe('il y a 2 j');
    expect(formatRelativeTime(ago(29 * 86_400_000), now)).toBe('il y a 29 j');
  });

  it('bascule sur une date au-delà d’un mois', () => {
    const label = formatRelativeTime(ago(60 * 86_400_000), now);
    expect(label).not.toMatch(/il y a/);
    expect(label).toMatch(/2026/);
  });

  it('borne un horodatage futur à « à l’instant » (pas de durée négative)', () => {
    expect(formatRelativeTime(new Date(now + 5_000).toISOString(), now)).toBe("à l'instant");
  });
});
