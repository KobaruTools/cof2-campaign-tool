/**
 * Modificateurs de caractéristiques apportés par le peuple (création, p. 26-28).
 *
 * Un peuple a un ou deux modificateurs ; chacun cible une caractéristique fixe
 * (`abilities` de longueur 1) ou laisse le choix entre plusieurs (ex. demi-elfe
 * « +1 PER ou CHA »). L'humain a un modificateur « +1 à une des deux plus
 * faibles » encodé avec les 7 caractéristiques admissibles : le choix est libre
 * dans le modèle, l'UI conseille les plus faibles.
 */
import type { AbilityId, Ancestry } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';

/**
 * Choix résolus pour chaque modificateur du peuple, dans le même ordre que
 * `ancestry.abilityModifiers`. Pour un modificateur fixe, la valeur est imposée
 * (= son unique carac). `null` = choix non encore fait.
 */
export type AncestryChoice = (AbilityId | null)[];

/** Initialise les choix : caracs fixes pré-remplies, choix multiples à null. */
export function initialChoices(ancestry: Ancestry): AncestryChoice {
  return ancestry.abilityModifiers.map((mod) => (mod.abilities.length === 1 ? mod.abilities[0] : null));
}

/** Tous les choix multiples sont-ils résolus ? */
export function choicesComplete(ancestry: Ancestry, choices: AncestryChoice): boolean {
  return ancestry.abilityModifiers.every((mod, i) => {
    if (mod.abilities.length === 1) return true;
    const c = choices[i];
    return c !== null && c !== undefined && mod.abilities.includes(c);
  });
}

/**
 * Deltas par caractéristique résultant des modificateurs de peuple résolus.
 * Les choix non résolus sont ignorés (delta 0) — la validation se fait via
 * `choicesComplete`.
 */
export function modifierDeltas(ancestry: Ancestry, choices: AncestryChoice): Record<AbilityId, number> {
  const deltas = ABILITY_IDS.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as Record<AbilityId, number>,
  );
  ancestry.abilityModifiers.forEach((mod, i) => {
    const target = mod.abilities.length === 1 ? mod.abilities[0] : choices[i];
    if (target) deltas[target] += mod.value;
  });
  return deltas;
}

/** Applique les modificateurs de peuple à des valeurs de base. */
export function applyModifiers(
  base: Record<AbilityId, number>,
  ancestry: Ancestry,
  choices: AncestryChoice,
): Record<AbilityId, number> {
  const deltas = modifierDeltas(ancestry, choices);
  return ABILITY_IDS.reduce(
    (acc, id) => {
      acc[id] = base[id] + deltas[id];
      return acc;
    },
    {} as Record<AbilityId, number>,
  );
}

/**
 * Les deux caractéristiques les plus faibles d'un jeu de valeurs (pour
 * conseiller le bonus de l'humain). Retourne les ids triés par valeur
 * croissante puis ordre canonique.
 */
export function twoLowest(base: Record<AbilityId, number>): AbilityId[] {
  return [...ABILITY_IDS].sort((a, b) => base[a] - base[b]).slice(0, 2);
}
