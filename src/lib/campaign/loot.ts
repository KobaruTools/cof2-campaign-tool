/**
 * Moteur de tirage du butin (PER-200) — logique PURE et testable, découplée de l'UI
 * et du réseau. Implémentation SŒUR de `rumors.ts` : même mécanique « réserve
 * pré-écrite + tirage sans répétition + réinitialisation à épuisement ».
 *
 * Règle de jeu : le MJ pré-écrit une réserve d'objets de butin (récompenses) ; en
 * jeu il en PIOCHE UN AU HASARD (trésor de coffre, butin sur un adversaire). Le
 * tirage évite les objets déjà servis (non-redoublement) et marque le tiré « servi ».
 * Quand tous ont été servis, la réserve est « épuisée » : le MJ la RÉINITIALISE.
 *
 * L'aléa est INJECTÉ (`pick`) pour garder ces fonctions déterministes en test —
 * l'UI fournit un `pick` basé sur `Math.random`. Aucune de ces fonctions ne mute son
 * entrée : elles renvoient de nouveaux tableaux (persistables tels quels).
 *
 * Duplication ASSUMÉE avec `rumors.ts` (décision de cadrage PER-200) : les deux cas
 * partagent la forme (`{ id, served }`) mais l'objet de butin enrobe une `EquipmentLine`
 * complète — on préfère deux modules lisibles à une abstraction prématurée qui viendrait
 * remuer les rumeurs déjà livrées.
 */
import type { LootItem } from './types';

/** Tire un index dans `[0, n)`. L'UI passe `(n) => Math.floor(Math.random() * n)`. */
export type PickIndex = (n: number) => number;

/** Objets encore piochables (non servis), dans l'ordre de la réserve. */
export function remainingLoot(loot: LootItem[]): LootItem[] {
  return loot.filter((l) => !l.served);
}

/** Nombre d'objets encore piochables. */
export function remainingCount(loot: LootItem[]): number {
  return remainingLoot(loot).length;
}

/** La réserve est-elle vide (aucun objet saisi) ? */
export function isReserveEmpty(loot: LootItem[]): boolean {
  return loot.length === 0;
}

/**
 * La réserve est-elle ÉPUISÉE : au moins un objet existe, mais tous ont déjà été
 * servis ? Distinct de « vide » — l'UI propose alors de RÉINITIALISER plutôt que
 * d'inviter à saisir.
 */
export function isExhausted(loot: LootItem[]): boolean {
  return loot.length > 0 && remainingCount(loot) === 0;
}

/** Résultat d'un tirage : l'objet tiré + la réserve mise à jour (objet marqué servi). */
export interface LootDraw {
  item: LootItem;
  loot: LootItem[];
}

/**
 * Pioche AU HASARD un objet parmi les non-servis et le marque « servi ». Renvoie
 * `null` si rien n'est piochable (réserve vide OU épuisée) — l'appelant distingue les
 * deux cas via `isReserveEmpty`/`isExhausted`.
 *
 * `pick` reçoit le nombre de candidats et doit renvoyer un index dans `[0, n)` ; une
 * valeur hors bornes est ramenée dans l'intervalle (garde-fou défensif).
 */
export function drawLoot(loot: LootItem[], pick: PickIndex): LootDraw | null {
  const candidates = loot.filter((l) => !l.served);
  if (candidates.length === 0) return null;
  const raw = pick(candidates.length);
  // Garde-fou : borne l'index même si `pick` déborde (NaN → 0, négatif → 0, ≥ n → n-1).
  const idx = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 0), candidates.length - 1) : 0;
  const chosen = candidates[idx];
  const updated = loot.map((l) => (l.id === chosen.id ? { ...l, served: true } : l));
  return { item: { ...chosen, served: true }, loot: updated };
}

/** Réinitialise la réserve : tous les objets repassent non-servis. */
export function resetLoot(loot: LootItem[]): LootItem[] {
  return loot.map((l) => (l.served ? { ...l, served: false } : l));
}
