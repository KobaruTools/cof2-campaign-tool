import { describe, expect, it } from 'vitest';
import type { Purse } from './types';
import {
  COPPER_PER_GOLD,
  COPPER_PER_PLATINUM,
  COPPER_PER_SILVER,
  EMPTY_PURSE,
  GOLD_PER_PLATINUM,
  canWithdrawCoin,
  copperToPurse,
  formatPurse,
  isPurseCanonical,
  isPurseEmpty,
  normalizePurse,
  purseTotalCopper,
  withdrawCoin,
} from './purse';

describe('taux de conversion (p. 181)', () => {
  it('1 pp = 10 po = 100 pa = 1000 pc', () => {
    expect(COPPER_PER_SILVER).toBe(10);
    expect(COPPER_PER_GOLD).toBe(100);
    expect(GOLD_PER_PLATINUM).toBe(10);
    expect(COPPER_PER_PLATINUM).toBe(1000);
  });
});

describe('purseTotalCopper', () => {
  it('additionne les unités converties en cuivre', () => {
    expect(purseTotalCopper({ platinum: 0, gold: 1, silver: 2, copper: 3 })).toBe(123);
    expect(purseTotalCopper(EMPTY_PURSE)).toBe(0);
    expect(purseTotalCopper({ platinum: 0, gold: 0, silver: 15, copper: 23 })).toBe(173);
  });

  it('compte la platine (1 pp = 1000 pc)', () => {
    expect(purseTotalCopper({ platinum: 2, gold: 1, silver: 2, copper: 3 })).toBe(2123);
  });
});

describe('copperToPurse', () => {
  it('regroupe un total en forme canonique', () => {
    expect(copperToPurse(123)).toEqual({ platinum: 0, gold: 1, silver: 2, copper: 3 });
    expect(copperToPurse(0)).toEqual({ platinum: 0, gold: 0, silver: 0, copper: 0 });
    expect(copperToPurse(1235)).toEqual({ platinum: 1, gold: 2, silver: 3, copper: 5 });
  });

  it('plafonne à zéro et arrondit à l’entier inférieur', () => {
    expect(copperToPurse(-50)).toEqual({ platinum: 0, gold: 0, silver: 0, copper: 0 });
    expect(copperToPurse(12.9)).toEqual({ platinum: 0, gold: 0, silver: 1, copper: 2 });
  });
});

describe('normalizePurse', () => {
  it('regroupe sans changer la valeur totale', () => {
    const p: Purse = { platinum: 0, gold: 0, silver: 15, copper: 23 };
    const n = normalizePurse(p);
    expect(n).toEqual({ platinum: 0, gold: 1, silver: 7, copper: 3 });
    expect(purseTotalCopper(n)).toBe(purseTotalCopper(p));
  });

  it('regroupe l’or débordant en platine', () => {
    const p: Purse = { platinum: 1, gold: 25, silver: 0, copper: 0 };
    const n = normalizePurse(p);
    expect(n).toEqual({ platinum: 3, gold: 5, silver: 0, copper: 0 });
    expect(purseTotalCopper(n)).toBe(purseTotalCopper(p));
  });

  it('laisse une bourse déjà canonique inchangée', () => {
    const p: Purse = { platinum: 8, gold: 5, silver: 4, copper: 9 };
    expect(normalizePurse(p)).toEqual(p);
  });
});

describe('isPurseEmpty', () => {
  it('détecte une bourse vide', () => {
    expect(isPurseEmpty(EMPTY_PURSE)).toBe(true);
    expect(isPurseEmpty({ platinum: 0, gold: 0, silver: 0, copper: 1 })).toBe(false);
    expect(isPurseEmpty({ platinum: 1, gold: 0, silver: 0, copper: 0 })).toBe(false);
  });
});

