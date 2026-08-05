import {
  ITEM_SUBCATEGORY_ICON_IDS,
  WEAPON_KIND_ICON_IDS,
  type ItemIconId,
  type ItemSubcategoryIcon,
} from '@/data/item-icons';
import { equipmentById } from '@/data';
import { isCustomItem, type EquipmentLine, type ItemType } from '@/lib/character/types';
import { itemType } from '@/lib/character/items';
import { weaponIconKind } from '@/lib/ui/weaponKind';
import { ITEM_TYPE_ICON_PATHS } from '@/lib/ui/itemTypeIcons';
import { WEAPON_KIND_ICON_PATHS } from '@/lib/ui/weaponKindIcons';
import { ITEM_SUBCATEGORY_ICON_PATHS } from '@/lib/ui/itemIcons';

/**
 * Markup SVG interne de N'IMPORTE QUEL id d'icône d'objet, les trois étages du vocabulaire
 * confondus (type d'objet, sous-type d'arme, sous-catégorie). Chaîne vide si l'id est inconnu —
 * cas qui ne devrait pas arriver (vocabulaire fermé), garanti par `itemIcon.test.ts`.
 */
export function itemIconMarkup(id: ItemIconId): string {
  return (
    ITEM_SUBCATEGORY_ICON_PATHS[id as ItemSubcategoryIcon] ??
    WEAPON_KIND_ICON_PATHS[id as never] ??
    ITEM_TYPE_ICON_PATHS[id as ItemType] ??
    ''
  );
}

/**
 * Icône d'une LIGNE d'inventaire, en cascade du plus précis au plus général :
 *
 *  1. `line.icon` — le CHOIX EXPLICITE du joueur (objet libre, ou variante d'un objet du livre) ;
 *  2. `catalogItem.icon` — la sous-catégorie déclarée par la donnée du livre (corde, grappin,
 *     cotte de mailles…) ;
 *  3. le sous-type d'arme DÉRIVÉ des règles (`weaponIconKind`) — aucune arme n'a besoin d'être
 *     annotée, et une arme ajoutée au catalogue hérite automatiquement de la bonne icône ;
 *  4. l'icône du TYPE d'objet — repli final (comportement d'origine).
 *
 * L'identité se lit sur l'`itemId` de BASE : une variante ou un reskin (« Bâton noueux » du
 * druide) ne change pas l'objet, donc pas son icône — sauf choix explicite du joueur (étage 1).
 */
export function itemIconId(line: EquipmentLine): ItemIconId {
  return line.icon ?? defaultItemIconId(line);
}

/**
 * Icône par DÉFAUT d'une ligne, c'est-à-dire ce que la cascade donnerait SANS choix explicite
 * (étages 2 à 4). Sert au sélecteur d'icône : c'est la valeur pré-sélectionnée, et celle sur
 * laquelle « Par défaut » remet la ligne (en effaçant `icon`).
 */
export function defaultItemIconId(line: EquipmentLine): ItemIconId {
  if (!isCustomItem(line)) {
    const item = equipmentById.get(line.itemId);
    if (item?.icon) return item.icon;
    const kind = weaponIconKind(line);
    if (kind) return kind;
  }
  return itemType(line);
}

/** Un groupe d'icônes du sélecteur : un libellé FR et ses ids, dans l'ordre d'affichage. */
export interface ItemIconGroup {
  label: string;
  ids: readonly ItemIconId[];
}

/** Ids de sous-catégorie regroupés par thème pour le sélecteur (source unique de l'ordre). */
const SUBCATEGORY_GROUPS: readonly (readonly ItemSubcategoryIcon[])[] = [
  ['clothes', 'padded-armor', 'leather-armor', 'studded-armor', 'mail-shirt', 'heavy-mail', 'plate-armor', 'full-plate', 'small-shield', 'large-shield', 'cloak', 'boots'],
  ['potion', 'herbs', 'bandage', 'ration', 'mess-kit', 'waterskin', 'mug'],
  ['rope', 'grapple', 'torch', 'lantern', 'lamp-oil', 'tinderbox', 'blanket', 'tent', 'backpack', 'lockpicks', 'quiver', 'writing-kit', 'instrument', 'key'],
  ['spellbook', 'scroll', 'wand', 'holy-symbol', 'amulet', 'ring'],
  ['precious-metal', 'gems', 'coins', 'pouch', 'chest', 'octopus'],
];

/**
 * Icônes proposées au joueur, groupées et libellées en français. Couvre TOUT le vocabulaire :
 * les 20 sous-types d'arme (un objet libre peut être une arme), les sous-catégories, et enfin
 * les 7 icônes de type comme repli générique — ordre pensé pour que l'icône par défaut d'un
 * objet libre (son type) reste trouvable.
 */
