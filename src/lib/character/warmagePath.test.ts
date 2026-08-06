import { describe, expect, it } from 'vitest';
import { featureById } from '@/data';
import { createBlankCharacter } from './factory';
import type { Character } from './types';
import {
  combatRitualDiscount,
  warmageArmorWaiverThreshold,
  warmageHasDeflection,
  warmageMeleeAttackNotes,
  warmageRank,
} from './warmagePath';

const R4 = 'prestige-guerrier-mage-r4';
const R5 = 'prestige-guerrier-mage-r5';
const R6 = 'prestige-guerrier-mage-r6';
const R7 = 'prestige-guerrier-mage-r7';
const R8 = 'prestige-guerrier-mage-r8';

function makeChar(over: Partial<Character>): Character {
  return { ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }), ...over };
}

describe('warmageRank — rang le plus élevé atteint dans la voie du guerrier-mage', () => {
  it('voie absente → 0', () => {
    expect(warmageRank(makeChar({ featureIds: ['autre-chose'] }))).toBe(0);
  });

  it('R4 seul → 4', () => {
    expect(warmageRank(makeChar({ featureIds: [R4] }))).toBe(4);
  });

  it('R4-R7 acquis (pas R8) → 7 (le rang le plus élevé, pas le compte de rangs)', () => {
    expect(warmageRank(makeChar({ featureIds: [R4, R5, R6, R7] }))).toBe(7);
  });
});

describe('warmageArmorWaiverThreshold — seuil de dispense de surcoût (R4, p. 151)', () => {
  it('R4 non acquise → null', () => {
    expect(warmageArmorWaiverThreshold(makeChar({ featureIds: [] }))).toBeNull();
  });

  it('R4 seul (rang 4) → seuil 2 (cuir simple)', () => {
    expect(warmageArmorWaiverThreshold(makeChar({ featureIds: [R4] }))).toBe(2);
  });

  it('R4-R8 (rang 8) → seuil 6 (armure de plaques)', () => {
    expect(warmageArmorWaiverThreshold(makeChar({ featureIds: [R4, R5, R6, R7, R8] }))).toBe(6);
  });
});

describe('combatRitualDiscount — -1 PM sur le sort désigné (R5, p. 151)', () => {
  const spell = () => featureById.get('magie-des-arcanes-r1')!;
  const otherSpell = () => featureById.get('magie-des-arcanes-r2')!;

  it('R5 non acquise → 0, même avec un choix renseigné', () => {
    const char = makeChar({ featureIds: [], featureChoices: { [R5]: [spell().id] } });
    expect(combatRitualDiscount(char, spell())).toBe(0);
  });

  it('R5 acquise, sort désigné → 1', () => {
    const char = makeChar({ featureIds: [R5], featureChoices: { [R5]: [spell().id] } });
    expect(combatRitualDiscount(char, spell())).toBe(1);
  });

  it('R5 acquise, AUTRE sort (non désigné) → 0', () => {
    const char = makeChar({ featureIds: [R5], featureChoices: { [R5]: [spell().id] } });
    expect(combatRitualDiscount(char, otherSpell())).toBe(0);
  });

  it('R5 acquise mais aucun choix renseigné → 0', () => {
    const char = makeChar({ featureIds: [R5] });
    expect(combatRitualDiscount(char, spell())).toBe(0);
  });

  it('capacité NON-sort désignée par erreur → 0 (le sort ciblé doit être un sort)', () => {
    const nonSpell = featureById.get('combat-r1')!;
    const char = makeChar({ featureIds: [R5], featureChoices: { [R5]: [nonSpell.id] } });
    expect(combatRitualDiscount(char, nonSpell)).toBe(0);
  });
});

describe('warmageHasDeflection — Déflexion arcanique (R6)', () => {
  it('sans R6 → false', () => {
    expect(warmageHasDeflection([R4, R5, R7, R8])).toBe(false);
  });

  it('avec R6 → true', () => {
    expect(warmageHasDeflection([R6])).toBe(true);
  });
});

describe('warmageMeleeAttackNotes — Frappe des arcanes (R8)', () => {
  it('sans R8 → aucune note', () => {
    expect(warmageMeleeAttackNotes([R4, R5, R6, R7])).toEqual([]);
  });

  it('avec R8 → une note ambre (situationnel), dé balisé', () => {
    const notes = warmageMeleeAttackNotes([R8]);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ featureId: R8, icon: 'arcane-strike', color: 'warning' });
    expect(notes[0].reminder).toContain('{1d4°}');
  });
});
