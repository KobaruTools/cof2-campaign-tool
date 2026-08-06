/**
 * BUFFS DE GROUPE (PER-104) — part PURE : qui, à la table, peut poser quel buff, et à quel palier.
 *
 * Le catalogue (`BENEFICIAL_EFFECTS`) dit ce qu'un buff FAIT ; ce module dit qui le PORTE. Trois
 * usages — deux côté écran de MJ, un côté fiche :
 *  - GATER la 4e ligne de la palette (`unlockedGroupBuffIds`) : une table sans barde ni prêtre n'a
 *    rien à poser, exactement comme pour les effets situationnels (PER-279) ;
 *  - PRÉ-REMPLIR le palier de la fenêtre de pose (`groupBuffIntensityFor`) : « +1, +2 au rang 5 » se
 *    lit sur le RANG ATTEINT dans la voie porteuse, le MJ gardant la main sur la valeur retenue ;
 *  - DÉPARTAGER les deux canaux du même bonus chez le porteur (`supersededBuffToggles`, PER-314) :
 *    le barde a AUSSI un interrupteur de fiche pour son propre Chant des héros, qui compterait une
 *    seconde fois si le MJ pose le buff en séance ;
 *  - NOMMER la capacité source sur la fiche du BUFFÉ (`groupBuffFeatureId`), qui ne la possède pas.
 *
 * Aucune UI, aucun store — capacités acquises en entrée, données en sortie.
 */
import { BENEFICIAL_EFFECT_IDS, type BeneficialEffectId } from '@/data/schema';
import { featureById } from '@/data/index';
import { isEffectActive, pathRanksFromFeatures } from './effects';
import type { Character } from './types';

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

/**
 * Cache de la table inverse « buff → capacité porteuse ». Reconstruit dès que le registre de capacités
 * change de taille : le contenu PAYANT est fusionné dans `featureById` après le premier rendu, un cache
 * figé y perdrait les capacités ajoutées.
 */
let carrierFeatureByBuff: { size: number; map: Map<string, string> } | null = null;

/**
 * Capacité qui CONFÈRE `buffId`, indépendamment de tout personnage (`'heroes-song'` → `'musicien-r1'`).
 *
 * Sert la fiche du BUFFÉ : le détail de ses tests doit nommer la capacité source avec sa puce de
 * capacité (couleur et icône de la voie), alors qu'il ne possède pas cette capacité — c'est le barde
 * qui l'a. `groupBuffsOf` ne peut pas répondre à ça : il part des capacités acquises d'un personnage.
 *
 * `undefined` pour tout ce qui n'est pas un buff de groupe (état subi, effet d'environnement) : aucune
 * capacité ne les confère, ils restent affichés en texte.
 */
export function groupBuffFeatureId(buffId: string): string | undefined {
  if (carrierFeatureByBuff?.size !== featureById.size) {
    const map = new Map<string, string>();
    for (const [featureId, feature] of featureById) {
      for (const id of feature.groupBuffIds ?? []) if (!map.has(id)) map.set(id, featureId);
    }
    carrierFeatureByBuff = { size: featureById.size, map };
  }
  return carrierFeatureByBuff.map.get(buffId);
}

/** PER-314 — un interrupteur de fiche SUPPLANTÉ par le même buff posé en séance. */
export interface SupersededBuffToggle {
  /** Capacité porteuse (`musicien-r1`, `priere-r1`…). */
  featureId: string;
  /** Index de l'effet TEMPORAIRE dans `Feature.effects`. */
  index: number;
  /** Buff posé en séance qui le supplante. */
  buffId: BeneficialEffectId;
}

/**
 * PER-314 — interrupteurs de fiche supplantés par la SÉANCE. Le porteur d'un buff de groupe a DEUX
 * canaux pour le même bonus : son interrupteur de fiche (« Chant des héros actif (CHA min) ») et
 * l'état que le MJ pose sur tout le camp (PER-104). Actifs ensemble, ils comptent deux fois — le
 * barde passerait à +2 au lieu de +1. La séance GAGNE : on neutralise l'interrupteur, on ne le
 * supprime pas (hors séance il reste le seul canal, cf. fiche en solo ou table sans écran de MJ).
 *
 * `sessionStatusIds` = les états que le MJ a appliqués à CE personnage (ids d'`AppliedStatus`, buffs
 * comme malus) ; l'intersection avec les buffs que ses capacités confèrent fait le tri. Tous les
 * effets TEMPORAIRES de la capacité porteuse sont visés : ce sont eux qui décrivent le sort actif
 * (les `condition` décrivent une situation, jamais une durée — cf. `clearTemporaryEffectToggles`).
 */
export function supersededBuffToggles(
  featureIds: readonly string[],
  sessionStatusIds: readonly string[],
): SupersededBuffToggle[] {
  if (sessionStatusIds.length === 0) return [];
  const posed = new Set<string>(sessionStatusIds);
  const superseded: SupersededBuffToggle[] = [];
  for (const carrier of groupBuffsOf(featureIds)) {
    if (!posed.has(carrier.buffId)) continue;
    featureById.get(carrier.featureId)?.effects?.forEach((effect, index) => {
      if (effect.kind !== 'conditional-stat-bonus' || effect.activation.kind !== 'temporary') return;
      superseded.push({ featureId: carrier.featureId, index, buffId: carrier.buffId });
    });
  }
  return superseded;
}

/**
 * Le i-ème effet de `featureId` est-il supplanté par un buff posé en séance ? Prédicat de l'UI :
 * l'interrupteur est alors grisé et porte la note « appliqué par la séance ».
 */
export function isBuffToggleSuperseded(
  featureIds: readonly string[],
  sessionStatusIds: readonly string[],
  featureId: string,
  index: number,
): boolean {
  return supersededBuffToggles(featureIds, sessionStatusIds).some(
    (t) => t.featureId === featureId && t.index === index,
  );
}

/**
 * Personnage tel que les CALCULS doivent le voir en séance : interrupteurs supplantés éteints, pour
 * que le bonus ne soit compté qu'une fois (par l'état, canal autoritatif du MJ). Fonction pure, et
 * surtout **jamais persistée** — l'interrupteur du joueur garde sa valeur en base et reprend la main
 * dès la fin de la séance. Renvoie la MÊME référence quand rien n'est supplanté (aucun re-calcul en
 * aval hors séance, et aucune copie inutile).
 */
export function withSupersededBuffTogglesOff(
  character: Character,
  sessionStatusIds: readonly string[],
): Character {
  const superseded = supersededBuffToggles(character.featureIds, sessionStatusIds).filter((t) =>
    isEffectActive(character, t.featureId, t.index),
  );
  if (superseded.length === 0) return character;
  const effectToggles: Record<string, boolean[]> = { ...character.effectToggles };
  for (const { featureId, index } of superseded) {
    const arr = [...(effectToggles[featureId] ?? [])];
    while (arr.length <= index) arr.push(false);
    arr[index] = false;
    effectToggles[featureId] = arr;
  }
  return { ...character, effectToggles };
}
