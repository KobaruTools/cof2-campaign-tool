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

/** Équipement de départ d'un profil + sac d'aventurier, en lignes du modèle. */
export function initialEquipment(characterClass: CharacterClass): EquipmentLine[] {
  const lines: EquipmentLine[] = [];
  for (const ref of [...characterClass.startingEquipment, ...progression.adventurerPack]) {
    if (ref.itemId) {
      lines.push({ itemId: ref.itemId, quantity: ref.quantity });
    } else {
      lines.push({ custom: true, name: ref.label, quantity: ref.quantity });
    }
  }
  return lines;
}

/** Libellé d'affichage d'une ligne d'équipement. */
export function equipmentLabel(line: EquipmentLine): string {
  if (isCustomItem(line)) return line.name;
  return equipmentById.get(line.itemId)?.name ?? line.itemId;
}

/** Contribution de l'équipement porté à la défense (armures + boucliers). */
export function defenseFromEquipment(equipment: EquipmentLine[]): DefenseEquipment {
  let defBonus = 0;
  let maxAgi: number | null = null;
  for (const line of equipment) {
    if (isCustomItem(line)) continue;
    const item = equipmentById.get(line.itemId);
    if (!item) continue;
    if (item.category === 'armor') {
      defBonus += item.def;
      if (item.maxAgi !== null) maxAgi = maxAgi === null ? item.maxAgi : Math.min(maxAgi, item.maxAgi);
    } else if (item.category === 'shield') {
      defBonus += item.def;
    }
  }
  return { defBonus, maxAgi };
}
