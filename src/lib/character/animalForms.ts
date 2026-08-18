/**
 * Catégories d'animaux accessibles à un druide, dérivées des choix de
 * « Langage des animaux » (animaux-r1) — PER-70.
 *
 * Le rang 1 octroie d'office la communication avec les MAMMIFÈRES ; chaque voie de
 * druide atteignant le rang 4 débloque une catégorie supplémentaire au choix
 * (oiseaux, reptiles, poissons, arthropodes, animaux fantastiques), persistée dans
 * `character.featureChoices['animaux-r1']`. « Forme animale » (animaux-r5) réutilise
 * ces catégories, à l'EXCEPTION des animaux fantastiques. On dérive donc ici les
 * libellés à afficher, en lisant les options du catalogue (source unique des libellés).
 */
import { featureById } from '@/data';
import type { OptionFeatureChoice } from '@/data/schema';
import { effectiveFeatureIdsForMods } from './choices';
import type { Character } from './types';

const LANGUAGE_FEATURE_ID = 'animaux-r1';
const FORM_FEATURE_ID = 'animaux-r5';
/**
 * Choix de catégorie UNIQUE du changeforme (PER-375, r5, p. 170 : « il ne connaît qu'une seule
 * catégorie d'animaux ») — à la différence d'`animaux-r1`, pas répétable. Fusionné avec les
 * catégories du druide (cas d'un personnage multiclassé qui a les deux).
 */
const CHANGEFORME_CATEGORY_FEATURE_ID = 'prestige-changeforme-r5';
/** Catégorie exclue de la métamorphose (Forme animale, p. 114). */
const NO_FORM_CATEGORY = 'fantastic-animals';
/** Communication innée du rang 1 (pas une option de choix). */
const INNATE_LABEL = 'Mammifères';

/** Map id d'option → libellé, lue depuis le choix de Langage des animaux. */
function categoryLabels(): Map<string, string> {
  const choice = featureById.get(LANGUAGE_FEATURE_ID)?.choices?.[0] as OptionFeatureChoice | undefined;
  return new Map((choice?.options ?? []).map((o) => [o.id, o.label]));
}

/** Ids des catégories supplémentaires retenues dans Langage des animaux ET/OU le changeforme. */
function chosenCategoryIds(character: Character): string[] {
  const druidSel = character.featureChoices?.[LANGUAGE_FEATURE_ID]?.[0];
  const changeformeSel = character.featureChoices?.[CHANGEFORME_CATEGORY_FEATURE_ID]?.[0];
  const ids = [
    ...(Array.isArray(druidSel) ? druidSel : druidSel ? [druidSel] : []),
    ...(Array.isArray(changeformeSel) ? changeformeSel : changeformeSel ? [changeformeSel] : []),
  ];
  return [...new Set(ids)];
}

/**
 * Libellés des catégories que le druide maîtrise en COMMUNICATION (rang 1) :
 * mammifères (toujours) + catégories choisies, dans l'ordre du catalogue. Toujours
 * appelée dans un contexte où `animaux-r1` est natif (sa propre carte) : les
 * mammifères sont donc toujours acquis ici (à la différence de `animalFormCategories`).
 */
export function communicableAnimalCategories(character: Character): string[] {
  const labels = categoryLabels();
  const chosen = new Set(chosenCategoryIds(character));
  return [INNATE_LABEL, ...[...labels].filter(([id]) => chosen.has(id)).map(([, label]) => label)];
}

/**
 * Ids des catégories connues pour « Forme animale » (animaux-r5, natif OU octroyé par
 * le changeforme) — sans les animaux fantastiques. Les MAMMIFÈRES ne sont innés que
 * si le personnage a `animaux-r1` NATIVEMENT (druide) : un personnage qui n'a QUE la
 * voie de prestige (`prestige-changeforme-r5`) ne connaît QUE la catégorie unique
 * choisie là (p. 170, « il ne connaît qu'une seule catégorie d'animaux ») — les
 * mammifères ne s'y ajoutent pas gratuitement. `null` si le personnage n'a pas Forme
 * animale du tout (`effectiveFeatureIdsForMods` couvre l'octroi PAR le changeforme).
 */
export function knownAnimalFormCategoryIds(character: Character): Set<string> | null {
  if (!effectiveFeatureIdsForMods(character).includes(FORM_FEATURE_ID)) return null;
  const chosen = new Set(chosenCategoryIds(character));
  chosen.delete(NO_FORM_CATEGORY);
  if (character.featureIds.includes(LANGUAGE_FEATURE_ID)) chosen.add('mammals');
  return chosen;
}

/**
 * Libellés des formes accessibles via « Forme animale » — même ensemble que
 * `knownAnimalFormCategoryIds`, résolu en libellés affichables (mammifères en tête).
 * `null` si le personnage n'a pas Forme animale (rien à afficher).
 */
export function animalFormCategories(character: Character): string[] | null {
  const ids = knownAnimalFormCategoryIds(character);
  if (!ids) return null;
  const labels = categoryLabels();
  return [
    ...(ids.has('mammals') ? [INNATE_LABEL] : []),
    ...[...labels].filter(([id]) => id !== NO_FORM_CATEGORY && ids.has(id)).map(([, label]) => label),
  ];
}
