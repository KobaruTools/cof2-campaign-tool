import { featureById, pathById } from '@/data';
import { classColor } from './classColors';

/**
 * Origine d'AFFICHAGE d'une capacité, pour situer une source de bonus dans les
 * tooltips des statistiques dérivées (PER-137) : sa voie (nom + couleur du profil
 * + icône recolorable) et son rang. Le nom seul d'une capacité ne suffit pas à
 * identifier d'où vient un bonus (RD, immunité, plage de critique).
 */
export interface FeatureOrigin {
  /** Nom de la voie d'origine (ex. « Voie du colosse »). */
  pathName: string;
  /** Teinte d'accentuation de la voie (profil) ; absente pour peuple/mage/prestige. */
  color?: string;
  /** Profil pour l'icône recolorée (`classIds[0]`) ; absent hors voie de profil. */
  classId?: string;
  /** Peuple pour l'icône (`ancestryIds[0]`) ; absent hors voie de peuple. */
  ancestryId?: string;
  /** Rang de la capacité dans sa voie (1-5 ; 4-8 en prestige). */
  rank: number;
}

/**
 * Résout l'origine d'affichage d'une capacité (voie + rang) d'après SA voie réelle
 * (`feature.pathId`). Renvoie `undefined` si l'id est inconnu.
 */
export function featureOrigin(featureId: string): FeatureOrigin | undefined {
  const feature = featureById.get(featureId);
  if (!feature) return undefined;
  const path = pathById.get(feature.pathId);
  const classId = path?.type === 'class' ? path.classIds[0] : undefined;
  const ancestryId = path?.type === 'ancestry' ? path.ancestryIds[0] : undefined;
  return {
    pathName: path?.name ?? feature.pathId,
    color: classId ? classColor(classId) : undefined,
    classId,
    ancestryId,
    rank: feature.rank,
  };
}
