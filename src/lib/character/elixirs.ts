/**
 * Élixirs préparés par le forgesort matérialisés en OBJETS d'inventaire (voie des élixirs, p. 98).
 * Source de vérité du NOMMAGE de ces objets, partagée par le bouton « Créer l'élixir » (fiche) et
 * la liste d'ajout d'équipement — mêmes noms ⇒ les doses s'empilent (quantité incrémentée).
 * Matérialisation minimale ; le transfert à un autre personnage relève de PER-158.
 */
import { features, featureById } from '@/data';

/** Nom d'objet d'inventaire d'une dose d'élixir, d'après le sort/la recette reproduit(e). */
export function elixirItemName(spellOrRecipeName: string): string {
  return `Élixir — ${spellOrRecipeName}`;
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
