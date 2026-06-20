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
import type { Character } from './types';

const LANGUAGE_FEATURE_ID = 'animaux-r1';
const FORM_FEATURE_ID = 'animaux-r5';
/** Catégorie exclue de la métamorphose (Forme animale, p. 114). */
const NO_FORM_CATEGORY = 'fantastic-animals';
/** Communication innée du rang 1 (pas une option de choix). */
const INNATE_LABEL = 'Mammifères';

/** Map id d'option → libellé, lue depuis le choix de Langage des animaux. */
function categoryLabels(): Map<string, string> {
  const choice = featureById.get(LANGUAGE_FEATURE_ID)?.choices?.[0] as OptionFeatureChoice | undefined;
  return new Map((choice?.options ?? []).map((o) => [o.id, o.label]));
}

/** Ids des catégories supplémentaires retenues dans Langage des animaux. */
function chosenCategoryIds(character: Character): string[] {
  const sel = character.featureChoices?.[LANGUAGE_FEATURE_ID]?.[0];
  return Array.isArray(sel) ? sel : sel ? [sel] : [];
}

/**
 * Libellés des catégories que le druide maîtrise en COMMUNICATION (rang 1) :
 * mammifères (toujours) + catégories choisies, dans l'ordre du catalogue.
 */
export function communicableAnimalCategories(character: Character): string[] {
  const labels = categoryLabels();
  const chosen = new Set(chosenCategoryIds(character));
  return [INNATE_LABEL, ...[...labels].filter(([id]) => chosen.has(id)).map(([, label]) => label)];
}

/**
 * Libellés des formes accessibles via « Forme animale » (animaux-r5) : comme la
 * communication, mais sans les animaux fantastiques. Renvoie `null` si le personnage
 * ne possède pas Forme animale (rien à afficher).
 */
export function animalFormCategories(character: Character): string[] | null {
  if (!character.featureIds.includes(FORM_FEATURE_ID)) return null;
  const labels = categoryLabels();
  const chosen = new Set(chosenCategoryIds(character));
  return [
    INNATE_LABEL,
    ...[...labels]
      .filter(([id]) => id !== NO_FORM_CATEGORY && chosen.has(id))
      .map(([, label]) => label),
  ];
}
