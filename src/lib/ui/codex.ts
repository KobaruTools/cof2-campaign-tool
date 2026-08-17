/**
 * Constantes/URLs purement UI du Codex (PER-418) — bibliothèque de règles consultable HORS
 * personnage. Source unique du format d'URL partageable d'une voie, pour que tout lien vers
 * une voie (sélecteur, capacité empruntée) pointe au même endroit.
 */

/** URL partageable d'une voie du Codex (`/codex/voies?id=<pathId>`). */
export function codexPathHref(pathId: string): string {
  return `/codex/voies?id=${encodeURIComponent(pathId)}`;
}

/**
 * Sous-pages FONCTIONNELLES du Codex (PER-419), pour le sous-menu de l'en-tête
 * (`CodexSplitButton`/`CodexDrawerItems`) — liste statique, contenu du livre de base
 * uniquement, aucun gating payant à prévoir ici (contrairement au chevron « Livre des
 * règles », qui liste des livres payants débloqués). Les entrées « à venir » de
 * `src/app/codex/page.tsx` (Familiers/montures, Équipement) n'y figurent pas tant
 * qu'elles n'ont pas de route propre.
 */
export const CODEX_SUBPAGES: readonly { label: string; href: string }[] = [
  { label: 'Voies', href: '/codex/voies' },
  { label: 'Objets magiques', href: '/codex/objets-magiques' },
  { label: 'Dieux', href: '/codex/dieux' },
];
