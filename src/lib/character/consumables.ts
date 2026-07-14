/**
 * Consommabilité d'une ligne d'inventaire : détermine si un objet peut être « utilisé »
 * (dépense d'une unité). Seuls les consommables — potions, parchemins et doses d'élixir
 * (voie des élixirs, p. 98) — exposent le bouton « Utiliser » sur la fiche ; le matériel
 * durable (armes, armures, montures, cordage…) n'est jamais « utilisé » de cette façon.
 */
import { equipmentById } from '@/data';
import { COIN_POUCH_ITEM_NAME } from '@/data/progression';
import { isCustomItem, type EquipmentLine } from './types';
import { isElixirItemName } from './elixirs';

/**
 * `true` si la ligne désigne un objet consommable. Un objet du catalogue l'est via son
 * drapeau `consumable` (potion de soins…) ; un objet personnalisé ne l'est que s'il s'agit
 * d'une dose d'élixir matérialisée (nom préfixé par `elixirItemName`) ou de la « Bourse de
 * 2d6 pa » du sac de départ (p. 31 : à l'usage, on tire les pa et la bourse est consommée —
 * cf. modale `CoinPouchDialog`). Tout autre objet libre est traité comme durable — l'éditeur
 * ne peut pas deviner sa consommabilité.
 */
export function isConsumable(line: EquipmentLine): boolean {
  if (isCustomItem(line)) return isElixirItemName(line.name) || line.name === COIN_POUCH_ITEM_NAME;
  const item = equipmentById.get(line.itemId);
  return item?.category === 'gear' && item.consumable === true;
}
