import { describe, expect, it } from 'vitest';
import type { Purse } from './types';
import {
  COPPER_PER_GOLD,
  COPPER_PER_SILVER,
  EMPTY_PURSE,
  copperToPurse,
  formatPurse,
  isPurseCanonical,
  isPurseEmpty,
  normalizePurse,
  purseTotalCopper,
} from './purse';

describe('taux de conversion (p. 181)', () => {
  it('1 po = 10 pa = 100 pc', () => {
    expect(COPPER_PER_SILVER).toBe(10);
    expect(COPPER_PER_GOLD).toBe(100);
  });
});

describe('purseTotalCopper', () => {
  it('additionne les unités converties en cuivre', () => {
    expect(purseTotalCopper({ gold: 1, silver: 2, copper: 3 })).toBe(123);
    expect(purseTotalCopper(EMPTY_PURSE)).toBe(0);
    expect(purseTotalCopper({ gold: 0, silver: 15, copper: 23 })).toBe(173);
  });
});

describe('copperToPurse', () => {
  it('regroupe un total en forme canonique', () => {
    expect(copperToPurse(123)).toEqual({ gold: 1, silver: 2, copper: 3 });
    expect(copperToPurse(0)).toEqual({ gold: 0, silver: 0, copper: 0 });
    expect(copperToPurse(1235)).toEqual({ gold: 12, silver: 3, copper: 5 });
  });

  it('plafonne à zéro et arrondit à l’entier inférieur', () => {
    expect(copperToPurse(-50)).toEqual({ gold: 0, silver: 0, copper: 0 });
    expect(copperToPurse(12.9)).toEqual({ gold: 0, silver: 1, copper: 2 });
  });
});

describe('normalizePurse', () => {
  it('regroupe sans changer la valeur totale', () => {
    const p: Purse = { gold: 0, silver: 15, copper: 23 };
    const n = normalizePurse(p);
    expect(n).toEqual({ gold: 1, silver: 7, copper: 3 });
    expect(purseTotalCopper(n)).toBe(purseTotalCopper(p));
  });

  it('laisse une bourse déjà canonique inchangée', () => {
    const p: Purse = { gold: 5, silver: 4, copper: 9 };
    expect(normalizePurse(p)).toEqual(p);
  });
});

describe('isPurseEmpty', () => {
  it('détecte une bourse vide', () => {
    expect(isPurseEmpty(EMPTY_PURSE)).toBe(true);
    expect(isPurseEmpty({ gold: 0, silver: 0, copper: 1 })).toBe(false);
  });
});

describe('isPurseCanonical', () => {
  it('vrai si cuivre et argent < 10 et entiers ≥ 0', () => {
    expect(isPurseCanonical({ gold: 5, silver: 9, copper: 9 })).toBe(true);
    expect(isPurseCanonical({ gold: 0, silver: 0, copper: 0 })).toBe(true);
  });

  it('faux si une sous-unité déborde ou est invalide', () => {
    expect(isPurseCanonical({ gold: 0, silver: 10, copper: 0 })).toBe(false);
    expect(isPurseCanonical({ gold: 0, silver: 0, copper: 10 })).toBe(false);
    expect(isPurseCanonical({ gold: -1, silver: 0, copper: 0 })).toBe(false);
    expect(isPurseCanonical({ gold: 0, silver: 1.5, copper: 0 })).toBe(false);
  });
});

describe('formatPurse', () => {
  it('omet les unités à zéro', () => {
    expect(formatPurse({ gold: 12, silver: 3, copper: 5 })).toBe('12 po 3 pa 5 pc');
    expect(formatPurse({ gold: 0, silver: 3, copper: 0 })).toBe('3 pa');
    expect(formatPurse({ gold: 2, silver: 0, copper: 7 })).toBe('2 po 7 pc');
  });

  it('bourse vide → « 0 pc »', () => {
    expect(formatPurse(EMPTY_PURSE)).toBe('0 pc');
  });
});
