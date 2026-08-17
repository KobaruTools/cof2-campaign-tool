/**
 * Sélection d'un animal RÉEL du bestiaire pour « Forme animale » (animaux-r5) et la voie de
 * prestige du changeforme (PER-375/PER-435), filtrée par TAILLE seulement — le livre (p. 266)
 * fournit des profils GÉNÉRIQUES par taille pour les petits animaux (« Animal minuscule/petit/
 * très petit ») en précisant qu'ils servent aussi pour ce sort ; il n'y a pas de classification
 * fiable par classe taxonomique (mammifère/oiseau/…) dans le bestiaire actuel. La catégorie
 * maîtrisée (`animalFormCategories`, `animalForms.ts`) reste une note informative, pas un filtre.
 */
import { CREATURE_SIZES, type CreatureSize } from '@/data/schema';
import type { Character } from './types';

/** Taille max de base de « Forme animale » (« taille moyenne ou inférieure », p. 114). */
const BASE_MAX_SIZE: CreatureSize = 'moyenne';

/**
 * Taille maximale accessible pour la forme choisie. La voie du changeforme élève ce plafond par
 * rang (r7 = grande, r8 = énorme) ; r6 l'élargit en FLAVOR (animaux géants/préhistoriques) sans
 * changer le plafond, toujours « sans dépasser la taille M » (p. 170).
 */
export function maxAnimalFormSize(character: Character): CreatureSize {
  if (character.featureIds.includes('prestige-changeforme-r8')) return 'enorme';
  if (character.featureIds.includes('prestige-changeforme-r7')) return 'grande';
  return BASE_MAX_SIZE;
}

/** Une créature de cette taille rentre-t-elle dans le plafond `max` ? */
export function sizeWithinLimit(size: CreatureSize | undefined, max: CreatureSize): boolean {
  if (!size) return false;
  return CREATURE_SIZES.indexOf(size) <= CREATURE_SIZES.indexOf(max);
}
