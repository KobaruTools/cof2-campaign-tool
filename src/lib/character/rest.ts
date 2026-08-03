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
import type { Character, Depletion, EquipmentLine, PoisonApplication } from './types';
import { currentRecoveryDice, healHp, pruneDepletion, spendRecoveryDice } from './gauges';
import { clearTemporaryEffectInputs, clearTemporaryEffectToggles, resetUsageCounters } from './effects';
import { removeElixirDoses } from './elixirs';
import { reloadAllToFull } from './weaponLoading';
import { rechargeItemsOnRest } from './itemCharges';

/**
 * Ré-enduit les armes empoisonnées (« Avant chaque combat, ses armes sont enduites », p. 143, PER-74) :
 * remet chaque charge à `spent: false`. Renvoie la nouvelle liste UNIQUEMENT si au moins une charge
 * était dépensée (sinon `undefined` → le patch de repos ne se « mixe » pas inutilement, cf. PER-266).
 */
function reArmPoisons(poisonedWeapons: PoisonApplication[] = []): PoisonApplication[] | undefined {
  if (!poisonedWeapons.some((p) => p.spent)) return undefined;
  return poisonedWeapons.map((p) => (p.spent ? { ...p, spent: false } : p));
}

/** Patch d'état de jeu produit par un repos. */
export interface RestResult {
  depletion: Depletion;
  usageCounters: Record<string, number>;
  /**
   * Interrupteurs d'effets TEMPORAIRES éteints par le repos (PER-161) : un repos met fin aux états
   * de durée / combat (Sanctuaire, Rage…). Les effets conditionnels situationnels sont préservés.
   */
  effectToggles: Record<string, boolean[]>;
  /**
   * Saisies libres d'état de jeu mises à jour (PER-164) : un repos qui éteint l'interrupteur d'un effet
   * temporaire purge aussi la saisie libre corrélée à la même capacité (ex. l'animal de Forme animale),
   * pour ne pas laisser de note orpheline au réveil. Les saisies d'effets situationnels sont préservées.
   */
  effectInputs: Record<string, string>;
  /**
   * Équipement mis à jour : présent quand le repos a REELLEMENT touché une ligne — purge des doses
   * d'élixir du forgesort au repos LONG (PER-152 ; voie des élixirs, p. 98 : « Les élixirs qui ne
   * sont pas utilisés le jour même sont perdus »), et remise à plein des armes à recharger aux DEUX
   * repos (PER-284, cf. `reloadAllToFull`), et remise à plein des objets à charges selon LEUR réglage
   * (PER-294, cf. `rechargeItemsOnRest`). Absent = aucune ligne modifiée (ou reset) → l'équipement
   * n'est pas touché, et le patch de repos reste purement état de jeu (PER-266).
   */
  equipment?: EquipmentLine[];
  /**
   * Armes empoisonnées ré-enduites (PER-74) : présent UNIQUEMENT si au moins une charge était dépensée
   * (« avant chaque combat, ses armes sont enduites », p. 143). Absent = aucune charge à ré-enduire →
   * l'état des poisons n'est pas touché (le patch reste purement état de jeu, synchronisé en direct).
   */
  poisonedWeapons?: PoisonApplication[];
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
  const result: RestResult = {
    depletion: pruneDepletion(depletion),
    usageCounters: resetUsageCounters(
      character.usageCounters,
      character.featureIds,
      new Set(['short-rest', 'combat']),
      character.featureChoices,
    ),
    effectToggles: clearTemporaryEffectToggles(character),
    effectInputs: clearTemporaryEffectInputs(character),
  };
  // Armes rechargées à plein (PER-284) : une pause de quelques minutes suffit à recharger une
  // arbalète ou une arme à poudre (p. 185 : le rechargement se compte en actions), et rien ne
  // justifie de repartir déchargé. Inclus SEULEMENT si une arme était réellement à recharger.
  const reloaded = reloadAllToFull(character.equipment);
  // Objets à charges réglés « au repos court » (PER-294) : eux seuls repartent à plein ici — un
  // objet sans réglage ne se recharge qu'à la main, et un objet « au repos long » attend la nuit.
  const recharged = rechargeItemsOnRest(reloaded, 'short');
  if (recharged !== character.equipment) result.equipment = recharged;
  const reArmed = reArmPoisons(character.poisonedWeapons);
  if (reArmed) result.poisonedWeapons = reArmed;
  return result;
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
 * du dé. » Le DR **gagné** est aussitôt **dépensé** pour le soin : c'est le MÊME dé, donc le
 * nombre de DR reste **INCHANGÉ** (même à plein — le dé plafonné est créé et consommé sur-le-champ,
 * il ne se rajoute pas et n'en retire pas un autre). Soin = `dieFaces + ½ niveau` PV (valeur MAX).
 */
export function longRest(character: Character, heal?: { dieFaces: number }): RestResult {
  let depletion: Depletion = { ...clearTemp(character.depletion) };
  // Mana plein.
  delete depletion.mana;
  if (heal) {
    // Le DR gagné est immédiatement dépensé pour le soin → réserve de DR inchangée (net zéro).
    depletion = healHp(depletion, heal.dieFaces + Math.floor(character.level / 2));
  } else {
    // Sans soin : on conserve le +1 DR gagné (réduit le manque de 1, plancher 0).
    const spentDr = depletion.recoveryDice ?? 0;
    if (spentDr > 0) depletion.recoveryDice = spentDr - 1;
    else delete depletion.recoveryDice;
  }
  // Récupération complète = nouveau jour : les élixirs préparés non utilisés sont perdus (p. 98).
  // On n'inclut `equipment` QUE si des doses ont réellement été retirées — sinon le patch resterait
  // « mixte » (equipment ∉ état de jeu) et partirait, en session, sur le chemin verrou de version
  // SANS diffusion (PER-266). Sans élixir, un repos long est ainsi un patch PUREMENT état de jeu,
  // synchronisé en direct comme un repos court.
  // Les armes à recharger repartent à plein (PER-284), comme au repos court, en plus de la purge.
  const prunedEquipment = removeElixirDoses(character.equipment);
  const dosesRemoved = prunedEquipment.length !== character.equipment.length;
  const restoredEquipment = reloadAllToFull(prunedEquipment);
  // Objets à charges (PER-294) : un repos long recharge ceux réglés « au repos long » ET ceux réglés
  // « au repos court » (une nuit fait au moins ce qu'une pause de trente minutes fait).
  const rechargedEquipment = rechargeItemsOnRest(restoredEquipment, 'long');
  const result: RestResult = {
    depletion: pruneDepletion(depletion),
    usageCounters: resetUsageCounters(
      character.usageCounters,
      character.featureIds,
      new Set(['day', 'short-rest', 'combat']),
      character.featureChoices,
    ),
    effectToggles: clearTemporaryEffectToggles(character),
    effectInputs: clearTemporaryEffectInputs(character),
  };
  if (dosesRemoved || rechargedEquipment !== prunedEquipment) result.equipment = rechargedEquipment;
  const reArmed = reArmPoisons(character.poisonedWeapons);
  if (reArmed) result.poisonedWeapons = reArmed;
  return result;
}

/**
 * « Tout réinitialiser » — raccourci manuel HORS RÈGLES (préfiguré à la conception du
 * bloc) : remet toutes les jauges à plein en un clic (PV, mana, DR) et tous les
 * compteurs d'usages au maximum, y compris les compteurs `manual` (à vie).
 */
export function resetAll(): RestResult {
  return { depletion: {}, usageCounters: {}, effectToggles: {}, effectInputs: {} };
}
