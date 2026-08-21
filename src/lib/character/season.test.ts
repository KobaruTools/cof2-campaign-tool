import { describe, expect, it } from 'vitest';
import { buildSeasonalAgeBreakdown, setSeason } from './season';
import type { Character } from './types';

describe('setSeason', () => {
  it('patches season, null clears it', () => {
    expect(setSeason({} as Character, 'winter')).toEqual({ season: 'winter' });
    expect(setSeason({} as Character, null)).toEqual({ season: undefined });
  });
});

describe('buildSeasonalAgeBreakdown', () => {
  const featureIds = ['humain-r1', 'prestige-saisons-r4', 'prestige-saisons-r5'];

  it('printemps : paraît plus jeune de 2 × rang atteint (rang 5 → 10 ans)', () => {
    const b = buildSeasonalAgeBreakdown('34', 'humain', featureIds, 'spring');
    expect(b?.total).toBe(24);
    expect(b?.terms).toEqual([
      { label: 'Âge', value: 34 },
      { label: 'Voie des saisons (printemps)', value: -10, featureId: 'prestige-saisons-r5' },
    ]);
  });

  it('hiver : paraît plus vieux de 2 × rang atteint', () => {
    const b = buildSeasonalAgeBreakdown('34', 'humain', featureIds, 'winter');
    expect(b?.total).toBe(44);
  });

  it("été/automne/non choisie : aucun delta RAW -> null (repli sur l'âge brut)", () => {
    expect(buildSeasonalAgeBreakdown('34', 'humain', featureIds, 'summer')).toBeNull();
    expect(buildSeasonalAgeBreakdown('34', 'humain', featureIds, 'autumn')).toBeNull();
    expect(buildSeasonalAgeBreakdown('34', 'humain', featureIds, undefined)).toBeNull();
  });

  it("pas humain -> null (la règle du livre est qualifiée « pour un humain »)", () => {
    expect(buildSeasonalAgeBreakdown('34', 'demi-elfe', featureIds, 'spring')).toBeNull();
  });

  it('voie non acquise -> null', () => {
    expect(buildSeasonalAgeBreakdown('34', 'humain', ['humain-r1'], 'spring')).toBeNull();
  });

  it('âge non saisi/non numérique -> null', () => {
    expect(buildSeasonalAgeBreakdown(undefined, 'humain', featureIds, 'spring')).toBeNull();
    expect(buildSeasonalAgeBreakdown('inconnu', 'humain', featureIds, 'spring')).toBeNull();
  });

  it('plancher à 0 an (jamais négatif)', () => {
    const b = buildSeasonalAgeBreakdown('5', 'humain', featureIds, 'spring');
    expect(b?.total).toBe(0);
  });
});
