/**
 * Agrégation des bonus à la VALEUR D'ATTAQUE (touche) accordés par les capacités et conditionnés au
 * TYPE d'arme réellement portée (PER-72/PER-226). Ex. maître d'armes r1 : « +1 en attaque avec une
 * arme de prédilection » ; nain « Haches et marteaux » (PER-154) : +1 avec hache/marteau.
 *
 * Pendant de `weaponDamageBonus.ts` pour la touche : ce module ne rassemble QUE les suppléments
 * `attack-bonus`, filtrés par mode d'attaque et arme en main, et en fait la somme (avec le détail des
 * sources pour l'infobulle). Un bonus INCONDITIONNEL global reste un `stat-bonus meleeAttack` classique
 * (agrégé au moteur) ; ici on ne traite QUE le conditionnel-à-l'arme.
 *
 * Fonction PURE : aucune dépendance à React, aucun jet (on affiche, on ne résout pas le combat).
 */
import { featureById } from '@/data';
import type { Weapon } from '@/data/schema';
import {
  activeFeatureIdsForMods,
  effectContext,
  pathRanksFromFeatures,
  resolveValue,
} from '@/lib/character/effects';
import { weaponConditionMet, type AttackMode } from '@/lib/character/weaponDamageBonus';
import type { Character } from '@/lib/character/types';

/** Contribution d'une capacité au bonus d'attaque conditionné à l'arme. */
export interface WeaponAttackBonusSource {
  featureId: string;
  name: string;
  sourcePage?: number;
  /** Valeur résolue du bonus (ex. +1). */
  value: number;
}

export interface WeaponAttackBonusResult {
  /** Somme des bonus retenus (0 si aucun). */
  total: number;
  /** Détail par capacité, pour l'infobulle / le breakdown. */
  sources: WeaponAttackBonusSource[];
}

/**
 * Bonus d'attaque des capacités actives, pour un `mode` d'attaque et l'arme (`weapon`) en main dans
 * ce mode (`null` = aucune arme de ce mode / mains nues). Un `attack-bonus` n'est retenu que si son
 * mode correspond et que l'arme portée satisfait sa condition de type/famille. Voir en-tête de module.
 */
export function weaponAttackBonuses(
  character: Character,
  mode: AttackMode,
  weapon: Weapon | null,
): WeaponAttackBonusResult {
  const ctx = effectContext(character);
  const pathRanks = pathRanksFromFeatures(character.featureIds);
  const sources: WeaponAttackBonusSource[] = [];

  for (const featureId of activeFeatureIdsForMods(character)) {
    const feature = featureById.get(featureId);
    if (!feature?.effects) continue;
    for (const effect of feature.effects) {
      if (effect.kind !== 'attack-bonus') continue;
      const { condition } = effect;
      // Filtre de mode : une condition qui exige l'autre mode est écartée.
      if (condition.attackMode && condition.attackMode !== mode) continue;
      // Le bonus n'est retenu que si une arme satisfait la condition de type/famille.
      if (!weaponConditionMet(condition, weapon, character)) continue;
      // Rang résolu sur la VOIE A pour une capacité empruntée (encadré « Appel à une autre capacité »).
      const rankPathId = ctx.borrowedHostPaths?.get(featureId) ?? feature.pathId;
      const value = resolveValue(effect.value, rankPathId, pathRanks, ctx);
      if (value === null || value <= 0) continue;
      sources.push({ featureId, name: feature.name, sourcePage: feature.sourcePage, value });
    }
  }

  const total = sources.reduce((sum, s) => sum + s.value, 0);
  return { total, sources };
}
