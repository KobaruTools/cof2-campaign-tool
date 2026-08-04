/**
 * Arithmétique du DÉFILEMENT HORIZONTAL d'une bande (PER-298) : de quel côté il reste du
 * contenu hors champ (estompes + chevrons), où aller au clic d'un chevron, et faut-il
 * détourner la molette verticale.
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

/**
 * Hauteur d'une « ligne » de molette en px, pour les souris qui comptent en lignes
 * (`deltaMode: 1`) plutôt qu'en pixels. Valeur usuelle des navigateurs.
 */
export const WHEEL_LINE_HEIGHT = 16;

export interface WheelScrollInput extends ScrollMetrics {
  /** `WheelEvent.deltaX` (pavé tactile, souris à molette latérale). */
  deltaX: number;
  /** `WheelEvent.deltaY` (molette verticale). */
  deltaY: number;
  /** `WheelEvent.deltaMode` : 0 = pixels, 1 = lignes, 2 = pages. */
  deltaMode: number;
}

/** Convertit une unité de `deltaMode` en pixels. */
function wheelUnitPixels(deltaMode: number, viewportWidth: number): number {
  if (deltaMode === 1) return WHEEL_LINE_HEIGHT;
  if (deltaMode === 2) return viewportWidth;
  return 1;
}

/**
 * Décalage horizontal (px) à appliquer à la bande pour un coup de molette VERTICALE
 * au-dessus d'elle, ou `null` quand il ne faut PAS détourner l'événement.
 *
 * On laisse passer dans deux cas :
 *  - le geste est DÉJÀ horizontal (`|deltaX| ≥ |deltaY|`) : le navigateur fait alors
 *    lui-même défiler la bande, inutile de s'en mêler ;
 *  - la bande est en BUTÉE dans le sens demandé : détourner là ferait « coller » le
 *    pointeur sur la bande et empêcherait la page de défiler verticalement — pire que le
 *    problème d'origine.
 */
export function wheelScrollDelta({
  deltaX,
  deltaY,
  deltaMode,
  ...metrics
}: WheelScrollInput): number | null {
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return null;
  const pixels = deltaY * wheelUnitPixels(deltaMode, metrics.viewportWidth);
  if (pixels === 0) return null;
  const edges = scrollEdges(metrics);
  if (pixels < 0 ? !edges.left : !edges.right) return null;
  return pixels;
}
