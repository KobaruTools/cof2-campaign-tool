/**
 * Résolution PURE des VOIES d'une créature de bestiaire (`Creature.paths`) contre les
 * données de voies (`pathById`/`featureById`). Séparée du rendu (`CreaturePathBlock`)
 * pour être testable en environnement node — d'où l'absence de toute dépendance UI :
 * la COULEUR de profil (concern de présentation) est dérivée par le composant, pas ici.
 *
 * RÈGLE (confirmée par le propriétaire, 2026-07-27) — quand « Voie X rang N » désigne une
 * VOIE DE PROFIL de joueur (une `Path` de classe), la créature possède la voie ENTIÈRE
 * jusqu'au rang indiqué, c.-à-d. les capacités des rangs 1..N (comme un personnage qui
 * atteint le rang N). Le filtre est donc `feature.rank <= ref.rank`. Ex. aberratus,
 * « Voie des illusions rang 5 » → rangs 1 à 5.
 *
 * (Une brève hypothèse « rang N seul » avait été codée puis figée par erreur le
 * 2026-07-27 ; corrigée ici. Les éventuelles « voies de créatures » propres au Bestiaire
 * — p. 209-212, hors périmètre actuel, cf. PER-251 — pourront avoir une autre sémantique
 * et seront traitées à part le moment venu.)
 */
import { featureById, pathById } from '@/data';
import type { CreaturePathReference, Feature } from '@/data/schema';

/** Une voie résolue + ses capacités jusqu'au rang indiqué (rangs 1..rank). */
export interface ResolvedPath {
  ref: CreaturePathReference;
  name: string;
  /** id de classe de la voie (si voie de classe) — le composant en dérive la couleur. */
  classId?: string;
  /** Page de DÉBUT de la voie (`Path.sourcePage`) — le renvoi du titre y pointe. */
  sourcePage?: number;
  /** Capacités des rangs 1..rank, triées par rang croissant. */
  features: Feature[];
}

export function resolvePath(ref: CreaturePathReference): ResolvedPath | null {
  const path = pathById.get(ref.pathId);
  if (!path) return null; // Voie inconnue : on n'invente rien, on l'ignore.
  const classId = path.type === 'class' ? path.classIds[0] : undefined;
  // Voie ENTIÈRE jusqu'au rang indiqué : capacités des rangs 1..N (règle ci-dessus).
  const features = path.featureIds
    .map((id) => featureById.get(id))
    .filter((f): f is Feature => !!f && f.rank <= ref.rank)
    .sort((a, b) => a.rank - b.rank);
  return {
    ref,
    name: path.name,
    classId,
    sourcePage: path.sourcePage,
    features,
  };
}
