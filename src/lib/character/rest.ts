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
import { pruneDepletion } from './gauges';
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
 * rapide ». Ne rend ni les DR, ni le mana, ni les PV létaux (la dépense de DR pour
 * soigner reste une action manuelle — les dés se lancent à la vraie table).
 */
export function shortRest(character: Character): RestResult {
  return {
    depletion: pruneDepletion(clearTemp(character.depletion)),
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
 */
export function longRest(character: Character): RestResult {
  const depletion = clearTemp(character.depletion);
  const next: Depletion = { ...depletion };
  // Mana plein.
  delete next.mana;
  // +1 DR (réduit le manque de 1, plancher 0).
  const spentDr = next.recoveryDice ?? 0;
  if (spentDr > 0) next.recoveryDice = spentDr - 1;
  return {
    depletion: pruneDepletion(next),
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
