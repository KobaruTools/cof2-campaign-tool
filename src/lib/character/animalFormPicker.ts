/**
 * Sélection d'un animal RÉEL du bestiaire pour « Forme animale » (animaux-r5) et la voie de
 * prestige du changeforme (PER-375/PER-435), filtrée par TAILLE, par catégorie taxonomique
 * connue (`knownAnimalFormCategoryIds`, `animalForms.ts`, comparée à `Creature.animalFormCategory`)
 * et par accès aux variantes géantes/préhistoriques (`Creature.animalFormFlavor`, débloquées au
 * rang 6 du changeforme, p. 170). Les créatures sans `animalFormCategory` (gabarits génériques
 * du livre type « Animal petit », ou contenu pas encore tagué) ne sont PAS restreintes par
 * catégorie — repli permissif plutôt qu'une classification devinée.
 */
import { CREATURE_SIZES, type CreatureSize, type Feature } from '@/data/schema';
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
 * Le personnage garde-t-il sa propre DEF (et sa valeur d'attaque magique pour attaquer) plutôt que
 * celles du profil pris, quand elles sont SUPÉRIEURES (« Transformation puissante », rang 6 du
 * changeforme, p. 170 : « le personnage peut conserver sa propre DEF et utiliser sa valeur
 * d'attaque magique pour attaquer si ceux-ci sont supérieurs au profil de la forme choisie ») ?
 * Le rang 7 (« Grande forme animale », p. 170) redit la même faculté pour les formes GRANDES sans
 * poser de condition supplémentaire — même règle, pas un choix distinct — et r7/r8 impliquent
 * normalement r6 (rangs d'une même voie acquis dans l'ordre), vérifiés par sécurité comme
 * `hasGiantOrPrehistoricAnimalFormAccess`. Consommé par `activeDefenseOverrideSource` (effects.ts),
 * qui compare ensuite au cas par cas. RAW : ne s'applique QU'à la DEF (et l'attaque, hors périmètre
 * pour l'instant) — jamais à l'Initiative, non mentionnée par ce rang.
 */
export function hasChangeformeOwnDefenseAccess(character: Character): boolean {
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

/**
 * Capacités dont la pastille PM doit refléter le coût RÉEL de la transformation (« Forme animale »,
 * `animaux-r5` ; « Transformation en animal », `prestige-changeforme-r5` — MÊME clé d'activation
 * `effectInputs['animaux-r5']`, retour propriétaire 2026-08-19 : le toggle du changeforme s'affiche
 * désormais sur sa PROPRE carte même quand le personnage a `animaux-r5` nativement, cf.
 * `hasEffectToggles`, `usePathFeatureState.tsx` — sa pastille doit donc suivre la même règle de coût,
 * pas rester au coût de rang générique de « Transformation en animal »).
 */
const ANIMAL_FORM_MANA_COST_FEATURE_IDS = new Set(['animaux-r5', 'prestige-changeforme-r5']);

/**
 * Coût réel EN PM d'une transformation « Forme animale » une fois une créature de taille
 * Grande/Énorme choisie ET active (retour propriétaire 2026-08-19, changeforme-r7, p. 170 :
 * « le coût du sort est égal à 2 + NC de la créature »). Verbatim limité aux tailles Grande (r7) et
 * Énorme (r8, « mêmes règles ») : rien dans le livre ne change le coût de rang standard des formes
 * Petite/Moyenne, qui gardent leur pastille inchangée. Retourne `feature` TEL QUEL sinon (pas une
 * capacité de `ANIMAL_FORM_MANA_COST_FEATURE_IDS`, aucune forme active, ou forme active mais
 * Petite/Moyenne) — même patron que `ghostShipManaCostFeature` (`majorSummoningPath.ts`) : une
 * surcharge PONCTUELLE de `manaCost` appliquée juste avant `SpellManaBadge`, jamais encodée dans les
 * données statiques du sort.
 */
export function animalFormManaCostFeature<T extends Pick<Feature, 'id' | 'manaCost'>>(
  character: Character | undefined,
  feature: T,
): T {
  if (!character || !ANIMAL_FORM_MANA_COST_FEATURE_IDS.has(feature.id) || !character.effectInputs?.['animaux-r5'])
    return feature;
  const stats = character.transformationDerivedStats?.['animaux-r5'];
  if (stats?.nc == null || (stats.size !== 'grande' && stats.size !== 'enorme')) return feature;
  return { ...feature, manaCost: 2 + stats.nc };
}
