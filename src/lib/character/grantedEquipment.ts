/**
 * OBJETS OCTROYÉS PAR UNE CAPACITÉ (PER-286) — module pur.
 *
 * Certaines capacités ne donnent pas un bonus mais un OBJET : la Couleuvrine de l'artilleur (r5,
 * p. 63) commence par « L'arquebusier OBTIENT une couleuvrine (un petit canon portatif) ». L'objet
 * n'a donc ni prix ni ligne de table — il arrive dans l'inventaire avec le rang.
 *
 * Deux moments d'application, tous deux alimentés par les résolveurs ci-dessous :
 *  - à la MONTÉE DE NIVEAU, l'objet est ajouté automatiquement avec la capacité choisie ;
 *  - sur une fiche DÉJÀ montée (rang acquis avant que la règle n'existe, ou objet supprimé par le
 *    joueur), l'inventaire RAPPELLE l'octroi et propose l'ajout — la fiche est permissive : on ne
 *    réimpose jamais un objet que le joueur a retiré, on le signale.
 *
 * La substitution sans poudre est déjà en DONNÉE (`Weapon.equivalentCrossbowId`, PER-234) : quand
 * les armes à feu sont interdites dans l'univers, la couleuvrine est remplacée par une baliste
 * (encadré « Poudre ou pas poudre ? », p. 62), comme la pétoire par l'arbalète de poing.
 */
import { equipmentById, featureById } from '@/data';
import { isCustomItem } from './types';
import type { Character, EquipmentLine, EquipmentRef } from './types';

/** Un objet octroyé par une capacité possédée, résolu pour CE personnage. */
export interface GrantedItem {
  /** Capacité qui l'octroie (`artilleur-r5`). */
  featureId: string;
  /** Objet EFFECTIVEMENT octroyé (couleuvrine, ou baliste si la poudre est interdite). */
  itemId: string;
  /** Nom d'affichage de l'objet octroyé. */
  name: string;
}

/**
 * Objet effectivement octroyé par une capacité : l'objet déclaré, ou son équivalent arbalète quand
 * les armes à feu sont interdites (`firearmsAllowed === false`). Un `itemId` inconnu du catalogue,
 * ou un équivalent manquant, renvoie `null` (aucune invention).
 */
export function grantedItemId(declaredItemId: string, firearmsAllowed: boolean): string | null {
  const item = equipmentById.get(declaredItemId);
  if (!item) return null;
  if (firearmsAllowed || item.category !== 'weapon' || item.rangedKind !== 'firearm') {
    return declaredItemId;
  }
  const replacement = item.equivalentCrossbowId;
  return replacement && equipmentById.has(replacement) ? replacement : null;
}

/**
 * Tous les objets octroyés par les capacités POSSÉDÉES, dans l'ordre de `featureIds`. Sert à la fois
 * à l'ajout automatique et au rappel d'inventaire.
 */
export function grantedItems(
  character: Pick<Character, 'featureIds'>,
  firearmsAllowed: boolean,
): GrantedItem[] {
  const items: GrantedItem[] = [];
  for (const featureId of character.featureIds) {
    const grant = featureById.get(featureId)?.grantsEquipment;
    if (!grant) continue;
    const itemId = grantedItemId(grant.itemId, firearmsAllowed);
    if (!itemId) continue;
    items.push({ featureId, itemId, name: equipmentById.get(itemId)?.name ?? itemId });
  }
  return items;
}

/**
 * Objets octroyés qui MANQUENT à l'inventaire. Une ligne du bon `itemId` suffit à considérer
 * l'octroi honoré, quelle que soit sa quantité ou ses surcharges de variante (le joueur a pu
 * renommer sa couleuvrine ou lui poser un enchantement : c'est toujours celle du rang).
 */
export function missingGrantedItems(
  character: Pick<Character, 'featureIds' | 'equipment'>,
  firearmsAllowed: boolean,
): GrantedItem[] {
  const owned = new Set(
    character.equipment.filter((line): line is EquipmentRef => !isCustomItem(line)).map((l) => l.itemId),
  );
  return grantedItems(character, firearmsAllowed).filter((g) => !owned.has(g.itemId));
}

/**
 * Équipement complété des objets octroyés manquants — appliqué à la MONTÉE DE NIVEAU, où la capacité
 * vient d'être acquise. Renvoie la MÊME référence si rien ne manque, pour ne pas produire d'écriture
 * inutile (même contrat que les réducteurs de chargement).
 */
export function withGrantedEquipment(
  character: Pick<Character, 'featureIds' | 'equipment'>,
  firearmsAllowed: boolean,
): EquipmentLine[] {
  const missing = missingGrantedItems(character, firearmsAllowed);
  if (missing.length === 0) return character.equipment;
  return [...character.equipment, ...missing.map((g) => ({ itemId: g.itemId, quantity: 1 }))];
}
