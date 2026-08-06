import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import { createBlankCharacter } from './factory';
import type { Character } from './types';
import { archmageFreeSpellDiscount } from './archmagePath';

const R5 = 'prestige-archimage-r5';
const R7 = 'prestige-archimage-r7';

function makeChar(over: Partial<Character>): Character {
  return { ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }), ...over };
}

describe('archmageFreeSpellDiscount — sort du Bâton magique sans dépense de mana (R5/R7, p. 154)', () => {
  const rank1Spell = () => featureById.get('magie-des-arcanes-r1')!;
  const rank2Spell = () => featureById.get('magie-des-arcanes-r2')!;

  it('R5 non acquise → 0, même avec un choix renseigné', () => {
    const char = makeChar({ featureIds: [], featureChoices: { [R5]: [rank1Spell().id] } });
    expect(archmageFreeSpellDiscount(char, rank1Spell())).toBe(0);
  });

  it('R5 acquise, sort de rang 1 désigné → coût de base entier (1 PM)', () => {
    const char = makeChar({ featureIds: [R5], featureChoices: { [R5]: [rank1Spell().id] } });
    expect(archmageFreeSpellDiscount(char, rank1Spell())).toBe(1);
  });

  it('R5 acquise, AUTRE sort (non désigné) → 0', () => {
    const char = makeChar({ featureIds: [R5], featureChoices: { [R5]: [rank1Spell().id] } });
    expect(archmageFreeSpellDiscount(char, rank2Spell())).toBe(0);
  });

  it('R5 acquise mais aucun choix renseigné → 0', () => {
    const char = makeChar({ featureIds: [R5] });
    expect(archmageFreeSpellDiscount(char, rank1Spell())).toBe(0);
  });

  it('capacité NON-sort désignée par erreur → 0 (le sort ciblé doit être un sort)', () => {
    const nonSpell = featureById.get('combat-r1')!;
    const char = makeChar({ featureIds: [R5], featureChoices: { [R5]: [nonSpell.id] } });
    expect(archmageFreeSpellDiscount(char, nonSpell)).toBe(0);
  });

  it('R7 acquise, sort de rang 2 désigné sur R7 → coût de base entier (2 PM)', () => {
    const char = makeChar({ featureIds: [R5, R7], featureChoices: { [R7]: [rank2Spell().id] } });
    expect(archmageFreeSpellDiscount(char, rank2Spell())).toBe(2);
  });

  it('R7 NON acquise → le choix R7 (théorique) ne compte pas, même renseigné', () => {
    const char = makeChar({ featureIds: [R5], featureChoices: { [R7]: [rank2Spell().id] } });
    expect(archmageFreeSpellDiscount(char, rank2Spell())).toBe(0);
  });

  it('R5 (rang 1) ET R7 (rang 2) désignent chacun leur sort → les deux sont gratuits indépendamment', () => {
    const char = makeChar({
      featureIds: [R5, R7],
      featureChoices: { [R5]: [rank1Spell().id], [R7]: [rank2Spell().id] },
    });
    expect(archmageFreeSpellDiscount(char, rank1Spell())).toBe(1);
    expect(archmageFreeSpellDiscount(char, rank2Spell())).toBe(2);
  });
});
