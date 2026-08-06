/**
 * Primitives de la voie de l'archimage (PER-74, p. 154), pures et testables.
 */
import type { Feature } from '@/data/schema';
import { spellManaCost } from '@/lib/engine';
import type { Character } from './types';

const R5 = 'prestige-archimage-r5';
const R7 = 'prestige-archimage-r7';

/**
 * Réduction PERMANENTE de coût en mana du sort désigné par Bâton magique (R5, p. 154) : « il peut
 * l'utiliser au prix d'une action de mouvement sans dépense de mana » — réduction TOTALE (le coût
 * de base entier), contrairement au Rituel de combat du guerrier-mage (`combatRitualDiscount`, -1
 * PM fixe). À partir du rang 7, un second sort de rang 2 bénéficie du même traitement — porté par
 * le choix `feature-from-path` de la capacité R7 (« il peut AJOUTER un sort de rang 2 ») plutôt que
 * par un second slot sur R5 : `borrowedFeatureIds` (choices.ts) rend un sort choisi CONNU dès que
 * son choix hôte est résolu, sans notion de rang — placer ce second choix sur R7 fait donc que le
 * sort n'existe QUE si le personnage a réellement atteint le rang 7, sans code de gating dédié.
 */
export function archmageFreeSpellDiscount(character: Character, feature: Feature): number {
  if (!feature.isSpell) return 0;
  const matches = (sel: unknown) => typeof sel === 'string' && sel === feature.id;
  const r5Choice = character.featureIds.includes(R5) ? character.featureChoices?.[R5]?.[0] : undefined;
  const r7Choice = character.featureIds.includes(R7) ? character.featureChoices?.[R7]?.[0] : undefined;
  if (!matches(r5Choice) && !matches(r7Choice)) return 0;
  return spellManaCost(feature) ?? 0;
}
