import { describe, expect, it } from 'vitest';
import { CROSS_OUT_CURRENT_COLOR, crossOutAfterSx, crossOutBackgroundImage } from './crossOut';

describe('crossOutBackgroundImage', () => {
  // Verrou de non-régression du RÉGLAGE HISTORIQUE (croix « capacité gênée par l'armure », PER-86) :
  // trait de 1px dérivé de la couleur courante, feutré de 0.75px de chaque côté (anti-crénelage).
  it('par défaut : trait de 1px en couleur courante, bords feutrés à 0.75px', () => {
    const stops =
      `transparent calc(50% - 1.25px), ${CROSS_OUT_CURRENT_COLOR} calc(50% - 0.5px), ` +
      `${CROSS_OUT_CURRENT_COLOR} calc(50% + 0.5px), transparent calc(50% + 1.25px)`;
    expect(crossOutBackgroundImage()).toBe(
      `linear-gradient(to top right, ${stops}), linear-gradient(to bottom right, ${stops})`,
    );
  });

  it('deux barres en croix : une montante, une descendante', () => {
    const image = crossOutBackgroundImage();
    expect(image).toContain('linear-gradient(to top right,');
    expect(image).toContain('linear-gradient(to bottom right,');
  });

  it('épaissit le trait autour du milieu, feutrage constant', () => {
    const image = crossOutBackgroundImage({ color: 'red', thickness: 3 });
    expect(image).toContain('red calc(50% - 1.5px)');
    expect(image).toContain('red calc(50% + 1.5px)');
    expect(image).toContain('transparent calc(50% - 2.25px)');
    expect(image).toContain('transparent calc(50% + 2.25px)');
  });
});

describe('crossOutAfterSx', () => {
  it('barre le bloc via ::after, sans intercepter le pointeur et en suivant l’arrondi', () => {
    const sx = crossOutAfterSx();
    expect(sx['&::after']).toMatchObject({
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      borderRadius: 'inherit',
      backgroundImage: crossOutBackgroundImage(),
    });
  });
});
