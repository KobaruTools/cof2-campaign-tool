import { describe, expect, it } from 'vitest';
import { scrollEdges, stepScrollLeft } from './horizontalScroll';

/**
 * Cas de référence, identique à `centerScroll.test.ts` : 6 cartes de 260 px séparées de 16 px
 * (1640 px de contenu) dans une zone visible de 1000 px — l'écran de MJ sur un portable.
 * Défilement maximum : 1640 − 1000 = 640 px. Pas d'un chevron : 260 + 16 = 276 px.
 */
const BAND = { viewportWidth: 1000, contentWidth: 1640 };
const STEP = 276;

describe('scrollEdges', () => {
  it('au départ, il ne reste du contenu qu’à droite', () => {
    expect(scrollEdges({ ...BAND, scrollLeft: 0 })).toEqual({ left: false, right: true });
  });

  it('au milieu, il reste du contenu des deux côtés', () => {
    expect(scrollEdges({ ...BAND, scrollLeft: 300 })).toEqual({ left: true, right: true });
  });

  it('en bout de course, il ne reste du contenu qu’à gauche', () => {
    expect(scrollEdges({ ...BAND, scrollLeft: 640 })).toEqual({ left: true, right: false });
  });

  it('aucun côté quand le contenu ne déborde pas', () => {
    expect(scrollEdges({ scrollLeft: 0, viewportWidth: 1000, contentWidth: 800 })).toEqual({
      left: false,
      right: false,
    });
  });

  it('tolère le sous-pixel du zoom navigateur en bout de course', () => {
    // `scrollLeft` fractionnaire à 0.4 px de la butée : sans tolérance, l'estompe de droite
    // resterait allumée alors qu'il n'y a plus rien à atteindre.
    expect(scrollEdges({ ...BAND, scrollLeft: 639.6 })).toEqual({ left: true, right: false });
    expect(scrollEdges({ ...BAND, scrollLeft: 0.4 })).toEqual({ left: false, right: true });
  });
});

describe('stepScrollLeft', () => {
  it('avance d’une carte + gouttière vers la droite', () => {
    expect(stepScrollLeft({ ...BAND, scrollLeft: 0 }, 1, STEP)).toBe(276);
  });

  it('recule d’une carte + gouttière vers la gauche', () => {
    expect(stepScrollLeft({ ...BAND, scrollLeft: 552 }, -1, STEP)).toBe(276);
  });

  it('borne la cible au défilement maximum', () => {
    expect(stepScrollLeft({ ...BAND, scrollLeft: 500 }, 1, STEP)).toBe(640);
  });

  it('borne la cible à zéro', () => {
    expect(stepScrollLeft({ ...BAND, scrollLeft: 100 }, -1, STEP)).toBe(0);
  });

  it('renvoie null en butée (pas d’animation à vide)', () => {
    expect(stepScrollLeft({ ...BAND, scrollLeft: 640 }, 1, STEP)).toBeNull();
    expect(stepScrollLeft({ ...BAND, scrollLeft: 0 }, -1, STEP)).toBeNull();
  });

  it('renvoie null quand le contenu ne déborde pas', () => {
    expect(stepScrollLeft({ scrollLeft: 0, viewportWidth: 1000, contentWidth: 800 }, 1, STEP)).toBeNull();
  });
});
