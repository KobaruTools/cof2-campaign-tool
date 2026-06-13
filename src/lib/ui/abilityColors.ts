/**
 * Couleurs d'accentuation des caractéristiques — préoccupation purement UI
 * (aucune règle CO2), donc en dehors des données sourcées du PDF. Tons pastel
 * choisis pour rester lisibles sans être trop vibrants. Centralisées ici pour
 * être éditées d'un seul endroit, comme `classColors.ts`.
 */

/**
 * Échelle de couleur du total d'une caractéristique :
 * négatif rouge, 0 orange, 1-2 jaune, 3-4 vert, 5+ bleu.
 */
export const ABILITY_TOTAL_COLORS = {
  negative: '#e57373', // rouge pastel
  zero: '#ffb74d', // orange pastel
  low: '#ffd54f', // jaune pastel (1-2)
  high: '#81c784', // vert pastel (3-4)
  max: '#64b5f6', // bleu pastel (5+)
} as const;

/** Couleur du total d'une caractéristique selon sa valeur. */
export function abilityTotalColor(total: number): string {
  if (total < 0) return ABILITY_TOTAL_COLORS.negative;
  if (total === 0) return ABILITY_TOTAL_COLORS.zero;
  if (total <= 2) return ABILITY_TOTAL_COLORS.low;
  if (total <= 4) return ABILITY_TOTAL_COLORS.high;
  return ABILITY_TOTAL_COLORS.max;
}

/** Couleurs des modificateurs de peuple : bonus vert, malus rouge. */
export const ANCESTRY_MODIFIER_COLORS = {
  bonus: '#81c784', // vert pastel
  malus: '#e57373', // rouge pastel
} as const;

/** Couleur d'un modificateur de peuple selon son signe. */
export function ancestryModifierColor(delta: number): string {
  return delta > 0 ? ANCESTRY_MODIFIER_COLORS.bonus : ANCESTRY_MODIFIER_COLORS.malus;
}
