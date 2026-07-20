/**
 * Aides du wizard de création (calculs UI purs).
 */
import { equipmentById, progression } from '@/data';
import { valueSets as valueSetsData } from '@/data/value-sets';
import type { AbilityId, CharacterClass } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import type { EquipmentLine } from '@/lib/character/types';
import type { DefenseEquipment } from '@/lib/engine';
import { isCustomItem } from '@/lib/character/types';
import { autoEquipStartingGear } from '@/lib/character/equipment';
import { effectiveItem } from '@/lib/character/items';
import { reskinnedItemName } from '@/lib/character/classDisplay';

export const valueSets = valueSetsData;

/**
 * Répartit les 7 valeurs d'une série sur les caractéristiques : les plus
 * fortes d'abord sur les caractéristiques conseillées du profil, le reste sur
 * les autres dans l'ordre canonique.
 */
export function distributeValueSet(values: number[], recommended: AbilityId[]): Record<AbilityId, number> {
  const sorted = [...values].sort((a, b) => b - a);
  const order: AbilityId[] = [
    ...recommended.filter((c, i) => recommended.indexOf(c) === i),
    ...ABILITY_IDS.filter((c) => !recommended.includes(c)),
  ];
  const out = {} as Record<AbilityId, number>;
  order.forEach((id, i) => {
    out[id] = sorted[i] ?? 0;
  });
  return out;
}

/**
 * Équipement de départ d'un profil + sac d'aventurier, en lignes du modèle. Le
 * matériel de base est auto-équipé (meilleure armure, meilleur bouclier, première
 * arme) pour qu'une création parte protégée/armée dès le wizard, sans attendre
 * l'UI d'équipement manuel (PER-77) — même logique que la migration v16→v17.
 */
export function initialEquipment(characterClass: CharacterClass): EquipmentLine[] {
  const lines: EquipmentLine[] = [];
  for (const ref of [...characterClass.startingEquipment, ...progression.adventurerPack]) {
    if (ref.itemId) {
      lines.push({ itemId: ref.itemId, quantity: ref.quantity });
    } else {
      // Placeholder libre (`itemId: null`) : simple ligne custom nommée par le libellé du
      // livre. Un choix « X ou Y » (PER-220) est reconnu à l'affichage PAR SON NOM
      // (`startingChoiceOptionsFor`), comme la « Bourse de 2d6 pa » — pas de champ stocké.
      lines.push({ custom: true, name: ref.label, quantity: ref.quantity });
    }
  }
  return autoEquipStartingGear(lines);
}

/**
 * Libellé d'affichage d'une ligne d'équipement. `characterClass` optionnel :
 * quand il est fourni, applique les reskins d'objet du profil (PER-181, ex. druide
 * `baton-ferre` → « Bâton noueux »). Absent → nom du catalogue tel quel.
 *
 * Le nom d'une VARIANTE (`overrides.name`, PER-211) prime : il a été choisi
 * explicitement par le joueur et court-circuite le reskin de profil.
 */
export function equipmentLabel(line: EquipmentLine, characterClass?: CharacterClass): string {
  if (isCustomItem(line)) return line.name;
  if (line.overrides?.name) return line.overrides.name;
  const name = equipmentById.get(line.itemId)?.name ?? line.itemId;
  return reskinnedItemName(characterClass, line.itemId, name);
}

/**
 * Contribution de l'équipement PORTÉ à la défense (armure + bouclier), p. 188.
 *
 * Depuis PER-76 le calcul ne considère que les objets marqués `worn` : une armure
 * ou un bouclier rangé dans le sac ne compte pas. On ne retient qu'UNE armure et
 * qu'UN bouclier portés (les premiers rencontrés) — le modèle vise ≤ 1 de chaque,
 * et cette garde rend le cumul erroné d'antan structurellement impossible même sur
 * des données incohérentes. L'AGI maximale provient de l'armure portée (les
 * boucliers n'en imposent pas, colonne « — » p. 188).
 *
 * Le bonus magique éventuel (`magicDef`, PER-85 généralisé) est tenu SÉPARÉ de la DEF
 * mondaine (`magicDefBonus`) : il compte dans la DEF totale mais reste distinct pour le
 * surcoût de mana des sorts en armure (p. 178, PER-82). Il est lu sur N'IMPORTE QUEL
 * objet PORTÉ (armure de corps, mais aussi bottes/cape/anneau en `accessory`, y compris
 * un objet libre) et tous les bonus se CUMULENT ; ignoré si l'objet est rangé.
 */
export function defenseFromEquipment(equipment: EquipmentLine[]): DefenseEquipment {
  let defBonus = 0;
  let magicDefBonus = 0;
  let maxAgi: number | null = null;
  let armorCounted = false;
  let shieldCounted = false;
  for (const line of equipment) {
    if (!line.worn) continue;
    // Bonus de DEF MAGIQUE : porté par tout objet équipé (custom compris) et cumulable.
    magicDefBonus += line.magicDef ?? 0;
    // La DEF MONDAINE et le plafond d'AGI ne proviennent que du catalogue (une armure de
    // corps + un bouclier au plus) ; un objet libre n'a pas de stats mondaines connues.
    if (isCustomItem(line)) continue;
    // Résolveur de variante (PER-211) : DEF/plafond AGI EFFECTIFS (surcharges d'instance
    // appliquées), pas les seules valeurs du catalogue.
    const item = effectiveItem(line);
    if (!item) continue;
    if (item.category === 'armor' && !armorCounted) {
      defBonus += item.def;
      maxAgi = item.maxAgi;
      armorCounted = true;
    } else if (item.category === 'shield' && !shieldCounted) {
      defBonus += item.def;
      shieldCounted = true;
    }
  }
  return { defBonus, maxAgi, magicDefBonus };
}
