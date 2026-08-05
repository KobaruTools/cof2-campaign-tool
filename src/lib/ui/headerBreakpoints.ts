/**
 * Paliers de largeur (en px, hors grille de breakpoints MUI nommés) de la nav globale
 * de l'en-tête (`AppHeader`). Partagés entre `AppHeader` (bascule structurelle vers le
 * menu burger) et `HeaderNavButton`/`RulesBookSplitButton` (repli en icône seule), pour
 * qu'un seul et même seuil pilote les deux.
 */

/**
 * Sous ce seuil, plus assez de place pour la rangée de boutons même en icône seule :
 * bascule structurelle vers un bouton burger + tiroir listant les mêmes liens.
 */
export const HEADER_BURGER_BREAKPOINT = 760;

/**
 * À partir de ce seuil, la rangée de boutons réaffiche son libellé. Sous ce seuil (mais
 * au-dessus du seuil burger), icône seule EN PERMANENCE, quel que soit le défilement.
 */
export const HEADER_ICON_ONLY_BREAKPOINT = 1080;
