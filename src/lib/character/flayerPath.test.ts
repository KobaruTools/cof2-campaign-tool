import { describe, expect, it } from 'vitest';
import { flayerMeleeAttackNotes, flayerRetaliationBadge } from './flayerPath';

const R4 = 'prestige-ecorcheur-r4';
const R5 = 'prestige-ecorcheur-r5';
const R6 = 'prestige-ecorcheur-r6';
const R7 = 'prestige-ecorcheur-r7';
const R8 = 'prestige-ecorcheur-r8';

describe('flayerMeleeAttackNotes', () => {
  it('aucune capacité de la voie → aucune note', () => {
    expect(flayerMeleeAttackNotes(['autre-chose'])).toEqual([]);
  });

  it('R4 seul → une note weaponOnly', () => {
    const notes = flayerMeleeAttackNotes([R4]);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ featureId: R4, icon: 'bleeding', weaponOnly: true });
  });

  it('R6 seul → une note SANS weaponOnly (les deux modes)', () => {
    const notes = flayerMeleeAttackNotes([R6]);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ featureId: R6, icon: 'grievous-wounds' });
    expect(notes[0].weaponOnly).toBeUndefined();
  });

  it('R8 seul → une note SANS weaponOnly, verbatim balisé (dé évolutif)', () => {
    const notes = flayerMeleeAttackNotes([R8]);
    expect(notes).toHaveLength(1);
    expect(notes[0]).toMatchObject({ featureId: R8, icon: 'merciless' });
    expect(notes[0].weaponOnly).toBeUndefined();
    expect(notes[0].reminder).toContain('{1d4°}');
  });

  it('R5 ne produit AUCUNE note (verbatim seul, DM sur la Défense pas sur l’attaque)', () => {
    expect(flayerMeleeAttackNotes([R5])).toEqual([]);
  });

  it('toute la voie acquise (R4-R8) → 3 notes, ordre R4/R6/R8', () => {
    const notes = flayerMeleeAttackNotes([R4, R5, R6, R7, R8]);
    expect(notes.map((n) => n.featureId)).toEqual([R4, R6, R8]);
  });
});

describe('flayerRetaliationBadge', () => {
  it('sans R5 → null', () => {
    expect(flayerRetaliationBadge([R4, R6, R7, R8])).toBeNull();
  });

  it('R5 sans R7 → dé fixe 1d4', () => {
    expect(flayerRetaliationBadge([R5])).toEqual({ die: '1d4' });
  });

  it('R5 avec R7 (rang 7 de la voie atteint) → dé évolutif 1d4°', () => {
    expect(flayerRetaliationBadge([R5, R6, R7])).toEqual({ die: '1d4°' });
  });
});
