import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import { createBlankCharacter } from './factory';
import type { Character } from './types';
import { archmageRank, archmageStaffSpellGranted } from './archmagePath';

const R4 = 'prestige-archimage-r4';
const R5 = 'prestige-archimage-r5';
const R6 = 'prestige-archimage-r6';
const R7 = 'prestige-archimage-r7';

function makeChar(over: Partial<Character>): Character {
  return { ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }), ...over };
}

describe("archmageRank — rang le plus élevé atteint dans la voie de l'archimage", () => {
  it('voie absente → 0', () => {
    expect(archmageRank(makeChar({ featureIds: ['autre-chose'] }))).toBe(0);
  });

  it('R4 seul → 4', () => {
    expect(archmageRank(makeChar({ featureIds: [R4] }))).toBe(4);
  });

  it('R4-R7 acquis (pas R8) → 7 (le rang le plus élevé, pas le compte de rangs)', () => {
    expect(archmageRank(makeChar({ featureIds: [R4, R5, R6, R7] }))).toBe(7);
  });
});

describe('archmageStaffSpellGranted — sort du Bâton magique (R5, p. 154)', () => {
  const rank1Spell = () => featureById.get('magie-des-arcanes-r1')!;
  const rank2Spell = () => featureById.get('magie-des-arcanes-r2')!;

  it('R5 non acquise → false, même avec un choix renseigné', () => {
    const char = makeChar({ featureIds: [], featureChoices: { [R5]: [rank1Spell().id] } });
    expect(archmageStaffSpellGranted(char, rank1Spell())).toBe(false);
  });

  it('R5 acquise, sort de rang 1 (1er choix) désigné → true (dès le rang 5)', () => {
    const char = makeChar({ featureIds: [R5], featureChoices: { [R5]: [rank1Spell().id] } });
    expect(archmageStaffSpellGranted(char, rank1Spell())).toBe(true);
  });

  it('AUTRE sort (non désigné) → false', () => {
    const char = makeChar({ featureIds: [R5], featureChoices: { [R5]: [rank1Spell().id] } });
    expect(archmageStaffSpellGranted(char, rank2Spell())).toBe(false);
  });

  it('R5 acquise mais aucun choix renseigné → false', () => {
    const char = makeChar({ featureIds: [R5] });
    expect(archmageStaffSpellGranted(char, rank1Spell())).toBe(false);
  });

  it('capacité NON-sort désignée par erreur → false (le sort ciblé doit être un sort)', () => {
    const nonSpell = featureById.get('combat-r1')!;
    const char = makeChar({ featureIds: [R5], featureChoices: { [R5]: [nonSpell.id] } });
    expect(archmageStaffSpellGranted(char, nonSpell)).toBe(false);
  });

  it('sort de rang 2 (2e choix) désigné SANS le rang 7 → false (« à partir du rang 7 » pas encore atteint)', () => {
    const char = makeChar({
      featureIds: [R4, R5, R6],
      featureChoices: { [R5]: [rank1Spell().id, rank2Spell().id] },
    });
    expect(archmageStaffSpellGranted(char, rank2Spell())).toBe(false);
    // Le 1er sort, lui, reste actif indépendamment du 2e.
    expect(archmageStaffSpellGranted(char, rank1Spell())).toBe(true);
  });

  it('sort de rang 2 (2e choix) désigné AVEC le rang 7 atteint → true', () => {
    const char = makeChar({
      featureIds: [R4, R5, R6, R7],
      featureChoices: { [R5]: [rank1Spell().id, rank2Spell().id] },
    });
    expect(archmageStaffSpellGranted(char, rank2Spell())).toBe(true);
  });
});
