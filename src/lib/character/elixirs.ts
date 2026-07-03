/**
 * Élixirs préparés par le forgesort matérialisés en OBJETS d'inventaire (voie des élixirs, p. 98).
 * Source de vérité du NOMMAGE de ces objets, partagée par le bouton « Créer l'élixir » (fiche) et
 * la liste d'ajout d'équipement — mêmes noms ⇒ les doses s'empilent (quantité incrémentée).
 * Matérialisation minimale ; le transfert à un autre personnage relève de PER-158.
 */
import { features, featureById } from '@/data';
import { isCustomItem, type EquipmentLine } from './types';

/** Préfixe commun à toutes les doses d'élixir matérialisées (voie des élixirs, p. 98). */
const ELIXIR_ITEM_PREFIX = 'Élixir — ';

/** Nom d'objet d'inventaire d'une dose d'élixir, d'après le sort/la recette reproduit(e). */
export function elixirItemName(spellOrRecipeName: string): string {
  return `${ELIXIR_ITEM_PREFIX}${spellOrRecipeName}`;
}

/** `true` si le nom d'objet désigne une dose d'élixir (préfixe `elixirItemName`). */
export function isElixirItemName(name: string): boolean {
  return name.startsWith(ELIXIR_ITEM_PREFIX);
}

/**
 * Retire toutes les doses d'élixir de l'équipement (voie des élixirs, p. 98 : « Les élixirs
 * qui ne sont pas utilisés le jour même sont perdus »). Appelé au repos long (récupération
 * complète) ; sans effet pour un personnage sans dose (non-forgesort).
 */
export function removeElixirDoses(equipment: EquipmentLine[]): EquipmentLine[] {
  return equipment.filter((line) => !(isCustomItem(line) && isElixirItemName(line.name)));
}

/**
 * Noms d'objets de TOUS les élixirs qu'un forgesort peut préparer : la recette de chaque rang à
 * recette unique (r1-r3, nom de la capacité) + chaque sort reproduit par les Élixirs mineurs/majeurs
 * (r4/r5, `referencedFeatures`). Les capacités porteuses sont repérées par leur réserve partagée
 * `poolInPathHeader` (seuls les élixirs en ont). Ordre par rang de voie ; doublons écartés.
 */
export function creatableElixirItemNames(): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  const add = (name: string) => {
    const item = elixirItemName(name);
    if (!seen.has(item)) {
      seen.add(item);
      names.push(item);
    }
  };
  for (const feature of features) {
    if (!feature.usageCounter?.poolInPathHeader) continue;
    if (feature.referencedFeatures?.length) {
      for (const id of feature.referencedFeatures) {
        const ref = featureById.get(id);
        if (ref) add(ref.name);
      }
    } else {
      add(feature.name);
    }
  }
  return names;
}

/**
 * Résolution NOM D'OBJET → id de la CAPACITÉ à mettre en avant (puce) pour une dose d'élixir en
 * inventaire. Pour un Élixir mineur/majeur (r4/r5), c'est le SORT choisi dans une autre voie
 * (`referencedFeatures`) ; pour les rangs 1-3, c'est la capacité du forgesort elle-même. Restreint
 * au SET des élixirs préparables → pas d'ambiguïté sur les noms (ex. « Invisibilité » ne pointe pas
 * vers une voie de prestige). `undefined` pour un objet qui n'est pas un élixir connu (repli texte).
 */
export function elixirFeatureIdByItemName(): Map<string, string> {
  const map = new Map<string, string>();
  for (const feature of features) {
    if (!feature.usageCounter?.poolInPathHeader) continue;
    if (feature.referencedFeatures?.length) {
      for (const id of feature.referencedFeatures) {
        const ref = featureById.get(id);
        if (ref) map.set(elixirItemName(ref.name), ref.id);
      }
    } else {
      map.set(elixirItemName(feature.name), feature.id);
    }
  }
  return map;
}
