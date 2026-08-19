/**
 * Sélection d'un animal RÉEL du bestiaire pour « Forme animale » (animaux-r5) et la voie de
 * prestige du changeforme (PER-375/PER-435), filtrée par TAILLE, par catégorie taxonomique
 * connue (`knownAnimalFormCategoryIds`, `animalForms.ts`, comparée à `Creature.animalFormCategory`)
 * et par accès aux variantes géantes/préhistoriques (`Creature.animalFormFlavor`, débloquées au
 * rang 6 du changeforme, p. 170). Les créatures sans `animalFormCategory` (gabarits génériques
 * du livre type « Animal petit », ou contenu pas encore tagué) ne sont PAS restreintes par
 * catégorie — repli permissif plutôt qu'une classification devinée.
 */
import { CREATURE_SIZES, type CreatureSize } from '@/data/schema';
import type { Character } from './types';

/**
 * Le personnage a-t-il accès aux formes animales GÉANTES ou PRÉHISTORIQUES (p. 170, rang 6
 * du changeforme : « peut prendre la forme des animaux géants ou préhistoriques ») ? r7/r8
 * impliquent normalement r6 (rangs d'une même voie acquis dans l'ordre), vérifiés par
 * sécurité.
 */
export function hasGiantOrPrehistoricAnimalFormAccess(character: Character): boolean {
  return (
    character.featureIds.includes('prestige-changeforme-r6') ||
    character.featureIds.includes('prestige-changeforme-r7') ||
    character.featureIds.includes('prestige-changeforme-r8')
  );
}

/**
 * Créatures du bestiaire à exclure de « Forme animale » malgré une taille/catégorie
 * compatibles : la « Nuée de bestioles » (p. 145) n'est PAS un individu mais un
 * regroupement (« les caractéristiques données ici correspondent à un groupe de
 * créatures ») — un PJ ne peut pas se transformer en nuée. Non tagué par
 * `animalFormCategory` (le filtre par catégorie de `animalForms.ts` est permissif sur
 * les créatures non taguées), d'où cette liste noire explicite par id.
 */
const ANIMAL_FORM_EXCLUDED_IDS = new Set(['nuee-de-bestioles']);

/** La créature (par id/slug) est-elle éligible à « Forme animale » ? */
export function isEligibleAnimalForm(id: string): boolean {
  return !ANIMAL_FORM_EXCLUDED_IDS.has(id);
}

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
