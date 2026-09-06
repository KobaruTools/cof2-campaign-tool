import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrateCharacter } from '@/lib/engine/migrations';
import { buildCharacterPdfData, type PdfPathGroup } from './buildCharacterPdfData';
import { mapPathsToBbeSlots } from './mapPathsToBbeSlots';

function loadFixture(name: string) {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe('mapPathsToBbeSlots', () => {
  it('route la voie du peuple et une voie de profil vers leurs cases respectives (perso nain de bout en bout)', () => {
    const character = loadFixture('demo-forgesort-mana');
    const { paths } = buildCharacterPdfData(character);
    const slots = mapPathsToBbeSlots(paths);

    expect(slots.peoplePath?.title).toBe('Voie du nain');
    expect(slots.classPaths).toHaveLength(1);
    expect(slots.classPaths[0].title).toBe('Voie des runes');
    expect(slots.prestigePath).toBeNull();
  });

  it('route la voie de prestige indépendamment des voies de profil', () => {
    const paths: PdfPathGroup[] = [
      { title: 'Voie du profil', slot: 'class', ranks: [], rankLabels: [1, 2, 3, 4, 5] },
      { title: 'Voie de prestige', slot: 'prestige', ranks: [], rankLabels: [4, 5, 6, 7, 8] },
      { title: 'Voie du peuple', slot: 'people', ranks: [], rankLabels: [1, 2, 3, 4, 5] },
    ];
    const slots = mapPathsToBbeSlots(paths);

    expect(slots.peoplePath?.title).toBe('Voie du peuple');
    expect(slots.classPaths.map((p) => p.title)).toEqual(['Voie du profil']);
    expect(slots.prestigePath?.title).toBe('Voie de prestige');
  });

  it('tronque silencieusement au-delà de 5 voies de profil', () => {
    const paths: PdfPathGroup[] = Array.from({ length: 7 }, (_, i) => ({
      title: `Voie ${i}`,
      slot: 'class',
      ranks: [],
      rankLabels: [1, 2, 3, 4, 5],
    }));
    const slots = mapPathsToBbeSlots(paths);
    expect(slots.classPaths).toHaveLength(5);
    expect(slots.classPaths.map((p) => p.title)).toEqual(['Voie 0', 'Voie 1', 'Voie 2', 'Voie 3', 'Voie 4']);
  });
});
