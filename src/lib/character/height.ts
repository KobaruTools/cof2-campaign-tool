/**
 * Aide au traitement de la taille (PER — saisie en centimètres).
 *
 * La saisie de la taille se fait en **centimètres entiers** dans l'éditeur, mais
 * les fourchettes de référence des peuples (`ancestry.physical.height`) sont des
 * chaînes verbatim du livre, exprimées en mètres ou centimètres (« 1,50 m à
 * 1,90 m », « 80 cm à 1 m »…). Ces utilitaires convertissent les deux mondes en
 * centimètres pour pouvoir comparer la valeur du joueur à la fourchette du livre
 * et l'avertir — sans la bloquer — quand elle en sort.
 */

/** Fourchette de taille recommandée, en centimètres. */
export interface HeightRangeCm {
  minCm: number;
  maxCm: number;
}

/**
 * Convertit un littéral « nombre + unité » (« 1,50 m », « 80 cm », « 2 m ») en
 * centimètres. Accepte la virgule décimale française. Retourne `null` si le
 * littéral n'est pas reconnu.
 */
function tokenToCm(value: string, unit: string): number | null {
  const n = Number.parseFloat(value.replace(',', '.'));
  if (!Number.isFinite(n)) return null;
  return unit === 'cm' ? Math.round(n) : Math.round(n * 100);
}

/**
 * Extrait la fourchette de taille (min/max en cm) d'une chaîne de référence du
 * livre. Prend les deux premiers nombres « unité » rencontrés. Retourne `null`
 * si la chaîne n'en contient pas deux.
 */
export function parseHeightRangeCm(raw: string | undefined): HeightRangeCm | null {
  if (!raw) return null;
  const matches = [...raw.matchAll(/(\d+(?:,\d+)?)\s*(cm|m)\b/g)];
  if (matches.length < 2) return null;
  const a = tokenToCm(matches[0][1], matches[0][2]);
  const b = tokenToCm(matches[1][1], matches[1][2]);
  if (a == null || b == null) return null;
  return { minCm: Math.min(a, b), maxCm: Math.max(a, b) };
}

/**
 * Convertit la valeur saisie par le joueur (centimètres, virgule tolérée) en
 * nombre. Retourne `null` si la saisie est vide ou non numérique.
 */
export function parseHeightCm(value: string | undefined): number | null {
  if (value == null || value.trim() === '') return null;
  const n = Number.parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

/** Formate une fourchette en cm pour l'affichage (« 150 à 190 cm »). */
export function formatHeightRangeCm(range: HeightRangeCm): string {
  return `${range.minCm} à ${range.maxCm} cm`;
}

/**
 * Indique si la taille saisie sort de la fourchette recommandée. Retourne
 * `false` (pas d'avertissement) tant que la saisie ou la fourchette manque : on
 * n'avertit que sur un dépassement avéré.
 */
export function isHeightOutOfRange(value: string | undefined, range: HeightRangeCm | null): boolean {
  if (!range) return false;
  const cm = parseHeightCm(value);
  if (cm == null) return false;
  return cm < range.minCm || cm > range.maxCm;
}
