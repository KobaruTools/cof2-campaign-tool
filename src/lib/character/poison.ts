/**
 * GESTION DE POISON APPLIQUÉ AUX ARMES — voie du maître des poisons (p. 143, PER-74).
 *
 * Résolveurs PURS autour de l'état de jeu `Character.poisonedWeapons` (liste de `PoisonApplication`) :
 *  - repérage de la capacité qui débloque la gestion de poison (`Feature.poisonWeaponLoadout`, r5) ;
 *  - éligibilité des armes de l'inventaire ; assignation d'un `instanceId` stable à l'enduisage ;
 *  - vue enrichie des armes enduites (nettoyée des entrées orphelines) ;
 *  - déblocage du poison « affaiblissant » (possession de la capacité de r6).
 *
 * Les MUTATIONS (enduire / changer le type / dépenser / retirer) sont dans `sheetActions.ts` ; ce module
 * reste pur (aucune dépendance vers les composants). L'arme est toujours référencée par son
 * `EquipmentRef.instanceId` (pas par index — fragile au réordonnancement/suppression).
 */
import { featureById } from '@/data/index';
import type { PoisonKind, PoisonWeaponLoadout } from '@/data/schema';
import { effectiveItem } from './items';
import { isCustomItem } from './types';
import type { Character, EquipmentLine, EquipmentRef, PoisonApplication } from './types';

/** La capacité de gestion de poison POSSÉDÉE par le personnage (r5), ou `null`. */
export function poisonLoadoutFeature(
  character: Pick<Character, 'featureIds'>,
): { featureId: string; loadout: PoisonWeaponLoadout } | null {
  for (const featureId of character.featureIds) {
    const loadout = featureById.get(featureId)?.poisonWeaponLoadout;
    if (loadout) return { featureId, loadout };
  }
  return null;
}

/** Le personnage a-t-il débloqué le poison « affaiblissant » (possession de `weakeningUnlockedBy`, r6) ? */
export function weakeningUnlocked(character: Pick<Character, 'featureIds'>): boolean {
  const feature = poisonLoadoutFeature(character);
  const unlockedBy = feature?.loadout.weakeningUnlockedBy;
  return !!unlockedBy && character.featureIds.includes(unlockedBy);
}

/** Natures de poison disponibles pour ce personnage (toujours `quick` ; `weakening` si r6 acquis). */
export function availablePoisonKinds(character: Pick<Character, 'featureIds'>): PoisonKind[] {
  return weakeningUnlocked(character) ? ['quick', 'weakening'] : ['quick'];
}

/** Une ligne d'équipement est-elle une ARME de catalogue enduisable (contact OU distance) ? */
export function isPoisonableWeaponLine(line: EquipmentLine): line is EquipmentRef {
  if (isCustomItem(line)) return false;
  const item = effectiveItem(line);
  return item?.category === 'weapon' && (!!item.melee || !!item.ranged);
}

/** Nom d'affichage d'une arme (surcharges de variante appliquées). */
export function weaponLineName(line: EquipmentRef): string {
  return effectiveItem(line)?.name ?? line.itemId;
}

/** Ligne d'équipement portant cet `instanceId`, ou `null` (arme supprimée = référence orpheline). */
export function equipmentLineByInstanceId(
  equipment: EquipmentLine[],
  instanceId: string,
): EquipmentRef | null {
  for (const line of equipment) {
    if (!isCustomItem(line) && line.instanceId === instanceId) return line;
  }
  return null;
}

/** Arme enduite, enrichie de sa ligne d'équipement résolue et de son nom. */
export interface PoisonedWeaponView {
  application: PoisonApplication;
  line: EquipmentRef;
  name: string;
}

/**
 * Vue des armes enduites, DÉBARRASSÉE des entrées orphelines (instanceId qui ne correspond plus à
 * aucune arme de l'inventaire). Ordre = celui de `Character.poisonedWeapons`.
 */
export function poisonedWeaponsView(
  character: Pick<Character, 'poisonedWeapons' | 'equipment'>,
): PoisonedWeaponView[] {
  const views: PoisonedWeaponView[] = [];
  for (const application of character.poisonedWeapons ?? []) {
    const line = equipmentLineByInstanceId(character.equipment, application.instanceId);
    if (!line) continue; // orpheline : arme supprimée → ignorée
    views.push({ application, line, name: weaponLineName(line) });
  }
  return views;
}

/**
 * Liste des `PoisonApplication` valides (orphelines retirées), utilisée pour NETTOYER l'état après une
 * suppression d'arme. Renvoie une nouvelle liste ; l'ordre est préservé.
 */
export function prunePoisonedWeapons(
  character: Pick<Character, 'poisonedWeapons' | 'equipment'>,
): PoisonApplication[] {
  return (character.poisonedWeapons ?? []).filter(
    (a) => equipmentLineByInstanceId(character.equipment, a.instanceId) !== null,
  );
}
