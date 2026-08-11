import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import { createBlankCharacter } from './factory';
import type { Character } from './types';
import {
  archmageRank,
  archmageStaffActionTypesOverride,
  archmageStaffGrantedSpellIds,
  archmageStaffSpellGranted,
  archmageStaffSuppressedBonusMarker,
} from './archmagePath';

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

describe('archmageStaffActionTypesOverride — type d’action du sort lié au bâton (retour proprio 2026-08-10)', () => {
  const freeActionSpell = () => featureById.get('air-r1')!; // Murmures dans le vent, actionTypes: ['G']
  const rank1Spell = () => featureById.get('magie-des-arcanes-r1')!; // Projectile de mana, actionTypes: ['A']

  it("sort NON connu par ailleurs, même (G) → override (M) (c'est le gain net du bâton)", () => {
    const char = makeChar({ featureIds: [] });
    expect(archmageStaffActionTypesOverride(char, freeActionSpell())).toEqual(['M']);
  });

  it('sort connu nativement (autre voie) en (G) → PAS d’override, la carte garde son type natif', () => {
    const char = makeChar({ featureIds: [freeActionSpell().id] });
    expect(archmageStaffActionTypesOverride(char, freeActionSpell())).toBeUndefined();
  });

  it('sort connu nativement mais en (A) → override (M) quand même (gain, pas de nerf)', () => {
    const char = makeChar({ featureIds: [rank1Spell().id] });
    expect(archmageStaffActionTypesOverride(char, rank1Spell())).toEqual(['M']);
  });
});

describe('archmageStaffGrantedSpellIds — sorts liés au bâton dont le bonus permanent est supprimé', () => {
  const freeActionSpell = () => featureById.get('air-r1')!;
  const rank2Spell = () => featureById.get('magie-des-arcanes-r2')!;

  it('R5 non acquise → ensemble vide', () => {
    const char = makeChar({ featureIds: [], featureChoices: { [R5]: [freeActionSpell().id] } });
    expect(archmageStaffGrantedSpellIds(char)).toEqual(new Set());
  });

  it('1er choix (rang 1) désigné dès le rang 5 → dans l’ensemble', () => {
    const char = makeChar({ featureIds: [R5], featureChoices: { [R5]: [freeActionSpell().id] } });
    expect(archmageStaffGrantedSpellIds(char)).toEqual(new Set([freeActionSpell().id]));
  });

  it('2e choix (rang 2) désigné SANS le rang 7 → PAS encore dans l’ensemble (pas encore granté)', () => {
    const char = makeChar({
      featureIds: [R4, R5, R6],
      featureChoices: { [R5]: [freeActionSpell().id, rank2Spell().id] },
    });
    expect(archmageStaffGrantedSpellIds(char)).toEqual(new Set([freeActionSpell().id]));
  });

  it('2e choix (rang 2) désigné AVEC le rang 7 → les deux dans l’ensemble', () => {
    const char = makeChar({
      featureIds: [R4, R5, R6, R7],
      featureChoices: { [R5]: [freeActionSpell().id, rank2Spell().id] },
    });
    expect(archmageStaffGrantedSpellIds(char)).toEqual(new Set([freeActionSpell().id, rank2Spell().id]));
  });

  it('sort désigné mais DÉJÀ connu nativement (autre voie) → PAS dans l’ensemble (son bonus n’est pas retiré)', () => {
    const char = makeChar({
      featureIds: [R5, freeActionSpell().id],
      featureChoices: { [R5]: [freeActionSpell().id] },
    });
    expect(archmageStaffGrantedSpellIds(char)).toEqual(new Set());
  });
});

describe('archmageStaffSuppressedBonusMarker — sous-chaîne à barrer sur la carte d’emprunt', () => {
  const freeActionSpell = () => featureById.get('air-r1')!; // Murmures dans le vent, stat-bonus Init/DEF
  const testBonusSpell = () => featureById.get('sombre-magie-r1')!; // Ténèbres, test-bonus érudition occulte
  const rank2Spell = () => featureById.get('magie-des-arcanes-r2')!; // pas de clause « en plus de ce sort »

  it('sort granté par le bâton avec bonus stat-bonus + clause verbatim → renvoie la sous-chaîne', () => {
    const char = makeChar({ featureIds: [R5], featureChoices: { [R5]: [freeActionSpell().id] } });
    expect(archmageStaffSuppressedBonusMarker(char, freeActionSpell())).toBe('En plus de ce sort,');
  });

  it('sort granté par le bâton avec bonus test-bonus + clause verbatim → renvoie la sous-chaîne (audit 2026-08-11)', () => {
    const char = makeChar({ featureIds: [R5], featureChoices: { [R5]: [testBonusSpell().id] } });
    expect(archmageStaffSuppressedBonusMarker(char, testBonusSpell())).toBe('En plus de ce sort,');
  });

  it('sort à bonus test-bonus déjà connu nativement (bonus non supprimé côté moteur) → undefined', () => {
    const char = makeChar({
      featureIds: [R5, testBonusSpell().id],
      featureChoices: { [R5]: [testBonusSpell().id] },
    });
    expect(archmageStaffSuppressedBonusMarker(char, testBonusSpell())).toBeUndefined();
  });

  it('sort NON granté par le bâton (R5 absente) → undefined', () => {
    const char = makeChar({ featureIds: [], featureChoices: { [R5]: [freeActionSpell().id] } });
    expect(archmageStaffSuppressedBonusMarker(char, freeActionSpell())).toBeUndefined();
  });

  it('sort déjà connu nativement (bonus non supprimé côté moteur) → undefined', () => {
    const char = makeChar({
      featureIds: [R5, freeActionSpell().id],
      featureChoices: { [R5]: [freeActionSpell().id] },
    });
    expect(archmageStaffSuppressedBonusMarker(char, freeActionSpell())).toBeUndefined();
  });

  it('sort granté SANS effet stat-bonus/test-bonus (aucune clause annexe) → undefined, rien à barrer', () => {
    const char = makeChar({
      featureIds: [R4, R5, R6, R7],
      featureChoices: { [R5]: [freeActionSpell().id, rank2Spell().id] },
    });
    expect(archmageStaffSuppressedBonusMarker(char, rank2Spell())).toBeUndefined();
  });
});
