import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrateCharacter } from '@/lib/engine/migrations';
import { deriveStats } from '@/lib/engine';
import { buildCharacterDerivedView } from '@/components/sheet/characterDerivedView';
import { ABILITY_IDS } from '@/data/schema';
import { buildCharacterPdfData } from './buildCharacterPdfData';

function loadFixture(name: string) {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples/characters', `${name}.json`), 'utf8'));
  return migrateCharacter(raw);
}

describe('buildCharacterPdfData', () => {
  it('reprend les stats dérivées du moteur telles quelles, sans les recalculer (perso simple niveau 2)', () => {
    const character = loadFixture('recette-per104-allie-guerrier');
    const data = buildCharacterPdfData(character);
    const derivedView = buildCharacterDerivedView(character);
    const expected = derivedView.derivedInput ? deriveStats(derivedView.derivedInput) : null;

    expect(data.identity.level).toBe(2);
    expect(data.abilities).toHaveLength(ABILITY_IDS.length);
    expect(data.derived.maxHp).toBe(expected?.maxHp);
    expect(data.derived.defense).toBe(expected?.defense);
    expect(data.derived.initiative).toBe(expected?.initiative);
    expect(data.attacks.melee.attack).toBe(expected?.meleeAttack);
    expect(data.attacks.ranged.attack).toBe(expected?.rangedAttack);
    expect(data.equipment).toEqual([]);
  });

  it('liste toutes les voies obtenues, ranks croissants, sur un personnage prestige de haut niveau', () => {
    const character = loadFixture('recette-per74-archimage');
    const data = buildCharacterPdfData(character);

    expect(data.identity.level).toBe(16);
    // Une entrée de rang par capacité acquise (pas de fusion/perte).
    const totalRanks = data.paths.reduce((sum, g) => sum + g.ranks.length, 0);
    expect(totalRanks).toBe(character.featureIds.length);
    // Chaque groupe est trié par rang croissant.
    for (const group of data.paths) {
      const ranks = group.ranks.map((r) => r.rank);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
    // Une voie de prestige (archimage) doit figurer parmi les groupes.
    expect(data.paths.some((g) => g.title.toLowerCase().includes('archimage'))).toBe(true);
    expect(data.equipment).toHaveLength(character.equipment.length);
  });

  it('numérote les rangs d’une voie de prestige 4-8 (PAS 1-5) — PER-202, la grille BBE doit refléter le catalogue', () => {
    const character = loadFixture('recette-per74-archimage');
    const data = buildCharacterPdfData(character);
    const archimage = data.paths.find((g) => g.slot === 'prestige');
    expect(archimage?.rankLabels).toEqual([4, 5, 6, 7, 8]);
  });

  it('nomme le fichier depuis le nom du personnage', () => {
    const character = loadFixture('recette-per104-allie-guerrier');
    const data = buildCharacterPdfData(character);
    expect(data.fileName.endsWith('.pdf')).toBe(true);
  });
});
