/**
 * Regroupement des capacités acquises par voie — extrait de `FeaturesByPath.tsx` (PER-201) pour
 * rester un module PUR (aucun import MUI/React), consommable hors composant : l'export PDF
 * (`buildCharacterPdfData.ts`) en a besoin sans vouloir tirer tout le composant de la fiche (et
 * ses dépendances client) dans un test Node. `FeaturesByPath.tsx` et `LevelUpDialog.tsx` importent
 * désormais `groupFeaturesByPath`/`FeatureGroup` d'ici — source unique inchangée.
 */
import { featureById, pathById } from '@/data';
import type { Feature, Path } from '@/data/schema';
import { artilleurFeatureDisplay } from '@/lib/character/artilleurDisplay';

export interface FeatureGroup {
  path: Path | undefined;
  pathId: string;
  features: Feature[];
}

/**
 * Ordre d'affichage des voies par type, de gauche à droite sur la fiche :
 * la voie du peuple (ou du mage, qui la remplace) à gauche, les voies de
 * profil au milieu, la voie de prestige tout à droite.
 */
const PATH_TYPE_ORDER: Record<Path['type'], number> = {
  ancestry: 0,
  mage: 0,
  class: 1,
  prestige: 2,
};

/**
 * Regroupe les capacités d'un personnage par voie, triées par rang croissant.
 * Les groupes sont ordonnés par type de voie (voie de peuple à gauche, voies de
 * profil au milieu, voie de prestige à droite) puis, à l'intérieur d'un même
 * type, dans l'**ordre d'acquisition** (première capacité acquise de la voie),
 * et non par ordre alphabétique. Les ids inconnus sont ignorés ici (signalés par
 * les avertissements de conformité, PER-47).
 */
export function groupFeaturesByPath(
  featureIds: string[],
  /**
   * Relocalisation d'affichage : `featureId → pathId d'accueil`. Sert au prêtre
   * spécialiste, dont la capacité divine (d'un autre profil) occupe le slot d'une
   * voie de prêtre — on l'affiche sous cette voie d'accueil, pas sous sa voie d'origine.
   */
  pathOverride?: Map<string, string>,
  /**
   * Autorisation EFFECTIVE des armes à feu (PER-178) : applique le reskin d'affichage
   * `artilleurFeatureDisplay` (voie de l'artilleur → « Arbalétrier ») à chaque capacité résolue.
   * Absent/`true` → capacités renvoyées telles quelles (texte source verbatim).
   */
  firearmsAllowed?: boolean,
): FeatureGroup[] {
  const byPath = new Map<string, Feature[]>();
  const acquisitionOrder: string[] = [];
  for (const id of featureIds) {
    const rawFeature = featureById.get(id);
    if (!rawFeature) continue;
    const feature = artilleurFeatureDisplay(rawFeature, firearmsAllowed);
    const pathId = pathOverride?.get(id) ?? feature.pathId;
    if (!byPath.has(pathId)) acquisitionOrder.push(pathId);
    const list = byPath.get(pathId) ?? [];
    list.push(feature);
    byPath.set(pathId, list);
  }
  const acquisitionIndex = new Map(acquisitionOrder.map((pathId, i) => [pathId, i]));
  const groups: FeatureGroup[] = [...byPath.entries()].map(([pathId, features]) => ({
    pathId,
    path: pathById.get(pathId),
    features: features.slice().sort((a, b) => a.rank - b.rank),
  }));
  groups.sort((a, b) => {
    const ta = a.path ? PATH_TYPE_ORDER[a.path.type] : 99;
    const tb = b.path ? PATH_TYPE_ORDER[b.path.type] : 99;
    if (ta !== tb) return ta - tb;
    return (acquisitionIndex.get(a.pathId) ?? 0) - (acquisitionIndex.get(b.pathId) ?? 0);
  });
  return groups;
}
