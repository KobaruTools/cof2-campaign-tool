import { describe, expect, it } from 'vitest';
import type { Npc } from './types';
import { addNpc, removeNpc, sortNpcsByName } from './npc';

/** Fabrique un PNJ minimal (nom seul, PER-428). */
const npc = (id: string, name: string): Npc => ({
  id,
  campaignId: 'c1',
  name,
  createdAt: '2026-08-15T10:00:00Z',
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

describe('sortNpcsByName', () => {
  it('trie par nom sans muter l’entrée', () => {
    const npcs = [npc('n1', 'Zorg'), npc('n2', 'Anna'), npc('n3', 'Milo')];
    expect(sortNpcsByName(npcs).map((n) => n.name)).toEqual(['Anna', 'Milo', 'Zorg']);
    expect(npcs.map((n) => n.name)).toEqual(['Zorg', 'Anna', 'Milo']);
  });
});
