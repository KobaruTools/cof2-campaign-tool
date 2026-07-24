/**
 * Tests des fonctions PURES du cache du bestiaire (PER-244) : diff manifeste↔cache
 * (quelles sources recharger / purger), invalidation fine des blobs et aplatissement
 * de la liste. L'IO IndexedDB/réseau (indisponible en environnement node) n'est pas
 * couverte ici — seule la logique de décision l'est.
 */
import { describe, expect, it } from 'vitest';
import {
  flattenSources,
  planBlobInvalidation,
  planSourceReconciliation,
  type CachedSource,
} from './cache';
import type { CreatureListItem, SourceManifestEntry } from './types';

/** Fabrique un item de liste minimal (les champs non testés prennent des valeurs neutres). */
function item(
  id: string,
  sourceId: string,
  updatedAt: string,
  sortOrder = 0,
): CreatureListItem {
  return {
    id,
    name: id,
    category: 'animaux',
    nature: [],
    sortOrder,
    sourceId,
    updatedAt,
  };
}

function source(id: string, contentVersion: number): SourceManifestEntry {
  return { id, slug: id, contentVersion };
}

describe('planSourceReconciliation', () => {
  it('recharge une source absente du cache', () => {
    const plan = planSourceReconciliation([source('drs', 1)], []);
    expect(plan.toFetch).toEqual(['drs']);
    expect(plan.toPurge).toEqual([]);
  });

  it('recharge une source dont la version a changé, pas les autres', () => {
    const cached: Pick<CachedSource, 'id' | 'contentVersion'>[] = [
      { id: 'drs', contentVersion: 2 },
      { id: 'bestiaire', contentVersion: 5 },
    ];
    const plan = planSourceReconciliation(
      [source('drs', 3), source('bestiaire', 5)],
      cached,
    );
    expect(plan.toFetch).toEqual(['drs']); // bestiaire inchangé → pas rechargé
    expect(plan.toPurge).toEqual([]);
  });

  it('ne recharge rien quand tout est à jour', () => {
    const cached = [{ id: 'drs', contentVersion: 2 }];
    const plan = planSourceReconciliation([source('drs', 2)], cached);
    expect(plan.toFetch).toEqual([]);
    expect(plan.toPurge).toEqual([]);
  });

  it('purge une source disparue du manifeste (retrait / entitlement perdu)', () => {
    const cached = [
      { id: 'drs', contentVersion: 2 },
      { id: 'bestiaire', contentVersion: 1 },
    ];
    const plan = planSourceReconciliation([source('drs', 2)], cached);
    expect(plan.toFetch).toEqual([]);
    expect(plan.toPurge).toEqual(['bestiaire']);
  });
});

describe('planBlobInvalidation', () => {
  it('conserve les blobs des sources non rechargées', () => {
    const cachedBlobs = [{ slug: 'loup', sourceId: 'drs', updatedAt: 't1' }];
    // Aucune source rechargée → aucun blob jeté.
    expect(planBlobInvalidation([], [], cachedBlobs)).toEqual([]);
  });

  it('jette un blob dont updatedAt a avancé sur une source rechargée', () => {
    const fresh = [item('loup', 'drs', 't2'), item('ours', 'drs', 't1')];
    const cachedBlobs = [
      { slug: 'loup', sourceId: 'drs', updatedAt: 't1' }, // avancé → jeté
      { slug: 'ours', sourceId: 'drs', updatedAt: 't1' }, // inchangé → gardé
    ];
    expect(planBlobInvalidation(fresh, ['drs'], cachedBlobs)).toEqual(['loup']);
  });

  it('jette un blob dont la créature a disparu de la source rechargée', () => {
    const fresh = [item('loup', 'drs', 't1')];
    const cachedBlobs = [{ slug: 'ancien', sourceId: 'drs', updatedAt: 't1' }];
    expect(planBlobInvalidation(fresh, ['drs'], cachedBlobs)).toEqual(['ancien']);
  });

  it('ne touche pas un blob d\'une autre source même si sa source à lui est rechargée', () => {
    const fresh = [item('loup', 'drs', 't2')];
    const cachedBlobs = [
      { slug: 'demon', sourceId: 'bestiaire', updatedAt: 't1' }, // autre source → gardé
    ];
    expect(planBlobInvalidation(fresh, ['drs'], cachedBlobs)).toEqual([]);
  });
});

describe('flattenSources', () => {
  it('aplatit et trie par ordre du livre à travers les sources', () => {
    const sources: CachedSource[] = [
      {
        id: 'bestiaire',
        slug: 'bestiaire',
        contentVersion: 1,
        items: [item('demon', 'bestiaire', 't1', 3)],
      },
      {
        id: 'drs',
        slug: 'drs',
        contentVersion: 1,
        items: [item('loup', 'drs', 't1', 1), item('ours', 'drs', 't1', 2)],
      },
    ];
    expect(flattenSources(sources).map((c) => c.id)).toEqual([
      'loup',
      'ours',
      'demon',
    ]);
  });
});
