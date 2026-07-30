import { describe, expect, it } from 'vitest';

import {
  compareInitiative,
  randomTieBreakSeed,
  sortByInitiative,
  type InitiativeCombatant,
} from './initiativeOrder';

/** Fabrique un combattant de test (joueur par défaut). */
function player(key: string, initiative: number, agility?: number): InitiativeCombatant {
  return { key, initiative, isCreature: false, agility };
}

/** Fabrique une créature de test. */
function creature(key: string, initiative: number, agility?: number): InitiativeCombatant {
  return { key, initiative, isCreature: true, agility };
}

/** Clés dans l'ordre de jeu, pour des attentes lisibles. */
const keys = (rows: InitiativeCombatant[]) => rows.map((r) => r.key);

describe('sortByInitiative', () => {
  it('classe par initiative décroissante', () => {
    const rows = [player('a', 12), creature('b', 18), player('c', 15)];
    expect(keys(sortByInitiative(rows))).toEqual(['b', 'c', 'a']);
  });

  it('à égalité d’initiative, les joueurs passent avant les créatures', () => {
    // La créature a pourtant une AGI supérieure : la priorité joueur prime sur l'AGI.
    const rows = [creature('gobelin', 14, 5), player('perso', 14, 1)];
    expect(keys(sortByInitiative(rows))).toEqual(['perso', 'gobelin']);
  });

  it('à égalité d’initiative entre joueurs, la plus haute AGI passe devant', () => {
    const rows = [player('lent', 14, 1), player('vif', 14, 4)];
    expect(keys(sortByInitiative(rows))).toEqual(['vif', 'lent']);
  });

  it('départage aussi les créatures entre elles par l’AGI', () => {
    const rows = [creature('ours', 10, 0), creature('loup', 10, 3)];
    expect(keys(sortByInitiative(rows))).toEqual(['loup', 'ours']);
  });

  it('classe une AGI inconnue derrière une AGI connue, même négative', () => {
    const rows = [creature('sans-caracs', 10), creature('maladroit', 10, -2)];
    expect(keys(sortByInitiative(rows))).toEqual(['maladroit', 'sans-caracs']);
  });

  it('conserve l’ordre d’ajout entre créatures à égalité parfaite (tri stable)', () => {
    const rows = [creature('c-1', 10, 2), creature('c-2', 10, 2), creature('c-3', 10, 2)];
    expect(keys(sortByInitiative(rows, 12345))).toEqual(['c-1', 'c-2', 'c-3']);
    // Une autre graine ne rebat pas les cartes des créatures.
    expect(keys(sortByInitiative(rows, 999))).toEqual(['c-1', 'c-2', 'c-3']);
  });

  it('départage les joueurs à égalité parfaite par tirage au sort reproductible', () => {
    const rows = [player('anna', 14, 3), player('bruno', 14, 3), player('cyril', 14, 3)];
    const first = keys(sortByInitiative(rows, 4242));
    // Même graine → même ordre, quel que soit l'ordre d'entrée (départage TOTAL, pas stable).
    expect(keys(sortByInitiative([...rows].reverse(), 4242))).toEqual(first);
    expect(first).toHaveLength(3);
    expect([...first].sort()).toEqual(['anna', 'bruno', 'cyril']);
  });

  it('change le tirage entre joueurs quand la graine change (au moins une graine sur cent)', () => {
    const rows = [player('anna', 14, 3), player('bruno', 14, 3)];
    const reference = keys(sortByInitiative(rows, 0));
    const seeds = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(seeds.some((seed) => keys(sortByInitiative(rows, seed))[0] !== reference[0])).toBe(true);
  });

  it('ne mute pas le tableau d’entrée', () => {
    const rows = [player('a', 5), player('b', 20)];
    sortByInitiative(rows);
    expect(keys(rows)).toEqual(['a', 'b']);
  });
});

describe('compareInitiative', () => {
  it('est antisymétrique sur les égalités parfaites entre joueurs', () => {
    const a = player('anna', 14, 3);
    const b = player('bruno', 14, 3);
    expect(Math.sign(compareInitiative(a, b, 7))).toBe(-Math.sign(compareInitiative(b, a, 7)));
  });

  it('renvoie 0 entre deux créatures à égalité parfaite (ordre d’entrée conservé)', () => {
    expect(compareInitiative(creature('c-1', 10, 2), creature('c-2', 10, 2), 7)).toBe(0);
  });
});

describe('randomTieBreakSeed', () => {
  it('tire un entier positif borné à 31 bits', () => {
    for (let i = 0; i < 50; i += 1) {
      const seed = randomTieBreakSeed();
      expect(Number.isInteger(seed)).toBe(true);
      expect(seed).toBeGreaterThanOrEqual(0);
      expect(seed).toBeLessThan(0x7fffffff);
    }
  });
});
