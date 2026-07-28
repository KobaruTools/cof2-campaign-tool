import { describe, expect, it } from 'vitest';
import {
  clampPageNumber,
  columnHeight,
  dominantPage,
  pageAnchor,
  pageOffset,
  pageStep,
  scrollTopForAnchor,
  scrollTopForPage,
  visiblePageRange,
  type PageColumnGeometry,
} from './pageColumn';

/** Livre de 10 pages de 100 px, 10 px d'espace, colonne décalée de 16 px (padding). */
const g: PageColumnGeometry = { numPages: 10, pageHeight: 100, gap: 10, columnTop: 16 };

describe('pageStep / columnHeight', () => {
  it('additionne hauteur et espace inter-pages', () => {
    expect(pageStep(g)).toBe(110);
  });

  it('compte un espace en moins que de pages', () => {
    expect(columnHeight(g)).toBe(10 * 100 + 9 * 10);
    expect(columnHeight({ ...g, numPages: 1 })).toBe(100);
    expect(columnHeight({ ...g, numPages: 0 })).toBe(0);
  });
});

describe('clampPageNumber', () => {
  it('borne dans 1..numPages', () => {
    expect(clampPageNumber(g, 0)).toBe(1);
    expect(clampPageNumber(g, -5)).toBe(1);
    expect(clampPageNumber(g, 4)).toBe(4);
    expect(clampPageNumber(g, 99)).toBe(10);
  });

  it('tolère un livre vide', () => {
    expect(clampPageNumber({ ...g, numPages: 0 }, 3)).toBe(1);
  });
});

describe('pageOffset / scrollTopForPage', () => {
  it('empile les pages à pas constant depuis le haut de la colonne', () => {
    expect(pageOffset(g, 1)).toBe(16);
    expect(pageOffset(g, 2)).toBe(126);
    expect(pageOffset(g, 10)).toBe(16 + 9 * 110);
  });

  it('laisse l’espace inter-pages visible au-dessus de la page visée', () => {
    expect(scrollTopForPage(g, 2)).toBe(126 - 10);
  });

  it('ne défile jamais avant le début du contenu', () => {
    expect(scrollTopForPage(g, 1)).toBe(6);
    expect(scrollTopForPage({ ...g, columnTop: 4 }, 1)).toBe(0);
  });
});

describe('visiblePageRange', () => {
  it('ne monte que la page visible quand elle remplit le viewport', () => {
    expect(visiblePageRange(g, scrollTopForPage(g, 1), 100)).toEqual({ start: 1, end: 1 });
  });

  it('inclut les deux pages à cheval sur une frontière', () => {
    expect(visiblePageRange(g, 66, 100)).toEqual({ start: 1, end: 2 });
  });

  it('élargit de l’overscan demandé, sans sortir du livre', () => {
    expect(visiblePageRange(g, pageOffset(g, 5), 100, 2)).toEqual({ start: 3, end: 7 });
    expect(visiblePageRange(g, 0, 100, 2)).toEqual({ start: 1, end: 3 });
    expect(visiblePageRange(g, pageOffset(g, 10), 100, 2)).toEqual({ start: 8, end: 10 });
  });

  it('couvre plusieurs pages dans un grand viewport', () => {
    // 330 px = exactement 3 pas depuis le haut de la page 3 : la 6e n'est pas encore entamée.
    expect(visiblePageRange(g, pageOffset(g, 3), 330)).toEqual({ start: 3, end: 5 });
    expect(visiblePageRange(g, pageOffset(g, 3), 340)).toEqual({ start: 3, end: 6 });
  });

  it('reste défini avec une géométrie dégénérée', () => {
    expect(visiblePageRange({ ...g, pageHeight: 0, gap: 0 }, 0, 100)).toEqual({ start: 1, end: 1 });
  });
});

describe('dominantPage', () => {
  it('suit la page dont la plus grande surface est visible', () => {
    expect(dominantPage(g, scrollTopForPage(g, 1), 100)).toBe(1);
    expect(dominantPage(g, 66, 100)).toBe(1);
    expect(dominantPage(g, 76, 100)).toBe(2);
    expect(dominantPage(g, scrollTopForPage(g, 7), 100)).toBe(7);
  });

  it('donne la page du haut en cas d’égalité parfaite', () => {
    // À 71, page 1 et page 2 occupent 45 px chacune.
    expect(dominantPage(g, 71, 100)).toBe(1);
  });

  it('reste dans le livre aux extrémités', () => {
    expect(dominantPage(g, -200, 100)).toBe(1);
    expect(dominantPage(g, 99_999, 100)).toBe(10);
  });
});

describe('pageAnchor / scrollTopForAnchor', () => {
  it('décrit la position de lecture en page + fraction', () => {
    expect(pageAnchor(g, pageOffset(g, 2))).toEqual({ page: 2, fraction: 0 });
    expect(pageAnchor(g, pageOffset(g, 2) + 55)).toEqual({ page: 2, fraction: 0.5 });
  });

  it('fait un aller-retour exact dans la même géométrie', () => {
    const scrollTop = pageOffset(g, 4) + 33;
    expect(scrollTopForAnchor(g, pageAnchor(g, scrollTop))).toBeCloseTo(scrollTop, 6);
  });

  it('conserve l’endroit lu quand le zoom double les hauteurs', () => {
    const anchor = pageAnchor(g, pageOffset(g, 3) + 50); // à mi-hauteur de la page 3
    expect(anchor.page).toBe(3);
    // Le pas passe de 110 à 210 : la même fraction de page, deux fois plus loin en pixels.
    const zoomed: PageColumnGeometry = { ...g, pageHeight: 200 };
    expect(scrollTopForAnchor(zoomed, anchor)).toBeCloseTo(16 + (2 + 50 / 110) * 210, 6);
  });

  it('ne renvoie jamais un défilement négatif', () => {
    expect(scrollTopForAnchor(g, { page: 1, fraction: -1 })).toBe(0);
  });
});
