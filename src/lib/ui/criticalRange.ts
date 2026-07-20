/**
 * Mise en forme (français) d'une plage de critique élargie pour l'affichage sous les cartes
 * « Attaque au contact » / « à distance » (PER-133). La plage reste « non lue par le moteur » au
 * sens des calculs de combat (aucun jet simulé) ; ce formateur ne sert qu'à un affichage
 * informatif (puce + info-bulle), sur le même patron que `formatDamageReduction`.
 */
import type { CriticalRange } from '@/data/schema';

/** Mot français de la portée d'une plage de critique. */
const SCOPE_WORDS: Record<CriticalRange['scope'], string> = {
  melee: 'au contact',
  ranged: 'à distance',
};

/**
 * Forme courte (puce, ex. « Crit. 19-20 ») et longue (info-bulle) d'une plage de critique, à partir
 * de l'élargissement RÉSOLU (1 → 19-20, 2 → 18-20) et de la portée. Le seuil bas est borné à 16
 * (plancher du livre, p. 213 — pertinent en cas de cumul ; cf. Frappe chirurgicale).
 */
export function formatCriticalRange(
  scope: CriticalRange['scope'],
  value: number,
): { short: string; long: string } {
  const low = Math.max(16, 20 - value);
  const range = `${low}-20`;
  const scopeWords = SCOPE_WORDS[scope];
  return {
    // Court : la plage seule (« 19-20 ») — l'icône de critique et le contexte de la carte suffisent ;
    // le tooltip (`long`) explicite.
    short: range,
    long: `Critique sur ${range} (au lieu de 20) sur les attaques ${scopeWords}.`,
  };
}

/** Une source d'élargissement de plage de critique (capacité ACTIVE ou arme équipée), résolue à sa valeur. */
export interface CriticalRangeSourceLike {
  /**
   * Capacité d'origine, si la source EST une capacité (le badge la rend en puce de voie).
   * ABSENT quand la source est l'arme elle-même (plage intrinsèque, PER-225) : le badge
   * retombe alors sur le `name` en texte simple.
   */
  featureId?: string;
  name: string;
  scope: CriticalRange['scope'];
  value: number;
}

/** Élargissement de critique CUMULÉ d'une portée : valeur sommée + capacités contributrices. */
export interface CombinedCriticalRange {
  scope: CriticalRange['scope'];
  /** Somme des élargissements actifs de cette portée (le plancher 16 est appliqué au formatage). */
  total: number;
  sources: CriticalRangeSourceLike[];
}

/**
 * CUMUL des plages de critique d'une même portée (PER-73). Les élargissements de critique
 * s'ADDITIONNENT — deux sources « +1 au contact » (ex. Critique brutal du demi-orc + Briseur d'os
 * du barbare) donnent 18-20. On somme donc TOUTES les sources actives de la portée et on liste
 * chaque capacité contributrice (le plancher 16, p. 213, est appliqué par `formatCriticalRange`).
 * `null` si aucune source pour cette portée. Règle systémique : vaut pour toute combinaison de
 * capacités (passives ou conditionnelles déjà filtrées en amont), pas seulement un cas particulier.
 */
export function combineCriticalRanges(
  sources: CriticalRangeSourceLike[],
  scope: CriticalRange['scope'],
): CombinedCriticalRange | null {
  const list = sources.filter((s) => s.scope === scope);
  if (list.length === 0) return null;
  return { scope, total: list.reduce((acc, s) => acc + s.value, 0), sources: list };
}
