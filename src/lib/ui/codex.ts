/**
 * Constantes/URLs purement UI du Codex (PER-418) — bibliothèque de règles consultable HORS
 * personnage. Source unique du format d'URL partageable d'une voie, pour que tout lien vers
 * une voie (sélecteur, capacité empruntée) pointe au même endroit.
 */

/** URL partageable d'une voie du Codex (`/codex/voies?id=<pathId>`). */
export function codexPathHref(pathId: string): string {
  return `/codex/voies?id=${encodeURIComponent(pathId)}`;
}
