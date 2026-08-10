/**
 * Don d'objet ENTRE JOUEURS, sans validation du MJ (PER-388). Un enchanteur peut fabriquer un
 * objet magique ; ce module calcule ce qu'il en reste chez le DONNEUR et l'objet à transmettre au
 * receveur. La persistance chez le receveur n'a PAS sa place ici (fonction pure, sans réseau) :
 * elle passe par la RPC `give_item_to_character` (migration 0021), seul chemin autorisé à écrire
 * sur la fiche d'un AUTRE joueur (RLS `characters_player_update_own`, migration 0002) — voir
 * `stores/characters.ts`.
 *
 * Deux garde-fous validés par le propriétaire avant le code :
 *  - un objet PORTÉ ne peut pas être donné (il faut d'abord le déséquiper) ;
 *  - un objet qui porte un état d'INSTANCE (arme empoisonnée, charges, munitions chargées,
 *    chargeur, second canon) ne peut être donné qu'EN ENTIER — partager une partie de cet état
 *    n'aurait aucun sens (quel exemplaire garde le poison ?).
 */
import { isCustomItem, type EquipmentLine } from './types';

/** L'objet porte-t-il un état d'INSTANCE qui empêche de n'en donner qu'une partie de la pile ? */
function hasInstanceState(line: EquipmentLine): boolean {
  if (isCustomItem(line)) return !!line.charges;
  return !!(line.instanceId || line.charges || line.loaded || line.magazine || line.doubleBarrel);
}

/** L'objet peut-il être donné ? Un objet PORTÉ doit d'abord être déséquipé (retour propriétaire). */
export function canGiveEquipmentLine(line: EquipmentLine): boolean {
  return line.worn === undefined;
}

/** Quantité maximale donnable en un seul don (toute la pile). */
export function maxGivableQuantity(line: EquipmentLine): number {
  return line.quantity;
}

/** Un don PARTIEL (moins que toute la pile) est-il possible sur cet objet ? */
export function isSplittableEquipmentLine(line: EquipmentLine): boolean {
  return !hasInstanceState(line);
}

/** Objet transmis au receveur : dépouillé du port et de l'identité d'instance du donneur. */
function stripForReceiver(line: EquipmentLine, quantity: number): EquipmentLine {
  const clone: EquipmentLine = { ...line, quantity };
  delete clone.worn;
  if (!isCustomItem(clone)) delete clone.instanceId;
  return clone;
}

export interface ItemTransferPlan {
  /** Nouvel inventaire du DONNEUR (ligne retirée, ou quantité décrémentée). */
  giverEquipment: EquipmentLine[];
  /** Objet à transmettre au receveur (quantité donnée). */
  itemForReceiver: EquipmentLine;
}

/**
 * Calcule le don de la ligne `index` de `equipment`, à hauteur de `quantity`. `null` si le don
 * est invalide (ligne introuvable, objet porté, quantité hors bornes, ou don PARTIEL d'un objet
 * non partageable) — l'appelant n'écrit alors rien, ni chez le donneur ni chez le receveur.
 */
export function planItemTransfer(
  equipment: readonly EquipmentLine[],
  index: number,
  quantity: number,
): ItemTransferPlan | null {
  const line = equipment[index];
  if (!line) return null;
  if (!canGiveEquipmentLine(line)) return null;
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > line.quantity) return null;
  if (quantity < line.quantity && !isSplittableEquipmentLine(line)) return null;

  const giverEquipment =
    quantity === line.quantity
      ? equipment.filter((_, i) => i !== index)
      : equipment.map((l, i) => (i === index ? { ...l, quantity: l.quantity - quantity } : l));

  return { giverEquipment, itemForReceiver: stripForReceiver(line, quantity) };
}
