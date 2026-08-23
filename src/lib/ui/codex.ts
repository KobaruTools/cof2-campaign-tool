import type { Feature } from '@/data/schema';

/**
 * Constantes/URLs purement UI du Codex (PER-418) — bibliothèque de règles consultable HORS
 * personnage. Source unique du format d'URL partageable d'une voie, pour que tout lien vers
 * une voie (sélecteur, capacité empruntée) pointe au même endroit.
 */

/**
 * URL partageable d'une voie du Codex (`/codex/voies?id=<pathId>`). `featureId` (PER-72 suite :
 * bouton codex de la puce `SourceRef`) cible en plus un RANG précis de la voie — `CodexPathBrowser`
 * y défile automatiquement (`?rank=<featureId>`, ancre = l'id de la capacité).
 */
export function codexPathHref(pathId: string, featureId?: string): string {
  const base = `/codex/voies?id=${encodeURIComponent(pathId)}`;
  return featureId ? `${base}&rank=${encodeURIComponent(featureId)}` : base;
}

/**
 * URL du Codex pointant directement sur le RANG de voie où figure `feature` — pratique pour toute
 * `SourceRef` liée à une capacité précise (bouton « voir dans le Codex »), sans reconstruire
 * `codexPathHref` à chaque site d'appel.
 */
export function featureCodexHref(feature: Pick<Feature, 'pathId' | 'id'>): string {
  return codexPathHref(feature.pathId, feature.id);
}

/**
 * URL partageable d'une entrée précise d'une sous-page du Codex SANS sélecteur maître-détail
 * (Objets magiques/Dieux/Familiers/Montures, `?id=<entryId>`) — même défilement automatique que
 * `codexPathHref`, chaque navigateur pose son ancre `codex-<kind>-<id>` et lit ce paramètre.
 */
function codexEntryHref(subpage: string, id: string): string {
  return `${subpage}?id=${encodeURIComponent(id)}`;
}

/** Lien Codex vers un cristal de la Voie des cristaux (`CodexMagicItemsBrowser`, `CrystalChip`). */
export function crystalCodexHref(crystalId: string): string {
  return codexEntryHref('/codex/objets-magiques', crystalId);
}

/** Lien Codex vers un dieu du panthéon (`CodexGodsBrowser`, `PriestVocationBadge`). */
export function godCodexHref(godId: string): string {
  return codexEntryHref('/codex/dieux', godId);
}

/** Lien Codex vers un familier fantastique (`CodexFamiliarsBrowser`, `FamiliarGrantedPowerNote`). */
export function familiarCodexHref(familiarId: string): string {
  return codexEntryHref('/codex/familiers', familiarId);
}

/** Lien Codex vers une monture/un véhicule du catalogue (`CodexMountsBrowser`, `OwnedMountsPanel`). */
export function mountCodexHref(mountId: string): string {
  return codexEntryHref('/codex/montures', mountId);
}

/** Lien Codex vers un objet d'équipement du catalogue (`CodexEquipmentBrowser`, `EquipmentList`). */
export function equipmentCodexHref(equipmentId: string): string {
  return codexEntryHref('/codex/equipement', equipmentId);
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
  { label: 'Capacités', href: '/codex/capacites' },
  { label: 'Objets magiques', href: '/codex/objets-magiques' },
  { label: 'Dieux', href: '/codex/dieux' },
  { label: 'Familiers fantastiques', href: '/codex/familiers' },
  { label: 'Montures & véhicules', href: '/codex/montures' },
  { label: 'Équipement', href: '/codex/equipement' },
];
