import { describe, expect, it } from 'vitest';
import { formatDamageReduction } from './damageReduction';

describe('formatDamageReduction — étiquettes RD (PER-137)', () => {
  it('RD plate sans portée = tous les DM → « RD 3 »', () => {
    expect(formatDamageReduction({ kind: 'flat', value: 3 }).short).toBe('RD 3');
  });

  it('RD plate typée → « RD Froid 2 »', () => {
    expect(formatDamageReduction({ kind: 'flat', value: 2, scopes: ['cold'] }).short).toBe('RD Froid 2');
  });

  it('RD par division typée → « RD Froid ÷2 »', () => {
    expect(formatDamageReduction({ kind: 'divide', value: 2, scopes: ['cold'] }).short).toBe('RD Froid ÷2');
  });

  it('RD par division sans portée → « RD ÷2 »', () => {
    expect(formatDamageReduction({ kind: 'divide', value: 2 }).short).toBe('RD ÷2');
  });

  it('plusieurs portées jointes → « RD Feu, Froid, Foudre, Acide ÷2 »', () => {
    const dr = formatDamageReduction({
      kind: 'divide',
      value: 2,
      scopes: ['fire', 'cold', 'lightning', 'acid'],
    });
    expect(dr.short).toBe('RD Feu, Froid, Foudre, Acide ÷2');
  });

  it("info-bulle d'une RD plate typée", () => {
    expect(formatDamageReduction({ kind: 'flat', value: 5, scopes: ['fire'] }).long).toBe(
      'Réduit de 5 les DM de feu.',
    );
  });
});
