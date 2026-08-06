/**
 * Primitives de la voie de l'archimage (PER-74, p. 154), pures et testables.
 */
import { featureById } from '@/data';
import type { Feature } from '@/data/schema';
import type { Character } from './types';

const R5 = 'prestige-archimage-r5';

/** Rang le plus élevé atteint dans la voie de l'archimage (0 si absente). */
export function archmageRank(character: Character): number {
  let rank = 0;
  for (const id of character.featureIds) {
    const f = featureById.get(id);
    if (f?.pathId === 'prestige-archimage') rank = Math.max(rank, f.rank);
  }
  return rank;
}

/**
 * `feature` est-elle le sort lié au Bâton magique (R5, p. 154) — cast au prix d'une action de
 * MOUVEMENT et SANS dépense de mana ? R5 porte DEUX choix `feature-from-path` : le premier (sort de
 * rang 1) est actif dès le rang 5 ; le second (sort de rang 2, « il peut AJOUTER ») ne l'est qu'à
 * PARTIR du rang 7 — avant ce rang, le joueur peut déjà le désigner (choix permissif, comme le reste
 * de la fiche) mais il ne bénéficie pas encore de la gratuité ni de l'action de mouvement. Consommé
 * par `FeaturesByPath` pour piloter `noMana`/`actionTypesOverride` de la carte d'emprunt correspondante.
 */
export function archmageStaffSpellGranted(character: Character, feature: Feature): boolean {
  if (!feature.isSpell || !character.featureIds.includes(R5)) return false;
  const choices = character.featureChoices?.[R5];
  const matches = (i: number) => typeof choices?.[i] === 'string' && choices![i] === feature.id;
  if (matches(0)) return true;
  return matches(1) && archmageRank(character) >= 7;
}
