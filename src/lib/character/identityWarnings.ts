/**
 * Avertissements d'identité non bloquants (immersion) — taille, âge, poids.
 *
 * Le joueur reste libre de saisir n'importe quelle valeur ; on signale seulement
 * celles qui sortent des repères du peuple (`ancestry.physical`) : taille hors
 * fourchette, âge au-delà de l'espérance de vie, poids hors fourchette. Centralisé
 * et pur pour être testé et partagé par le wizard et la fiche (`IdentityForm`).
 */
import type { Ancestry } from '@/data/schema';
import type { Identity } from './types';
import {
  formatHeightRangeCm,
  isHeightOutOfRange,
  parseHeightCm,
  parseHeightRangeCm,
} from './height';

/** Fourchette numérique simple (mêmes unités que la source). */
interface NumberRange {
  min: number;
  max: number;
}

/** Premier entier rencontré dans une chaîne (« 150 ans » → 150). */
function firstInt(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/\d+/);
  return m ? Number.parseInt(m[0], 10) : null;
}

/** Fourchette « A à B » d'une chaîne (« 40 à 80 kg » → { min: 40, max: 80 }). */
function parseNumberRange(raw: string | undefined): NumberRange | null {
  if (!raw) return null;
  const nums = [...raw.matchAll(/\d+(?:,\d+)?/g)].map((m) => Number.parseFloat(m[0].replace(',', '.')));
  if (nums.length < 2) return null;
  return { min: Math.min(nums[0], nums[1]), max: Math.max(nums[0], nums[1]) };
}

/**
 * Liste des avertissements d'immersion pour une identité donnée, dans l'ordre des
 * champs (âge, taille, poids). Vide si aucun repère n'est dépassé ou si le peuple
 * est inconnu.
 */
export function identityWarnings(identity: Identity, ancestry?: Ancestry): string[] {
  const physical = ancestry?.physical;
  if (!physical) return [];
  const warnings: string[] = [];
  const name = ancestry.name;

  // Âge : au-delà de l'espérance de vie du peuple (borne haute uniquement).
  const lifeMax = firstInt(physical.lifeExpectancy);
  const age = parseHeightCm(identity.age);
  if (lifeMax != null && age != null && age > lifeMax) {
    warnings.push(`Âge : dépasse l'espérance de vie de ce peuple (${name} : ${lifeMax} ans).`);
  }

  // Taille : hors de la fourchette du peuple (en cm).
  const heightRange = parseHeightRangeCm(physical.height);
  if (isHeightOutOfRange(identity.height, heightRange) && heightRange) {
    warnings.push(`Taille : hors de la fourchette de ce peuple (${name} : ${formatHeightRangeCm(heightRange)}).`);
  }

  // Poids : en dessous ou au-dessus de la fourchette conseillée (en kg).
  const weightRange = parseNumberRange(physical.weight);
  const weight = parseHeightCm(identity.weight);
  if (weightRange && weight != null && (weight < weightRange.min || weight > weightRange.max)) {
    warnings.push(`Poids : hors de la fourchette de ce peuple (${name} : ${weightRange.min} à ${weightRange.max} kg).`);
  }

  return warnings;
}
