/**
 * Résolution PURE des VOIES d'une créature de bestiaire (`Creature.paths`) contre les
 * données de voies (`pathById`/`featureById`). Séparée du rendu (`CreaturePathBlock`)
 * pour être testable en environnement node — d'où l'absence de toute dépendance UI :
 * la COULEUR de profil (concern de présentation) est dérivée par le composant, pas ici.
 *
 * ⚠️ RÈGLE VERROUILLÉE — « Voie X rang N » = la SEULE capacité de rang N, PAS les rangs
 * 1..N (confirmé par les auteurs, Discord officiel 2026-07-27). Le filtre est donc
 * `feature.rank === ref.rank`. NE JAMAIS revenir à `<=` : `creaturePaths.test.ts` fige
 * cet invariant et cassera si la faute (dérouler toute la voie) est réintroduite — c'est
 * précisément ce qui protège les ~140 créatures du bestiaire d'une régression silencieuse.
 */
import { featureById, pathById } from '@/data';
import type { CreaturePathReference, Feature } from '@/data/schema';

/** Une voie résolue + la capacité de son rang indiqué (règle : ce rang SEUL). */
export interface ResolvedPath {
  ref: CreaturePathReference;
  name: string;
  /** id de classe de la voie (si voie de classe) — le composant en dérive la couleur. */
  classId?: string;
  /** Page de la CAPACITÉ affichée (pas du début de voie) — cf. ci-dessous. */
  sourcePage?: number;
  /** Nom de la capacité affichée, pour le surlignage `SourceRef` sur la bonne page. */
  featureName?: string;
  features: Feature[];
}

export function resolvePath(ref: CreaturePathReference): ResolvedPath | null {
  const path = pathById.get(ref.pathId);
  if (!path) return null; // Voie inconnue : on n'invente rien, on l'ignore.
  const classId = path.type === 'class' ? path.classIds[0] : undefined;
  // Capacité du rang indiqué UNIQUEMENT (généralement une seule ; on capte les rares
  // voies à plusieurs capacités au même rang). On ne déroule PAS les rangs inférieurs.
  const features = path.featureIds
    .map((id) => featureById.get(id))
    .filter((f): f is Feature => !!f && f.rank === ref.rank);
  // La source pointe la CAPACITÉ affichée (ex. « Exécution mentale » p. 96), pas le
  // début de la voie (p. 95) : depuis qu'on ne montre que ce rang, c'est la bonne page.
  const feature = features[0];
  return {
    ref,
    name: path.name,
    classId,
    sourcePage: feature?.sourcePage ?? path.sourcePage,
    featureName: feature?.name,
    features,
  };
}
