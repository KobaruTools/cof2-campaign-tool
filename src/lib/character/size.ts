/**
 * Catégorie de taille du personnage — réutilise l'échelle du Bestiaire (`CreatureSize`, table
 * p. 260) : « moyenne » pour tous les peuples jouables, sauf le halfelin, le frouïn, le gobelin et
 * le kobold (« petite » ; frouïn/gobelin/kobold = contenu payant du Compagnon, PER-330/331/332),
 * et le lutin (« très petite » ; contenu payant du Compagnon, PER-333 — le livre le qualifie de
 * « créature très petite », un cran sous « petite »). Arbitrage propriétaire (2026-08-06) : le livre
 * ne donne la taille d'un peuple qu'en prose libre dans sa description (`Ancestry` n'a pas de champ
 * `size` structuré), cette règle fixe la référence unique pour la fiche. Stature de géant
 * (`prestige-colosse-r4`, p. 149 : « considéré comme faisant une taille de plus ») augmente cette
 * catégorie d'UN cran.
 */
import { CREATURE_SIZES } from '@/data/schema';
import type { CreatureSize } from '@/data/schema';

const SMALL_ANCESTRY_IDS = new Set(['halfelin', 'frouin', 'gobelin', 'kobold']);

/** Peuples de taille « très petite » d'office (PER-333, lutin : « créature très petite » — Le Compagnon, p. 27). */
const TINY_ANCESTRY_IDS = new Set(['lutin']);

/**
 * Peuples de taille « grande » d'office (PER-325, demi-ogre : « considéré comme de taille grande » —
 * Le Compagnon, p. 12). Le trait est HORS voie, toujours actif dès la création. Comme pour le
 * halfelin, la taille d'un peuple n'a pas de champ structuré sur `Ancestry` (prose libre) : cette
 * table fixe la référence unique de la fiche. Slug d'`id` de contenu payant conservé (chaîne).
 */
const LARGE_ANCESTRY_IDS = new Set(['demi-ogre']);

/**
 * Taille de base du peuple, avant capacités : « très petite » pour le lutin, « petite » pour le
 * halfelin, « grande » pour le demi-ogre (trait de peuple), « moyenne » sinon.
 */
export function baseAncestrySize(ancestryId: string | undefined): CreatureSize {
  if (ancestryId && TINY_ANCESTRY_IDS.has(ancestryId)) return 'tres-petite';
  if (ancestryId && SMALL_ANCESTRY_IDS.has(ancestryId)) return 'petite';
  if (ancestryId && LARGE_ANCESTRY_IDS.has(ancestryId)) return 'grande';
  return 'moyenne';
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
