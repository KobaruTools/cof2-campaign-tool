/**
 * Reskin d'AFFICHAGE de la voie de l'artilleur pour la variante « Arbalétrier » (PER-178, armes à
 * feu interdites dans l'univers, p. 62). Miroir de `classDisplayName` (cf. `classDisplay.ts`) au
 * niveau CAPACITÉ : la voie de l'artilleur elle-même reste acquise telle quelle par l'arquebusier
 * (`CharacterClass.pathIdsWithoutFirearms` ne remplace que la voie des explosifs, pas celle-ci), mais
 * son texte verbatim mentionne la poudre. Le texte SOURCE (`adventurerFeatures`) n'est JAMAIS modifié
 * — cette couche ne fait que substituer le `Feature` rendu à l'affichage.
 *
 * Décision par capacité (encadré « Poudre ou pas poudre ? », p. 62) :
 *  - Mécanismes (r1) : la liste d'exemple d'armes de siège perd couleuvrine/canon (des armes à poudre
 *    qui n'existent plus dans un univers qui interdit la poudre) ; le bonus lui-même est inchangé.
 *  - Arme à répétition (r2) et Tir de barrage (r3) : déjà agnostiques à l'arme (aucune mention de
 *    poudre) — aucun reskin nécessaire.
 *  - Canon double (r4) : RÈGLE MAISON (décision propriétaire, aucun équivalent RAW) — reformulé en
 *    « Carreau double », un second mécanisme de tir pour les arbalètes (mais pas la baliste, à
 *    l'identique de l'exclusion couleuvrine du livre). Le `weaponModification` sous-jacent reste
 *    `scope: 'firearm'` en DONNÉE ; c'est `isModifiableWeapon` (cf. `weaponLoading.ts`) qui étend
 *    l'éligibilité aux arbalètes quand `firearmsAllowed === false`, pour que la capacité reformulée
 *    ait un effet réel (jamais de texte promettant un effet inerte).
 *  - Couleuvrine (r5) : reskin simple en « Baliste », texte calqué sur `equipment.ts` (mêmes DM/portée/
 *    rechargement — « contrepartie sans poudre de la couleuvrine », p. 62). `grantsEquipment` reste
 *    verbatim (`couleuvrine`) : la substitution d'objet est déjà gérée par `grantedItemId`
 *    (cf. `grantedEquipment.ts`), qui résout la baliste à la place.
 */
import type { Feature } from '@/data/schema';

type FeatureOverride = (feature: Feature) => Feature;

const ARTILLEUR_OVERRIDES_WITHOUT_FIREARMS: Record<string, FeatureOverride> = {
  'artilleur-r1': (feature) => ({
    ...feature,
    text: "L'arbalétrier ajoute son rang + 2 à tous les tests visant à réparer ou à comprendre des mécanismes (cela inclut le fait de désamorcer des pièges mécaniques et de manipuler des armes de siège). Il obtient un dé bonus à tous les tests d'attaque avec des armes de siège (baliste, trébuchet, catapulte, etc.).",
    richText:
      "L'arbalétrier ajoute son [rang + 2] à tous les tests visant à réparer ou à comprendre des mécanismes (cela inclut le fait de désamorcer des pièges mécaniques et de manipuler des armes de siège). Il obtient un dé bonus à tous les tests d'attaque avec des armes de siège (baliste, trébuchet, catapulte, etc.).",
  }),
  'artilleur-r4': (feature) => ({
    ...feature,
    name: 'Carreau double',
    text: "L'arbalétrier peut bricoler ses arbalètes (mais pas une baliste) pour les doter d'un second mécanisme de tir. Il double le dé de DM de l'arme (mais pas les dés bonus ni les bonus). Il doit recharger chaque mécanisme individuellement (un carreau double consomme 2 carreaux). En cas de critique le dé est triplé (au lieu de ×4). Ce type d'arme possède une double gâchette et il reste possible de ne décocher qu'un seul carreau à la fois.",
    weaponModification: feature.weaponModification
      ? { ...feature.weaponModification, label: 'Arbalètes dotées d’un second mécanisme' }
      : feature.weaponModification,
  }),
  'artilleur-r5': (feature) => ({
    ...feature,
    name: 'Baliste',
    text: "L'arbalétrier obtient une baliste (une lourde arbalète de siège portative). Sur un test d'attaque à distance réussi (dé bonus), la baliste inflige [5d4° + INT] DM à une portée de 100 m. Il faut ensuite deux rounds (L) pour la recharger. C'est une arme encombrante et il est impossible de transporter plus d'une baliste.",
    richText:
      "L'arbalétrier obtient une baliste (une lourde arbalète de siège portative). Sur un test d'attaque à distance réussi (dé bonus), la baliste inflige [5d4° + INT] DM à une portée de 100 m. Il faut ensuite deux rounds (L) pour la recharger. C'est une arme encombrante et il est impossible de transporter plus d'une baliste.",
  }),
};

/**
 * `feature` tel qu'il doit être AFFICHÉ compte tenu de l'autorisation des armes à feu. Ne bascule que
 * si `firearmsAllowed === false` ET que la capacité fait partie de la voie de l'artilleur avec un
 * reskin déclaré ci-dessus ; sinon renvoie `feature` tel quel (le texte source ne bouge jamais).
 */
export function artilleurFeatureDisplay(
  feature: Feature,
  firearmsAllowed: boolean | undefined,
): Feature {
  if (firearmsAllowed !== false) return feature;
  const override = ARTILLEUR_OVERRIDES_WITHOUT_FIREARMS[feature.id];
  return override ? override(feature) : feature;
}
