import { describe, expect, it } from 'vitest';
import { regenerationAmount } from './regeneration';

describe('regenerationAmount (PER-456)', () => {
  it('rend 0 pour une créature sans régénération de bestiaire', () => {
    expect(regenerationAmount(undefined, false)).toBe(0);
  });

  it('rend le montant plein quand la régénération joue (troll, non bloquée)', () => {
    expect(regenerationAmount({ amount: 5, blockedBy: ['fire', 'acid'] }, false)).toBe(5);
  });

  it('rend 0 quand la créature a subi ce tour un DM d’un type bloquant', () => {
    expect(regenerationAmount({ amount: 5, blockedBy: ['fire', 'acid'] }, true)).toBe(0);
  });

  it('joue sans exception si `blockedBy` est absent, tant que non bloquée', () => {
    expect(regenerationAmount({ amount: 5 }, false)).toBe(5);
  });

  it('plafonne un montant négatif (donnée mal formée) à 0', () => {
    expect(regenerationAmount({ amount: -3 }, false)).toBe(0);
  });
});
