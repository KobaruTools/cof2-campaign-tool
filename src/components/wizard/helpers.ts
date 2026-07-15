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
      lines.push({ custom: true, name: ref.label, quantity: ref.quantity });
    }
  }
  return autoEquipStartingGear(lines);
}

/**
 * Libellé d'affichage d'une ligne d'équipement. `characterClass` optionnel :
 * quand il est fourni, applique les reskins d'objet du profil (PER-181, ex. druide
 * `baton-ferre` → « Bâton noueux »). Absent → nom du catalogue tel quel.
 */
export function equipmentLabel(line: EquipmentLine, characterClass?: CharacterClass): string {
  if (isCustomItem(line)) return line.name;
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
 * Le bonus magique éventuel de l'armure portée (`EquipmentRef.magicDef`, PER-85) est
 * tenu SÉPARÉ de la DEF mondaine (`magicDefBonus`) : il compte dans la DEF totale mais
 * reste distinct pour le surcoût de mana des sorts en armure (p. 178, PER-82). Il n'est
 * lu QUE sur l'armure portée (hors périmètre : boucliers/armes ; ignoré si rangée).
 */
export function defenseFromEquipment(equipment: EquipmentLine[]): DefenseEquipment {
  let defBonus = 0;
  let magicDefBonus = 0;
  let maxAgi: number | null = null;
  let armorCounted = false;
  let shieldCounted = false;
  for (const line of equipment) {
    if (isCustomItem(line) || !line.worn) continue;
    const item = equipmentById.get(line.itemId);
    if (!item) continue;
    if (item.category === 'armor' && !armorCounted) {
      defBonus += item.def;
      magicDefBonus += line.magicDef ?? 0;
      maxAgi = item.maxAgi;
      armorCounted = true;
    } else if (item.category === 'shield' && !shieldCounted) {
      defBonus += item.def;
      shieldCounted = true;
    }
  }
  return { defBonus, maxAgi, magicDefBonus };
}
