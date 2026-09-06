import { describe, expect, it } from 'vitest';
import type { CreatureListItem } from '@/lib/bestiary/types';
import { CUSTOM_CREATURE_SLUG } from './customCreature';
import { buildCreatureExportFile, isBestiaryCreaturePaid, isCreatureExportable } from './creatureTransfer';

function listItem(id: string, sourceId: string): CreatureListItem {
  return { id, name: id, category: 'humanoides', nature: [], sortOrder: 0, sourceId, updatedAt: '2026-01-01' };
}

describe('buildCreatureExportFile', () => {
  it('enveloppe la créature avec kind/version', () => {
    const creature = { id: 'loup', name: 'Loup', category: 'animaux' as const, sourcePage: 1 };
    expect(buildCreatureExportFile(creature)).toEqual({
      kind: 'cof2-creature-export',
      version: 1,
      creature,
    });
  });
});

describe('isBestiaryCreaturePaid', () => {
  it('renvoie faux pour une créature dont la source n’est pas payante', () => {
    const list = [listItem('loup', 'src-book')];
    expect(isBestiaryCreaturePaid('loup', list, new Set())).toBe(false);
  });

  it('renvoie vrai pour une créature dont la source est payante', () => {
    const list = [listItem('cambion', 'src-compagnon')];
    expect(isBestiaryCreaturePaid('cambion', list, new Set(['src-compagnon']))).toBe(true);
  });

  it('refuse prudemment (vrai) si la liste n’est pas encore chargée', () => {
    expect(isBestiaryCreaturePaid('loup', null, new Set())).toBe(true);
  });

  it('refuse prudemment (vrai) si le slug est absent de la liste', () => {
    const list = [listItem('loup', 'src-book')];
    expect(isBestiaryCreaturePaid('inconnu', list, new Set())).toBe(true);
  });
});

describe('isCreatureExportable', () => {
  it('autorise toujours une créature manuelle, quelle que soit la liste', () => {
    expect(isCreatureExportable(CUSTOM_CREATURE_SLUG, null, new Set())).toBe(true);
  });

  it('autorise une créature du bestiaire gratuite', () => {
    const list = [listItem('loup', 'src-book')];
    expect(isCreatureExportable('loup', list, new Set())).toBe(true);
  });

  it('refuse une créature du bestiaire payante', () => {
    const list = [listItem('cambion', 'src-compagnon')];
    expect(isCreatureExportable('cambion', list, new Set(['src-compagnon']))).toBe(false);
  });
});
