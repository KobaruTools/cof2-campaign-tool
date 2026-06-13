/**
 * Standardisation UI des statistiques dérivées de CO2 — source unique réutilisée
 * partout dans l'app (récapitulatif, fiche, montée de niveau…). On y centralise
 * l'id technique, le libellé français et l'icône (markup SVG game-icons.net, cf.
 * `derivedStatIcons.ts`). L'affichage passe toujours par `<DerivedStatIcon>`, qui
 * cercle l'icône à la manière des fiches Chroniques Oubliées.
 *
 * Les ids reprennent les clés de `DerivedStats` (cf. `src/lib/engine/derived.ts`),
 * `recoveryDice` regroupant le couple `recoveryDiceCount` / `recoveryDie`.
 */

export const DERIVED_STAT_IDS = [
  'maxHp',
  'defense',
  'initiative',
  'luckPoints',
  'recoveryDice',
  'manaPoints',
  'meleeAttack',
  'rangedAttack',
  'magicAttack',
] as const;

export type DerivedStatId = (typeof DERIVED_STAT_IDS)[number];

/** Libellés français des statistiques dérivées, indexés par id. */
export const DERIVED_STAT_NAMES: Record<DerivedStatId, string> = {
  maxHp: 'Points de vigueur',
  defense: 'Défense',
  initiative: 'Initiative',
  luckPoints: 'Points de chance',
  recoveryDice: 'Dés de récupération',
  manaPoints: 'Points de mana',
  meleeAttack: 'Attaque contact',
  rangedAttack: 'Attaque distance',
  magicAttack: 'Attaque magique',
};
