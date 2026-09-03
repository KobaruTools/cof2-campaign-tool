/**
 * Bourse & monnaie CO2 (PER-152) — conversions et formatage.
 *
 * Système monétaire extrait du livre de base, p. 181 (« Système monétaire ») :
 *   « Tous les prix sont exprimés en pièces d'argent (pa) et pièces de cuivre (pc).
 *     Les pièces d'or (po) sont rares et précieuses […]. 1 po = 10 pa = 100 pc. »
 *   La platine (« 1 pp = 10 po ») est rare et précieuse ; elle n'apparaît dans aucune
 *   table de prix mais est désormais suivie (thésaurisation, faire la monnaie).
 *
 * Module pur (aucune dépendance UI). Les valeurs d'une `Purse` ne sont PAS
 * normalisées d'office : le joueur peut détenir « 15 pa » sans les regrouper en
 * « 1 po 5 pa ». `normalizePurse` propose ce regroupement à la demande.
 */
import type { Purse } from './types';

/** 1 pa (argent) = 10 pc (cuivre). Taux p. 181. */
export const COPPER_PER_SILVER = 10;
/** 1 po (or) = 10 pa (argent). Taux p. 181. */
export const SILVER_PER_GOLD = 10;
/** 1 pp (platine) = 10 po (or). Taux p. 181. */
export const GOLD_PER_PLATINUM = 10;
/** 1 po (or) = 100 pc (cuivre). Taux p. 181. */
export const COPPER_PER_GOLD = COPPER_PER_SILVER * SILVER_PER_GOLD;
/** 1 pp (platine) = 1000 pc (cuivre). Taux p. 181. */
export const COPPER_PER_PLATINUM = COPPER_PER_GOLD * GOLD_PER_PLATINUM;

/** Bourse vide (toutes unités à zéro). */
export const EMPTY_PURSE: Purse = { platinum: 0, gold: 0, silver: 0, copper: 0 };

/** Valeur totale de la bourse exprimée en pièces de cuivre (unité de base). */
export function purseTotalCopper(purse: Purse): number {
  return (
    purse.platinum * COPPER_PER_PLATINUM +
    purse.gold * COPPER_PER_GOLD +
    purse.silver * COPPER_PER_SILVER +
    purse.copper
  );
}

/**
 * Convertit un total en cuivre vers la représentation canonique minimale
 * (regroupement : 1000 pc → 1 pp, 100 pc → 1 po, 10 pc → 1 pa). Le total est
 * plafonné à ≥ 0 et arrondi à l'entier inférieur (les pièces sont indivisibles).
 */
export function copperToPurse(copperTotal: number): Purse {
  const total = Math.max(0, Math.floor(copperTotal));
  const platinum = Math.floor(total / COPPER_PER_PLATINUM);
  const gold = Math.floor((total % COPPER_PER_PLATINUM) / COPPER_PER_GOLD);
  const silver = Math.floor((total % COPPER_PER_GOLD) / COPPER_PER_SILVER);
  const copper = total % COPPER_PER_SILVER;
  return { platinum, gold, silver, copper };
}

/**
 * Regroupe la bourse en monnaie courante (forme canonique : cuivre et argent < 10).
 * Conserve la valeur totale — c'est un simple change, pas un gain.
 */
export function normalizePurse(purse: Purse): Purse {
  return copperToPurse(purseTotalCopper(purse));
}

/** Bourse sans aucune pièce. */
export function isPurseEmpty(purse: Purse): boolean {
  return purse.platinum === 0 && purse.gold === 0 && purse.silver === 0 && purse.copper === 0;
}

/**
 * `true` si la bourse est déjà sous forme canonique (rien à regrouper) : chaque
 * sous-unité (cuivre, argent, or) est < 10 et toutes les unités sont des entiers ≥ 0.
 */
export function isPurseCanonical(purse: Purse): boolean {
  return (
    Number.isInteger(purse.platinum) &&
    Number.isInteger(purse.gold) &&
    Number.isInteger(purse.silver) &&
    Number.isInteger(purse.copper) &&
    purse.platinum >= 0 &&
    purse.gold >= 0 &&
    purse.silver >= 0 &&
    purse.copper >= 0 &&
    purse.gold < GOLD_PER_PLATINUM &&
    purse.silver < SILVER_PER_GOLD &&
    purse.copper < COPPER_PER_SILVER
  );
}

