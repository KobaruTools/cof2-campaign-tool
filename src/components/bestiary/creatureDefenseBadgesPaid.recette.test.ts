/**
 * Recette de la passe défensive du bestiaire PAYANT (PER-261) sur les VRAIES données du
 * supplément « Le Bestiaire » : mêmes règles que la passe gratuite (PER-260), déroulées sur les
 * créatures emblématiques (démons, dragons, golems, morts-vivants, élémentaires, lycanthropes).
 *
 * `private/bestiary-paid.ts` est GITIGNORÉ (copyright BBE) : absent en CI et sur toute autre
 * machine → la suite s'ANNULE d'elle-même (`describe.skip`) au lieu d'échouer. Le chargement passe
 * par un spécificateur non littéral pour que TypeScript ne tente pas de le résoudre statiquement.
 */
import { describe, expect, it } from 'vitest';
import type { Creature } from '@/data/schema';
import { withInheritedDefense } from '@/lib/bestiary/creatureDefense';
import { creatureDefenseBadges } from './creatureDefenseBadges';

const PAID_MODULE = '../../../private/bestiary-paid';

/** Charge le supplément payant, ou `null` s'il est absent (CI, autre machine). */
async function loadPaid(): Promise<Creature[] | null> {
  try {
    const mod = (await import(/* @vite-ignore */ PAID_MODULE)) as { paidBestiary?: Creature[] };
    return mod.paidBestiary ?? null;
  } catch {
    return null;
  }
}

const paid = await loadPaid();
// L'ingestion applique `withInheritedDefense` avant d'écrire les blobs : on recette la MÊME liste.
const byId = new Map((paid ? withInheritedDefense(paid) : []).map((c) => [c.id, c]));
const describePaid = paid ? describe : describe.skip;

/** Titres des badges du cadre Défense d'une créature du supplément. */
function titles(id: string): string[] {
  const c = byId.get(id);
  if (!c) throw new Error(`créature inconnue : ${id}`);
  return creatureDefenseBadges(c).map((b) => b.title);
}

/** Précisions (2e ligne d'info-bulle) portées par les badges d'une créature. */
function notes(id: string): string[] {
  const c = byId.get(id);
  if (!c) throw new Error(`créature inconnue : ${id}`);
  return creatureDefenseBadges(c).flatMap((b) => b.sources.slice(1).map((s) => s.name));
}

