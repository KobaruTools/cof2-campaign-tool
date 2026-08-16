import { describe, expect, it } from 'vitest';
import type { Npc } from './types';
import { addNpc, removeNpc, replaceNpc, sortNpcsByName } from './npc';

/** Fabrique un PNJ (fiche complète PER-429), surchargeable par test. */
const npc = (id: string, name: string, over: Partial<Npc> = {}): Npc => ({
  id,
  campaignId: 'c1',
  name,
  role: null,
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
