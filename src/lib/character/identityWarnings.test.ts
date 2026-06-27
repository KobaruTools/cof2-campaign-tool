import { describe, expect, it } from 'vitest';
import { ancestryById } from '@/data';
import { identityWarnings } from './identityWarnings';

// Humain : espérance 100 ans, taille 1,50 m à 2 m, poids 40 à 120 kg.
const humain = ancestryById.get('humain')!;

describe('identityWarnings', () => {
  it('ne signale rien pour des valeurs dans les repères', () => {
    expect(identityWarnings({ age: '30', height: '175', weight: '80' }, humain)).toEqual([]);
  });

  it('ne signale rien sans peuple connu', () => {
    expect(identityWarnings({ age: '999', height: '500', weight: '999' }, undefined)).toEqual([]);
  });

  it('signale un âge au-delà de l’espérance de vie', () => {
    const w = identityWarnings({ age: '150' }, humain);
    expect(w).toHaveLength(1);
    expect(w[0]).toContain('espérance de vie');
    expect(w[0]).toContain('100 ans');
  });

  it('ne signale pas un âge égal à l’espérance de vie', () => {
    expect(identityWarnings({ age: '100' }, humain)).toEqual([]);
  });

  it('signale une taille hors fourchette (bornes incluses)', () => {
    expect(identityWarnings({ height: '250' }, humain)).toHaveLength(1);
    expect(identityWarnings({ height: '200' }, humain)).toEqual([]);
  });

  it('signale un poids en dessous ou au-dessus de la fourchette', () => {
    expect(identityWarnings({ weight: '30' }, humain)[0]).toContain('Poids');
    expect(identityWarnings({ weight: '200' }, humain)[0]).toContain('Poids');
    expect(identityWarnings({ weight: '120' }, humain)).toEqual([]);
  });

  it('cumule les avertissements dans l’ordre âge / taille / poids', () => {
    const w = identityWarnings({ age: '150', height: '250', weight: '200' }, humain);
    expect(w).toHaveLength(3);
    expect(w[0]).toContain('Âge');
    expect(w[1]).toContain('Taille');
    expect(w[2]).toContain('Poids');
  });
});
