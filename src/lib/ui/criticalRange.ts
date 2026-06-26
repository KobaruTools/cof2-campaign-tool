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
