/**
 * Résolution PURE de la régénération automatique par tour d'une créature du bestiaire
 * (PER-456, `CreatureRegeneration`). Le montant se lit tel quel depuis le livre (troll,
 * hydre…) ; le seul calcul est le blocage : si la créature a subi CE TOUR un DM d'un type
 * listé dans `blockedBy` (bascule manuelle MJ, cf. `combatState.regenBlocked`), aucun PV
 * n'est régénéré. Ne connaît ni le combat ni le bestiaire : appelée depuis la couche qui a
 * les deux (`useGmScreenCombat`).
 */
import type { CreatureRegeneration } from '@/data/schema';

/**
 * PV régénérés au début du tour, compte tenu du blocage manuel du MJ. `undefined` (créature
 * sans régénération de bestiaire) → 0.
 */
export function regenerationAmount(
  regeneration: CreatureRegeneration | undefined,
  blockedThisRound: boolean,
): number {
  if (!regeneration || blockedThisRound) return 0;
  return Math.max(0, regeneration.amount);
}
