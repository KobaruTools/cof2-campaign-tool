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

import {
  DERIVED_STAT_IDS as DERIVED_MOD_IDS,
  type DerivedStatId as DerivedModStatId,
} from '@/data/schema';

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

/**
 * Correspondance clé du MOTEUR (`DerivedStatId` de `schema.ts`, celle du sac de
 * modificateurs `DerivedMods`) → id d'AFFICHAGE de ce module. Deux clés diffèrent
 * volontairement : `def` (moteur) s'affiche `defense`, et `recoveryDiceCount` (moteur)
 * s'affiche `recoveryDice` (l'id UI regroupant le nombre de dés et le dé lui-même).
 * Permet d'afficher un modificateur de stat dérivée — libellé et icône — depuis la clé
 * moteur, sans redéclarer une table de libellés (cf. PER-273, apports d'objets).
 */
export const DERIVED_MOD_DISPLAY_ID: Record<DerivedModStatId, DerivedStatId> = {
  maxHp: 'maxHp',
  def: 'defense',
  initiative: 'initiative',
  luckPoints: 'luckPoints',
  manaPoints: 'manaPoints',
  recoveryDiceCount: 'recoveryDice',
  meleeAttack: 'meleeAttack',
  rangedAttack: 'rangedAttack',
  magicAttack: 'magicAttack',
};

/**
 * Libellés français des statistiques dérivées indexés par clé du MOTEUR — dérivés de
 * `DERIVED_STAT_NAMES` via `DERIVED_MOD_DISPLAY_ID` pour que les libellés restent définis
 * une seule fois.
 */
export const DERIVED_MOD_NAMES: Record<DerivedModStatId, string> = Object.fromEntries(
  DERIVED_MOD_IDS.map((id) => [id, DERIVED_STAT_NAMES[DERIVED_MOD_DISPLAY_ID[id]]]),
) as Record<DerivedModStatId, string>;

/**
 * Libellés COURTS (français) des stats dérivées indexés par clé du MOTEUR, pour les
 * pastilles et les listes serrées où le libellé complet ne tient pas (interrupteurs
 * d'effets, badges d'apport d'objet). Les abréviations sont celles des fiches CO2.
 */
export const DERIVED_MOD_SHORT_NAMES: Record<DerivedModStatId, string> = {
  maxHp: 'PV',
  def: 'DEF',
  initiative: 'Init.',
  luckPoints: 'PC',
  manaPoints: 'PM',
  recoveryDiceCount: 'DR',
  meleeAttack: 'Att. contact',
  rangedAttack: 'Att. distance',
  magicAttack: 'Att. magique',
};
