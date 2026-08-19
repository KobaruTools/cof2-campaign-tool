/**
 * Résumé des voies d'un personnage en colonnes fixes (peuple/mage, profils, prestige),
 * un rang par ligne — logique partagée entre la micro-grille de `CharacterPreviewCard`
 * et le graphe des voies du wizard de montée de niveau (`LevelUpPathsGrid`).
 */
import { classById, featureById, pathById } from '@/data';
import type { Feature, Path } from '@/data/schema';
import { effectiveClassPathIds } from '@/lib/character/classDisplay';
import { priestDivineSlot, type DivineSlot } from '@/lib/character/choices';
import type { Character } from '@/lib/character/types';
import { ANCESTRY_COLOR, MAGE_PATH_COLOR, classColor, prestigeCategoryColor } from '@/lib/ui/classColors';
import { prestigeMetalGradient } from '@/lib/ui/prestigeStyle';

/** Nombre de colonnes de la grille : 1 peuple/mage + 5 voies libres + 1 prestige. */
export const PATH_COLUMN_COUNT = 7;
/** Nombre de rangs (lignes) par voie. */
export const PATH_RANK_COUNT = 5;

/** Ordre d'affichage des colonnes : peuple/mage à gauche, profils au milieu, prestige à droite. */
const PATH_TYPE_ORDER: Record<Path['type'], number> = {
  ancestry: 0,
  mage: 0,
  class: 1,
  prestige: 2,
};

export interface PathColumn {
  path: Path | undefined;
  name: string | undefined;
  /**
   * Fond CSS de chaque rang débloqué (index 0 = premier rang débloqué, en haut).
   * Un carré est plein ssi son index est < `rankColors.length`. Couleur PLATE de la
   * voie, ou DÉGRADÉ « précieux » pour une voie de prestige (PER-74). Exception : un
   * rang qui a EMPRUNTÉ une capacité (PER-120) prend la couleur plate du profil de la
   * capacité empruntée. Valeur utilisable telle quelle en `background`.
   */
  rankColors: string[];
  /**
   * Capacités de la voie dans l'ordre des rangs (5 entrées, acquises ou non) — sert
   * à l'infobulle : contrairement à `rankColors`, ne dépend pas de ce qui est acquis.
   */
  features: (Feature | undefined)[];
}

/**
 * Couleur d'une voie selon son type : profil (teinte du profil ; celle du
 * personnage pour ses voies natives, du profil source en hybride), peuple, mage
 * ou prestige. Repli neutre si la voie est inconnue.
 */
export function pathColor(path: Path | undefined, classId: string): string {
  if (!path) return '#90a4ae';
  switch (path.type) {
    case 'ancestry':
      return ANCESTRY_COLOR;
    case 'mage':
      return MAGE_PATH_COLOR;
    case 'prestige':
      return prestigeCategoryColor(path.category);
    case 'class':
      return classColor(path.classIds.includes(classId) ? classId : path.classIds[0]);
  }
}

/**
 * Teinte + icône (profil/peuple/mage/prestige) d'une voie — partagé entre le graphe de voies
 * du wizard de montée de niveau (`LevelUpPathsGrid`) et son pendant lecture seule du
 * récapitulatif de création (`AcquiredPathsGrid`). `classId` prioritaire, sinon `ancestryId`
 * (clés hors-peuple dédiées 'mage'/'prestige').
 */
export function pathVisuals(path: Path | undefined, characterClassId: string) {
  const prestigePath = path?.type === 'prestige' ? path : undefined;
  const color = prestigePath
    ? prestigeCategoryColor(prestigePath.category)
    : path
      ? pathColor(path, characterClassId)
      : undefined;
  const classId =
    path?.type === 'class'
      ? path.classIds.includes(characterClassId)
        ? characterClassId
        : path.classIds[0]
      : undefined;
  const rawAncestryId = path?.type === 'ancestry' ? path.id : undefined;
  const ancestryId = rawAncestryId ?? (prestigePath ? 'prestige' : path?.type === 'mage' ? 'mage' : undefined);
  const prestigeTint = prestigePath && prestigePath.category !== 'generic' ? color : undefined;
  return { color, classId, ancestryId, isPrestige: !!prestigePath, prestigeTint };
}