describePaid('Bestiaire payant — badges du cadre Défense (PER-261)', () => {
  it('démon crocodile : RD 10 feu/acide + RD 5 des armes non magiques (p. 66)', () => {
    // Les deux capacités communes des démons ; la RD 5 imprimée avec les PV est la version
    // IMPRÉCISE de la seconde → elle ne doit PAS apparaître en plus.
    expect(titles('demon-crocodile')).toEqual(['RD Feu, Acide 10', 'RD Non magiques 5']);
  });

  it('seigneur démon : la RD des armes passe à 10 au-delà du NC 10 (p. 66)', () => {
    expect(titles('seigneur-demon')).toEqual(['RD Feu, Acide 10', 'RD Non magiques 10']);
  });

  it('âme damnée : démon « minable » — garde feu/acide, RD 5 immatérielle (p. 67)', () => {
    expect(titles('ame-damnee')).toEqual(['RD Feu, Acide 10', 'RD Non magiques 5']);
  });

  it('ange : le livre se contredit (RD 11 imprimée / RD 10 en capacité) → un seul badge, RD 10', () => {
    // Décision du propriétaire (2026-07-28) : c'est la valeur de la CAPACITÉ qui compte, et elle
    // remplace la RD imprimée avec les PV malgré la différence de valeur (`replacesPrintedRd`).
    expect(byId.get('ange')?.hitPointsNote).toBe('RD 11');
    expect(titles('ange')).toEqual(['RD 10']);
    expect(notes('ange')).toEqual([
      'Magie incluse, sauf les armes maléfiques et la magie des sorciers. La ligne de stats du livre imprime « RD 11 ».',
    ]);
  });

  it('archange : RD 15, cohérente entre la ligne de stats et la capacité (p. 14)', () => {
    expect(titles('archange')).toEqual(['RD 15']);
  });

  it('dragon ancien : sommeil + paralysie, et la RD 6 de taille reste imprimée (p. 84)', () => {
    // L'immunité au type de son SOUFFLE dépend de l'espèce choisie → volontairement pas de badge.
    expect(titles('dragon-ancien')).toEqual([
      'Immunité : Sommeil magique',
      'Immunité : Paralysé',
      'RD 6',
    ]);
  });

  it('dragon mort-vivant : ÷2 perforant/tranchant et froid (p. 85)', () => {
    expect(titles('dragon-mort-vivant')).toEqual(['RD Perforants, Tranchants, Froid ÷2']);
  });

  it('golem de métal : esprit + ÷2 élémentaire + RD 6 contre les armes (p. 114)', () => {
    expect(titles('golem-de-metal')).toEqual([
      'Immunité : Charme / possession',
      'RD Feu, Froid, Foudre, Acide ÷2',
      'RD Armes 6',
    ]);
  });

  it('golem de glace : immunité à la magie, sauf les sorts de feu (p. 112)', () => {
    expect(titles('golem-de-glace')).toEqual(['Immunité : Charme / possession', 'Immunité à la magie']);
    expect(notes('golem-de-glace')).toContain('Sauf les sorts de FEU, qui lui infligent le DOUBLE des DM.');
  });

  it('guerrier maudit : ÷2 des armes sauf contondantes + sans esprit (p. 116)', () => {
    expect(titles('guerrier-maudit')).toEqual([
      'Immunité : Charme / possession',
      'RD Tranchants, Perforants ÷2',
    ]);
    expect(notes('guerrier-maudit')).toContain('Les armes CONTONDANTES infligent des DM pleins.');
  });

  it('fantôme majeur : la RD contre les armes ordinaires passe à 10 (p. 100)', () => {
    // La variante déclare ses propres traits : elle NE doit PAS hériter de la RD 5 du fantôme mineur.
    expect(titles('fantome-mineur')).toEqual(['RD Non magiques 5', 'RD Froid 5']);
    expect(titles('fantome-majeur')).toEqual(['RD Non magiques 10', 'RD Froid 5']);
  });

  it('loup barghest : hérite des traits du chien barghest (p. 45)', () => {
    expect(titles('loup-barghest')).toEqual(['RD 5']);
    expect(notes('loup-barghest')).toEqual(['Sauf le feu et les armes bénies ou sacrées.']);
  });

  it('cerbère des enfers : hérite des immunités d’état du cerbère (p. 51)', () => {
    expect(titles('cerbere-des-enfers')).toEqual([
      'Immunité : Surpris',
      'Immunité : Immobilisé',
      'Immunité : Renversé',
    ]);
  });

  it('spore zombie : traits de la recette du Zombie, recopiés (héritage cross-source impossible)', () => {
    expect(titles('spore-zombie')).toEqual([
      'Immunité : Charme / possession',
      'RD Contondants, Perforants ÷2',
    ]);
  });

  it('lycanthropes : RD 5 sauf argent, sous forme animale ou hybride (p. 128)', () => {
    for (const id of ['loup-garou-infecte', 'loup-garou-naturel', 'rat-garou']) {
      expect(titles(id)).toEqual(['RD Armes non argentées 5']);
      expect(notes(id)).toEqual(['Sous forme animale ou hybride seulement.']);
    }
  });

  it('élémentaire de feu (grand) : immunité au feu, RD 3 de taille, ÷2 armes non magiques (p. 92)', () => {
    expect(titles('elementaire-feu-grand')).toEqual([
      'Immunité au feu',
      'RD 3',
      'RD Non magiques ÷2',
    ]);
  });

  it('limace électrique : un seul badge, ÷2 contondants (p. 15)', () => {
    // PAS d'immunité à l'électricité — le critère d'acceptation de PER-260 se trompait.
    expect(titles('limace-electrique')).toEqual(['RD Contondants ÷2']);
  });

  it('morlock : la RD 3 imprimée est conditionnelle (Le goût du sang, p. 137)', () => {
    expect(titles('morlock')).toEqual(['RD 3']);
    expect(notes('morlock')).toEqual(['Seulement après avoir réussi une attaque (Le goût du sang).']);
  });

  it('tardigrade : immunité aux quatre éléments, mais pas au poison (p. 170)', () => {
    expect(titles('tardigrade')).toEqual([
      'Immunité au feu',
      'Immunité au froid',
      "Immunité à l'acide",
      "Immunité à l'électricité",
    ]);
  });

  it('trémor : immunité au froid, ÷2 au feu (p. 177)', () => {
    expect(titles('tremor')).toEqual(['Immunité au froid', 'RD Feu ÷2']);
  });

  it('sylvanien : ÷2 sur tous les DM, sauf feu et haches (p. 169)', () => {
    expect(titles('sylvanien')).toEqual(['RD ÷2']);
    expect(notes('sylvanien')).toEqual(['Sauf le feu et les haches.']);
  });

  it('génie mineur : ÷2 garanti sur les quatre éléments, immunité au sien en précision (p. 110)', () => {
    expect(titles('genie-mineur')).toEqual(['RD Feu, Froid, Foudre, Acide ÷2']);
    expect(notes('genie-mineur')).toEqual([
      'Immunité TOTALE à son propre élément (feu, eau, air ou terre), au choix du MJ.',
    ]);
  });

  it('immunité VARIABLE selon l’individu : aucun badge inventé (linnorm, pestif, destrier)', () => {
    for (const id of ['linnorm', 'pestif', 'destrier-des-tenebres']) {
      const c = byId.get(id);
      expect(c?.damageReduction, id).toBeUndefined();
    }
    // Le linnorm garde tout de même la RD 6 imprimée avec ses PV.
    expect(titles('linnorm')).toEqual(['RD 6']);
    expect(titles('pestif')).toEqual([]);
  });

  it('les RD de TAILLE restent la valeur imprimée avec les PV (aucun doublon)', () => {
    for (const id of ['troll-des-profondeurs', 'geant-des-montagnes', 'titan', 'cyclope']) {
      expect(titles(id).filter((t) => t.startsWith('RD ')), id).toHaveLength(1);
    }
  });

  it('aucun badge ne porte une portée de dégât inconnue', () => {
    for (const c of byId.values())
      for (const b of creatureDefenseBadges(c)) expect(b.title, `${c.id} / ${b.key}`).not.toContain('(');
  });
});
