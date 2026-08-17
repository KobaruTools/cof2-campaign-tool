import { describe, expect, it } from 'vitest';
import type { Npc, NpcCategory } from './types';
import {
  addNpc,
  addNpcCategory,
  filterNpcsByQuery,
  reassignNpcsCategory,
  removeNpc,
  removeNpcCategory,
  renameNpcCategory,
  replaceNpc,
  sortNpcsByChallenge,
  sortNpcsByDisposition,
  sortNpcsByName,
  toggleNpcCategoryCollapsed,
} from './npc';

/** Fabrique un PNJ (fiche complète PER-429 + catégorie/NC PER-430), surchargeable par test. */
const npc = (id: string, name: string, over: Partial<Npc> = {}): Npc => ({
  id,
  campaignId: 'c1',
  name,
  role: null,
  ancestryId: null,
  sex: null,
  categoryId: null,
  challengeRating: null,
  location: null,
  disposition: 'neutral',
  status: 'not-encountered',
  description: null,
  descriptionVisibleToPlayers: false,
  gmNotes: null,
  linkedCharacterIds: [],
  createdAt: '2026-08-15T10:00:00Z',
  ...over,
});

/** Fabrique une catégorie de PNJ (PER-430), surchargeable par test. */
const category = (id: string, name: string, over: Partial<NpcCategory> = {}): NpcCategory => ({
  id,
  name,
  collapsed: false,
  ...over,
});

describe('addNpc', () => {
  it('ajoute un PNJ en fin de liste', () => {
    expect(addNpc([], npc('n1', 'Gorak'))).toEqual([npc('n1', 'Gorak')]);
  });

  it('ne mute pas la liste d’entrée', () => {
    const npcs: Npc[] = [];
    addNpc(npcs, npc('n1', 'Gorak'));
    expect(npcs).toEqual([]);
  });
});

describe('removeNpc', () => {
  it('retire le PNJ ciblé', () => {
    const npcs = [npc('n1', 'Gorak'), npc('n2', 'Yeva')];
    expect(removeNpc(npcs, 'n1')).toEqual([npc('n2', 'Yeva')]);
  });

  it('no-op si l’id est inconnu', () => {
    const npcs = [npc('n1', 'Gorak')];
    expect(removeNpc(npcs, 'inconnu')).toEqual(npcs);
  });

  it('ne mute pas la liste d’entrée', () => {
    const npcs = [npc('n1', 'Gorak')];
    removeNpc(npcs, 'n1');
    expect(npcs).toHaveLength(1);
  });
});

describe('replaceNpc', () => {
  it('remplace le PNJ ciblé par sa version à jour', () => {
    const npcs = [npc('n1', 'Gorak'), npc('n2', 'Yeva')];
    const updated = npc('n1', 'Gorak', { role: 'Aubergiste', disposition: 'ally' });
    expect(replaceNpc(npcs, updated)).toEqual([updated, npc('n2', 'Yeva')]);
  });

  it('no-op si l’id est inconnu', () => {
    const npcs = [npc('n1', 'Gorak')];
    expect(replaceNpc(npcs, npc('inconnu', 'X'))).toEqual(npcs);
  });

  it('ne mute pas la liste d’entrée', () => {
    const npcs = [npc('n1', 'Gorak')];
    replaceNpc(npcs, npc('n1', 'Gorak', { role: 'Forgeron' }));
    expect(npcs[0].role).toBeNull();
  });
});

describe('sortNpcsByName', () => {
  it('trie par nom sans muter l’entrée', () => {
    const npcs = [npc('n1', 'Zorg'), npc('n2', 'Anna'), npc('n3', 'Milo')];
    expect(sortNpcsByName(npcs).map((n) => n.name)).toEqual(['Anna', 'Milo', 'Zorg']);
    expect(npcs.map((n) => n.name)).toEqual(['Zorg', 'Anna', 'Milo']);
  });
});

