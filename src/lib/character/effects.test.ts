import { describe, expect, it } from 'vitest';
import { modsFromFeatures } from './effects';

describe('modsFromFeatures', () => {
  it('aucune capacité → sac vide', () => {
    expect(modsFromFeatures([])).toEqual({});
  });

  it('ignore les ids inconnus et les capacités sans effects', () => {
    expect(modsFromFeatures(['id-inexistant', 'air-r2'])).toEqual({});
  });

  it('agrège un bonus plat unique (Murmures dans le vent, air r1 : +1 Init, +1 DEF)', () => {
    expect(modsFromFeatures(['air-r1'])).toEqual({ initiative: 1, def: 1 });
  });

  it('agrège la part plate de Réflexes éclair (pourfendeur r1 : +3 Init, +1 DEF)', () => {
    // Le bonus conditionnel d'esquive et le passage de la DEF à +2 au rang 5 ne
    // sont PAS structurés : seule la part plate inconditionnelle est agrégée.
    expect(modsFromFeatures(['pourfendeur-r1'])).toEqual({ initiative: 3, def: 1 });
  });

  it('agrège la part plate de Diversité (humain r1 : +1 PC)', () => {
    // Le +3 à deux domaines au choix n'est pas structuré ici.
    expect(modsFromFeatures(['humain-r1'])).toEqual({ luckPoints: 1 });
  });

  it('somme les bonus de plusieurs capacités, par stat (cas Lhagva)', () => {
    expect(modsFromFeatures(['pourfendeur-r1', 'humain-r1'])).toEqual({
      initiative: 3,
      def: 1,
      luckPoints: 1,
    });
  });
});
