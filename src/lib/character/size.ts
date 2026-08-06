/**
 * Catégorie de taille du personnage — réutilise l'échelle du Bestiaire (`CreatureSize`, table
 * p. 260) : « moyenne » pour tous les peuples jouables, sauf le halfelin (« petite »). Arbitrage
 * propriétaire (2026-08-06) : le livre ne donne la taille d'un peuple qu'en prose libre dans sa
 * description (`Ancestry` n'a pas de champ `size` structuré), cette règle fixe la référence unique
 * pour la fiche. Stature de géant (`prestige-colosse-r4`, p. 149 : « considéré comme faisant une
 * taille de plus ») augmente cette catégorie d'UN cran.
 */
import { CREATURE_SIZES } from '@/data/schema';
import type { CreatureSize } from '@/data/schema';

const SMALL_ANCESTRY_IDS = new Set(['halfelin']);

/** Taille de base du peuple, avant capacités : « petite » pour le halfelin, « moyenne » sinon. */
export function baseAncestrySize(ancestryId: string | undefined): CreatureSize {
  return ancestryId && SMALL_ANCESTRY_IDS.has(ancestryId) ? 'petite' : 'moyenne';
}

/** Taille effective du personnage, Stature de géant comprise (une catégorie de plus si acquise). */
export function characterSizeCategory(
  ancestryId: string | undefined,
  featureIds: string[],
): CreatureSize {
  const base = baseAncestrySize(ancestryId);
  if (!featureIds.includes('prestige-colosse-r4')) return base;
  const index = CREATURE_SIZES.indexOf(base);
  return CREATURE_SIZES[Math.min(index + 1, CREATURE_SIZES.length - 1)];
}
