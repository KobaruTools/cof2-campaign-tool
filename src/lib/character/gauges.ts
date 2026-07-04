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
 * Applique des dégâts : augmente le manque de PV de la composante correspondante —
 * `lethal` (dégâts normaux) ou `temp` (dégâts temporaires / non létaux). Les DM
 * temporaires sont « comptabilisés à part » (p. 219/220), donc n'écrasent jamais les
 * dégâts létaux et inversement. Un montant nul/négatif ne change rien.
 */
export function applyDamage(depletion: Depletion, amount: number, kind: 'lethal' | 'temp'): Depletion {
  const delta = Math.max(0, Math.round(amount));
  if (delta === 0) return depletion;
  const hp = depletion.hp ?? { lethal: 0, temp: 0 };
  return {
    ...depletion,
    hp: { lethal: Math.max(0, hp.lethal), temp: Math.max(0, hp.temp), [kind]: Math.max(0, hp[kind]) + delta },
  };
}

/**
 * Soigne : réduit le manque de PV du montant indiqué, en résorbant d'abord les
 * dégâts LÉTAUX (blessures réelles) puis, le reliquat épuisé, les dégâts temporaires.
 * Outil manuel permissif (les règles de récupération réglementaires — repos, régen
 * 1/min des DM temporaires — relèvent du ticket Repos). Une jauge redevenue pleine
 * est normalisée (clé retirée). Un montant nul/négatif ne change rien.
 */
export function healHp(depletion: Depletion, amount: number): Depletion {
  const heal = Math.max(0, Math.round(amount));
  if (heal === 0 || !depletion.hp) return depletion;
  let remaining = heal;
  let lethal = Math.max(0, depletion.hp.lethal);
  let temp = Math.max(0, depletion.hp.temp);
  const healedLethal = Math.min(lethal, remaining);
  lethal -= healedLethal;
  remaining -= healedLethal;
  temp = Math.max(0, temp - remaining);
  return pruneDepletion({ ...depletion, hp: { lethal, temp } });
}

/** Remet les PV à plein (retire la dépletion de PV, conserve les autres jauges). */
export function resetHp(depletion: Depletion): Depletion {
  const next = { ...depletion };
  delete next.hp;
  return next;
}

/**
 * Fixe le MANQUE de mana (points dépensés), borné à `[0, max]`. À 0, la clé est
 * retirée (mana plein par défaut). Setter unique dont dérivent dépense/récupération/
 * reset — sur le modèle de `setUsageCounterValue`. Un `max` ≤ 0 remet le mana à plein.
 */
export function setManaMissing(depletion: Depletion, missing: number, max: number): Depletion {
  const clamped = Math.max(0, Math.min(Math.max(0, max), Math.round(missing)));
  const next = { ...depletion };
  if (clamped <= 0) delete next.mana;
  else next.mana = clamped;
  return next;
}

/** Dépense `amount` points de mana (augmente le manque, borné au max). */
export function spendMana(depletion: Depletion, amount: number, max: number): Depletion {
  return setManaMissing(depletion, (depletion.mana ?? 0) + Math.max(0, amount), max);
}

/** Récupère `amount` points de mana (réduit le manque, plancher 0). */
export function restoreMana(depletion: Depletion, amount: number, max: number): Depletion {
  return setManaMissing(depletion, (depletion.mana ?? 0) - Math.max(0, amount), max);
}

/** Remet le mana à plein (retire la dépletion de mana, conserve les autres jauges). */
export function resetMana(depletion: Depletion): Depletion {
  const next = { ...depletion };
  delete next.mana;
  return next;
}

/** Points de chance courants = `clamp(maxLuck − dépensés, 0, maxLuck)` (PER-155). */
export function currentLuck(maxLuck: number, depletion: Depletion): number {
  return currentGauge(maxLuck, Math.max(0, depletion.luck ?? 0));
}

/**
 * Fixe le MANQUE de points de chance (points dépensés), borné à `[0, max]`. À 0, la clé
 * est retirée (réserve pleine par défaut). Pendant de `setManaMissing` pour la chance
 * (PER-155). Un `max` ≤ 0 remet la réserve à plein.
 */
export function setLuckMissing(depletion: Depletion, missing: number, max: number): Depletion {
  const clamped = Math.max(0, Math.min(Math.max(0, max), Math.round(missing)));
  const next = { ...depletion };
  if (clamped <= 0) delete next.luck;
  else next.luck = clamped;
  return next;
}

/** Dépense `amount` points de chance (augmente le manque, borné au max). */
export function spendLuck(depletion: Depletion, amount: number, max: number): Depletion {
  return setLuckMissing(depletion, (depletion.luck ?? 0) + Math.max(0, amount), max);
}

/** Récupère `amount` points de chance (réduit le manque, plancher 0). */
export function restoreLuck(depletion: Depletion, amount: number, max: number): Depletion {
  return setLuckMissing(depletion, (depletion.luck ?? 0) - Math.max(0, amount), max);
}

/** Remet la chance à plein (retire la dépletion de chance, conserve les autres jauges). */
export function resetLuck(depletion: Depletion): Depletion {
  const next = { ...depletion };
  delete next.luck;
  return next;
}

/** Dés de récupération COURANTS = `clamp(max − dépensés, 0, max)`. */
export function currentRecoveryDice(max: number, depletion: Depletion): number {
  return currentGauge(max, Math.max(0, depletion.recoveryDice ?? 0));
}

/**
 * Fixe le MANQUE de dés de récupération (DR dépensés), borné à `[0, max]`. À 0, la clé
 * est retirée (réserve pleine par défaut). Pendant de `setManaMissing` pour les DR (PER-151).
 */
export function setRecoveryDiceMissing(depletion: Depletion, missing: number, max: number): Depletion {
  const clamped = Math.max(0, Math.min(Math.max(0, max), Math.round(missing)));
  const next = { ...depletion };
  if (clamped <= 0) delete next.recoveryDice;
  else next.recoveryDice = clamped;
  return next;
}

/** Dépense `amount` dés de récupération (augmente le manque, borné au max). */
export function spendRecoveryDice(depletion: Depletion, amount: number, max: number): Depletion {
  return setRecoveryDiceMissing(depletion, (depletion.recoveryDice ?? 0) + Math.max(0, amount), max);
}

/** Regagne `amount` dés de récupération (réduit le manque, plancher 0). */
export function restoreRecoveryDice(depletion: Depletion, amount: number, max: number): Depletion {
  return setRecoveryDiceMissing(depletion, (depletion.recoveryDice ?? 0) - Math.max(0, amount), max);
}

/** Remet les DR à plein (retire la dépletion de DR, conserve les autres jauges). */
export function resetRecoveryDice(depletion: Depletion): Depletion {
  const next = { ...depletion };
  delete next.recoveryDice;
  return next;
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
  if (depletion.luck !== undefined) {
    const luck = Math.max(0, depletion.luck);
    if (luck > 0) next.luck = luck;
  }
  if (depletion.recoveryDice !== undefined) {
    const dr = Math.max(0, depletion.recoveryDice);
    if (dr > 0) next.recoveryDice = dr;
  }
  return next;
}
