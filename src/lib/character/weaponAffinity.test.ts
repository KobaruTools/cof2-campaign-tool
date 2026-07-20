import { describe, expect, it } from 'vitest';
import { createBlankCharacter } from './factory';
import type { Character } from './types';
import { weaponAffinities } from './weaponAffinity';

function makeChar(over: Partial<Character>): Character {
  return {
    ...createBlankCharacter({ now: '2026-01-01T00:00:00.000Z' }),
    ancestryId: 'humain',
    ancestryPathId: 'humain',
    classId: 'pretre',
    ...over,
  };
}

describe('weaponAffinities (PER-218)', () => {
  it('prêtre spécialiste : l’arme sacrée porte une affinité « arme sacrée »', () => {
    const pretre = makeChar({ priestVocation: { mode: 'specialist', godId: 'axender' } });
    const aff = weaponAffinities(pretre, 'epee-longue');
    expect(aff).toHaveLength(1);
    expect(aff[0].kind).toBe('sacred-weapon');
    expect(aff[0].label).toContain('maîtrisée');
    expect(aff[0].tooltip).toContain('Axénder');
    expect(aff[0].tooltip).toContain('(p. 122)');
  });

  it('prêtre spécialiste : une arme NON sacrée n’a aucune affinité', () => {
    const pretre = makeChar({ priestVocation: { mode: 'specialist', godId: 'axender' } });
    expect(weaponAffinities(pretre, 'dague')).toHaveLength(0);
  });

  it('variantes « au choix » : chaque variante porte l’affinité (Arwendée arc long/court)', () => {
    const pretre = makeChar({ priestVocation: { mode: 'specialist', godId: 'arwendee' } });
    expect(weaponAffinities(pretre, 'arc-long')).toHaveLength(1);
    expect(weaponAffinities(pretre, 'arc-court')).toHaveLength(1);
  });

  it('généraliste : aucune affinité', () => {
    const pretre = makeChar({ priestVocation: { mode: 'generalist' } });
    expect(weaponAffinities(pretre, 'epee-longue')).toHaveLength(0);
  });

  it('personnage sans vocation de prêtre : aucune affinité', () => {
    const magicien = makeChar({ classId: 'magicien', priestVocation: undefined });
    expect(weaponAffinities(magicien, 'baton')).toHaveLength(0);
  });

  describe('arme de peuple du nain (PER-154)', () => {
    const nain = makeChar({
      classId: 'magicien',
      ancestryId: 'nain',
      ancestryPathId: 'nain',
      featureIds: ['nain-r2'],
      priestVocation: undefined,
    });

    it('hache : affinité « arme de peuple · maîtrisée » avec source p. 59', () => {
      const aff = weaponAffinities(nain, 'hache');
      expect(aff).toHaveLength(1);
      expect(aff[0].kind).toBe('ancestry-weapon');
      expect(aff[0].label).toContain('maîtrisée');
      expect(aff[0].tooltip).toContain('(p. 59)');
    });

    it('marteau de guerre : affinité présente', () => {
      expect(weaponAffinities(nain, 'marteau')).toHaveLength(1);
    });

    it('masse (contondante hors marteau) : aucune affinité', () => {
      expect(weaponAffinities(nain, 'masse')).toHaveLength(0);
    });

    it('nain sans nain-r2 : aucune affinité', () => {
      const nainR1 = makeChar({ ancestryId: 'nain', ancestryPathId: 'nain', featureIds: ['nain-r1'] });
      expect(weaponAffinities(nainR1, 'hache')).toHaveLength(0);
    });
  });
});
