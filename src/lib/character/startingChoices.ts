/**
 * Choix d'équipement de départ « X ou Y » (PER-220) — reconnaissance des lignes
 * placeholder et de leurs options.
 *
 * Certains profils remettent, à la création, un CHOIX d'équipement (« Épée ou hache à
 * deux mains », « Dague ou hachette de lancer », lot du barbare — p. 79/87). Ces lignes
 * arrivent dans l'inventaire comme objets libres (`custom: true`) dont le NOM est le
 * texte du livre. On les reconnaît par ce nom — même mécanique que la « Bourse de 2d6 pa »
 * (`COIN_POUCH_ITEM_NAME`) —, sans champ stocké ni migration : les personnages créés
 * AVANT l'implémentation profitent aussitôt de la résolution.
 *
 * La table `label → options` est dérivée UNE FOIS des données de profil (`startingEquipment`
 * dont `choice` est défini). Fonction pure côté données de règles.
 */
import { classes } from '@/data';
import type { StartingEquipmentChoiceOption } from '@/data/schema';
import { isCustomItem, type EquipmentLine } from './types';

/** Table `libellé de la ligne → options concrètes`, construite au chargement du module. */
const OPTIONS_BY_LABEL: ReadonlyMap<string, StartingEquipmentChoiceOption[]> = (() => {
  const map = new Map<string, StartingEquipmentChoiceOption[]>();
  for (const characterClass of classes) {
    for (const ref of characterClass.startingEquipment) {
      if (ref.choice && ref.choice.length > 0) map.set(ref.label, ref.choice);
    }
  }
  return map;
})();

/**
 * Options de résolution d'une ligne de choix d'équipement de départ, ou `undefined` si
 * la ligne n'est pas un tel choix. Une ligne est un choix si c'est un objet libre dont
 * le nom correspond à un libellé de choix connu d'un profil.
 */
export function startingChoiceOptionsFor(
  line: EquipmentLine,
): StartingEquipmentChoiceOption[] | undefined {
  if (!isCustomItem(line)) return undefined;
  return OPTIONS_BY_LABEL.get(line.name);
}

/** `true` si la ligne est un choix d'équipement de départ non résolu (PER-220). */
export function isStartingChoiceLine(line: EquipmentLine): boolean {
  return startingChoiceOptionsFor(line) !== undefined;
}
