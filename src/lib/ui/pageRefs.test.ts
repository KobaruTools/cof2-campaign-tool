import { describe, expect, it } from 'vitest';
import { splitPageRefs } from './pageRefs';

describe('splitPageRefs', () => {
  it('extrait une référence de page parenthésée en fin de phrase', () => {
    expect(splitPageRefs("AGI plafonnée à 3 par l'armure portée (p. 188).")).toEqual([
      { kind: 'text', value: "AGI plafonnée à 3 par l'armure portée " },
      { kind: 'page', page: '188' },
      { kind: 'text', value: '.' },
    ]);
  });

  it('gère une PLAGE de pages', () => {
    expect(splitPageRefs('voir (p. 219-220) plus loin')).toEqual([
      { kind: 'text', value: 'voir ' },
      { kind: 'page', page: '219-220' },
      { kind: 'text', value: ' plus loin' },
    ]);
  });

  it('accepte l’absence d’espace après « p. »', () => {
    expect(splitPageRefs('règle (p.31)')).toEqual([
      { kind: 'text', value: 'règle ' },
      { kind: 'page', page: '31' },
    ]);
  });

  it('extrait plusieurs références', () => {
    expect(splitPageRefs('a (p. 10) b (p. 20)')).toEqual([
      { kind: 'text', value: 'a ' },
      { kind: 'page', page: '10' },
      { kind: 'text', value: ' b ' },
      { kind: 'page', page: '20' },
    ]);
  });

  it("renvoie un seul segment texte quand il n'y a aucune référence", () => {
    expect(splitPageRefs('aucune page ici')).toEqual([{ kind: 'text', value: 'aucune page ici' }]);
  });

  it("omet le texte vide autour d'une référence isolée", () => {
    expect(splitPageRefs('(p. 42)')).toEqual([{ kind: 'page', page: '42' }]);
  });

  it('extrait la forme en prose « (voir page 78) » en remplaçant tout le renvoi', () => {
    expect(
      splitPageRefs('une capacité issue de la famille des combattants (voir page 78).'),
    ).toEqual([
      { kind: 'text', value: 'une capacité issue de la famille des combattants ' },
      { kind: 'page', page: '78' },
      { kind: 'text', value: '.' },
    ]);
  });

  it('accepte « (voir p. 60) » et une plage « (voir pages 219-220) »', () => {
    expect(splitPageRefs('voie du mage (voir p. 60)')).toEqual([
      { kind: 'text', value: 'voie du mage ' },
      { kind: 'page', page: '60' },
    ]);
    expect(splitPageRefs('règle (voir pages 219-220) suite')).toEqual([
      { kind: 'text', value: 'règle ' },
      { kind: 'page', page: '219-220' },
      { kind: 'text', value: ' suite' },
    ]);
  });

  it('laisse en texte une double référence « (voir pages 51 et 56) » (non tronquée)', () => {
    expect(splitPageRefs('noms (voir pages 51 et 56).')).toEqual([
      { kind: 'text', value: 'noms (voir pages 51 et 56).' },
    ]);
  });

  it('reconnaît le qualificatif de livre « (p. N, Compagnon) » (PER-395)', () => {
    expect(splitPageRefs('un pouvoir (p. 40, Compagnon) rare')).toEqual([
      { kind: 'text', value: 'un pouvoir ' },
      { kind: 'page', page: '40', book: 'companion' },
      { kind: 'text', value: ' rare' },
    ]);
  });

  it('reconnaît le qualificatif « Bestiaire », insensible à la casse', () => {
    expect(splitPageRefs('(p. 12, bestiaire)')).toEqual([{ kind: 'page', page: '12', book: 'bestiaire' }]);
  });

  it('reste rétrocompatible sans qualificatif (pas de champ book)', () => {
    const [seg] = splitPageRefs('(p. 188)');
    expect(seg).toEqual({ kind: 'page', page: '188' });
    expect((seg as { book?: string }).book).toBeUndefined();
  });

  it('ignore sans crash un qualificatif de livre inconnu — retombe en texte littéral', () => {
    expect(splitPageRefs('(p. 10, Almanach)')).toEqual([{ kind: 'text', value: '(p. 10, Almanach)' }]);
  });
});
