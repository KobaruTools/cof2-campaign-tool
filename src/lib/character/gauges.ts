/**
 * Jauges de jeu : valeur COURANTE et état de santé, dérivés de la dépletion
 * transitoire du personnage (PER-147).
 *
 * La dépletion stocke le **manque** d'une jauge (dégâts subis, mana dépensé), pas
 * sa valeur absolue : la valeur courante se recalcule toujours depuis le max du
 * moment, si bien qu'un changement de max (montée de niveau, surcharge manuelle)
 * est suivi automatiquement, sans re-clamp ni perte d'information. Absence d'entrée
 * = jauge pleine.
 *
 * Module pur (aucune dépendance UI), source de vérité de ces calculs.
 */
import type { Depletion, HpDepletion } from './types';

/**
 * Valeur courante d'une jauge simple = `clamp(max − manque, 0, max)`. Un manque
 * nul/négatif laisse la jauge pleine ; on ne descend jamais sous 0 ni au-dessus du
 * max — p. 220, verbatim : « On ne compte pas les PV perdus en dessous de 0 ».
 */
export function currentGauge(max: number, missing = 0): number {
  return Math.max(0, Math.min(max, max - Math.max(0, missing)));
}

/** Manque total de PV = dégâts létaux + temporaires (chacun borné à ≥ 0). */
export function hpMissing(hp: HpDepletion | undefined): number {
  if (!hp) return 0;
  return Math.max(0, hp.lethal) + Math.max(0, hp.temp);
}

/** PV courants = `clamp(maxHp − létaux − temporaires, 0, maxHp)`. */
export function currentHp(maxHp: number, depletion: Depletion): number {
  return currentGauge(maxHp, hpMissing(depletion.hp));
}

/** Points de mana courants = `clamp(maxMana − dépensés, 0, maxMana)`. */
export function currentMana(maxMana: number, depletion: Depletion): number {
  return currentGauge(maxMana, Math.max(0, depletion.mana ?? 0));
}

/**
 * État de santé dérivé des PV courants (p. 220) :
 *  - `weakened` (affaibli) : exactement 1 PV — p. 220, verbatim : « Un personnage
 *    ou une créature à 1 PV subit l'état préjudiciable affaibli. L'état affaibli
 *    disparaît dès que les PV repassent au-dessus de 1. » ;
 *  - `down` (à terre / mourant) : 0 PV avec des dégâts **létaux** en cause ;
 *  - `stunned` (assommé) : 0 PV par dégâts **temporaires** seuls (aucun létal) ;
 *  - `normal` : sinon.
 */
export type HealthState = 'normal' | 'weakened' | 'down' | 'stunned';

export function hpHealthState(maxHp: number, depletion: Depletion): HealthState {
  const current = currentHp(maxHp, depletion);
  if (current === 1) return 'weakened';
  if (current === 0) {
    const lethal = Math.max(0, depletion.hp?.lethal ?? 0);
    return lethal > 0 ? 'down' : 'stunned';
  }
  return 'normal';
}

/**
 * Normalise la dépletion : retire les jauges pleines (manque nul) et re-borne les
 * composantes à ≥ 0, pour respecter l'invariant « absence d'entrée = jauge pleine ».
 * À appeler comme les autres `prune` d'état transitoire lors des mutations
 * structurelles. Purement défensif : la valeur courante se recalcule de toute façon
 * via le clamp, donc une dépletion résiduelle ne fausse jamais l'affichage.
 */
export function pruneDepletion(depletion: Depletion): Depletion {
  const next: Depletion = {};
  if (depletion.hp) {
    const lethal = Math.max(0, depletion.hp.lethal);
    const temp = Math.max(0, depletion.hp.temp);
    if (lethal > 0 || temp > 0) next.hp = { lethal, temp };
  }
  if (depletion.mana !== undefined) {
    const mana = Math.max(0, depletion.mana);
    if (mana > 0) next.mana = mana;
  }
  return next;
}
