/**
 * Couleurs d'accentuation des caractéristiques — préoccupation purement UI
 * (aucune règle CO2), donc en dehors des données sourcées du PDF. Tons pastel
 * choisis pour rester lisibles sans être trop vibrants. Centralisées ici pour
 * être éditées d'un seul endroit, comme `classColors.ts`.
 */

import type { AbilityId } from '@/data/schema';
import { ABILITY_COLORS } from '@/lib/ui/ability';

/**
 * Échelle du total d'une caractéristique (option D + couleur d'identité) : au lieu
 * d'une échelle arc-en-ciel (rouge→orange→jaune→vert→bleu) qui concurrençait les 7
 * teintes PROPRES des icônes, on encode la grandeur par la SATURATION de la teinte
 * d'identité de la carac elle-même (`ABILITY_COLORS`). Faible = 100 % DÉSATURÉ (gris),
 * haute = 100 % de la couleur de la carac. Une seule teinte par carac, cohérente avec
 * son icône → aucune couleur « en plus ». Le signe reste lu sur le glyphe.
 *
 * Bornes de la rampe de saturation : ≤ `min` → gris ; ≥ `max` → couleur pleine.
 */
export const ABILITY_TOTAL_SCALE = {
  /** Total à partir duquel (et en-dessous) la teinte est 100 % désaturée (grise). */
  min: 0,
  /** Total à partir duquel la couleur d'identité est pleine (100 % saturée). */
  max: 5,
} as const;

/**
 * Couleur du total d'une caractéristique : teinte d'identité de la carac dont on
 * module la SATURATION selon la valeur (gris à ≤0, couleur pleine à ≥+5), teinte et
 * clarté conservées. `hsl(from …)` (relative color CSS) produit un `<color>` valide
 * partout où une couleur est attendue (`color`, `WebkitTextFillColor`…).
 */
export function abilityTotalColor(total: number, abilityId: AbilityId): string {
  const { min, max } = ABILITY_TOTAL_SCALE;
  const clamped = Math.min(max, Math.max(min, total));
  const frac = (clamped - min) / (max - min); // 0 (≤0) → 1 (≥+5)
  return `hsl(from ${ABILITY_COLORS[abilityId]} h calc(s * ${frac}) l)`;
}

/** Gain de taille (px) du chiffre par point de total AU-DESSUS de 0. */
export const ABILITY_VALUE_FONT_STEP_PX = 1;

/**
 * Taille du chiffre du total : +1px par point au-dessus de 0 (les valeurs ≤ 0
 * gardent la taille de base), plafonnée au maximum de l'échelle pour ne pas casser
 * la grille sur une fiche permissive. `base` = taille de référence CSS (ex. la
 * `fontSize` du variant, `'1.25rem'` pour h6).
 */
export function abilityTotalFontSize(total: number, base: string): string {
  const above = Math.min(ABILITY_TOTAL_SCALE.max, Math.max(0, total));
  return above === 0 ? base : `calc(${base} + ${above * ABILITY_VALUE_FONT_STEP_PX}px)`;
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