export const ITEM_ICON_PICKER_GROUPS: readonly ItemIconGroup[] = [
  { label: 'Armes', ids: WEAPON_KIND_ICON_IDS },
  { label: 'Protections et vêtements', ids: SUBCATEGORY_GROUPS[0] },
  { label: 'Consommables et vivres', ids: SUBCATEGORY_GROUPS[1] },
  { label: 'Matériel d’aventure', ids: SUBCATEGORY_GROUPS[2] },
  { label: 'Livres et objets mystiques', ids: SUBCATEGORY_GROUPS[3] },
  { label: 'Trésors et richesses', ids: SUBCATEGORY_GROUPS[4] },
  { label: 'Catégories générales', ids: ['weapon', 'armor', 'shield', 'consumable', 'gear', 'treasure', 'misc'] },
];

/**
 * Libellé FR de chaque icône, pour l'info-bulle du sélecteur et son accessibilité. Une icône
 * sans libellé retombe sur son id (garde-fou : `itemIcon.test.ts` exige la couverture totale).
 */
export const ITEM_ICON_LABELS: Record<ItemIconId, string> = {
  // Types d'objet
  weapon: 'Arme',
  armor: 'Armure',
  shield: 'Bouclier',
  consumable: 'Consommable',
  gear: 'Équipement',
  treasure: 'Trésor',
  misc: 'Divers',
  // Sous-types d'arme
  sword: 'Épée',
  dagger: 'Dague',
  axe: 'Hache',
  hammer: 'Marteau',
  mace: 'Masse',
  flail: 'Fléau',
  polearm: 'Arme d’hast',
  trident: 'Trident',
  scythe: 'Faux',
  pick: 'Pioche',
  staff: 'Bâton',
  unarmed: 'Mains nues',
  bow: 'Arc',
  crossbow: 'Arbalète',
  sling: 'Fronde',
  firearm: 'Arme à poudre',
  cannon: 'Canon',
  thrown: 'Arme de jet',
  pan: 'Poêle',
  'rolling-pin': 'Rouleau à pâtisserie',
  // Sous-catégories
  clothes: 'Vêtements',
  'padded-armor': 'Tissus matelassés, fourrures',
  'leather-armor': 'Cuir',
  'studded-armor': 'Cuir renforcé, broigne',
  'mail-shirt': 'Chemise de mailles',
  'heavy-mail': 'Cotte de mailles',
  'plate-armor': 'Plaques',
  'full-plate': 'Plaque complète',
  'small-shield': 'Petit bouclier',
  'large-shield': 'Grand bouclier',
  rope: 'Corde',
  grapple: 'Grappin',
  tinderbox: 'Briquet, allume-feu',
  quiver: 'Carquois, munitions',
  blanket: 'Couverture',
  lantern: 'Lanterne',
  'lamp-oil': 'Huile, amphore',
  torch: 'Torche',
  'writing-kit': 'Matériel d’écriture',
  lockpicks: 'Outils de crochetage',
  potion: 'Potion',
  ration: 'Vivres, ration',
  'mess-kit': 'Gamelle, popote',
  waterskin: 'Outre, gourde',
  backpack: 'Sac à dos',
  spellbook: 'Grimoire',
  instrument: 'Instrument de musique',
  'precious-metal': 'Métal précieux',
  mug: 'Chope, récipient',
  octopus: 'Créature aquatique',
  scroll: 'Parchemin',
  gems: 'Gemmes',
  coins: 'Pièces',
  key: 'Clé',
  chest: 'Coffre',
  pouch: 'Bourse',
  wand: 'Baguette',
  tent: 'Tente',
  ring: 'Anneau',
  amulet: 'Amulette',
  cloak: 'Cape',
  boots: 'Bottes',
  herbs: 'Herbes',
  bandage: 'Bandages',
  'holy-symbol': 'Symbole sacré',
};

/** Libellé FR d'une icône, avec repli sur son id (jamais vide). */
export function itemIconLabel(id: ItemIconId): string {
  return ITEM_ICON_LABELS[id] ?? id;
}

/** Tous les ids offerts par le sélecteur (à plat) — sert aux tests d'exhaustivité. */
export const PICKER_ICON_IDS: readonly ItemIconId[] = [
  ...ITEM_ICON_PICKER_GROUPS.flatMap((g) => g.ids),
];

/** Ids de sous-catégorie non proposés par le sélecteur (garde-fou de complétude). */
export const UNPICKABLE_SUBCATEGORY_IDS: readonly ItemSubcategoryIcon[] =
  ITEM_SUBCATEGORY_ICON_IDS.filter((id) => !PICKER_ICON_IDS.includes(id));
