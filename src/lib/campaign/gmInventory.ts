/**
 * Moteur de l'inventaire PERMANENT du MJ (extension PER-200) — logique PURE et
 * testable, découplée de l'UI et du réseau. Implémentation SŒUR de `loot.ts` : à
 * PART de la réserve piochée au hasard (`LootItem`/`loot`), pour des objets uniques
 * distribués À LA MAIN, classés en catégories renommables/repliables.
 *
 * Un objet n'appartient qu'à UNE des deux réserves à la fois : `moveItemFromLootTo
 * Inventory`/`moveItemFromInventoryToLoot` RELOCALISENT un objet entre les deux
 * (jamais de duplication). Aucune de ces fonctions ne mute son entrée : elles
 * renvoient de nouveaux objets (persistables tels quels).
 */
import type { EquipmentLine } from '../character/types';
import type { GmInventory, GmInventoryItem, LootItem } from './types';

function newId(): string {
  return crypto.randomUUID();
}

/** Ajoute une nouvelle catégorie (dépliée) en fin de liste. */
export function addCategory(inv: GmInventory, name: string): GmInventory {
  return {
    ...inv,
    categories: [...inv.categories, { id: newId(), name, collapsed: false }],
  };
}

/** Renomme une catégorie existante. No-op si l'id est inconnu. */
export function renameCategory(inv: GmInventory, categoryId: string, name: string): GmInventory {
  return {
    ...inv,
    categories: inv.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)),
  };
}

/** Replie/déplie une catégorie. No-op si l'id est inconnu. */
export function toggleCategoryCollapsed(inv: GmInventory, categoryId: string): GmInventory {
  return {
    ...inv,
    categories: inv.categories.map((c) =>
      c.id === categoryId ? { ...c, collapsed: !c.collapsed } : c,
    ),
  };
}

/**
 * Supprime une catégorie. Ses items ne sont JAMAIS supprimés : ils repassent
 * `categoryId: null` (« Sans catégorie »).
 */
export function removeCategory(inv: GmInventory, categoryId: string): GmInventory {
  return {
    categories: inv.categories.filter((c) => c.id !== categoryId),
    items: inv.items.map((it) => (it.categoryId === categoryId ? { ...it, categoryId: null } : it)),
  };
}

/** Ajoute un nouvel objet à l'inventaire permanent. */
export function addItem(
  inv: GmInventory,
  item: { id: string; line: EquipmentLine; categoryId: string | null },
): GmInventory {
  return { ...inv, items: [...inv.items, item] };
}

/**
 * Ajoute PLUSIEURS objets d'un coup (création en lot, PER-200) — jamais une seule ligne à
 * quantité N : ce sont des CARTES DISTINCTES, chacune attribuable/dupliquable indépendamment.
 */
export function addItems(
  inv: GmInventory,
  items: { id: string; line: EquipmentLine; categoryId: string | null }[],
): GmInventory {
  return { ...inv, items: [...inv.items, ...items] };
}

/**
 * Duplique un objet existant (bouton « Dupliquer », PER-200) : même ligne, même catégorie,
 * nouvel `id` (fourni par l'appelant). No-op si l'id source est inconnu.
 */
export function duplicateItem(inv: GmInventory, itemId: string, newId: string): GmInventory {
  const found = inv.items.find((it) => it.id === itemId);
  if (!found) return inv;
  return addItem(inv, { id: newId, line: found.line, categoryId: found.categoryId });
}

/**
 * Trouve la catégorie nommée `name` (comparaison EXACTE) ou la crée si absente — utilisé par
 * le bouton « Bourse de pièces » (PER-200), qui range toujours ses créations dans « Divers »,
 * qu'elle existe déjà ou non. Renvoie l'inventaire (inchangé si la catégorie existait déjà)
 * et l'id résolu, prêt à passer à `addItem`/`addItems`.
 */
export function ensureCategory(
  inv: GmInventory,
  name: string,
): { inventory: GmInventory; categoryId: string } {
  const existing = inv.categories.find((c) => c.name === name);
  if (existing) return { inventory: inv, categoryId: existing.id };
  const id = newId();
  return {
    inventory: { ...inv, categories: [...inv.categories, { id, name, collapsed: false }] },
    categoryId: id,
  };
}

/** Remplace la ligne d'un objet existant (édition via `ItemDialog`). No-op si l'id est inconnu. */
export function updateItemLine(inv: GmInventory, itemId: string, line: EquipmentLine): GmInventory {
  return {
    ...inv,
    items: inv.items.map((it) => (it.id === itemId ? { ...it, line } : it)),
  };
}

/** Retire un objet de l'inventaire permanent. */
export function removeItem(inv: GmInventory, itemId: string): GmInventory {
  return { ...inv, items: inv.items.filter((it) => it.id !== itemId) };
}

/** Recatégorise un objet (glisser-déposer entre catégories). No-op si l'id est inconnu. */
export function moveItemToCategory(
  inv: GmInventory,
  itemId: string,
  categoryId: string | null,
): GmInventory {
  return {
    ...inv,
    items: inv.items.map((it) => (it.id === itemId ? { ...it, categoryId } : it)),
  };
}

/**
 * Relocalise un objet de la réserve ALÉATOIRE vers l'inventaire PERMANENT : retire
 * l'objet de `loot` (le `served` est abandonné, sans objet dans la réserve permanente),
 * l'ajoute à `inv` dans la catégorie donnée. `null` si `itemId` est introuvable dans
 * `loot` — l'appelant ne persiste rien dans ce cas.
 */
export function moveItemFromLootToInventory(
  loot: LootItem[],
  inv: GmInventory,
  itemId: string,
  categoryId: string | null,
): { loot: LootItem[]; inventory: GmInventory } | null {
  const found = loot.find((l) => l.id === itemId);
  if (!found) return null;
  return {
    loot: loot.filter((l) => l.id !== itemId),
    inventory: addItem(inv, { id: found.id, line: found.line, categoryId }),
  };
}

/**
 * Relocalise un objet de l'inventaire PERMANENT vers la réserve ALÉATOIRE : retire
 * l'objet de `inv` (la `categoryId` est abandonnée), l'ajoute à `loot` non-servi.
 * `null` si `itemId` est introuvable dans `inv.items`.
 */
export function moveItemFromInventoryToLoot(
  inv: GmInventory,
  loot: LootItem[],
  itemId: string,
): { inventory: GmInventory; loot: LootItem[] } | null {
  const found: GmInventoryItem | undefined = inv.items.find((it) => it.id === itemId);
  if (!found) return null;
  return {
    inventory: removeItem(inv, itemId),
    loot: [...loot, { id: found.id, line: found.line, served: false }],
  };
}
