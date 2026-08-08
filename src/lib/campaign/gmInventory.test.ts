import { describe, expect, it } from 'vitest';
import type { GmInventory, LootItem } from './types';
import {
  addCategory,
  addItem,
  addItems,
  duplicateItem,
  ensureCategory,
  moveItemFromInventoryToLoot,
  moveItemFromLootToInventory,
  moveItemToCategory,
  removeCategory,
  removeItem,
  renameCategory,
  toggleCategoryCollapsed,
  updateItemLine,
} from './gmInventory';

const emptyInv: GmInventory = { categories: [], items: [] };

/** Fabrique un objet d'inventaire permanent (ligne = objet libre nommé). */
const invItem = (id: string, categoryId: string | null = null) => ({
  id,
  line: { custom: true as const, name: `Objet ${id}`, quantity: 1 },
  categoryId,
});

/** Fabrique un objet de la réserve aléatoire. */
const lootItem = (id: string, served = false): LootItem => ({
  id,
  line: { custom: true, name: `Objet ${id}`, quantity: 1 },
  served,
});

describe('addCategory', () => {
  it('ajoute une catégorie dépliée en fin de liste', () => {
    const inv = addCategory(emptyInv, 'Potions');
    expect(inv.categories).toHaveLength(1);
    expect(inv.categories[0]).toMatchObject({ name: 'Potions', collapsed: false });
    expect(typeof inv.categories[0].id).toBe('string');
  });

  it('ne mute pas l’entrée', () => {
    addCategory(emptyInv, 'Potions');
    expect(emptyInv.categories).toEqual([]);
  });
});

describe('renameCategory', () => {
  it('renomme la catégorie ciblée', () => {
    const inv = addCategory(emptyInv, 'Ancien nom');
    const id = inv.categories[0].id;
    const renamed = renameCategory(inv, id, 'Nouveau nom');
    expect(renamed.categories[0].name).toBe('Nouveau nom');
  });

  it('no-op si l’id est inconnu', () => {
    const inv = addCategory(emptyInv, 'Potions');
    expect(renameCategory(inv, 'inconnu', 'X')).toEqual(inv);
  });
});

describe('toggleCategoryCollapsed', () => {
  it('inverse collapsed à chaque appel', () => {
    let inv = addCategory(emptyInv, 'Potions');
    const id = inv.categories[0].id;
    inv = toggleCategoryCollapsed(inv, id);
    expect(inv.categories[0].collapsed).toBe(true);
    inv = toggleCategoryCollapsed(inv, id);
    expect(inv.categories[0].collapsed).toBe(false);
  });
});

describe('removeCategory', () => {
  it('supprime la catégorie mais repasse ses items en « Sans catégorie »', () => {
    let inv = addCategory(emptyInv, 'Potions');
    const catId = inv.categories[0].id;
    inv = addItem(inv, invItem('i1', catId));
    inv = addItem(inv, invItem('i2', null));
    const result = removeCategory(inv, catId);
    expect(result.categories).toEqual([]);
    expect(result.items).toHaveLength(2);
    expect(result.items.every((it) => it.categoryId === null)).toBe(true);
  });
});

describe('addItem / updateItemLine / removeItem', () => {
  it('ajoute un item avec sa catégorie', () => {
    const inv = addItem(emptyInv, invItem('i1', 'cat1'));
    expect(inv.items).toEqual([invItem('i1', 'cat1')]);
  });

  it('remplace la ligne d’un item existant', () => {
    const inv = addItem(emptyInv, invItem('i1'));
    const updated = updateItemLine(inv, 'i1', { custom: true, name: 'Renommé', quantity: 2 });
    expect(updated.items[0].line).toEqual({ custom: true, name: 'Renommé', quantity: 2 });
  });

  it('updateItemLine no-op si l’id est inconnu', () => {
    const inv = addItem(emptyInv, invItem('i1'));
    expect(updateItemLine(inv, 'inconnu', { custom: true, name: 'X', quantity: 1 })).toEqual(inv);
  });

  it('retire un item', () => {
    const inv = addItem(emptyInv, invItem('i1'));
    expect(removeItem(inv, 'i1').items).toEqual([]);
  });
});

describe('moveItemToCategory', () => {
  it('recatégorise un item existant', () => {
    const inv = addItem(emptyInv, invItem('i1', null));
    const moved = moveItemToCategory(inv, 'i1', 'cat1');
    expect(moved.items[0].categoryId).toBe('cat1');
  });

  it('accepte null pour repasser « Sans catégorie »', () => {
    const inv = addItem(emptyInv, invItem('i1', 'cat1'));
    const moved = moveItemToCategory(inv, 'i1', null);
    expect(moved.items[0].categoryId).toBeNull();
  });

  it('no-op si l’id est inconnu', () => {
    const inv = addItem(emptyInv, invItem('i1'));
    expect(moveItemToCategory(inv, 'inconnu', 'cat1')).toEqual(inv);
  });
});

