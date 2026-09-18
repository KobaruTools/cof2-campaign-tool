import { describe, expect, it } from 'vitest';
import { classById } from '@/data';
import type { CharacterClass } from '@/data/schema';
import { classDisplayName, reskinnedItemName } from './classDisplay';

const druid = classById.get('druide') as CharacterClass;
const fighter = classById.get('guerrier') as CharacterClass;
const arquebusier = classById.get('arquebusier') as CharacterClass;
const forgesort = classById.get('forgesort') as CharacterClass;

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

describe('classDisplayName (féminisation du profil, PER-518)', () => {
  it('sex absent ou "male" : nom masculin', () => {
    expect(classDisplayName(fighter, true)).toBe('Guerrier');
    expect(classDisplayName(fighter, true, 'male')).toBe('Guerrier');
  });

  it('sex "female" : nom féminin quand le profil en déclare un', () => {
    expect(classDisplayName(fighter, true, 'female')).toBe('Guerrière');
    expect(classDisplayName(druid, true, 'female')).toBe('Druidesse');
  });

  it('sex "female" sans nameFeminine déclaré (profil épicène ou sans forme, ex. Forgesort) : repli sur le nom masculin', () => {
    expect(classDisplayName(forgesort, true, 'female')).toBe('Forgesort');
  });

  it('arquebusier/arbalétrier : la féminisation suit la règle « armes à feu »', () => {
    expect(classDisplayName(arquebusier, true, 'female')).toBe('Arquebusière');
    expect(classDisplayName(arquebusier, false, 'female')).toBe('Arbalétrière');
    expect(classDisplayName(arquebusier, false, 'male')).toBe('Arbalétrier');
  });
});
