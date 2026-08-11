import { describe, expect, it } from 'vitest';
import { friendPresenceLabel, isFriendOnline } from './presenceLabel';

describe('friendPresenceLabel', () => {
  const now = new Date('2026-08-11T12:00:00Z').getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('« Jamais vu en ligne » quand `last_seen_at` est null', () => {
    expect(friendPresenceLabel(null, now)).toBe('Jamais vu en ligne');
  });

  it('« En ligne » dans la fenêtre de présence', () => {
    expect(friendPresenceLabel(ago(30_000), now)).toBe('En ligne');
  });

  it('« Vu(e) … » hors fenêtre, avec le temps relatif', () => {
    expect(friendPresenceLabel(ago(3 * 60_000), now)).toBe('Vu(e) il y a 3 min');
  });
});

describe('isFriendOnline', () => {
  const now = new Date('2026-08-11T12:00:00Z').getTime();
  const ago = (ms: number) => new Date(now - ms).toISOString();

  it('faux si jamais vu', () => {
    expect(isFriendOnline(null, now)).toBe(false);
  });

  it('vrai dans la fenêtre, faux hors fenêtre', () => {
    expect(isFriendOnline(ago(30_000), now)).toBe(true);
    expect(isFriendOnline(ago(3 * 60_000), now)).toBe(false);
  });
});
