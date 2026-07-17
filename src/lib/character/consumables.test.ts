import { describe, expect, it } from 'vitest';
import { isConsumable } from './consumables';
import { elixirItemName } from './elixirs';
import { COIN_POUCH_ITEM_NAME } from '@/data/progression';
import type { EquipmentLine } from './types';

describe('isConsumable', () => {
  it('marque une potion du catalogue comme consommable', () => {
    expect(isConsumable({ itemId: 'potion-de-soins', quantity: 2 })).toBe(true);
  });

  it('ne marque pas le matériel durable du catalogue', () => {
    const durable: EquipmentLine[] = [
      { itemId: 'epee-longue', quantity: 1 },
      { itemId: 'sac-a-dos', quantity: 1 },
      { itemId: 'torches-x3', quantity: 1 },
    ];
    for (const line of durable) expect(isConsumable(line)).toBe(false);
  });

  it('marque une dose d’élixir (objet personnalisé) comme consommable', () => {
    expect(isConsumable({ custom: true, name: elixirItemName('Soin'), quantity: 1 })).toBe(true);
  });

  it('marque la « Bourse de 2d6 pa » (objet personnalisé, modale dédiée) comme consommable', () => {
    expect(isConsumable({ custom: true, name: COIN_POUCH_ITEM_NAME, quantity: 1 })).toBe(true);
  });

  it('marque un objet personnalisé typé « consommable » (PER-214)', () => {
    expect(isConsumable({ custom: true, name: 'Fiole d’acide', quantity: 3, type: 'consumable' })).toBe(
      true,
    );
  });

  it('ne marque pas un objet personnalisé typé autrement (trésor, divers…)', () => {
    expect(isConsumable({ custom: true, name: 'Rubis', quantity: 1, type: 'treasure' })).toBe(false);
    expect(isConsumable({ custom: true, name: 'Corde', quantity: 1, type: 'gear' })).toBe(false);
  });

  it('ne marque pas un objet personnalisé quelconque', () => {
    expect(isConsumable({ custom: true, name: 'Grimoire', quantity: 1 })).toBe(false);
  });

  it('ne marque pas une référence catalogue inconnue', () => {
    expect(isConsumable({ itemId: 'objet-inexistant', quantity: 1 })).toBe(false);
  });
});
