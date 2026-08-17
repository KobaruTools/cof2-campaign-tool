import { describe, expect, it } from 'vitest';

import {
  applyManualOrder,
  compareInitiative,
  isDefeatedCreature,
  randomTieBreakSeed,
  relegateSidelined,
  sidelineRank,
  sortByInitiative,
  type InitiativeCombatant,
  type SidelinableCombatant,
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
const keys = (rows: readonly { key: string }[]) => rows.map((r) => r.key);

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

/** Fabrique une ligne reléguable : en scène par défaut, PV pleins. */
function row(
  key: string,
  options: { isCreature?: boolean; hidden?: boolean; maxHp?: number; hp?: number } = {},
): SidelinableCombatant {
  const { isCreature = true, hidden = false, maxHp = 12, hp = maxHp } = options;
  return { key, isCreature, hidden, maxHp, depletion: { hp: { lethal: maxHp - hp, temp: 0 } } };
}

describe('isDefeatedCreature', () => {
  it('reconnaît une créature à 0 PV', () => {
    expect(isDefeatedCreature(row('gobelin', { hp: 0 }))).toBe(true);
  });

  it('ne dit rien d’une créature encore debout, même à 1 PV', () => {
    expect(isDefeatedCreature(row('gobelin', { hp: 1 }))).toBe(false);
  });

  it('NE tient JAMAIS un personnage joueur à 0 PV pour vaincu (à terre / mourant, p. 220)', () => {
    expect(isDefeatedCreature(row('kael', { isCreature: false, hp: 0 }))).toBe(false);
  });

  it('ne conclut rien d’un bloc de créature dont les PV max sont inconnus', () => {
    // Bloc du bestiaire pas encore chargé : `maxHp` à 0 donnerait 0 PV courants par défaut.
    expect(isDefeatedCreature(row('inconnue', { maxHp: 0 }))).toBe(false);
  });
});

describe('sidelineRank', () => {
  it('classe en scène, puis masquée, puis vaincue', () => {
    expect(sidelineRank(row('en-scene'))).toBe(0);
    expect(sidelineRank(row('renfort', { hidden: true }))).toBe(1);
    expect(sidelineRank(row('cadavre', { hp: 0 }))).toBe(2);
  });

  it('tient une créature à la fois masquée et vaincue pour vaincue', () => {
    expect(sidelineRank(row('cadavre-cache', { hidden: true, hp: 0 }))).toBe(2);
  });
});

describe('relegateSidelined', () => {
  it('repousse les vaincues en fin de bande', () => {
    const rows = [row('ilya', { isCreature: false }), row('gob-1'), row('gob-2', { hp: 0 }), row('ourse')];
    expect(keys(relegateSidelined(rows))).toEqual(['ilya', 'gob-1', 'ourse', 'gob-2']);
  });

  it('groupe les masquées entre les combattants en scène et les vaincues', () => {
    const rows = [
      row('gob-mort', { hp: 0 }),
      row('renfort', { hidden: true }),
      row('ilya', { isCreature: false }),
      row('gob-vivant'),
    ];
    expect(keys(relegateSidelined(rows))).toEqual(['ilya', 'gob-vivant', 'renfort', 'gob-mort']);
  });

  it('conserve l’ordre d’initiative À L’INTÉRIEUR de chaque groupe', () => {
    // L'entrée arrive déjà classée par `sortByInitiative` : le tri stable ne doit pas la brasser.
    const rows = [row('a'), row('b-mort', { hp: 0 }), row('c'), row('d-mort', { hp: 0 }), row('e')];
    expect(keys(relegateSidelined(rows))).toEqual(['a', 'c', 'e', 'b-mort', 'd-mort']);
  });

  it('ÉPARGNE la créature vaincue dont c’est le tour', () => {
    // Le MJ qui met à 0 PV la créature en train de jouer ne doit pas la voir filer sous son curseur.
    const rows = [row('ilya', { isCreature: false }), row('gob-1', { hp: 0 }), row('ourse')];
    expect(keys(relegateSidelined(rows, 'gob-1'))).toEqual(['ilya', 'gob-1', 'ourse']);
  });

  it('n’épargne PAS une créature MASQUÉE dont c’est le tour (sinon le tour de table boucle)', () => {
    // Cas de recette PER-302 : épargner le renfort masqué le faisait REMONTER à sa place
    // d'initiative, et le tour — qui suit la bande affichée — n'atteignait plus jamais la fin de
    // bande, donc plus jamais la manche suivante.
    // L'entrée est dans l'ordre d'initiative NU : le renfort (init. 15) précède le gobelin (14).
    const rows = [
      row('ilya', { isCreature: false }),
      row('renfort', { hidden: true }),
      row('gob-1'),
    ];
    expect(keys(relegateSidelined(rows, 'renfort'))).toEqual(['ilya', 'gob-1', 'renfort']);
  });

  it('ne mute pas l’entrée', () => {
    const rows = [row('mort', { hp: 0 }), row('vivant')];
    relegateSidelined(rows);
    expect(keys(rows)).toEqual(['mort', 'vivant']);
  });

  it('laisse intacte une bande sans vaincu ni masqué', () => {
    const rows = [row('a'), row('b'), row('c')];
    expect(keys(relegateSidelined(rows))).toEqual(['a', 'b', 'c']);
  });
});

describe('applyManualOrder (PER-436)', () => {
  const rows = [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'd' }];

  it('laisse l’ordre intact sans override', () => {
    expect(keys(applyManualOrder(rows, {}))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('réinsère un combattant juste avant son ancre', () => {
    // 'd' passe juste avant 'b'.
    expect(keys(applyManualOrder(rows, { d: 'b' }))).toEqual(['a', 'd', 'b', 'c']);
  });

  it('épingle en toute fin de bande avec une ancre null', () => {
    expect(keys(applyManualOrder(rows, { a: null }))).toEqual(['b', 'c', 'd', 'a']);
  });

  it('retombe en fin de bande quand l’ancre est introuvable (créature retirée)', () => {
    expect(keys(applyManualOrder(rows, { d: 'disparu' }))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('traite les ancres CROISÉES sans boucler (déterministe, part de l’ordre naturel)', () => {
    // 'a' avant 'b' ET 'b' avant 'a' : l'ordre de traitement suit l'entrée naturelle (a puis b).
    const result = applyManualOrder(rows, { a: 'b', b: 'a' });
    expect(result).toHaveLength(4);
    expect(new Set(keys(result))).toEqual(new Set(['a', 'b', 'c', 'd']));
  });

  it('déplace plusieurs combattants à la fois', () => {
    expect(keys(applyManualOrder(rows, { c: 'a', d: 'a' }))).toEqual(['c', 'd', 'a', 'b']);
  });

  it('ne mute pas l’entrée', () => {
    applyManualOrder(rows, { d: 'a' });
    expect(keys(rows)).toEqual(['a', 'b', 'c', 'd']);
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
