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
import {
  BENEFICIAL_EFFECT_IDS,
  BENEFICIAL_EFFECTS,
  type AbilityId,
  type BeneficialEffectId,
} from '@/data/schema';
import { featureById } from '@/data/index';
import { clampIntensity, statusEntry, type StatusSheetImpact } from './statusEffects';
import { effectiveFeatureIdsForMods } from './choices';
import { isEffectActive, pathRanksFromFeatures } from './effects';
import { resolveDisplayDice } from './weaponDamageBonus';
import type { SituationalDamageBonus } from './weaponDamageBonus';
import type { Character } from './types';

/**
 * Ce qu'il faut savoir du LANCEUR pour en déduire le palier d'un buff (PER-359). Les deux premiers
 * buffs du livre ne demandaient que ses capacités (le rang de la voie porteuse suffisait) ; les
 * suivants lisent son NIVEAU (Aura du chef de guerre, +2 au niveau 16) ou une CARACTÉRISTIQUE (Sans
 * peur = CHA, Argument de taille = FOR). Les deux derniers champs sont optionnels : un porteur qui
 * ne les fournit pas (créature du tracker, personnage non réclamé) retombe sur le palier 1.
 *
 * `abilities` = les valeurs RÉSOLUES de la fiche (modificateurs de peuple compris) ; un bonus de
 * carac conféré par une capacité n'y figure pas — le pré-remplissage vaut ce que vaut cette source.
 */
export interface GroupBuffCasterContext {
  abilities?: Partial<Record<AbilityId, number>>;
  level?: number;
}

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
 * Palier d'un buff pour un lanceur donné, D'APRÈS CE QUE LE CATALOGUE DÉCLARE (`intensityFrom`) —
 * jamais d'après une règle générale : chaque capacité dit d'où sort son chiffre (PER-359).
 *  - `path-rank` : 2 dès le rang déclaré de la voie PORTEUSE, 1 sinon (gabarit p. 67 / p. 124) ;
 *  - `character-level` : 2 dès le niveau déclaré, 1 sinon (Aura du chef de guerre, niveau 16) ;
 *  - `ability` : le palier EST la caractéristique du lanceur (Sans peur = CHA, Argument = FOR).
 *
 * Le résultat est toujours borné par le `stacking` du catalogue (`clampIntensity`), donc ≥ 1 : un
 * lanceur dont la caractéristique serait nulle ou négative retombe sur 1 plutôt que sur un buff
 * inversé — cas dégénéré qu'aucune capacité du livre ne rencontre en pratique.
 */
function intensityOf(
  buffId: BeneficialEffectId,
  pathRank: number,
  caster: GroupBuffCasterContext,
): number {
  const from = BENEFICIAL_EFFECTS[buffId]?.intensityFrom;
  if (!from) return 1;
  const raw =
    from.kind === 'path-rank'
      ? pathRank >= from.rank
        ? 2
        : 1
      : from.kind === 'character-level'
        ? (caster.level ?? 0) >= from.level
          ? 2
          : 1
        : (caster.abilities?.[from.ability] ?? 1);
  return clampIntensity(buffId, raw);
}

/**
 * Buffs de groupe conférés par les capacités acquises `featureIds`, dans l'ordre du catalogue. Le
 * `pathRank` reste le rang ATTEINT dans la voie de la capacité porteuse ; le PALIER, lui, se déduit
 * de ce que le catalogue déclare (rang, niveau ou caractéristique du lanceur — cf. `intensityOf`).
 *
 * `caster` est optionnel : les appelants qui ne veulent que la LISTE des buffs conférés (gating de
 * la palette, arbitrage du double compte) n'ont pas à le fournir — leur palier vaudra 1 et ne sera
 * pas lu.
 */
export function groupBuffsOf(
  featureIds: readonly string[],
  caster: GroupBuffCasterContext = {},
): GroupBuffCarrier[] {
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
        intensity: intensityOf(buffId, pathRank, caster),
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
 *
 * Retour proprio 2026-08-10 : `effectiveFeatureIdsForMods` (pas le seul `character.featureIds`) — un
 * buff conféré par une capacité EMPRUNTÉE (feature-from-path, même famille de bug que
 * `situationalEffectIds` sur le Bâton magique de l'archimage, PER-74) doit débloquer la ligne au même
 * titre qu'une capacité native.
 */
export function unlockedGroupBuffIds(characters: readonly Character[]): BeneficialEffectId[] {
  const unlocked = new Set<BeneficialEffectId>();
  for (const character of characters) {
    for (const carrier of groupBuffsOf(effectiveFeatureIdsForMods(character))) unlocked.add(carrier.buffId);
  }
  return BENEFICIAL_EFFECT_IDS.filter((id) => unlocked.has(id));
}

/**
 * Palier à PRÉ-REMPLIR pour `buffId` d'après le porteur présumé (le combattant sur lequel la puce a
 * été déposée). Retombe sur 1 quand il ne porte pas ce buff — une créature alliée ou un personnage
 * d'un autre profil.
 *
 * `caster` porte le niveau et les caractéristiques du lanceur, que certains buffs lisent (PER-359) :
 * l'omettre ne casse rien, mais ramène ces buffs-là à 1.
 */
export function groupBuffIntensityFor(
  featureIds: readonly string[],
  buffId: BeneficialEffectId,
  caster: GroupBuffCasterContext = {},
): number {
  return groupBuffsOf(featureIds, caster).find((c) => c.buffId === buffId)?.intensity ?? 1;
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

/**
 * Bonus de DM en DÉ (PER-496, `StatusSheetImpact.damageDealtDice`) prêts pour le badge de DM
 * SITUATIONNEL (`WeaponDamageBonusBadge`) — même forme que les bonus des capacités permanentes
 * (`weaponDamageBonuses`), avec la capacité RÉELLE qui confère le buff (`groupBuffFeatureId`) comme
 * `featureId` : la puce de capacité doit nommer « Charge fantastique », pas l'id interne de l'état.
 * `level` résout la face concrète d'un dé ÉVOLUTIF (même convention que les bonus permanents). Vide
 * si aucun état actif ne confère de bonus de DM en dé.
 */
export function statusDamageDiceBonuses(
  damageDealtDice: StatusSheetImpact['damageDealtDice'],
  level: number,
): SituationalDamageBonus[] {
  return damageDealtDice.map((d) => ({
    featureId: groupBuffFeatureId(d.id) ?? d.id,
    name: d.label,
    sourcePage: statusEntry(d.id)?.sourcePage,
    dice: resolveDisplayDice(d.dice, level),
  }));
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