describe('moveItemFromLootToInventory', () => {
  it('relocalise un objet de la réserve aléatoire vers l’inventaire permanent', () => {
    const loot = [lootItem('a'), lootItem('b', true)];
    const result = moveItemFromLootToInventory(loot, emptyInv, 'b', 'cat1');
    expect(result).not.toBeNull();
    expect(result!.loot.map((l) => l.id)).toEqual(['a']);
    expect(result!.inventory.items).toEqual([
      { id: 'b', line: { custom: true, name: 'Objet b', quantity: 1 }, categoryId: 'cat1' },
    ]);
  });

  it('abandonne served (aucun équivalent côté permanent)', () => {
    const loot = [lootItem('a', true)];
    const result = moveItemFromLootToInventory(loot, emptyInv, 'a', null);
    expect(result!.inventory.items[0]).not.toHaveProperty('served');
  });

  it('renvoie null si l’objet est introuvable dans loot', () => {
    expect(moveItemFromLootToInventory([lootItem('a')], emptyInv, 'inconnu', null)).toBeNull();
  });

  it('ne mute ni loot ni l’inventaire d’entrée', () => {
    const loot = [lootItem('a')];
    moveItemFromLootToInventory(loot, emptyInv, 'a', null);
    expect(loot).toHaveLength(1);
    expect(emptyInv.items).toEqual([]);
  });
});

describe('addItems', () => {
  it('ajoute plusieurs objets d’un coup', () => {
    const inv = addItems(emptyInv, [invItem('i1', 'cat1'), invItem('i2', 'cat1')]);
    expect(inv.items).toEqual([invItem('i1', 'cat1'), invItem('i2', 'cat1')]);
  });

  it('ne mute pas l’entrée', () => {
    addItems(emptyInv, [invItem('i1')]);
    expect(emptyInv.items).toEqual([]);
  });
});

describe('duplicateItem', () => {
  it('crée une copie sous un nouvel id, même ligne, même catégorie', () => {
    const inv = addItem(emptyInv, invItem('i1', 'cat1'));
    const dup = duplicateItem(inv, 'i1', 'i1-copy');
    expect(dup.items).toEqual([
      invItem('i1', 'cat1'),
      { ...invItem('i1', 'cat1'), id: 'i1-copy' },
    ]);
  });

  it('no-op si l’id source est inconnu', () => {
    const inv = addItem(emptyInv, invItem('i1'));
    expect(duplicateItem(inv, 'inconnu', 'new')).toEqual(inv);
  });
});

describe('ensureCategory', () => {
  it('crée la catégorie si elle n’existe pas encore', () => {
    const { inventory, categoryId } = ensureCategory(emptyInv, 'Divers');
    expect(inventory.categories).toEqual([{ id: categoryId, name: 'Divers', collapsed: false }]);
  });

  it('réutilise la catégorie existante (même nom) sans en recréer une seconde', () => {
    const inv = addCategory(emptyInv, 'Divers');
    const existingId = inv.categories[0].id;
    const { inventory, categoryId } = ensureCategory(inv, 'Divers');
    expect(categoryId).toBe(existingId);
    expect(inventory).toBe(inv);
  });
});

describe('moveItemFromInventoryToLoot', () => {
  it('relocalise un objet de l’inventaire permanent vers la réserve aléatoire, non-servi', () => {
    const inv = addItem(emptyInv, invItem('i1', 'cat1'));
    const loot = [lootItem('a')];
    const result = moveItemFromInventoryToLoot(inv, loot, 'i1');
    expect(result).not.toBeNull();
    expect(result!.inventory.items).toEqual([]);
    expect(result!.loot).toEqual([
      lootItem('a'),
      { id: 'i1', line: { custom: true, name: 'Objet i1', quantity: 1 }, served: false },
    ]);
  });

  it('abandonne categoryId (aucun équivalent côté aléatoire)', () => {
    const inv = addItem(emptyInv, invItem('i1', 'cat1'));
    const result = moveItemFromInventoryToLoot(inv, [], 'i1');
    expect(result!.loot[0]).not.toHaveProperty('categoryId');
  });

  it('renvoie null si l’objet est introuvable dans l’inventaire', () => {
    expect(moveItemFromInventoryToLoot(emptyInv, [], 'inconnu')).toBeNull();
  });
});
