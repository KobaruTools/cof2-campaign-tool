/**
 * Bourse & monnaie CO2 (PER-152) — conversions et formatage.
 *
 * Système monétaire extrait du livre de base, p. 181 (« Système monétaire ») :
 *   « Tous les prix sont exprimés en pièces d'argent (pa) et pièces de cuivre (pc).
 *     Les pièces d'or (po) sont rares et précieuses […]. 1 po = 10 pa = 100 pc. »
 *   La platine (« 1 pp = 10 po ») existe mais reste quasi-mythique et n'apparaît
 *   dans aucune table de prix : elle n'est pas suivie (cf. `src/data/equipment.ts`).
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
/** 1 po (or) = 100 pc (cuivre). Taux p. 181. */
export const COPPER_PER_GOLD = COPPER_PER_SILVER * SILVER_PER_GOLD;

/** Bourse vide (toutes unités à zéro). */
export const EMPTY_PURSE: Purse = { gold: 0, silver: 0, copper: 0 };

/** Valeur totale de la bourse exprimée en pièces de cuivre (unité de base). */
export function purseTotalCopper(purse: Purse): number {
  return purse.gold * COPPER_PER_GOLD + purse.silver * COPPER_PER_SILVER + purse.copper;
}

/**
 * Convertit un total en cuivre vers la représentation canonique minimale
 * (regroupement : 100 pc → 1 po, 10 pc → 1 pa). Le total est plafonné à ≥ 0 et
 * arrondi à l'entier inférieur (les pièces sont indivisibles).
 */
export function copperToPurse(copperTotal: number): Purse {
  const total = Math.max(0, Math.floor(copperTotal));
  const gold = Math.floor(total / COPPER_PER_GOLD);
  const silver = Math.floor((total % COPPER_PER_GOLD) / COPPER_PER_SILVER);
  const copper = total % COPPER_PER_SILVER;
  return { gold, silver, copper };
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
  return purse.gold === 0 && purse.silver === 0 && purse.copper === 0;
}

/**
 * `true` si la bourse est déjà sous forme canonique (rien à regrouper) : chaque
 * sous-unité (cuivre, argent) est < 10 et toutes les unités sont des entiers ≥ 0.
 */
export function isPurseCanonical(purse: Purse): boolean {
  return (
    Number.isInteger(purse.gold) &&
    Number.isInteger(purse.silver) &&
    Number.isInteger(purse.copper) &&
    purse.gold >= 0 &&
    purse.silver >= 0 &&
    purse.copper >= 0 &&
    purse.silver < SILVER_PER_GOLD &&
    purse.copper < COPPER_PER_SILVER
  );
}

/**
 * Formate une bourse en texte compact (« 12 po 3 pa 5 pc »), en omettant les
 * unités à zéro. Bourse vide → « 0 pc ».
 */
export function formatPurse(purse: Purse): string {
  const parts: string[] = [];
  if (purse.gold) parts.push(`${purse.gold} po`);
  if (purse.silver) parts.push(`${purse.silver} pa`);
  if (purse.copper) parts.push(`${purse.copper} pc`);
  return parts.length > 0 ? parts.join(' ') : '0 pc';
}
