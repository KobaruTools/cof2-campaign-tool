import { describe, expect, it } from 'vitest';
import {
  formatHeightRangeCm,
  isHeightOutOfRange,
  parseHeightCm,
  parseHeightRangeCm,
} from './height';

describe('parseHeightRangeCm', () => {
  it('convertit une fourchette en mètres', () => {
    expect(parseHeightRangeCm('1,50 m à 1,90 m')).toEqual({ minCm: 150, maxCm: 190 });
  });

  it('gère les mètres entiers et la virgule', () => {
    expect(parseHeightRangeCm('1 m à 1,20 m')).toEqual({ minCm: 100, maxCm: 120 });
    expect(parseHeightRangeCm('1,50 m à 2 m')).toEqual({ minCm: 150, maxCm: 200 });
  });

  it('gère un mélange cm / m', () => {
    expect(parseHeightRangeCm('80 cm à 1 m')).toEqual({ minCm: 80, maxCm: 100 });
  });

  it('retourne null sans fourchette exploitable', () => {
    expect(parseHeightRangeCm(undefined)).toBeNull();
    expect(parseHeightRangeCm('variable')).toBeNull();
    expect(parseHeightRangeCm('1,50 m')).toBeNull();
  });
});

describe('parseHeightCm', () => {
  it('lit un entier en cm', () => {
    expect(parseHeightCm('175')).toBe(175);
  });

  it('tolère la virgule décimale', () => {
    expect(parseHeightCm('175,5')).toBe(175.5);
  });

  it('retourne null sur une saisie vide ou invalide', () => {
    expect(parseHeightCm('')).toBeNull();
    expect(parseHeightCm(undefined)).toBeNull();
    expect(parseHeightCm('abc')).toBeNull();
  });
});

describe('isHeightOutOfRange', () => {
  const range = { minCm: 150, maxCm: 190 };

  it('ne signale pas une valeur dans la fourchette (bornes incluses)', () => {
    expect(isHeightOutOfRange('150', range)).toBe(false);
    expect(isHeightOutOfRange('170', range)).toBe(false);
    expect(isHeightOutOfRange('190', range)).toBe(false);
  });

  it('signale une valeur hors fourchette', () => {
    expect(isHeightOutOfRange('149', range)).toBe(true);
    expect(isHeightOutOfRange('220', range)).toBe(true);
  });

  it('reste silencieux sans saisie ou sans fourchette', () => {
    expect(isHeightOutOfRange('', range)).toBe(false);
    expect(isHeightOutOfRange('220', null)).toBe(false);
  });
});

describe('formatHeightRangeCm', () => {
  it('formate la fourchette en cm', () => {
    expect(formatHeightRangeCm({ minCm: 150, maxCm: 190 })).toBe('150 à 190 cm');
  });
});
