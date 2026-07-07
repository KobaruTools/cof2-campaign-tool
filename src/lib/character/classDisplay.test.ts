import { describe, expect, it } from 'vitest';
import { classById } from '@/data';
import type { CharacterClass } from '@/data/schema';
import { reskinnedItemName } from './classDisplay';

const druid = classById.get('druide') as CharacterClass;
const fighter = classById.get('guerrier') as CharacterClass;

describe('reskinnedItemName (reskin d’objet par profil, PER-181)', () => {
  it('druide : le bâton ferré s’affiche « Bâton noueux »', () => {
    expect(reskinnedItemName(druid, 'baton-ferre', 'Bâton ferré')).toBe('Bâton noueux');
  });

  it('druide : un objet non reskiné garde son nom de catalogue', () => {
    expect(reskinnedItemName(druid, 'dague', 'Dague')).toBe('Dague');
  });

  it('profil sans reskin déclaré : renvoie le nom de catalogue', () => {
    expect(reskinnedItemName(fighter, 'baton-ferre', 'Bâton ferré')).toBe('Bâton ferré');
  });

  it('classe absente (null / undefined) : renvoie le fallback', () => {
    expect(reskinnedItemName(null, 'baton-ferre', 'Bâton ferré')).toBe('Bâton ferré');
    expect(reskinnedItemName(undefined, 'baton-ferre', 'Bâton ferré')).toBe('Bâton ferré');
  });
});