describe('sortNpcsByDisposition', () => {
  it('groupe allié puis neutre puis ennemi, par nom au sein d’un groupe', () => {
    const npcs = [
      npc('n1', 'Zorg', { disposition: 'enemy' }),
      npc('n2', 'Anna', { disposition: 'ally' }),
      npc('n3', 'Milo', { disposition: 'neutral' }),
      npc('n4', 'Bea', { disposition: 'ally' }),
    ];
    expect(sortNpcsByDisposition(npcs).map((n) => n.name)).toEqual(['Anna', 'Bea', 'Milo', 'Zorg']);
  });
});

describe('sortNpcsByChallenge', () => {
  it('trie par NC croissant, sans valeur en fin de liste (par nom)', () => {
    const npcs = [
      npc('n1', 'Zorg', { challengeRating: 3 }),
      npc('n2', 'Anna', { challengeRating: null }),
      npc('n3', 'Milo', { challengeRating: 1 }),
      npc('n4', 'Bea', { challengeRating: null }),
    ];
    expect(sortNpcsByChallenge(npcs).map((n) => n.name)).toEqual(['Milo', 'Zorg', 'Anna', 'Bea']);
  });
});

describe('filterNpcsByQuery', () => {
  const npcs = [
    npc('n1', 'Gorak', { description: 'Aubergiste jovial' }),
    npc('n2', 'Yeva', { description: 'Espionne du roi' }),
  ];

  it('matche sur le nom OU la description, insensible à la casse/accents', () => {
    expect(filterNpcsByQuery(npcs, 'gorak').map((n) => n.id)).toEqual(['n1']);
    expect(filterNpcsByQuery(npcs, 'ESPIONNE').map((n) => n.id)).toEqual(['n2']);
  });

  it('requête vide (ou blanche) renvoie la liste inchangée', () => {
    expect(filterNpcsByQuery(npcs, '')).toEqual(npcs);
    expect(filterNpcsByQuery(npcs, '   ')).toEqual(npcs);
  });

  it('aucun match → liste vide', () => {
    expect(filterNpcsByQuery(npcs, 'introuvable')).toEqual([]);
  });
});

describe('addNpcCategory', () => {
  it('ajoute une catégorie dépliée en fin de liste', () => {
    const result = addNpcCategory([category('c1', 'Alliés')], 'Ennemis');
    expect(result).toHaveLength(2);
    expect(result[1]).toMatchObject({ name: 'Ennemis', collapsed: false });
  });
});

describe('renameNpcCategory', () => {
  it('renomme la catégorie ciblée', () => {
    const categories = [category('c1', 'Alliés')];
    expect(renameNpcCategory(categories, 'c1', 'Amis')).toEqual([category('c1', 'Amis')]);
  });

  it('no-op si l’id est inconnu', () => {
    const categories = [category('c1', 'Alliés')];
    expect(renameNpcCategory(categories, 'inconnu', 'X')).toEqual(categories);
  });
});

describe('toggleNpcCategoryCollapsed', () => {
  it('inverse le repli de la catégorie ciblée', () => {
    const categories = [category('c1', 'Alliés', { collapsed: false })];
    expect(toggleNpcCategoryCollapsed(categories, 'c1')).toEqual([
      category('c1', 'Alliés', { collapsed: true }),
    ]);
  });
});

describe('removeNpcCategory', () => {
  it('retire la catégorie et liste les PNJ à recatégoriser, sans les supprimer', () => {
    const categories = [category('c1', 'Alliés'), category('c2', 'Ennemis')];
    const npcs = [npc('n1', 'Gorak', { categoryId: 'c1' }), npc('n2', 'Yeva', { categoryId: 'c2' })];
    const result = removeNpcCategory(categories, npcs, 'c1');
    expect(result.categories).toEqual([category('c2', 'Ennemis')]);
    expect(result.reassignedNpcIds).toEqual(['n1']);
  });
});

describe('reassignNpcsCategory', () => {
  it('met à jour la categoryId des PNJ listés uniquement', () => {
    const npcs = [npc('n1', 'Gorak', { categoryId: 'c1' }), npc('n2', 'Yeva', { categoryId: 'c1' })];
    const result = reassignNpcsCategory(npcs, ['n1'], null);
    expect(result[0].categoryId).toBeNull();
    expect(result[1].categoryId).toBe('c1');
  });
});
