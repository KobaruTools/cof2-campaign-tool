/**
 * Moteur de tirage des rumeurs de taverne (PER-199) — logique PURE et testable,
 * découplée de l'UI et du réseau (même esprit que `turnOrder`/`centerScroll`).
 *
 * Règle de jeu : le MJ pré-écrit une réserve de rumeurs ; en jeu il en PIOCHE UNE
 * AU HASARD. Le tirage évite les rumeurs déjà servies (non-redoublement) et marque
 * la rumeur tirée « servie ». Quand toutes ont été servies, la réserve est
 * « épuisée » : le MJ la RÉINITIALISE (toutes repassent non-servies).
 *
 * L'aléa est INJECTÉ (`pick`) pour garder ces fonctions déterministes en test —
 * l'UI fournit un `pick` basé sur `Math.random`. Aucune de ces fonctions ne mute
 * son entrée : elles renvoient de nouveaux tableaux (persistables tels quels).
 *
 * Brique volontairement SPÉCIALISÉE aux rumeurs : la factorisation avec PER-200
 * (génération de butin, même mécanique « stock + tirage sans répétition ») est
 * différée jusqu'à ce que le second cas concret existe.
 */
import type { TavernRumor } from './types';

/** Tire un index dans `[0, n)`. L'UI passe `(n) => Math.floor(Math.random() * n)`. */
export type PickIndex = (n: number) => number;

/** Rumeurs encore piochables (non servies), dans l'ordre de la réserve. */
export function remainingRumors(rumors: TavernRumor[]): TavernRumor[] {
  return rumors.filter((r) => !r.served);
}

/** Nombre de rumeurs encore piochables. */
export function remainingCount(rumors: TavernRumor[]): number {
  return remainingRumors(rumors).length;
}

/** La réserve est-elle vide (aucune rumeur saisie) ? */
export function isReserveEmpty(rumors: TavernRumor[]): boolean {
  return rumors.length === 0;
}

/**
 * La réserve est-elle ÉPUISÉE : au moins une rumeur existe, mais toutes ont déjà
 * été servies ? Distinct de « vide » — l'UI propose alors de RÉINITIALISER plutôt
 * que d'inviter à saisir.
 */
export function isExhausted(rumors: TavernRumor[]): boolean {
  return rumors.length > 0 && remainingCount(rumors) === 0;
}

/** Résultat d'un tirage : la rumeur tirée + la réserve mise à jour (rumeur marquée servie). */
export interface RumorDraw {
  rumor: TavernRumor;
  rumors: TavernRumor[];
}

/**
 * Pioche AU HASARD une rumeur parmi les non-servies et la marque « servie ».
 * Renvoie `null` si rien n'est piochable (réserve vide OU épuisée) — l'appelant
 * distingue les deux cas via `isReserveEmpty`/`isExhausted`.
 *
 * `pick` reçoit le nombre de candidates et doit renvoyer un index dans `[0, n)` ;
 * une valeur hors bornes est ramenée dans l'intervalle (garde-fou défensif).
 */
export function drawRumor(rumors: TavernRumor[], pick: PickIndex): RumorDraw | null {
  const candidates = rumors.filter((r) => !r.served);
  if (candidates.length === 0) return null;
  const raw = pick(candidates.length);
  // Garde-fou : borne l'index même si `pick` déborde (NaN → 0, négatif → 0, ≥ n → n-1).
  const idx = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 0), candidates.length - 1) : 0;
  const chosen = candidates[idx];
  const updated = rumors.map((r) => (r.id === chosen.id ? { ...r, served: true } : r));
  return { rumor: { ...chosen, served: true }, rumors: updated };
}

/** Réinitialise la réserve : toutes les rumeurs repassent non-servies. */
export function resetRumors(rumors: TavernRumor[]): TavernRumor[] {
  return rumors.map((r) => (r.served ? { ...r, served: false } : r));
}
