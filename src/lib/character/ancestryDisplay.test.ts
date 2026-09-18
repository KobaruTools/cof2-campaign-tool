import { describe, expect, it } from 'vitest';
import { ancestryById } from '@/data';
import type { Ancestry } from '@/data/schema';
import { ancestryDisplayName, npcAncestryName } from './ancestryDisplay';

const nain = ancestryById.get('nain') as Ancestry;
const gnome = ancestryById.get('gnome') as Ancestry;

describe('ancestryDisplayName (féminisation du peuple, PER-518)', () => {
  it('sex absent ou "male" : nom masculin', () => {
    expect(ancestryDisplayName(nain)).toBe('Nain');
    expect(ancestryDisplayName(nain, 'male')).toBe('Nain');
  });

  it('sex "female" : nom féminin quand le peuple en déclare un', () => {
    expect(ancestryDisplayName(nain, 'female')).toBe('Naine');
  });

  it('sex "female" sans nameFeminine déclaré (peuple épicène, ex. Gnome) : repli sur le nom masculin', () => {
    expect(ancestryDisplayName(gnome, 'female')).toBe('Gnome');
  });
});

describe('npcAncestryName (peuple d’un PNJ du MJ)', () => {
  it('résout l’id et applique le genre du PNJ', () => {
    expect(npcAncestryName('nain', 'female')).toBe('Naine');
    expect(npcAncestryName('nain', 'male')).toBe('Nain');
  });

  it('ancestryId absent ou inconnu : renvoie null', () => {
    expect(npcAncestryName(null, 'female')).toBeNull();
    expect(npcAncestryName(undefined, 'female')).toBeNull();
    expect(npcAncestryName('inconnu', 'female')).toBeNull();
  });
});
