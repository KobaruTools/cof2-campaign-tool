import { equipmentById } from '@/data';
import type { WeaponKindIconId } from '@/data/item-icons';
import type { Weapon } from '@/data/schema';
import type { EquipmentLine } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';

/**
 * SOUS-TYPE D'ARME pour l'affichage — vocabulaire défini avec la donnée
 * (`WEAPON_KIND_ICON_IDS`, cf. `src/data/item-icons.ts`) puisqu'un objet du catalogue peut le
 * référencer et qu'il se persiste dans un personnage sauvegardé.
 *
 * Ce n'est NI une taxonomie de règles (`WeaponFamily`, qui sert aux prédilections et aux
 * maîtrises) NI un sous-type d'attaque à distance (`RangedWeaponKind`) : c'est la granularité à
 * laquelle une arme se reconnaît d'un coup d'œil, DÉRIVÉE des deux précédentes — d'où le fait
 * qu'aucune arme n'ait à déclarer son icône (cf. `weaponIconKindForWeapon`).
 *
 * Une icône par sous-type, cf. `WEAPON_KIND_ICON_PATHS` (`weaponKindIcons.ts`).
 */
export type WeaponIconKind = WeaponKindIconId;

/**
 * Armes que ni `weaponFamilies` ni `rangedKind` ne distinguent assez finement pour l'œil, et
 * qu'on désigne donc par leur `id` de catalogue. Trois cas :
 *
 *  - armes SANS famille de prédilection (bâton et bâton ferré p. 184, stylet, faux, pioche,
 *    trident, armes improvisées) — le livre les traite à part, elles n'ont aucune famille ;
 *  - armes dont la famille est trop large : le fléau est rangé dans `maces` (contondantes) mais
 *    ne ressemble pas à une masse ; les dagues et couteaux de lancer n'ont que `thrown` ;
 *  - la couleuvrine, `firearm` comme la pétoire et le mousquet, mais qui est un canon.
 *
 * Ces overrides passent AVANT la famille et le sous-type de tir (cf. `weaponIconKind`).
 */
const KIND_BY_ITEM_ID: Record<string, WeaponIconKind> = {
  baton: 'staff',
  'baton-ferre': 'staff',
  stylet: 'dagger',
  dague: 'dagger',
  'dague-de-lancer': 'dagger',
  'couteaux-de-lancer': 'dagger',
  fleau: 'flail',
  'fleau-a-deux-mains': 'flail',
  faux: 'scythe',
  pioche: 'pick',
  trident: 'trident',
  poele: 'pan',
  'rouleau-a-patisserie': 'rolling-pin',
  couleuvrine: 'cannon',
};

/** Sous-type de tir → sous-type d'icône, pour les armes qui n'existent QUE à distance. */
const KIND_BY_RANGED_KIND = {
  bow: 'bow',
  crossbow: 'crossbow',
  sling: 'sling',
  firearm: 'firearm',
} as const;

/**
 * Familles de prédilection → sous-type d'icône, dans cet ORDRE DE PRIORITÉ : une arme peut
 * appartenir à plusieurs familles et la première qui matche gagne. `hammers` passe donc avant
 * `maces` (le marteau de guerre est dans les deux, cf. `EXTRA_WEAPON_FAMILIES`), et toutes les
 * familles de contact passent avant `thrown` (la hachette est `['axes', 'thrown']` → une hache ;
 * l'épieu et la lance lancée sont `['polearms', 'thrown']` → des armes d'hast).
 */
const KIND_BY_FAMILY: readonly (readonly [string, WeaponIconKind])[] = [
  ['unarmed', 'unarmed'],
  ['swords', 'sword'],
  ['axes', 'axe'],
  ['hammers', 'hammer'],
  ['maces', 'mace'],
  ['polearms', 'polearm'],
  ['thrown', 'thrown'],
];

/**
 * Sous-type d'icône d'une ARME du catalogue (PER-306). Résolution PURE, en cascade :
 * override par `id` → sous-type de tir (arc / arbalète / fronde / poudre) → famille de
 * prédilection (contact d'abord, jet en dernier) → repli `sword`.
 *
 * Le repli couvre les armes futures du catalogue sans famille ni sous-type de tir : elles
 * gardent l'épée, exactement l'icône unique d'avant.
 */
export function weaponIconKindForWeapon(weapon: Weapon): WeaponIconKind {
  const override = KIND_BY_ITEM_ID[weapon.id];
  if (override) return override;
  if (weapon.rangedKind && weapon.rangedKind in KIND_BY_RANGED_KIND) {
    return KIND_BY_RANGED_KIND[weapon.rangedKind as keyof typeof KIND_BY_RANGED_KIND];
  }
  const families = weapon.weaponFamilies ?? [];
  for (const [family, kind] of KIND_BY_FAMILY) {
    if (families.includes(family as never)) return kind;
  }
  return 'sword';
}

/**
 * Sous-type d'icône d'une LIGNE d'inventaire, ou `null` quand la ligne n'est pas une arme du
 * catalogue — objet libre (aucune donnée d'arme à lire, il garde l'icône de son type) ou `itemId`
 * inconnu. L'identité se lit sur l'`itemId` de BASE : une variante ou un reskin (« Bâton noueux »
 * du druide, PER-181) ne change ni la forme de l'arme ni son icône.
 */
export function weaponIconKind(line: EquipmentLine): WeaponIconKind | null {
  if (isCustomItem(line)) return null;
  const item = equipmentById.get(line.itemId);
  if (!item || item.category !== 'weapon') return null;
  return weaponIconKindForWeapon(item);
}