/**
 * Couleur du profil de la capacité EMPRUNTÉE par une capacité (choix
 * `feature-from-path` résolu — PER-120, ex. Combattant aguerri prenant une
 * capacité de rang 1 d'une autre voie), ou `undefined` si la capacité n'emprunte
 * rien ou si le choix n'est pas encore fait.
 */
function borrowedColorOf(character: Character, feature: Feature): string | undefined {
  const defs = feature.choices;
  const sels = character.featureChoices?.[feature.id];
  if (!defs || !sels) return undefined;
  for (let i = 0; i < defs.length; i += 1) {
    if (defs[i].kind !== 'feature-from-path') continue;
    const sel = sels[i];
    if (typeof sel !== 'string') continue;
    const borrowed = featureById.get(sel);
    if (borrowed) return pathColor(pathById.get(borrowed.pathId), character.classId);
  }
  return undefined;
}

/**
 * Couleur d'origine de la capacité DIVINE d'un prêtre spécialiste (p. 122), si
 * `feature` est celle qui occupe ce slot d'accueil — signale « ça vient d'ailleurs »,
 * même convention que `FeaturesByPath` (`originColor`). `undefined` sinon.
 */
function divineColorOf(character: Character, feature: Feature, slot: DivineSlot | null): string | undefined {
  if (!slot || feature.id !== slot.featureId) return undefined;
  return pathColor(pathById.get(feature.pathId), character.classId);
}

/**
 * Résume les voies d'un personnage en une grille de 7 emplacements FIXES : peuple/mage
 * en tête, profils au milieu, prestige toujours en dernier (voir placement plus bas).
 * Les emplacements sans voie valent `undefined`. Chaque rang débloqué porte sa couleur
 * (celle de la voie, ou du profil emprunté pour un rang à capacité empruntée). Les ids
 * inconnus sont ignorés (comme sur la fiche).
 */
