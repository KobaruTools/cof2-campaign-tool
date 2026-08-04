/**
 * Arithmétique du RECENTRAGE HORIZONTAL d'un élément dans un conteneur défilant (PER-297).
 *
 * Extrait ici, pur et testable : le composant ne fait que lire les mesures du DOM
 * (`scrollLeft`/`clientWidth`/`scrollWidth` + rectangles) et appliquer le résultat via
 * `scrollTo`. On calcule `scrollLeft` À LA MAIN plutôt que d'appeler `scrollIntoView` :
 * cette dernière peut faire bouger la page VERTICALEMENT (l'écran de MJ est une page
 * longue), alors qu'un `scrollTo({ left })` sur le seul conteneur ne touche jamais au
 * défilement de la page.
 */

export interface CenterScrollInput {
  /** Défilement horizontal actuel du conteneur (`scrollLeft`). */
  scrollLeft: number;
  /** Largeur VISIBLE du conteneur (`clientWidth`, barre de défilement exclue). */
  viewportWidth: number;
  /** Largeur TOTALE du contenu (`scrollWidth`). */
  contentWidth: number;
  /**
   * Bord gauche de l'élément à centrer, RELATIF au bord gauche visible du conteneur
   * (`itemRect.left - containerRect.left`) : négatif si l'élément est déjà sorti à gauche.
   */
  itemLeft: number;
  /** Largeur de l'élément à centrer. */
  itemWidth: number;
}

/**
 * Position de défilement à atteindre pour amener l'élément au CENTRE de la zone visible,
 * bornée aux extrémités du contenu (le premier et le dernier élément se collent donc au
 * bord au lieu d'être centrés — le contenu ne se décolle jamais de ses bords).
 *
 * Renvoie `null` quand il n'y a RIEN à faire :
 *  - le contenu ne déborde pas (tout est déjà visible) → pas d'animation inutile ;
 *  - la cible est déjà la position courante (au pixel près).
 */
export function centeredScrollLeft({
  scrollLeft,
  viewportWidth,
  contentWidth,
  itemLeft,
  itemWidth,
}: CenterScrollInput): number | null {
  const maxScrollLeft = contentWidth - viewportWidth;
  // Pas de débordement (ou mesures pas encore fiables : conteneur non monté / masqué).
  if (maxScrollLeft <= 0 || viewportWidth <= 0) return null;
  // Décalage à appliquer : distance entre le bord gauche de l'élément et le bord gauche
  // qu'il aurait s'il était centré dans la zone visible.
  const delta = itemLeft - (viewportWidth - itemWidth) / 2;
  const target = Math.round(Math.min(Math.max(scrollLeft + delta, 0), maxScrollLeft));
  return target === Math.round(scrollLeft) ? null : target;
}
