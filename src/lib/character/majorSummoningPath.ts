/**
 * Primitive de la voie de l'invocation majeure (PER-74, p. 158) : réduction PERMANENTE et
 * INCONDITIONNELLE de coût en mana de TOUS les sorts de la voie — note de la voie : « tous les
 * sorts de la voie de l'invocation majeure sont des actions limitées qui demandent un rituel
 * d'incantation d'une durée d'une minute, mais ils bénéficient automatiquement de la Concentration,
 * c'est-à-dire qu'ils coûtent un nombre de PM égal à leur rang - 2. »
 *
 * PAS une dérogation `Feature.manaCost` : le piège documenté dans `schema.ts` (Rune de garde,
 * rang − 2 dû à sa Concentration automatique) s'applique ici aussi — c'est une réduction DYNAMIQUE,
 * pas un coût fixe verbatim. Contrairement à la Concentration standard (p. 228, `canConcentrate`),
 * qui ne s'applique qu'aux sorts lancés en action d'attaque (A), cette réduction est
 * INCONDITIONNELLE : tous les sorts de la voie sont purement (L) (le rituel d'1 min tient lieu de
 * l'action d'attaque qu'exigerait normalement la Concentration accrue).
 */
import type { Feature } from '@/data/schema';
import { isEffectActive } from './effects';
import type { Character } from './types';

const PATH_ID = 'prestige-invocation-majeure';

/** Réduction de coût en mana (2 PM) de tout sort de la voie de l'invocation majeure. */
export function majorSummoningManaDiscount(feature: Pick<Feature, 'isSpell' | 'pathId'>): number {
  return feature.isSpell && feature.pathId === PATH_ID ? 2 : 0;
}

const GHOST_SHIP_FEATURE_ID = 'prestige-invocation-majeure-r6';
/** Index de l'interrupteur « Nef fantôme » (variante aérienne) sur `prestige-invocation-majeure-r6`. */
const GHOST_SHIP_TOGGLE_INDEX = 0;

/**
 * Interrupteur « Nef fantôme » actif (PER-363, r6, p. 159) : « à partir du rang 8, le personnage
 * devient capable d'invoquer une nef fantôme qui navigue dans les airs (considéré comme un sort de
 * rang 8 pour le coût en PM) ». Un simple effet CONDITIONNEL sans bonus chiffré (comme la plupart des
 * interrupteurs de forme/variante) — la seule voie qui la révèle (rang 6) suffit pour le rendre
 * disponible, le rang 8 n'étant qu'une condition de COÛT, pas de déblocage. Faux si le personnage n'a
 * pas cette capacité (interrupteur absent → toujours inactif).
 */
export function ghostShipActive(character: Character): boolean {
  return character.featureIds.includes(GHOST_SHIP_FEATURE_ID) && isEffectActive(character, GHOST_SHIP_FEATURE_ID, GHOST_SHIP_TOGGLE_INDEX);
}

/**
 * Feature à passer à `SpellManaBadge` pour Navire fantôme (r6) : rang RELEVÉ à 8 quand la variante
 * « Nef fantôme » est active, pour que le coût de base affiché suive la règle p. 159 (rang 8, donc
 * 8 − 2 = 6 PM avec la Concentration automatique de la voie) au lieu du rang natif (6, → 4 PM). PAS
 * une dérogation `Feature.manaCost` (même piège que documenté dans `schema.ts` : c'est une variation
 * DYNAMIQUE liée à un choix du joueur à l'incantation, pas un coût fixe verbatim). Inchangée pour
 * toute autre capacité, ou si le personnage/l'interrupteur est absent.
 */
export function ghostShipManaCostFeature<T extends Pick<Feature, 'id' | 'rank'>>(
  character: Character | undefined,
  feature: T,
): T {
  if (!character || feature.id !== GHOST_SHIP_FEATURE_ID || !ghostShipActive(character)) return feature;
  return { ...feature, rank: 8 };
}
