/**
 * Bourses de pièces génériques (extension PER-200/PER-152) — reconnaissance par NOM d'un
 * objet libre « Bourse de NdM {pp|po|pa|pc} » (ex. « Bourse de 2d6 pa », p. 31 ; « Bourse
 * de 3d6 po » créée depuis les Outils du MJ). Généralise la « Bourse de 2d6 pa » d'origine
 * (`COIN_POUCH_ITEM_NAME`, TOUJOURS reconnue — son nom satisfait ce même motif) à
 * n'importe quelle monnaie/quantité de dés, sans rien changer à son comportement.
 *
 * Module pur (aucune dépendance UI/réseau).
 */
import type { Purse } from './types';

export type CoinCurrency = keyof Purse;

/** Abréviation FR de chaque monnaie (p. 181). */
export const CURRENCY_ABBREV: Record<CoinCurrency, string> = {
  platinum: 'pp',
  gold: 'po',
  silver: 'pa',
  copper: 'pc',
};

/** Libellé long affiché dans les modales (« pièces d'or (po) »). */
export const CURRENCY_LABEL: Record<CoinCurrency, string> = {
  platinum: 'pièces de platine (pp)',
  gold: 'pièces d’or (po)',
  silver: 'pièces d’argent (pa)',
  copper: 'pièces de cuivre (pc)',
};

const CURRENCY_BY_ABBREV: Record<string, CoinCurrency> = {
  pp: 'platinum',
  po: 'gold',
  pa: 'silver',
  pc: 'copper',
};

export interface CoinPouchInfo {
  currency: CoinCurrency;
  /** Abréviation telle que portée par le nom de l'objet (« po »). */
  abbrev: string;
  /** Libellé long pour affichage (« pièces d'or (po) »). */
  label: string;
  /** Notation de dés telle que portée par le nom de l'objet (« 2d6 »). */
  dice: string;
}

const COIN_POUCH_NAME_PATTERN = /^Bourse de (\d+d\d+) (pp|po|pa|pc)$/i;

/** Nom canonique d'une bourse (« Bourse de 2d6 po ») — utilisé à la CRÉATION (Outils du MJ). */
export function coinPouchItemName(dice: string, currency: CoinCurrency): string {
  return `Bourse de ${dice} ${CURRENCY_ABBREV[currency]}`;
}

/**
 * Reconnaît une bourse de pièces par son NOM. `null` si le nom ne correspond pas au
 * motif — objet ordinaire, ou bourse d'un ancien format non pris en charge.
 */
export function parseCoinPouchName(name: string): CoinPouchInfo | null {
  const match = COIN_POUCH_NAME_PATTERN.exec(name.trim());
  if (!match) return null;
  const [, dice, abbrevRaw] = match;
  const abbrev = abbrevRaw.toLowerCase();
  const currency = CURRENCY_BY_ABBREV[abbrev];
  return { currency, abbrev, label: CURRENCY_LABEL[currency], dice };
}

/** Plage attendue (min/max) d'une notation « NdM ». `null` si mal formée. */
export function diceRange(dice: string): { min: number; max: number } | null {
  const match = /^(\d+)d(\d+)$/i.exec(dice.trim());
  if (!match) return null;
  const count = Number.parseInt(match[1], 10);
  const faces = Number.parseInt(match[2], 10);
  if (!(count > 0) || !(faces > 0)) return null;
  return { min: count, max: count * faces };
}
