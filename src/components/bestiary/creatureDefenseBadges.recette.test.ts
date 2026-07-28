/**
 * Recette de la passe défensive du bestiaire GRATUIT (PER-260) sur les VRAIES données :
 * chaque protection décrite par une capacité doit produire son badge, et la RD imprimée avec les
 * PV ne doit rester à côté des PV que si aucune capacité ne la détaille.
 */
import { describe, expect, it } from 'vitest';
import { creatureById } from '@/data/creatures';
import { creatureDefenseBadges, defenseCoversPrintedRd } from './creatureDefenseBadges';

/** Titres des badges du cadre Défense d'une créature du bestiaire. */
function titles(id: string): string[] {
  const c = creatureById.get(id);
  if (!c) throw new Error(`créature inconnue : ${id}`);
  return creatureDefenseBadges(c).map((b) => b.title);
}

describe('Bestiaire gratuit — badges du cadre Défense (PER-260)', () => {
  it('golem de chair : immunités poison/électricité + ÷2 élémentaire et contondant (p. 285)', () => {
    expect(titles('golem-de-chair')).toEqual([
      'Immunité au poison',
      "Immunité à l'électricité",
      'RD Feu, Froid, Acide, Contondants ÷2',
    ]);
  });

  it('dragon des forêts : immunités sommeil/paralysie + poison (p. 279)', () => {
    expect(titles('dragon-des-forets')).toEqual([
      'Immunité : Sommeil magique',
      'Immunité : Paralysé',
      'Immunité au poison',
    ]);
  });

  it('garde du corps : immunités d’état Surpris / Immobilisé / Renversé (p. 265)', () => {
    expect(titles('garde-du-corps')).toEqual([
      'Immunité : Surpris',
      'Immunité : Immobilisé',
      'Immunité : Renversé',
    ]);
  });

  it('squelette : ÷2 hors arme contondante + RD 5 froid + sans esprit (p. 297)', () => {
    expect(titles('squelette-de-base')).toEqual([
      'Immunité : Charme / possession',
      'RD Tranchants, Perforants ÷2',
      'RD Froid 5',
    ]);
  });

  it('licorne : RD 5 contre les armes hors fer froid, avec sa vulnérabilité en précision (p. 289)', () => {
    const badges = creatureDefenseBadges(creatureById.get('licorne')!);
    expect(badges.map((b) => b.title)).toEqual(['RD Armes hors fer froid 5']);
    expect(badges[0].sources.at(-1)?.name).toContain('DOUBLE');
  });

  it('vampire : RD 10 (Résistance impie) que rien ne signalait avant (p. 299)', () => {
    const badges = creatureDefenseBadges(creatureById.get('vampire')!);
    expect(badges.map((b) => b.title)).toEqual(['RD 10']);
    expect(badges[0].sources.at(-1)?.name).toContain('argent');
  });

  it('chef gnoll / chef orc : ÷2 conditionnel, condition rappelée en précision', () => {
    for (const id of ['chef-gnoll', 'chef-orc']) {
      const badges = creatureDefenseBadges(creatureById.get(id)!);
      expect(badges.map((b) => b.title)).toEqual(['RD ÷2']);
      expect(badges[0].sources.at(-1)?.name).toContain('4 créatures sous ses ordres');
    }
  });
});

describe('Bestiaire gratuit — héritage des traits défensifs par les variantes', () => {
  it('zombie humain et zombie choursette héritent des traits de la recette Zombie (p. 301)', () => {
    for (const id of ['zombie-humain', 'zombie-choursette'])
      expect(titles(id)).toEqual([
        'Immunité : Charme / possession',
        'RD Contondants, Perforants ÷2',
      ]);
  });

  it('momie auguste hérite de la RD 5 de la momie (p. 291)', () => {
    expect(titles('momie-auguste')).toEqual(['RD 5']);
  });

  it('vampire ancien hérite de la Résistance impie du vampire (p. 299)', () => {
    expect(titles('vampire-ancien')).toEqual(['RD 10']);
  });

  it('le vampirien garde SA propre RD 5 (il n’hérite pas du RD 10 du vampire)', () => {
    expect(titles('vampirien')).toEqual(['RD 5']);
  });
});

describe('Bestiaire gratuit — RD imprimée avec les PV', () => {
  it('éléphant et troll : leur RD 3 imprimée est un badge du cadre Défense, pas un badge de PV', () => {
    for (const id of ['elephant', 'troll']) {
      expect(titles(id)).toEqual(['RD 3']);
      expect(defenseCoversPrintedRd(creatureById.get(id)!, '3')).toBe(false);
    }
  });

  it('démonet : la RD 5 imprimée est remplacée par sa version précise (armes non magiques)', () => {
    const demonet = creatureById.get('demonet')!;
    expect(defenseCoversPrintedRd(demonet, '5')).toBe(true);
    expect(titles('demonet')).toEqual([
      'Immunité au poison',
      'Immunité à la maladie',
      'RD Non magiques 5',
    ]);
  });

  it("élémentaire d'eau : RD 3 imprimée (capacité « Grand ») ET ÷2 non magiques, deux protections", () => {
    expect(titles('elementaire-eau-grand')).toEqual([
      "Immunité à l'acide",
      'RD 3',
      'RD Non magiques ÷2',
    ]);
  });

  it('géant du feu : immunité au feu + RD 6 imprimée', () => {
    expect(titles('geant-du-feu')).toEqual(['Immunité au feu', 'RD 6']);
  });

  it('vampirien : la RD 5 imprimée est remplacée par sa version avec exception', () => {
    expect(defenseCoversPrintedRd(creatureById.get('vampirien')!, '5')).toBe(true);
    expect(titles('vampirien')).toEqual(['RD 5']);
  });

  it('nécrocrâne : une note de PV sans RD ne crée pas de badge (formes de PV verbatim)', () => {
    const necro = creatureById.get('necrocrane');
    if (necro) expect(defenseCoversPrintedRd(necro, 'x')).toBe(false);
  });
});
