import { describe, expect, it } from 'vitest';
import { ancestryById } from '@/data';
import { pickName } from './names';

const dwarf = ancestryById.get('nain')!;
const halfling = ancestryById.get('halfelin')!;
const halfElf = ancestryById.get('demi-elfe')!;

describe('pickName', () => {
  it('tire un nom de la liste correspondant au sexe', () => {
    for (let i = 0; i < 50; i++) {
      expect(dwarf.names.male).toContain(pickName(dwarf, 'male'));
      expect(dwarf.names.female).toContain(pickName(dwarf, 'female'));
    }
  });

  it('puise dans les deux listes quand le sexe est inconnu', () => {
    const both = new Set([...dwarf.names.male, ...dwarf.names.female]);
    for (let i = 0; i < 50; i++) {
      expect(both.has(pickName(dwarf, undefined)!)).toBe(true);
    }
  });

  it('compose prénom + nom de famille pour le halfelin', () => {
    for (let i = 0; i < 50; i++) {
      const name = pickName(halfling, 'female')!;
      const [given, ...rest] = name.split(' ');
      expect(halfling.names.female).toContain(given);
      expect(halfling.names.surnames).toContain(rest.join(' '));
    }
  });

  it('compose un prénom elfique + un nom humain pour le demi-elfe', () => {
    const elfHigh = ancestryById.get('elfe-haut')!.names;
    const elfWood = ancestryById.get('elfe-sylvain')!.names;
    const human = ancestryById.get('humain')!.names;
    const elfMale = new Set([...elfHigh.male, ...elfWood.male]);
    const humanAny = new Set([...human.male, ...human.female]);
    for (let i = 0; i < 50; i++) {
      const name = pickName(halfElf, 'male')!;
      const [given, surname] = name.split(' ');
      expect(elfMale.has(given)).toBe(true);
      expect(humanAny.has(surname)).toBe(true);
    }
  });
});
