/**
 * Repos & récupération (PER-151) — application des règles CO2 aux jauges d'état.
 *
 * Règles extraites et documentées dans `docs/extraction/repos-recuperation.md`
 * (livre de base, p. 30, 219-222, 229). Modélisation FIDÈLE au système d'attrition :
 * un repos long ne rend PAS tous les PV/DR d'un coup, il n'accorde que +1 DR.
 *
 * Chaque fonction renvoie un patch `{ depletion, usageCounters }` à appliquer au
 * personnage ; elle ne mute pas l'entrée. Module pur (aucune dépendance UI).
 */
import type { Character, Depletion } from './types';
import { currentRecoveryDice, healHp, pruneDepletion, spendRecoveryDice } from './gauges';
import { resetUsageCounters } from './effects';

/** Patch d'état de jeu produit par un repos. */
export interface RestResult {
  depletion: Depletion;
  usageCounters: Record<string, number>;
}

/**
 * Efface les dégâts TEMPORAIRES (régénérés à 1/min, p. 220 → pleins après toute pause
 * de quelques minutes), en conservant les dégâts LÉTAUX.
 */
function clearTemp(depletion: Depletion): Depletion {
  if (!depletion.hp) return depletion;
  return { ...depletion, hp: { lethal: Math.max(0, depletion.hp.lethal), temp: 0 } };
}

/**
 * Repos court = récupération rapide (30 min, p. 221) : régénère les dégâts temporaires
 * et réinitialise les capacités de fréquence « par combat » / « par récupération
 * rapide ».
 *
 * Dépense d'un dé de récupération (optionnelle, p. 221) : « le personnage peut utiliser
 * UN dé de récupération pour restaurer ses PV. Il jette le dé et récupère [1 DR + ½ Niveau]
 * PV ; son nombre de DR est réduit de 1. » On soigne donc `recovery.dieRoll + ⌊niveau/2⌋`
 * PV (le résultat du dé est SAISI par le joueur — les dés se lancent à la vraie table) et on
 * dépense 1 DR. Sans DR disponible, aucun soin possible en repos court (seul le repos long
 * le permet). Le mana n'est pas rendu par un repos court.
 */
export function shortRest(
  character: Character,
  recovery?: { dieRoll: number; recoveryDiceMax: number },
): RestResult {
  let depletion = clearTemp(character.depletion);
  if (recovery && recovery.dieRoll > 0 && currentRecoveryDice(recovery.recoveryDiceMax, character.depletion) > 0) {
    const heal = recovery.dieRoll + Math.floor(character.level / 2);
    depletion = healHp(depletion, heal);
    depletion = spendRecoveryDice(depletion, 1, recovery.recoveryDiceMax);
  }
  return {
    depletion: pruneDepletion(depletion),
    usageCounters: resetUsageCounters(
      character.usageCounters,
      character.featureIds,
      new Set(['short-rest', 'combat']),
    ),
  };
}

/**
 * Repos long = récupération complète (8 h, 1/jour, p. 221-222, 229) :
 *  - dégâts temporaires pleins ;
 *  - mana entièrement restauré (p. 229) ;
 *  - **+1 DR** (attrition, p. 222 : « un personnage gagne 1 DR ») — pas de restauration
 *    complète des DR ni des PV ;
 *  - réinitialise les capacités « par jour » (et, a fortiori, « par combat » / « rapide »).
 *
 * Soin optionnel (p. 222) : « il peut immédiatement choisir d'utiliser ce DR pour restaurer
 * des PV. Dans ce cas, le nombre de PV récupérés est automatiquement égal à la valeur maximale
 * du dé. » → si `heal` est fourni et qu'un DR est disponible après le +1, on soigne
 * `dieFaces + ½ niveau` PV (valeur MAX du dé, sans lancer) et on dépense 1 DR.
 */
export function longRest(
  character: Character,
  heal?: { recoveryDiceMax: number; dieFaces: number },
): RestResult {
  let depletion: Depletion = { ...clearTemp(character.depletion) };
  // Mana plein.
  delete depletion.mana;
  // +1 DR (réduit le manque de 1, plancher 0).
  const spentDr = depletion.recoveryDice ?? 0;
  if (spentDr > 0) depletion.recoveryDice = spentDr - 1;
  else delete depletion.recoveryDice;
  // Dépense optionnelle du DR gagné pour un soin à la valeur MAX du dé (+ ½ niveau).
  if (heal && heal.recoveryDiceMax - (depletion.recoveryDice ?? 0) > 0) {
    const healAmount = heal.dieFaces + Math.floor(character.level / 2);
    depletion = healHp(depletion, healAmount);
    depletion = spendRecoveryDice(depletion, 1, heal.recoveryDiceMax);
  }
  return {
    depletion: pruneDepletion(depletion),
    usageCounters: resetUsageCounters(
      character.usageCounters,
      character.featureIds,
      new Set(['day', 'short-rest', 'combat']),
    ),
  };
}

/**
 * « Tout réinitialiser » — raccourci manuel HORS RÈGLES (préfiguré à la conception du
 * bloc) : remet toutes les jauges à plein en un clic (PV, mana, DR) et tous les
 * compteurs d'usages au maximum, y compris les compteurs `manual` (à vie).
 */
export function resetAll(): RestResult {
  return { depletion: {}, usageCounters: {} };
}
