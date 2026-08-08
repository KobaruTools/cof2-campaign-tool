/**
 * Tests du butin de combat (PER-200/308 extension). Aléa injecté via un roller SÉQUENTIEL
 * déterministe, même motif que `magicItemGenerator.test.ts` : chaque appel `roll(sides)`
 * dépile la prochaine valeur fournie, dans l'ordre exact des jets du module testé.
 */
import { describe, expect, it } from 'vitest';
import { isCustomItem } from '@/lib/character/types';
import {
  coinBandForLevel,
  coinPouchLineForLevel,
  generateCombatLootBatch,
  type CombatLootBatchRequest,
  type RollDie,
} from './combatLootBatch';

/** Roller déterministe : ignore `sides`, dépile les valeurs fournies dans l'ordre. */
function seq(...values: number[]): RollDie {
  let i = 0;
  return () => {
    if (i >= values.length) throw new Error(`seq épuisé après ${values.length} jets`);
    return values[i++];
  };
}

const req = (over: Partial<CombatLootBatchRequest>): CombatLootBatchRequest => ({
  count: 1,
  characterLevel: 10,
  frame: 'classic',
  ...over,
});

describe('coinBandForLevel / coinPouchLineForLevel (barème maison, p. 245 : aucune table livre)', () => {
  it('lit le palier de 4 niveaux, bornes incluses', () => {
    expect(coinBandForLevel(1)).toEqual({ maxLevel: 4, dice: '2d6', currency: 'silver' });
    expect(coinBandForLevel(4)).toEqual({ maxLevel: 4, dice: '2d6', currency: 'silver' });
    expect(coinBandForLevel(5)).toEqual({ maxLevel: 8, dice: '2d6', currency: 'gold' });
    expect(coinBandForLevel(9)).toEqual({ maxLevel: 12, dice: '4d6', currency: 'gold' });
    expect(coinBandForLevel(13)).toEqual({ maxLevel: 16, dice: '2d6', currency: 'platinum' });
    expect(coinBandForLevel(17)).toEqual({ maxLevel: 20, dice: '4d6', currency: 'platinum' });
  });

  it('borne les niveaux hors plage 1-20', () => {
    expect(coinBandForLevel(0)).toEqual(coinBandForLevel(1));
    expect(coinBandForLevel(25)).toEqual(coinBandForLevel(20));
  });

  it('fabrique une bourse reconnue par le motif « Bourse de NdM {pp|po|pa|pc} »', () => {
    const line = coinPouchLineForLevel(6);
    expect(isCustomItem(line)).toBe(true);
    expect(line.name).toBe('Bourse de 2d6 po');
    expect(line.type).toBe('treasure');
  });
});

describe('generateCombatLootBatch — routage bucket', () => {
  it('renvoie un tableau vide si count = 0', () => {
    expect(generateCombatLootBatch(req({ count: 0 }), seq())).toEqual([]);
  });

  it('commonRatio=1 + coinRatio=1 → uniquement des bourses (aucun jet de catégorie)', () => {
    const rolls = seq(100, 100, 100, 100, 100, 100); // 2 jets/récompense (bucket + sous-bucket)
    const rewards = generateCombatLootBatch(
      req({ count: 3, characterLevel: 6, commonRatio: 1, coinRatio: 1 }),
      rolls,
    );
    expect(rewards).toHaveLength(3);
    for (const r of rewards) {
      expect(r.kind).toBe('coin');
      expect(isCustomItem(r.line) && r.line.name).toBe('Bourse de 2d6 po');
    }
  });

  it('commonRatio=1 + coinRatio=0 → jamais de bourse, toujours potion/parchemin', () => {
    // bucketRoll=100 (commun), subRoll=100 (coinRatio=0 → 100<=0 faux → consommable),
    // categoryRoll=roll(2), puis padding généreux pour la sous-table (potion OU parchemin).
    const rolls = seq(100, 100, 1, 1, 1, 1, 1, 1);
    const rewards = generateCombatLootBatch(req({ commonRatio: 1, coinRatio: 0 }), rolls);
    expect(rewards).toHaveLength(1);
    expect(rewards[0].kind).toBe('magic');
    expect(['potion', 'scroll']).toContain(rewards[0].magic?.category);
  });

  it('commonRatio=0 → toujours le bucket rare (jamais bourse ni consommable)', () => {
    // categoryRoll=2 → 'weapon' (RARE_CATEGORIES = wand,weapon,defense,power).
    // typeRoll=1 (arme de contact), weaponRoll=1 (Maniques), check propriété=6 (aucune
    // propriété tirée : 6 < niveau de magie cible est toujours faux ici).
    const rolls = seq(1, 2, 1, 1, 6);
    const rewards = generateCombatLootBatch(
      req({ characterLevel: 14, frame: 'classic', commonRatio: 0 }),
      rolls,
    );
    expect(rewards).toHaveLength(1);
    expect(rewards[0].kind).toBe('magic');
    expect(rewards[0].magic?.category).toBe('weapon');
  });
});

describe('generateCombatLootBatch — objet rare mineur par défaut (p. 244)', () => {
  it('mineur par défaut : niveau de magie = colonne niveau ÷ 2', () => {
    // Niveau 14, cadre classique, mineur → recommendedMagicLevel = 2.
    const rolls = seq(1, 2, 1, 1, 6);
    const rewards = generateCombatLootBatch(req({ characterLevel: 14, commonRatio: 0 }), rolls);
    expect(rewards[0].magic?.magicLevel).toBe(2);
  });

  it('minorRare:false → objet majeur (pleine table p. 244)', () => {
    // Niveau 14, cadre classique, majeur → recommendedMagicLevel = 4.
    const rolls = seq(1, 2, 1, 1, 6);
    const rewards = generateCombatLootBatch(
      req({ characterLevel: 14, commonRatio: 0, minorRare: false }),
      rolls,
    );
    expect(rewards[0].magic?.magicLevel).toBe(4);
  });
});
