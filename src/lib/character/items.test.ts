import { describe, expect, it } from 'vitest';
import {
  ITEM_TYPE_ORDER,
  effectiveItem,
  groupEquipmentByType,
  itemType,
  snapshotOverrides,
} from './items';
import { isCustomItem } from './types';
import type { EquipmentLine, EquipmentRef } from './types';

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

describe('groupEquipmentByType', () => {
  // Inventaire mêlé : deux armes, une armure, un consommable, un objet custom trésor.
  const sample: EquipmentLine[] = [
    { itemId: 'epee-longue', quantity: 1 }, // arme (idx 0)
    { itemId: 'potion-de-soins', quantity: 2 }, // consommable (idx 1)
    { itemId: 'cuir-simple', quantity: 1 }, // armure (idx 2)
    { itemId: 'dague', quantity: 1 }, // arme (idx 3)
    { custom: true, name: 'Rubis', quantity: 1, type: 'treasure' }, // trésor (idx 4)
  ];

  it('émet les groupes non vides dans l’ordre de ITEM_TYPE_ORDER', () => {
    const groups = groupEquipmentByType(sample);
    expect(groups.map((g) => g.type)).toEqual(['weapon', 'armor', 'consumable', 'treasure']);
  });

  it('regroupe les lignes du même type en conservant leur index d’origine', () => {
    const groups = groupEquipmentByType(sample);
    const weapons = groups.find((g) => g.type === 'weapon');
    // Les deux armes, dans l'ordre stocké, avec leur index d'origine (0 puis 3).
    expect(weapons?.entries.map((e) => e.index)).toEqual([0, 3]);
    expect(weapons?.entries.map((e) => e.line)).toEqual([sample[0], sample[3]]);
  });

  it('conserve l’ordre stocké à l’intérieur d’un groupe (pas de tri secondaire)', () => {
    // Deux objets du même type dont l'ordre stocké contredit l'ordre alphabétique
    // (« Zircon » avant « Ambre ») : on doit retrouver l'ordre stocké, pas l'alpha.
    const treasures: EquipmentLine[] = [
      { custom: true, name: 'Zircon', quantity: 1, type: 'treasure' },
      { custom: true, name: 'Ambre', quantity: 1, type: 'treasure' },
    ];
    const group = groupEquipmentByType(treasures).find((g) => g.type === 'treasure');
    const names = group?.entries.map((e) => (isCustomItem(e.line) ? e.line.name : null));
    expect(names).toEqual(['Zircon', 'Ambre']);
  });

  it('omet les catégories vides et rend un tableau vide sur un inventaire vide', () => {
    expect(groupEquipmentByType([])).toEqual([]);
  });

  it('couvre toutes les lignes exactement une fois', () => {
    const total = groupEquipmentByType(sample).reduce((n, g) => n + g.entries.length, 0);
    expect(total).toBe(sample.length);
  });

  it('ITEM_TYPE_ORDER liste les 7 types une seule fois', () => {
    expect([...ITEM_TYPE_ORDER].sort()).toEqual(
      ['armor', 'consumable', 'gear', 'misc', 'shield', 'treasure', 'weapon'].sort(),
    );
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
      overrides: { name: 'Lame d’Ombre', damage: { count: 1, die: 'd8', modifier: 2 } },
    };
    const item = effectiveItem(ref);
    expect(item?.name).toBe('Lame d’Ombre');
    expect(item?.category === 'weapon' && item.damage).toEqual({ count: 1, die: 'd8', modifier: 2 });
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

describe('snapshotOverrides', () => {
  it('capture nom + DM d’une arme, ignore les champs d’armure', () => {
    const o = snapshotOverrides('weapon', {
      name: 'Rapière de Maître Ombre',
      description: 'Une lame fine et sombre.',
      damage: { count: 1, die: 'd6', modifier: 2 },
      range: '',
      weaponCategory: 'light',
      def: 99, // hors catégorie arme → ignoré
    });
    expect(o).toEqual({
      name: 'Rapière de Maître Ombre',
      description: 'Une lame fine et sombre.',
      damage: { count: 1, die: 'd6', modifier: 2 },
      weaponCategory: 'light',
    });
  });

  it('capture DEF + plafond AGI d’une armure ; maxAgi null (pas de plafond) est retenu', () => {
    expect(snapshotOverrides('armor', { name: 'Plaques runiques', def: 6, maxAgi: null })).toEqual({
      name: 'Plaques runiques',
      def: 6,
      maxAgi: null,
    });
  });

  it('capture seulement la DEF d’un bouclier', () => {
    expect(snapshotOverrides('shield', { name: 'Égide', def: 3, maxAgi: 2 })).toEqual({
      name: 'Égide',
      def: 3,
    });
  });

  it('coupe le nom et omet une description vide', () => {
    expect(
      snapshotOverrides('weapon', {
        name: '  Dague  ',
        description: '   ',
        damage: { count: 1, die: 'd4' },
      }),
    ).toEqual({
      name: 'Dague',
      damage: { count: 1, die: 'd4' },
    });
  });
});
