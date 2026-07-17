/**
 * Résolution des objets d'inventaire (PER-211) — module pur.
 *
 * Deux services, tous deux à partir d'une ligne d'équipement :
 *  - `itemType(line)` : le TYPE de l'objet (arme, armure, bouclier, consommable,
 *    équipement, trésor, divers), pour l'icône et le classement de l'inventaire ;
 *  - `effectiveItem(ref)` : l'objet du catalogue **enrichi des surcharges d'instance**
 *    de la variante (`EquipmentRef.overrides`). C'est le POINT D'ENTRÉE UNIQUE pour
 *    lire une stat d'un objet du catalogue : tout ce qui lisait `equipmentById.get(id)`
 *    pour une VALEUR (DEF, DM, plafond AGI, nom…) doit passer par ici, afin qu'une
 *    variante contribue au moteur (défense, affichage) avec ses valeurs surchargées.
 *
 * Le SOUS-TYPE et la MAÎTRISE d'une variante restent portés par l'`itemId` de base
 * (jamais surchargés) : la maîtrise/le dé malus continuent de se calculer sur l'objet
 * du livre (voir `mastery.ts`), pas sur le résolveur.
 */
import { equipmentById } from '@/data';
import type { EquipmentItem } from '@/data/schema';
import type { EquipmentLine, EquipmentRef, ItemType } from './types';
import { isCustomItem } from './types';

/**
 * Type d'une ligne d'inventaire (PER-211). Pour un objet personnalisé, son `type`
 * déclaré (défaut `misc`, « Divers »). Pour une référence catalogue, le type se déduit
 * de la catégorie : `weapon`/`armor`/`shield` directement, et `gear` → `consumable`
 * s'il porte le drapeau `consumable` (potion, parchemin…), sinon `gear`. Un `itemId`
 * introuvable dans le catalogue retombe sur `misc`.
 */
export function itemType(line: EquipmentLine): ItemType {
  if (isCustomItem(line)) return line.type ?? 'misc';
  const item = equipmentById.get(line.itemId);
  if (!item) return 'misc';
  switch (item.category) {
    case 'weapon':
      return 'weapon';
    case 'armor':
      return 'armor';
    case 'shield':
      return 'shield';
    case 'gear':
      return item.consumable ? 'consumable' : 'gear';
  }
}

/**
 * Objet du catalogue résolu pour une référence, surcharges d'instance appliquées
 * (PER-211). Sans `overrides`, renvoie l'objet du catalogue tel quel (référence
 * partagée, aucune copie — comportement identique à l'ancien `equipmentById.get`).
 * Avec `overrides`, renvoie une COPIE où chaque stat présente écrase la valeur de base,
 * en ne retenant que les clés pertinentes pour la catégorie de la base (la catégorie
 * elle-même n'est jamais surchargée : elle définit le sous-type et la maîtrise).
 * `undefined` si l'`itemId` est introuvable.
 */
export function effectiveItem(ref: EquipmentRef): EquipmentItem | undefined {
  const base = equipmentById.get(ref.itemId);
  if (!base) return undefined;
  const o = ref.overrides;
  if (!o) return base;

  const result: EquipmentItem = { ...base };
  if (o.name !== undefined) result.name = o.name;
  switch (result.category) {
    case 'weapon':
      if (o.damage !== undefined) result.damage = o.damage;
      if (o.twoHandedDamage !== undefined) result.twoHandedDamage = o.twoHandedDamage;
      if (o.range !== undefined) result.range = o.range;
      if (o.weaponCategory !== undefined) result.weaponCategory = o.weaponCategory;
      break;
    case 'armor':
      if (o.def !== undefined) result.def = o.def;
      if (o.maxAgi !== undefined) result.maxAgi = o.maxAgi;
      break;
    case 'shield':
      if (o.def !== undefined) result.def = o.def;
      break;
    case 'gear':
      if (o.description !== undefined) result.description = o.description;
      break;
  }
  return result;
}
