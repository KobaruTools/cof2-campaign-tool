import { describe, expect, it } from 'vitest';
import { effectiveItem, itemType } from './items';
import type { EquipmentRef } from './types';

describe('itemType', () => {
  it('déduit le type d’une référence catalogue depuis sa catégorie', () => {
    expect(itemType({ itemId: 'epee-longue', quantity: 1 })).toBe('weapon');
    expect(itemType({ itemId: 'cuir-simple', quantity: 1 })).toBe('armor');
    expect(itemType({ itemId: 'grand-bouclier', quantity: 1 })).toBe('shield');
  });

  it('classe un objet consommable du catalogue en « consommable »', () => {
    // potion-de-soins porte le drapeau `consumable` (voir catalogue).
    expect(itemType({ itemId: 'potion-de-soins', quantity: 1 })).toBe('consumable');
  });

  it('classe un matériel durable du catalogue en « gear »', () => {
    expect(itemType({ itemId: 'sac-a-dos', quantity: 1 })).toBe('gear');
  });

  it('retombe sur « misc » pour un itemId introuvable', () => {
    expect(itemType({ itemId: 'objet-inexistant', quantity: 1 })).toBe('misc');
  });

  it('renvoie le type déclaré d’un objet personnalisé, « misc » par défaut', () => {
    expect(itemType({ custom: true, name: 'Rubis', quantity: 1, type: 'treasure' })).toBe('treasure');
    expect(itemType({ custom: true, name: 'Bricole', quantity: 1 })).toBe('misc');
  });
});

describe('effectiveItem', () => {
  it('renvoie l’objet du catalogue tel quel sans surcharges (non-régression, même référence)', () => {
    const ref: EquipmentRef = { itemId: 'epee-longue', quantity: 1 };
    const base = effectiveItem(ref);
    expect(base).toBeDefined();
    expect(base).toBe(effectiveItem(ref)); // référence partagée du catalogue, aucune copie
    expect(base!.name).toBe('Épée longue');
    expect(base!.category).toBe('weapon');
  });

  it('écrase les stats d’arme présentes, garde les autres du catalogue', () => {
    const ref: EquipmentRef = {
      itemId: 'epee-longue',
      quantity: 1,
      overrides: { name: 'Lame d’Ombre', damage: '1d8+2' },
    };
    const item = effectiveItem(ref);
    expect(item?.name).toBe('Lame d’Ombre');
    expect(item?.category === 'weapon' && item.damage).toBe('1d8+2');
    // Catégorie d'arme non surchargée → valeur du catalogue conservée.
    expect(item?.category === 'weapon' && item.weaponCategory).toBe('oneHand');
  });

  it('écrase la DEF et le plafond AGI d’une armure', () => {
    const ref: EquipmentRef = {
      itemId: 'cuir-simple', // def 2, maxAgi 6
      quantity: 1,
      overrides: { def: 4, maxAgi: 5 },
    };
    const item = effectiveItem(ref);
    expect(item?.category === 'armor' && item.def).toBe(4);
    expect(item?.category === 'armor' && item.maxAgi).toBe(5);
  });

  it('ne mute pas l’objet du catalogue lors de la surcharge', () => {
    const ref: EquipmentRef = { itemId: 'cuir-simple', quantity: 1, overrides: { def: 9 } };
    effectiveItem(ref);
    const plain = effectiveItem({ itemId: 'cuir-simple', quantity: 1 });
    expect(plain?.category === 'armor' && plain.def).toBe(2); // catalogue intact
  });

  it('renvoie undefined pour un itemId introuvable', () => {
    expect(effectiveItem({ itemId: 'objet-inexistant', quantity: 1 })).toBeUndefined();
  });
});
