/**
 * Géométrie de la COLONNE DE PAGES du visualiseur PDF (PER-255, défilement continu).
 *
 * Le visualiseur ne rend plus une page à la fois : il empile N emplacements de hauteur
 * UNIFORME (une par page du livre) dans un conteneur défilant, et ne monte réellement
 * (`<Page>` pdf.js) que ceux proches du viewport — les autres restent des boîtes vides de la
 * bonne hauteur, ce qui garde la barre de défilement et les sauts de page exacts.
 *
 * Toute l'arithmétique vit ici, en fonctions PURES et testables : la page courante n'est plus
 * décidée par l'UI mais **déduite de la position de défilement**, et « aller à la page N »
 * devient « défiler jusqu'à l'offset de la page N ».
 *
 * Convention : les numéros de page manipulés ici sont des numéros de **FICHIER** (1..numPages),
 * jamais des numéros imprimés — la conversion (`printedPageOffset`) reste au composant.
 */

/**
 * Description de la colonne à un instant donné. Toutes les longueurs sont en pixels CSS, dans
 * le repère du CONTENU DÉFILANT (celui de `scrollTop`).
 */
export interface PageColumnGeometry {
  /** Nombre de pages du livre (donc d'emplacements empilés). */
  numPages: number;
  /**
   * Hauteur rendue d'une page. Identique pour toutes : c'est l'hypothèse de format uniforme,
   * vérifiée en amont par sondage du PDF (à défaut, le visualiseur se rabat sur le rendu
   * page à page et cette géométrie n'est pas utilisée).
   */
  pageHeight: number;
  /** Espace vertical entre deux pages consécutives. */
  gap: number;
  /**
   * Décalage du haut de la colonne dans le contenu défilant (padding du conteneur). Lu sur le
   * DOM (`offsetTop`) plutôt que recalculé, pour rester juste quel que soit l'habillage.
   */
  columnTop: number;
}

/** Position dans une page, pour réancrer le défilement après un changement d'échelle. */
export interface PageAnchor {
  /** Page (n° de fichier) qu'on était en train de lire. */
  page: number;
  /** Position dans cette page, en fraction de son pas vertical (0 = haut, 1 = page suivante). */
  fraction: number;
}

/** Pas vertical d'une page à la suivante (hauteur + espace inter-pages). */
export function pageStep(g: PageColumnGeometry): number {
  return g.pageHeight + g.gap;
}

/** Borne un numéro de page dans `1..numPages`. */
export function clampPageNumber(g: PageColumnGeometry, page: number): number {
  return Math.min(Math.max(1, Math.trunc(page) || 1), Math.max(1, g.numPages));
}

/** Hauteur totale de la colonne (utile pour vérifier l'accord avec le DOM). */
export function columnHeight(g: PageColumnGeometry): number {
  if (g.numPages <= 0) return 0;
  return g.numPages * g.pageHeight + (g.numPages - 1) * g.gap;
}

/** Offset du HAUT de la page `page` dans le contenu défilant. */
export function pageOffset(g: PageColumnGeometry, page: number): number {
  return g.columnTop + (clampPageNumber(g, page) - 1) * pageStep(g);
}

/**
 * `scrollTop` à appliquer pour amener la page `page` en haut du viewport. On retire l'espace
 * inter-pages pour laisser un filet d'air au-dessus (et rendre visible qu'il y a un avant).
 */
export function scrollTopForPage(g: PageColumnGeometry, page: number): number {
  return Math.max(0, pageOffset(g, page) - g.gap);
}

/**
 * Fenêtre de pages à monter réellement pour un défilement donné : les pages qui touchent le
 * viewport, élargies de `overscan` de chaque côté (pré-rendu des voisines, pour ne pas voir
 * d'emplacement vide en feuilletant).
 */
export function visiblePageRange(
  g: PageColumnGeometry,
  scrollTop: number,
  viewportHeight: number,
  overscan = 0,
): { start: number; end: number } {
  const step = pageStep(g);
  if (!(step > 0)) return { start: 1, end: clampPageNumber(g, 1) };
  const top = scrollTop - g.columnTop;
  const first = Math.floor(top / step) + 1;
  // `- 1` : un viewport dont le bord bas tombe pile sur la frontière n'inclut pas la suivante.
  const last = Math.floor((top + Math.max(0, viewportHeight) - 1) / step) + 1;
  return {
    start: clampPageNumber(g, first - overscan),
    end: clampPageNumber(g, last + overscan),
  };
}

/**
 * Page à afficher dans le compteur pour un défilement donné : celle dont la plus grande
 * surface est visible. À égalité (deux moitiés d'écran), la page du HAUT gagne — c'est celle
 * qu'on vient de lire, et ça évite que le compteur clignote au passage d'une frontière.
 */
export function dominantPage(
  g: PageColumnGeometry,
  scrollTop: number,
  viewportHeight: number,
): number {
  const { start, end } = visiblePageRange(g, scrollTop, viewportHeight);
  const viewTop = scrollTop;
  const viewBottom = scrollTop + Math.max(0, viewportHeight);
  let best = start;
  let bestVisible = -1;
  for (let p = start; p <= end; p++) {
    const top = pageOffset(g, p);
    const visible = Math.min(top + g.pageHeight, viewBottom) - Math.max(top, viewTop);
    if (visible > bestVisible) {
      bestVisible = visible;
      best = p;
    }
  }
  return best;
}

/**
 * Ancre de lecture courante : page + position relative dans son pas. Prise AVANT un changement
 * d'échelle (zoom, ajustement, redimensionnement), elle est réappliquée après recalcul des
 * hauteurs — sans quoi conserver le `scrollTop` en pixels téléporterait ailleurs dans le livre.
 */
export function pageAnchor(g: PageColumnGeometry, scrollTop: number): PageAnchor {
  const step = pageStep(g);
  if (!(step > 0)) return { page: 1, fraction: 0 };
  const top = scrollTop - g.columnTop;
  const page = clampPageNumber(g, Math.floor(top / step) + 1);
  return { page, fraction: (top - (page - 1) * step) / step };
}

/** `scrollTop` qui restaure une ancre dans la géométrie (nouvelle) `g`. */
export function scrollTopForAnchor(g: PageColumnGeometry, anchor: PageAnchor): number {
  const step = pageStep(g);
  return Math.max(0, g.columnTop + (clampPageNumber(g, anchor.page) - 1 + anchor.fraction) * step);
}
