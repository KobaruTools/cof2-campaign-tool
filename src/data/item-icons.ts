/**
 * VOCABULAIRE DES ICÔNES D'OBJET — ids seuls, sans SVG ni libellé.
 *
 * C'est de la **donnée** et non de l'UI : chaque objet du catalogue désigne son icône par un
 * de ces ids (`EquipmentItem.icon`, cf. `schema.ts`), et une ligne d'inventaire peut la
 * surcharger (`EquipmentRef.icon` / `CustomItem.icon`) — un id persisté dans un personnage
 * sauvegardé. D'où le vocabulaire FERMÉ, versionné avec la donnée, et découplé des tables de
 * markup SVG (`src/lib/ui/*Icons.ts`, générées depuis game-icons.net) et de la résolution
 * (`src/lib/ui/itemIcon.ts`).
 *
 * Trois étages, du plus général au plus précis :
 *  1. `ITEM_TYPE_ICON_IDS` — les 7 TYPES d'objet (`ItemType`), repli de dernier recours ;
 *  2. `WEAPON_KIND_ICON_IDS` — les 20 SOUS-TYPES d'arme, DÉRIVÉS des règles (familles de
 *     prédilection + sous-type de tir, cf. `weaponIconKind`) : aucune arme n'a besoin de
 *     déclarer son icône, mais elle peut la surcharger ;
 *  3. `ITEM_SUBCATEGORY_ICON_IDS` — les SOUS-CATÉGORIES du reste de l'inventaire (corde,
 *     grappin, lanterne, cotte de mailles…), plus un jeu d'icônes « libres » (parchemin,
 *     gemmes, anneau, cape…) absentes du catalogue mais utiles à un objet personnalisé.
 */

/** Les 7 types d'objet (miroir volontaire de `ItemType`, cf. `src/lib/character/types.ts`). */
export const ITEM_TYPE_ICON_IDS = [
  'weapon',
  'armor',
  'shield',
  'consumable',
  'gear',
  'treasure',
  'misc',
] as const;

/** Les 20 sous-types d'arme (résolus par `weaponIconKind`, surchargeables en donnée). */
export const WEAPON_KIND_ICON_IDS = [
  'sword',
  'dagger',
  'axe',
  'hammer',
  'mace',
  'flail',
  'polearm',
  'trident',
  'scythe',
  'pick',
  'staff',
  'unarmed',
  'bow',
  'crossbow',
  'sling',
  'firearm',
  'cannon',
  'thrown',
  'pan',
  'rolling-pin',
] as const;

/**
 * Sous-catégories du reste de l'inventaire. Les 30 premières sont portées par un objet du
 * catalogue (`EquipmentItem.icon`) ; les 15 dernières n'existent que pour le sélecteur d'icône
 * d'un objet personnalisé — c'est justement ce que le livre ne catalogue pas (bijoux, capes,
 * parchemins…).
 */
export const ITEM_SUBCATEGORY_ICON_IDS = [
  // Protections
  'clothes',
  'padded-armor',
  'leather-armor',
  'studded-armor',
  'mail-shirt',
  'heavy-mail',
  'plate-armor',
  'full-plate',
  'small-shield',
  'large-shield',
  // Équipement du catalogue
  'rope',
  'grapple',
  'tinderbox',
  'quiver',
  'blanket',
  'lantern',
  'lamp-oil',
  'torch',
  'writing-kit',
  'lockpicks',
  'potion',
  'ration',
  'mess-kit',
  'waterskin',
  'backpack',
  'spellbook',
  'instrument',
  'precious-metal',
  'mug',
  'octopus',
  // Icônes libres (hors catalogue), pour les objets personnalisés
  'scroll',
  'gems',
  'coins',
  'key',
  'chest',
  'pouch',
  'wand',
  'tent',
  'ring',
  'amulet',
  'cloak',
  'boots',
  'herbs',
  'bandage',
  'holy-symbol',
] as const;

export type ItemTypeIconId = (typeof ITEM_TYPE_ICON_IDS)[number];
export type WeaponKindIconId = (typeof WEAPON_KIND_ICON_IDS)[number];
export type ItemSubcategoryIcon = (typeof ITEM_SUBCATEGORY_ICON_IDS)[number];

/** Tout id d'icône affichable pour une ligne d'inventaire, les trois étages confondus. */
export type ItemIconId = ItemTypeIconId | WeaponKindIconId | ItemSubcategoryIcon;

/** Les ids des trois étages, dans l'ordre du général au précis (audit, tests d'exhaustivité). */
export const ITEM_ICON_IDS: readonly ItemIconId[] = [
  ...ITEM_TYPE_ICON_IDS,
  ...WEAPON_KIND_ICON_IDS,
  ...ITEM_SUBCATEGORY_ICON_IDS,
];
