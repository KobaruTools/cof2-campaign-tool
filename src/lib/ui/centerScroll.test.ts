import { describe, expect, it } from 'vitest';
import { centeredScrollLeft } from './centerScroll';

/**
 * Cas de référence : bande de 6 cartes de 260 px séparées de 16 px (1640 px de contenu) dans une
 * zone visible de 1000 px — la configuration réelle de l'écran de MJ sur un écran de portable, où
 * le combattant actif sort du champ dès la 4e carte. Défilement maximum : 1640 − 1000 = 640 px.
 */
const BAND = { viewportWidth: 1000, contentWidth: 1640 };
/** Bord gauche de la carte d'indice `i` dans le contenu (260 px de large, 16 px de gouttière). */
const cardOffset = (i: number) => i * 276;
/** Bord gauche qu'une carte de 260 px occupe une fois centrée dans la zone visible. */
const CENTERED_LEFT = (1000 - 260) / 2;

describe('centeredScrollLeft', () => {
  it('ne fait rien quand le contenu ne déborde pas', () => {
    expect(
      centeredScrollLeft({
        scrollLeft: 0,
        viewportWidth: 1000,
        contentWidth: 800,
        itemLeft: 552,
        itemWidth: 260,
      }),
    ).toBeNull();
  });

  it('centre une carte hors champ à droite', () => {
    // Carte 3 (bord gauche à 828 px du départ), bande non défilée → elle est à 828 px du bord
    // visible. Centrée, son bord gauche doit tomber à (1000 − 260) / 2 = 370 px.
    expect(
      centeredScrollLeft({ ...BAND, scrollLeft: 0, itemLeft: cardOffset(3), itemWidth: 260 }),
    ).toBe(cardOffset(3) - CENTERED_LEFT);
  });

  it('centre une carte sortie à gauche (décalage négatif)', () => {
    // Bande défilée à 500 px, carte 1 (bord gauche à 276 px du départ) → elle est à 276 − 500 =
    // −224 px du bord visible. Cible = 500 + (−224 − 370) = −94 → bornée à 0.
    expect(
      centeredScrollLeft({ ...BAND, scrollLeft: 500, itemLeft: cardOffset(1) - 500, itemWidth: 260 }),
    ).toBe(0);
  });

  it('borne la cible à la fin du contenu (dernière carte collée au bord droit)', () => {
    // Dernière carte : la centrer demanderait de défiler au-delà du contenu (1380 − 370 = 1010) →
    // on s'arrête au défilement maximum.
    expect(
      centeredScrollLeft({ ...BAND, scrollLeft: 0, itemLeft: cardOffset(5), itemWidth: 260 }),
    ).toBe(640);
  });

  it('renvoie null quand la carte est déjà centrée (pas d’animation à vide)', () => {
    // Carte 2 (bord gauche à 552 px), bande défilée à 182 px → elle est à 370 px du bord visible,
    // soit exactement centrée.
    expect(
      centeredScrollLeft({ ...BAND, scrollLeft: 182, itemLeft: cardOffset(2) - 182, itemWidth: 260 }),
    ).toBeNull();
  });

  it('renvoie null quand la zone visible n’est pas encore mesurable', () => {
    // Conteneur non monté / masqué : toutes les mesures sont à 0, on ne conclut rien.
    expect(
      centeredScrollLeft({
        scrollLeft: 0,
        viewportWidth: 0,
        contentWidth: 0,
        itemLeft: 0,
        itemWidth: 0,
      }),
    ).toBeNull();
  });

  it('arrondit la cible au pixel', () => {
    // (1000 − 175) / 2 = 412.5 → cible 500 − 412.5 = 87.5, arrondie à 88.
    expect(centeredScrollLeft({ ...BAND, scrollLeft: 0, itemLeft: 500, itemWidth: 175 })).toBe(88);
  });
});
