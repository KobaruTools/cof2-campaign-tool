/**
 * Arithmétique du DÉFILEMENT HORIZONTAL d'une bande (PER-298) : de quel côté il reste du
 * contenu hors champ (estompes + chevrons) et où aller au clic d'un chevron.
 *
 * Le détournement de la MOLETTE verticale, prévu par le ticket, a été implémenté puis RETIRÉ
 * à la demande du propriétaire (2026-08-04) : faire défiler une bande horizontalement pendant
 * qu'on fait défiler la page verticalement est désagréable, même en rendant la main en butée.
 * Ne pas le réintroduire.
 *
 * Extrait ici, pur et testable, sur le même modèle que `centerScroll.ts` (PER-297) : le
 * composant ne fait que LIRE les mesures du DOM (`scrollLeft`/`clientWidth`/`scrollWidth`)
 * et APPLIQUER le résultat.
 */

/** Mesures d'un conteneur défilant horizontalement, telles que lues sur le DOM. */
export interface ScrollMetrics {
  /** Défilement horizontal actuel (`scrollLeft`). */
  scrollLeft: number;
  /** Largeur VISIBLE du conteneur (`clientWidth`, barre de défilement exclue). */
  viewportWidth: number;
  /** Largeur TOTALE du contenu (`scrollWidth`). */
  contentWidth: number;
}

/**
 * Tolérance (px) sur les extrémités : au zoom navigateur, `scrollLeft` et `scrollWidth`
 * sont fractionnaires et `scrollLeft + clientWidth` n'atteint jamais exactement
 * `scrollWidth`. Sans marge, l'estompe de droite resterait allumée en bout de course.
 */
const EDGE_TOLERANCE = 1;

/** Y a-t-il encore du contenu hors champ de chaque côté ? */
export interface ScrollEdges {
  left: boolean;
  right: boolean;
}

/**
 * Côtés où il reste du contenu à atteindre. Pilote À LA FOIS les estompes en dégradé
 * (visibles du seul côté concerné) et l'activation des chevrons.
 */
export function scrollEdges({ scrollLeft, viewportWidth, contentWidth }: ScrollMetrics): ScrollEdges {
  return {
    left: scrollLeft > EDGE_TOLERANCE,
    right: scrollLeft + viewportWidth < contentWidth - EDGE_TOLERANCE,
  };
}

/** Sens d'un déplacement : −1 vers la gauche, +1 vers la droite. */
export type ScrollDirection = -1 | 1;

/**
 * Position de défilement à atteindre après un clic de chevron : un pas (`step` = largeur
 * d'une carte + gouttière) dans le sens demandé, borné aux extrémités du contenu.
 *
 * Renvoie `null` quand il n'y a rien à faire (bande déjà en butée de ce côté, ou contenu
 * qui ne déborde pas) — pas d'animation à vide.
 */
export function stepScrollLeft(
  { scrollLeft, viewportWidth, contentWidth }: ScrollMetrics,
  direction: ScrollDirection,
  step: number,
): number | null {
  const maxScrollLeft = Math.max(contentWidth - viewportWidth, 0);
  const target = Math.round(Math.min(Math.max(scrollLeft + direction * step, 0), maxScrollLeft));
  return target === Math.round(scrollLeft) ? null : target;
}