export function pathColumns(character: Character): (PathColumn | undefined)[] {
  // Capacité divine d'un prêtre spécialiste (p. 122) : occupe le slot de sa voie
  // D'ACCUEIL, pas de sa voie d'origine — même logique que `legality.ts`
  // (`effectivePathId`) et `FeaturesByPath` (`divineSlotReplacement`). Sans ce
  // relogement, la divine ouvrait sa propre colonne fantôme (voie d'origine) ET
  // laissait un trou dans la colonne d'accueil, ce qui cassait à la fois l'affichage
  // (colonne en trop) et le rang suivant cliquable (index de rang décalé).
  const divineSlot = priestDivineSlot(character);
  const byPath = new Map<string, { path: Path | undefined; features: Map<number, Feature>; order: number }>();
  for (const id of character.featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    const pathId = divineSlot && id === divineSlot.featureId ? divineSlot.hostPathId : feature.pathId;
    const entry = byPath.get(pathId);
    if (entry) {
      entry.features.set(feature.rank, feature);
    } else {
      byPath.set(pathId, {
        path: pathById.get(pathId),
        features: new Map([[feature.rank, feature]]),
        order: byPath.size,
      });
    }
  }
  // La voie du mage REMPLACE la voie de peuple (p. 60) : elles occupent le même
  // « emplacement de peuple ». Un mage garde toutefois sa capacité de peuple de
  // rang 1 (« Capacité de peuple + occultisme »), qui vit dans une voie de peuple
  // distincte — d'où deux entrées ici. On les fusionne en une seule colonne (rangs
  // réunis) sous la voie du mage, pour ne pas afficher deux colonnes là où il n'y a
  // qu'un emplacement.
  const magePath = [...byPath.values()].find((e) => e.path?.type === 'mage');
  if (magePath) {
    for (const [pathId, entry] of byPath) {
      if (entry.path?.type !== 'ancestry') continue;
      for (const [rank, feature] of entry.features) {
        if (!magePath.features.has(rank)) magePath.features.set(rank, feature);
      }
      byPath.delete(pathId);
    }
  }
  const buildColumn = (entry: { path: Path | undefined; features: Map<number, Feature> }): PathColumn => {
    const baseColor = pathColor(entry.path, character.classId);
    // Voie de PRESTIGE : les rangs NON empruntés reçoivent le DÉGRADÉ « précieux » (or par défaut pour
    // les génériques, teinté par famille sinon) plutôt qu'une couleur plate — plus joli (demande proprio).
    const prestigeFill =
      entry.path?.type === 'prestige'
        ? prestigeMetalGradient(
            entry.path.category !== 'generic' ? prestigeCategoryColor(entry.path.category) : undefined,
          )
        : undefined;
    const rankColors = [...entry.features.entries()]
      .sort((a, b) => a[0] - b[0])
      .slice(0, PATH_RANK_COUNT)
      // Un rang qui a emprunté une capacité prend la couleur plate du profil emprunté ; un rang occupé
      // par la capacité DIVINE du prêtre spécialiste prend la couleur de sa voie d'origine ; sinon la
      // couleur de la voie — ou le dégradé précieux pour le prestige.
      .map(
        ([, feature]) =>
          borrowedColorOf(character, feature) ?? divineColorOf(character, feature, divineSlot) ?? prestigeFill ?? baseColor,
      );
    // Rang occupé par la capacité DIVINE (prêtre spécialiste) : montre la capacité
    // RÉELLEMENT acquise (`entry.features`, ex. « Coup de boutoir » du pagne), pas la
    // native de la voie qu'elle a remplacée (« Miracle mineur ») — sinon l'infobulle du
    // rang mentait sur ce que le personnage a effectivement. Rang pas encore acquis :
    // repli sur la native de la voie (seule connue, sert à prévisualiser/acheter).
    const nativeFeatureIds = entry.path?.featureIds ?? [];
    const features = Array.from({ length: PATH_RANK_COUNT }, (_, i) => {
      const rank = i + 1;
      return entry.features.get(rank) ?? featureById.get(nativeFeatureIds[i]);
    });
    return { path: entry.path, name: entry.path?.name, rankColors, features };
  };
  // Chaque voie occupe un EMPLACEMENT FIXE, pas une colonne compactée : peuple/mage
  // à gauche (col. 0), voies de profil au milieu (col. 1-5, dans l'ordre d'acquisition),
  // voie de prestige toujours à la dernière colonne (col. 6). Ainsi la prestige reste
  // à droite même quand le personnage a moins de 7 voies (sinon elle remontait dans une
  // colonne du milieu — cf. recettes PER-175).
  const slots: (PathColumn | undefined)[] = new Array(PATH_COLUMN_COUNT).fill(undefined);
  let classSlot = 1;
  // Voies de profil (col. 1-5) : même priorité que la liste avancée du wizard de montée
  // de niveau (PER-186) — profil principal avant profils hybrides engagés, puis ordre
  // alphabétique — plutôt que l'ordre d'acquisition brut.
  const characterClass = classById.get(character.classId);
  const mainPathIds = new Set(
    characterClass ? effectiveClassPathIds(characterClass, character.firearmsAllowed) : [],
  );
  const isMainClassPath = (path: Path | undefined) =>
    !!path && path.type === 'class' && mainPathIds.has(path.id);
  const entries = [...byPath.values()].sort((a, b) => {
    const ta = a.path ? PATH_TYPE_ORDER[a.path.type] : 99;
    const tb = b.path ? PATH_TYPE_ORDER[b.path.type] : 99;
    if (ta !== tb) return ta - tb;
    if (ta === PATH_TYPE_ORDER.class) {
      const mainA = isMainClassPath(a.path) ? 0 : 1;
      const mainB = isMainClassPath(b.path) ? 0 : 1;
      if (mainA !== mainB) return mainA - mainB;
      return (a.path?.name ?? '').localeCompare(b.path?.name ?? '');
    }
    return a.order - b.order;
  });
  for (const entry of entries) {
    const column = buildColumn(entry);
    const type = entry.path?.type;
    if (type === 'ancestry' || type === 'mage') {
      slots[0] = column;
    } else if (type === 'prestige') {
      slots[PATH_COLUMN_COUNT - 1] = column;
    } else if (classSlot < PATH_COLUMN_COUNT - 1) {
      slots[classSlot] = column;
      classSlot += 1;
    }
  }
  return slots;
}
