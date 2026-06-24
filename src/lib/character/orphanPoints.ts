/**
 * Points de capacité orphelins (p. 40) — couche pure de lecture.
 *
 * Au changement de niveau, un point de capacité qui ne peut (ou ne veut) pas être
 * dépensé en capacité peut être échangé contre un bonus permanent : 1 point de
 * chance, 1 dé de récupération, 2 PV ou 2 PM. Les conversions sont journalisées sur
 * l'entrée de niveau (`LevelUpEntry.orphanRewards`) ; ce module les agrège en un
 * `DerivedMods` que le moteur ajoute aux modificateurs des capacités.
 */
import type { DerivedMods } from '@/lib/engine';
import type { Character, OrphanReward } from './types';

/** Bonus apporté par une récompense orphelin (clé de stat dérivée + montant). */
const ORPHAN_BONUS: Record<OrphanReward, { stat: keyof DerivedMods; amount: number }> = {
  luck: { stat: 'luckPoints', amount: 1 },
  'recovery-die': { stat: 'recoveryDiceCount', amount: 1 },
  hp: { stat: 'maxHp', amount: 2 },
  mana: { stat: 'manaPoints', amount: 2 },
};

/** Libellés français des récompenses (UI). */
export const ORPHAN_REWARD_LABEL: Record<OrphanReward, string> = {
  luck: '+1 point de chance',
  'recovery-die': '+1 dé de récupération',
  hp: '+2 points de vigueur',
  mana: '+2 points de mana',
};

/** Toutes les récompenses orphelines converties sur la carrière, dans l'ordre. */
export function orphanRewards(character: Character): OrphanReward[] {
  return character.levelUpHistory.flatMap((entry) => entry.orphanRewards ?? []);
}

/**
 * `DerivedMods` cumulé des points orphelins convertis (toutes entrées de niveau).
 * À fusionner avec les modificateurs des capacités avant le calcul des stats
 * dérivées : les formules `luckPoints` / `recoveryDiceCount` / `maxHp` / `manaPoints`
 * lisent déjà ces `mods`.
 */
export function orphanMods(character: Character): DerivedMods {
  const mods: DerivedMods = {};
  for (const reward of orphanRewards(character)) {
    const { stat, amount } = ORPHAN_BONUS[reward];
    mods[stat] = (mods[stat] ?? 0) + amount;
  }
  return mods;
}

/**
 * Contributions orphelines détaillées par stat dérivée, pour le détail (« breakdown »)
 * des stats : une entrée par point converti, libellée avec le niveau d'origine. La
 * forme `{ label, value }` est compatible avec un `BreakdownTerm` (couche UI), sans
 * que cette couche pure dépende de l'UI.
 */
export function orphanSourceTerms(
  character: Character,
): Partial<Record<keyof DerivedMods, { label: string; value: number }[]>> {
  const out: Partial<Record<keyof DerivedMods, { label: string; value: number }[]>> = {};
  for (const entry of character.levelUpHistory) {
    for (const reward of entry.orphanRewards ?? []) {
      const { stat, amount } = ORPHAN_BONUS[reward];
      (out[stat] ??= []).push({ label: `Point orphelin (niv. ${entry.level})`, value: amount });
    }
  }
  return out;
}

/** Fusion additive de plusieurs `DerivedMods` (somme clé à clé). */
export function mergeMods(...all: DerivedMods[]): DerivedMods {
  const out: DerivedMods = {};
  for (const mods of all) {
    for (const [stat, value] of Object.entries(mods)) {
      const key = stat as keyof DerivedMods;
      out[key] = (out[key] ?? 0) + (value ?? 0);
    }
  }
  return out;
}
