/**
 * BUFFS DE GROUPE (PER-104) — part PURE : qui, à la table, peut poser quel buff, et à quel palier.
 *
 * Le catalogue (`BENEFICIAL_EFFECTS`) dit ce qu'un buff FAIT ; ce module dit qui le PORTE. Deux
 * usages, tous deux côté écran de MJ :
 *  - GATER la 4e ligne de la palette (`unlockedGroupBuffIds`) : une table sans barde ni prêtre n'a
 *    rien à poser, exactement comme pour les effets situationnels (PER-279) ;
 *  - PRÉ-REMPLIR le palier de la fenêtre de pose (`groupBuffIntensityFor`) : « +1, +2 au rang 5 » se
 *    lit sur le RANG ATTEINT dans la voie porteuse, le MJ gardant la main sur la valeur retenue.
 *
 * Aucune UI, aucun store — capacités acquises en entrée, données en sortie.
 */
import { BENEFICIAL_EFFECT_IDS, type BeneficialEffectId } from '@/data/schema';
import { featureById } from '@/data/index';
import { pathRanksFromFeatures } from './effects';

/**
 * Rang de voie à partir duquel les deux buffs du livre passent de +1 à +2 (« Le bonus passe à +2 au
 * rang 5 » — Chant des héros p. 67, Bénédiction p. 124). Le palier vit dans le TEXTE des capacités,
 * pas dans une règle générale : si un jour un buff escaladait autrement, il faudrait le déclarer en
 * donnée plutôt que d'élargir ce seuil.
 */
export const GROUP_BUFF_RANK_5 = 5;

/** Un buff de groupe CONFÉRÉ par les capacités d'un combattant, avec le palier qu'il atteint. */
export interface GroupBuffCarrier {
  /** Buff conféré (entrée de `BENEFICIAL_EFFECTS`). */
  buffId: BeneficialEffectId;
  /** Capacité qui le confère (`musicien-r1`, `priere-r1`…). */
  featureId: string;
  /** Rang ATTEINT dans la voie porteuse (et non le rang de la capacité elle-même). */
  pathRank: number;
  /** Palier à pré-remplir : 2 dès le rang 5 de la voie porteuse, 1 sinon. */
  intensity: number;
}

/**
 * Buffs de groupe conférés par les capacités acquises `featureIds`, dans l'ordre du catalogue. Le
 * palier se lit sur le rang ATTEINT dans la voie de la capacité porteuse : un barde qui a pris les
 * rangs 1 et 3 du musicien reste à +1, celui qui a le rang 5 passe à +2.
 */
export function groupBuffsOf(featureIds: readonly string[]): GroupBuffCarrier[] {
  const pathRanks = pathRanksFromFeatures([...featureIds]);
  const carriers = new Map<BeneficialEffectId, GroupBuffCarrier>();
  for (const featureId of featureIds) {
    const feature = featureById.get(featureId);
    if (!feature?.groupBuffIds) continue;
    const pathRank = pathRanks[feature.pathId] ?? feature.rank;
    for (const buffId of feature.groupBuffIds) {
      // Première capacité porteuse retenue : deux capacités conférant le MÊME buff n'existent pas
      // aujourd'hui, et si cela arrivait, le catalogue serait le bon endroit pour les distinguer.
      if (carriers.has(buffId)) continue;
      carriers.set(buffId, {
        buffId,
        featureId,
        pathRank,
        intensity: pathRank >= GROUP_BUFF_RANK_5 ? 2 : 1,
      });
    }
  }
  return BENEFICIAL_EFFECT_IDS.filter((id) => carriers.has(id)).map(
    (id) => carriers.get(id) as GroupBuffCarrier,
  );
}

/**
 * Buffs de groupe DÉBLOQUÉS par la table (pendant de `situationalEffectIds`, PER-279) : ceux qu'au
 * moins un personnage réclamé confère. Dédupliqué, dans l'ordre du catalogue (affichage stable).
 * Vide = la palette masque la ligne des buffs de groupe.
 */
export function unlockedGroupBuffIds(
  characters: readonly { featureIds: readonly string[] }[],
): BeneficialEffectId[] {
  const unlocked = new Set<BeneficialEffectId>();
  for (const character of characters) {
    for (const carrier of groupBuffsOf(character.featureIds)) unlocked.add(carrier.buffId);
  }
  return BENEFICIAL_EFFECT_IDS.filter((id) => unlocked.has(id));
}

/**
 * Palier à PRÉ-REMPLIR pour `buffId` d'après les capacités du porteur présumé (le combattant sur
 * lequel la puce a été déposée). Retombe sur 1 quand il ne porte pas ce buff — une créature alliée
 * ou un personnage d'un autre profil : le MJ ajuste alors à la main.
 */
export function groupBuffIntensityFor(
  featureIds: readonly string[],
  buffId: BeneficialEffectId,
): number {
  return groupBuffsOf(featureIds).find((c) => c.buffId === buffId)?.intensity ?? 1;
}
