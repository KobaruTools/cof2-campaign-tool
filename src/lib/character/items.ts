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
import type { EquipmentItem, WeaponCategory, WeaponDamage } from '@/data/schema';
import type { EquipmentLine, EquipmentOverrides, EquipmentRef, ItemType } from './types';
import { isCustomItem } from './types';

/** Catégorie MÉCANIQUE d'une variante (base du livre obligatoire) — cf. `snapshotOverrides`. */
export type MechanicalCategory = 'weapon' | 'armor' | 'shield';

/**
 * Valeurs de formulaire d'une variante mécanique (PER-214), telles que saisies dans la
 * modale de création/édition d'objet. Toutes pré-remplies depuis la base du livre. Les
 * champs sans rapport avec la catégorie sont simplement ignorés par `snapshotOverrides`.
 */
export interface MechanicalItemFields {
  name: string;
  description?: string;
  damage?: WeaponDamage;
  twoHandedDamage?: WeaponDamage;
  range?: string;
  weaponCategory?: WeaponCategory;
  def?: number;
  maxAgi?: number | null;
}

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
 * Ordre canonique d'affichage des 7 types d'objet (PER-221) : mécaniques d'abord
 * (arme → armure → bouclier), puis consommable → équipement → trésor → divers.
 * Source unique partagée par le regroupement de l'inventaire, le sélecteur d'ajout
 * (`EquipmentCatalogAutocomplete`) et le sélecteur de type (`ItemDialog`).
 */
export const ITEM_TYPE_ORDER: readonly ItemType[] = [
  'weapon',
  'armor',
  'shield',
  'consumable',
  'gear',
  'treasure',
  'misc',
];

/** Une ligne d'inventaire avec son index d'ORIGINE dans le tableau `equipment`. */
export interface EquipmentEntry {
  line: EquipmentLine;
  /** Index d'origine dans `Character.equipment` — sert aux mutations par index. */
  index: number;
}

/** Un groupe de lignes d'un même type d'objet (PER-221). */
export interface EquipmentGroup {
  type: ItemType;
  entries: EquipmentEntry[];
}

/**
 * Regroupe l'inventaire par type d'objet pour l'affichage « Organiser par catégorie »
 * (PER-221) — regroupement PUREMENT VISUEL : le tableau `equipment` n'est jamais
 * réordonné, chaque ligne conserve son `index` d'origine (indispensable aux mutations
 * par index de `EquipmentList`). Les groupes sortent dans l'ordre de `ITEM_TYPE_ORDER`,
 * les catégories vides sont omises, et l'ordre stocké est conservé À L'INTÉRIEUR de
 * chaque groupe (aucun tri secondaire — cohérent avec la liste à plat et le futur
 * réordonnancement manuel de PER-222).
 */
export function groupEquipmentByType(equipment: EquipmentLine[]): EquipmentGroup[] {
  const buckets = new Map<ItemType, EquipmentEntry[]>();
  equipment.forEach((line, index) => {
    const type = itemType(line);
    const bucket = buckets.get(type);
    if (bucket) bucket.push({ line, index });
    else buckets.set(type, [{ line, index }]);
  });
  return ITEM_TYPE_ORDER.filter((type) => buckets.has(type)).map((type) => ({
    type,
    entries: buckets.get(type)!,
  }));
}

/**
 * Réordonne l'inventaire (PER-222) : déplace la ligne d'index `from` à la position `to`,
 * en conservant l'ordre relatif des autres. `Character.equipment` étant un tableau où la
 * POSITION EST l'ordre d'affichage, réordonner = réécrire ce tableau (aucune migration).
 * Fonction PURE : ne mute jamais la source et renvoie toujours une NOUVELLE référence
 * (l'appelant remonte le résultat via `onChange`). Un index hors bornes (garde-fou) ou
 * `from === to` renvoie une simple copie inchangée.
 */
export function reorderEquipment(
  equipment: EquipmentLine[],
  from: number,
  to: number,
): EquipmentLine[] {
  const next = equipment.slice();
  if (from < 0 || from >= next.length || to < 0 || to >= next.length || from === to) return next;
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
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

/**
 * Construit les surcharges FIGÉES (`overrides`) d'une variante mécanique à partir des
 * valeurs de formulaire (PER-214). SNAPSHOT sans diff contre le catalogue : on capture
 * telles quelles les valeurs saisies (pré-remplies depuis la base), en ne retenant que
 * les clés pertinentes pour la catégorie de la base (la catégorie/le sous-type/la
 * maîtrise ne sont jamais surchargés). Le `name` est toujours capturé (obligatoire) ;
 * la `description` seulement si non vide. Les stats numériques (DEF, plafond AGI) sont
 * capturées dès qu'elles sont définies — `maxAgi: null` (pas de plafond) est une valeur
 * valide, distincte d'absente.
 */
export function snapshotOverrides(
  category: MechanicalCategory,
  fields: MechanicalItemFields,
): EquipmentOverrides {
  const o: EquipmentOverrides = { name: fields.name.trim() };
  const description = fields.description?.trim();
  if (description) o.description = description;
  switch (category) {
    case 'weapon':
      if (fields.damage) o.damage = fields.damage;
      if (fields.twoHandedDamage) o.twoHandedDamage = fields.twoHandedDamage;
      if (fields.range?.trim()) o.range = fields.range.trim();
      if (fields.weaponCategory !== undefined) o.weaponCategory = fields.weaponCategory;
      break;
    case 'armor':
      if (fields.def !== undefined) o.def = fields.def;
      if (fields.maxAgi !== undefined) o.maxAgi = fields.maxAgi;
      break;
    case 'shield':
      if (fields.def !== undefined) o.def = fields.def;
      break;
  }
  return o;
}
