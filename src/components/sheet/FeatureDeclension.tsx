'use client';

/**
 * DÉCLINAISON DES CAPACITÉS À L'AFFICHAGE (PER-74) — pendant visuel de
 * `src/lib/character/dragonElement.ts`.
 *
 * Certaines capacités sont écrites avec des TOKENS de déclinaison (`%of%`, `%toThe%`…) parce que le
 * livre lui-même invite à les décliner : la voie du chevalier dragon est rédigée « à partir des
 * symboles liés au dragon rouge, mais elle peut évidemment être déclinée pour d'autres couleurs »
 * (p. 147). Résoudre ces tokens demande le PERSONNAGE (c'est lui qui porte le choix de couleur), or
 * le nom d'une capacité est affiché depuis une trentaine d'endroits qui n'ont pas tous le personnage
 * sous la main.
 *
 * D'où un CONTEXTE, sur le patron de `FeatureVerbatimContext` : la fiche (et le wizard) fournissent
 * le personnage courant une fois, et les points d'affichage déclinent via les hooks ci-dessous. Hors
 * de tout Provider (bestiaire, aide-mémoire, tests de rendu), les hooks retombent sur le texte
 * IMPRIMÉ du livre — jamais sur un token brut.
 */
import { createContext, useContext } from 'react';
import type { Feature } from '@/data/schema';
import { declineForFeature, declineText } from '@/lib/character/dragonElement';
import { chosenOptionName } from '@/lib/character/choices';
import type { Character } from '@/lib/character/types';

/** Personnage contre lequel décliner les capacités affichées ; `null` = aucun (repli imprimé). */
export const FeatureDeclensionContext = createContext<Character | null>(null);

/**
 * Décline un texte de capacité (nom, libellé, richText) contre le personnage du contexte. Une chaîne
 * sans token traverse inchangée : appelable sans condition, y compris sur des capacités non déclinables.
 */
export function useDeclined(feature: Pick<Feature, 'elementFromChoice'>, value: string): string {
  const character = useContext(FeatureDeclensionContext);
  if (!value.includes('%')) return value;
  return character ? declineForFeature(character, feature, value) : declineText(value, null);
}

/**
 * Nom AFFICHÉ d'une capacité : d'abord dérivé de l'option retenue si la capacité le demande
 * (`nameFromChosenOption`, ex. drakonide-r4 → « Fureur drakonide »), puis décliné par élément le cas
 * échéant (« Résistance au feu » → « Résistance à la foudre »). Source UNIQUE du nom affiché.
 */
export function useDeclinedFeatureName(feature: Feature): string {
  const character = useContext(FeatureDeclensionContext);
  const base = (character ? chosenOptionName(character, feature) : null) ?? feature.name;
  return useDeclined(feature, base);
}

/**
 * Fonction de déclinaison récupérée UNE FOIS pour tout un composant, puis appelable librement —
 * y compris dans une boucle (`.map` sur les capacités d'une voie), là où un hook par capacité
 * violerait les règles des hooks. C'est la forme à utiliser dès qu'on décline plusieurs capacités.
 */
export function useFeatureDecliner(): (feature: Pick<Feature, 'elementFromChoice'>, value: string) => string {
  const character = useContext(FeatureDeclensionContext);
  return (feature, value) => {
    if (!value.includes('%')) return value;
    return character ? declineForFeature(character, feature, value) : declineText(value, null);
  };
}

/** Raccourci de `useFeatureDecliner` pour le cas courant : le NOM de la capacité (option retenue incluse). */
export function useFeatureNameDecliner(): (feature: Feature) => string {
  const character = useContext(FeatureDeclensionContext);
  const decline = useFeatureDecliner();
  return (feature) => decline(feature, (character ? chosenOptionName(character, feature) : null) ?? feature.name);
}

/**
 * Nom décliné rendu comme composant — pour les emplacements où seul le nom NU est affiché (sans les
 * marqueurs d'action de `FeatureLabel`) et où appeler un hook serait malvenu.
 */
export function DeclinedFeatureName({ feature }: { feature: Feature }) {
  return <>{useDeclinedFeatureName(feature)}</>;
}