/** Ordre des dénominations, de la plus faible (cuivre) à la plus forte (platine). */
export const DENOMINATION_ORDER: readonly (keyof Purse)[] = ['copper', 'silver', 'gold', 'platinum'];

/**
 * Taux de conversion d'UNE pièce de la dénomination (clé) vers la dénomination
 * immédiatement inférieure de `DENOMINATION_ORDER` (p. 181). Pas d'entrée pour `copper`
 * (rien de plus faible).
 */
export const RATIO_TO_NEXT_LOWER: Partial<Record<keyof Purse, number>> = {
  silver: COPPER_PER_SILVER,
  gold: SILVER_PER_GOLD,
  platinum: GOLD_PER_PLATINUM,
};

/** Valeur d'une pièce de `key`, exprimée en pièces de cuivre (cf. `purseTotalCopper`). */
const COPPER_VALUE: Record<keyof Purse, number> = {
  copper: 1,
  silver: COPPER_PER_SILVER,
  gold: COPPER_PER_GOLD,
  platinum: COPPER_PER_PLATINUM,
};

/**
 * `true` si la bourse contient de quoi retirer `amount` pièces de `key`, tous rangs
 * confondus (emprunt automatique inclus, cf. `withdrawCoin`, PER-452).
 */
export function canWithdrawCoin(purse: Purse, key: keyof Purse, amount = 1): boolean {
  return purseTotalCopper(purse) >= amount * COPPER_VALUE[key];
}

/**
 * Garantit au moins 1 pièce disponible à `DENOMINATION_ORDER[index]`, en cassant une
 * pièce de la dénomination immédiatement supérieure si besoin (récursif, remonte la
 * chaîne aussi loin que nécessaire). Ne touche à rien si déjà disponible, ou si la
 * bourse n'a plus rien à emprunter plus haut (insuffisante).
 */
function ensureOneCoin(purse: Purse, index: number): Purse {
  const key = DENOMINATION_ORDER[index];
  if (purse[key] > 0) return purse;
  const higherKey = DENOMINATION_ORDER[index + 1];
  if (!higherKey) return purse;
  const withHigher = ensureOneCoin(purse, index + 1);
  if (withHigher[higherKey] <= 0) return withHigher;
  const ratio = RATIO_TO_NEXT_LOWER[higherKey]!;
  return { ...withHigher, [higherKey]: withHigher[higherKey] - 1, [key]: withHigher[key] + ratio };
}

/**
 * Retire `amount` pièces de `key` (PER-452). Si le solde de `key` est insuffisant,
 * emprunte automatiquement sur la dénomination immédiatement supérieure (taux p. 181),
 * en remontant la chaîne (po → pa → pc) si besoin — sans jamais toucher aux
 * dénominations plus faibles que `key`. Si la bourse ne suffit pas tous rangs
 * confondus, plafonne au maximum retirable (jamais négatif).
 */
export function withdrawCoin(purse: Purse, key: keyof Purse, amount = 1): Purse {
  const index = DENOMINATION_ORDER.indexOf(key);
  let working = purse;
  while (working[key] < amount) {
    const before = working;
    working = ensureOneCoin(working, index);
    if (working === before) break;
  }
  return { ...working, [key]: Math.max(0, working[key] - amount) };
}

/**
 * Formate une bourse en texte compact (« 1 pp 12 po 3 pa 5 pc »), en omettant les
 * unités à zéro. Bourse vide → « 0 pc ».
 */
export function formatPurse(purse: Purse): string {
  const parts: string[] = [];
  if (purse.platinum) parts.push(`${purse.platinum} pp`);
  if (purse.gold) parts.push(`${purse.gold} po`);
  if (purse.silver) parts.push(`${purse.silver} pa`);
  if (purse.copper) parts.push(`${purse.copper} pc`);
  return parts.length > 0 ? parts.join(' ') : '0 pc';
}