describe('isPurseCanonical', () => {
  it('vrai si cuivre, argent et or < 10 et entiers ≥ 0', () => {
    expect(isPurseCanonical({ platinum: 3, gold: 9, silver: 9, copper: 9 })).toBe(true);
    expect(isPurseCanonical({ platinum: 0, gold: 0, silver: 0, copper: 0 })).toBe(true);
  });

  it('faux si une sous-unité déborde ou est invalide', () => {
    expect(isPurseCanonical({ platinum: 0, gold: 10, silver: 0, copper: 0 })).toBe(false);
    expect(isPurseCanonical({ platinum: 0, gold: 0, silver: 10, copper: 0 })).toBe(false);
    expect(isPurseCanonical({ platinum: 0, gold: 0, silver: 0, copper: 10 })).toBe(false);
    expect(isPurseCanonical({ platinum: -1, gold: 0, silver: 0, copper: 0 })).toBe(false);
    expect(isPurseCanonical({ platinum: 0, gold: 0, silver: 1.5, copper: 0 })).toBe(false);
  });
});

describe('withdrawCoin (PER-452)', () => {
  it('retire simplement si la dénomination est suffisante', () => {
    expect(withdrawCoin({ platinum: 0, gold: 0, silver: 6, copper: 5 }, 'silver', 2)).toEqual({
      platinum: 0,
      gold: 0,
      silver: 4,
      copper: 5,
    });
  });

  it('emprunte 1 pa (→ 10 pc) quand le cuivre est insuffisant (exemple du ticket)', () => {
    // 6 pa, 0 pc, dépense de 1 pc → 5 pa, 9 pc.
    expect(withdrawCoin({ platinum: 0, gold: 0, silver: 6, copper: 0 }, 'copper', 1)).toEqual({
      platinum: 0,
      gold: 0,
      silver: 5,
      copper: 9,
    });
  });

  it('remonte la chaîne (po → pa → pc) si les dénominations intermédiaires sont vides', () => {
    expect(withdrawCoin({ platinum: 0, gold: 1, silver: 0, copper: 0 }, 'copper', 1)).toEqual({
      platinum: 0,
      gold: 0,
      silver: 9,
      copper: 9,
    });
  });

  it('remonte jusqu’à la platine si besoin', () => {
    expect(withdrawCoin({ platinum: 1, gold: 0, silver: 0, copper: 0 }, 'silver', 1)).toEqual({
      platinum: 0,
      gold: 9,
      silver: 9,
      copper: 0,
    });
  });

  it('ne touche jamais aux dénominations plus faibles que celle demandée', () => {
    expect(withdrawCoin({ platinum: 0, gold: 1, silver: 0, copper: 7 }, 'silver', 1)).toEqual({
      platinum: 0,
      gold: 0,
      silver: 9,
      copper: 7,
    });
  });

  it('plafonne à zéro (jamais négatif) si la bourse totale ne suffit pas, tous rangs confondus', () => {
    expect(withdrawCoin({ platinum: 0, gold: 0, silver: 0, copper: 3 }, 'copper', 5)).toEqual({
      platinum: 0,
      gold: 0,
      silver: 0,
      copper: 0,
    });
  });
});

describe('canWithdrawCoin (PER-452)', () => {
  it('vrai si la dénomination seule suffit', () => {
    expect(canWithdrawCoin({ platinum: 0, gold: 0, silver: 0, copper: 3 }, 'copper', 2)).toBe(true);
  });

  it('vrai si un emprunt plus haut peut combler', () => {
    expect(canWithdrawCoin({ platinum: 0, gold: 0, silver: 1, copper: 0 }, 'copper', 1)).toBe(true);
  });

  it('faux si la bourse totale est insuffisante', () => {
    expect(canWithdrawCoin({ platinum: 0, gold: 0, silver: 0, copper: 0 }, 'copper', 1)).toBe(false);
  });
});

describe('formatPurse', () => {
  it('omet les unités à zéro', () => {
    expect(formatPurse({ platinum: 0, gold: 12, silver: 3, copper: 5 })).toBe('12 po 3 pa 5 pc');
    expect(formatPurse({ platinum: 0, gold: 0, silver: 3, copper: 0 })).toBe('3 pa');
    expect(formatPurse({ platinum: 0, gold: 2, silver: 0, copper: 7 })).toBe('2 po 7 pc');
    expect(formatPurse({ platinum: 4, gold: 0, silver: 0, copper: 0 })).toBe('4 pp');
    expect(formatPurse({ platinum: 1, gold: 2, silver: 3, copper: 5 })).toBe('1 pp 2 po 3 pa 5 pc');
  });

  it('bourse vide → « 0 pc »', () => {
    expect(formatPurse(EMPTY_PURSE)).toBe('0 pc');
  });
});
