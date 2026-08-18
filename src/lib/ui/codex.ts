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
 * règles », qui liste des livres payants débloqués). L'entrée « à venir » de
 * `src/app/codex/page.tsx` (Équipement, PER-422) n'y figure pas tant qu'elle n'a pas
 * de route propre.
 *
 * Familiers et Montures (PER-421) sont DEUX routes distinctes (retour propriétaire : un seul
 * onglet commun ne servait à rien une fois les deux contenus enrichis) — plus de composant
 * partagé à onglets.
 *
 * Équipement (PER-422) : DERNIÈRE sous-page de la milestone — vue exhaustive/comparaison
 * (tableau triable/filtrable), là où `ItemDialog` (création/édition de personnage) ne montre
 * qu'un objet à la fois.
 */
export const CODEX_SUBPAGES: readonly { label: string; href: string }[] = [
  { label: 'Voies', href: '/codex/voies' },
  { label: 'Objets magiques', href: '/codex/objets-magiques' },
  { label: 'Dieux', href: '/codex/dieux' },
  { label: 'Familiers fantastiques', href: '/codex/familiers' },
  { label: 'Montures & véhicules', href: '/codex/montures' },
  { label: 'Équipement', href: '/codex/equipement' },
];
