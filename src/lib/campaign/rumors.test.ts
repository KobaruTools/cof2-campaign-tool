import { describe, expect, it } from 'vitest';
import type { TavernRumor } from './types';
import {
  drawRumor,
  isExhausted,
  isReserveEmpty,
  remainingCount,
  remainingRumors,
  resetRumors,
} from './rumors';

/** Fabrique une rumeur, `served` par défaut à `false`. */
const rumor = (id: string, served = false): TavernRumor => ({ id, text: `Rumeur ${id}`, served });

describe('remainingRumors / remainingCount', () => {
  it('ne garde que les non-servies, dans l’ordre', () => {
    const list = [rumor('a'), rumor('b', true), rumor('c')];
    expect(remainingRumors(list).map((r) => r.id)).toEqual(['a', 'c']);
    expect(remainingCount(list)).toBe(2);
  });

  it('renvoie 0 sur une réserve vide', () => {
    expect(remainingCount([])).toBe(0);
  });
});

describe('isReserveEmpty / isExhausted', () => {
  it('distingue « vide » (aucune rumeur) et « épuisée » (toutes servies)', () => {
    expect(isReserveEmpty([])).toBe(true);
    expect(isExhausted([])).toBe(false); // vide n’est PAS épuisée

    const allServed = [rumor('a', true), rumor('b', true)];
    expect(isReserveEmpty(allServed)).toBe(false);
    expect(isExhausted(allServed)).toBe(true);

    const someLeft = [rumor('a', true), rumor('b')];
    expect(isExhausted(someLeft)).toBe(false);
  });
});

describe('drawRumor', () => {
  it('tire la candidate à l’index fourni et la marque servie', () => {
    const list = [rumor('a'), rumor('b'), rumor('c')];
    // pick renvoie 1 → candidate 'b'
    const result = drawRumor(list, () => 1);
    expect(result).not.toBeNull();
    expect(result!.rumor.id).toBe('b');
    expect(result!.rumor.served).toBe(true);
    // La réserve mise à jour marque 'b' servie, laisse 'a' et 'c' intactes.
    expect(result!.rumors.find((r) => r.id === 'b')!.served).toBe(true);
    expect(result!.rumors.find((r) => r.id === 'a')!.served).toBe(false);
    expect(result!.rumors.find((r) => r.id === 'c')!.served).toBe(false);
  });

  it('n’indexe QUE parmi les non-servies (saute les déjà servies)', () => {
    // 'a' déjà servie → candidates = ['b', 'c'] ; pick(2)=0 → 'b'
    const list = [rumor('a', true), rumor('b'), rumor('c')];
    const result = drawRumor(list, (n) => {
      expect(n).toBe(2); // seules 2 candidates présentées
      return 0;
    });
    expect(result!.rumor.id).toBe('b');
  });

  it('ne redouble jamais : deux tirages successifs donnent des rumeurs distinctes', () => {
    let list = [rumor('a'), rumor('b')];
    const first = drawRumor(list, () => 0)!; // 'a'
    list = first.rumors;
    const second = drawRumor(list, () => 0)!; // reste 'b'
    expect(first.rumor.id).toBe('a');
    expect(second.rumor.id).toBe('b');
    expect(isExhausted(second.rumors)).toBe(true);
  });

  it('renvoie null quand la réserve est vide', () => {
    expect(drawRumor([], () => 0)).toBeNull();
  });

  it('renvoie null quand toutes les rumeurs sont servies (épuisée)', () => {
    expect(drawRumor([rumor('a', true)], () => 0)).toBeNull();
  });

  it('borne un index hors limites renvoyé par pick (garde-fou)', () => {
    const list = [rumor('a'), rumor('b')];
    expect(drawRumor(list, () => 99)!.rumor.id).toBe('b'); // ramené à n-1
    expect(drawRumor(list, () => -5)!.rumor.id).toBe('a'); // ramené à 0
    expect(drawRumor(list, () => NaN)!.rumor.id).toBe('a'); // NaN → 0
  });

  it('ne mute pas la réserve d’entrée', () => {
    const list = [rumor('a'), rumor('b')];
    drawRumor(list, () => 0);
    expect(list.every((r) => !r.served)).toBe(true);
  });
});

describe('resetRumors', () => {
  it('repasse toutes les rumeurs non-servies', () => {
    const list = [rumor('a', true), rumor('b', true), rumor('c')];
    const reset = resetRumors(list);
    expect(reset.every((r) => !r.served)).toBe(true);
    expect(remainingCount(reset)).toBe(3);
  });

  it('ne mute pas l’entrée', () => {
    const list = [rumor('a', true)];
    resetRumors(list);
    expect(list[0].served).toBe(true);
  });
});
