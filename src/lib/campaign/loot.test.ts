import { describe, expect, it } from 'vitest';
import type { LootItem } from './types';
import {
  drawLoot,
  isExhausted,
  isReserveEmpty,
  remainingCount,
  remainingLoot,
  resetLoot,
} from './loot';

/** Fabrique un objet de butin (ligne = objet libre nommé), `served` par défaut `false`. */
const loot = (id: string, served = false): LootItem => ({
  id,
  line: { custom: true, name: `Objet ${id}`, quantity: 1 },
  served,
});

describe('remainingLoot / remainingCount', () => {
  it('ne garde que les non-servis, dans l’ordre', () => {
    const list = [loot('a'), loot('b', true), loot('c')];
    expect(remainingLoot(list).map((l) => l.id)).toEqual(['a', 'c']);
    expect(remainingCount(list)).toBe(2);
  });

  it('renvoie 0 sur une réserve vide', () => {
    expect(remainingCount([])).toBe(0);
  });
});

describe('isReserveEmpty / isExhausted', () => {
  it('distingue « vide » (aucun objet) et « épuisée » (tous servis)', () => {
    expect(isReserveEmpty([])).toBe(true);
    expect(isExhausted([])).toBe(false); // vide n’est PAS épuisée

    const allServed = [loot('a', true), loot('b', true)];
    expect(isReserveEmpty(allServed)).toBe(false);
    expect(isExhausted(allServed)).toBe(true);

    const someLeft = [loot('a', true), loot('b')];
    expect(isExhausted(someLeft)).toBe(false);
  });
});

describe('drawLoot', () => {
  it('tire le candidat à l’index fourni et le marque servi', () => {
    const list = [loot('a'), loot('b'), loot('c')];
    const result = drawLoot(list, () => 1); // → 'b'
    expect(result).not.toBeNull();
    expect(result!.item.id).toBe('b');
    expect(result!.item.served).toBe(true);
    expect(result!.loot.find((l) => l.id === 'b')!.served).toBe(true);
    expect(result!.loot.find((l) => l.id === 'a')!.served).toBe(false);
    expect(result!.loot.find((l) => l.id === 'c')!.served).toBe(false);
  });

  it('n’indexe QUE parmi les non-servis (saute les déjà servis)', () => {
    const list = [loot('a', true), loot('b'), loot('c')];
    const result = drawLoot(list, (n) => {
      expect(n).toBe(2); // seuls 2 candidats présentés
      return 0;
    });
    expect(result!.item.id).toBe('b');
  });

  it('ne redouble jamais : deux tirages successifs donnent des objets distincts', () => {
    let list = [loot('a'), loot('b')];
    const first = drawLoot(list, () => 0)!; // 'a'
    list = first.loot;
    const second = drawLoot(list, () => 0)!; // reste 'b'
    expect(first.item.id).toBe('a');
    expect(second.item.id).toBe('b');
    expect(isExhausted(second.loot)).toBe(true);
  });

  it('renvoie null quand la réserve est vide', () => {
    expect(drawLoot([], () => 0)).toBeNull();
  });

  it('renvoie null quand tous les objets sont servis (épuisée)', () => {
    expect(drawLoot([loot('a', true)], () => 0)).toBeNull();
  });

  it('borne un index hors limites renvoyé par pick (garde-fou)', () => {
    const list = [loot('a'), loot('b')];
    expect(drawLoot(list, () => 99)!.item.id).toBe('b'); // ramené à n-1
    expect(drawLoot(list, () => -5)!.item.id).toBe('a'); // ramené à 0
    expect(drawLoot(list, () => NaN)!.item.id).toBe('a'); // NaN → 0
  });

  it('préserve la ligne d’équipement de l’objet tiré', () => {
    const list: LootItem[] = [
      { id: 'x', line: { custom: true, name: 'Anneau de brume', quantity: 1, details: 'Invisibilité 1×/jour' }, served: false },
    ];
    const result = drawLoot(list, () => 0)!;
    expect(result.item.line).toEqual({
      custom: true,
      name: 'Anneau de brume',
      quantity: 1,
      details: 'Invisibilité 1×/jour',
    });
  });

  it('ne mute pas la réserve d’entrée', () => {
    const list = [loot('a'), loot('b')];
    drawLoot(list, () => 0);
    expect(list.every((l) => !l.served)).toBe(true);
  });
});

describe('resetLoot', () => {
  it('repasse tous les objets non-servis', () => {
    const list = [loot('a', true), loot('b', true), loot('c')];
    const reset = resetLoot(list);
    expect(reset.every((l) => !l.served)).toBe(true);
    expect(remainingCount(reset)).toBe(3);
  });

  it('ne mute pas l’entrée', () => {
    const list = [loot('a', true)];
    resetLoot(list);
    expect(list[0].served).toBe(true);
  });
});
