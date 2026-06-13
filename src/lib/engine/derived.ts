/**
 * Calculs dérivés — module pur (aucune dépendance UI), source de vérité des
 * maths du personnage (PRD §5.5).
 *
 * Formules extraites du livre de base CO2 (références : `creation-progression.md`,
 * pages 30-32 et 38-43), vérifiées contre les fiches d'exemple Lhagva et Ionas
 * (p. 37) — voir `derived.test.ts`.
 *
 * IMPORTANT — couche « modificateurs » : beaucoup de capacités modifient une
 * valeur dérivée (« +3 en Init. », « +1 en DEF », bonus de PV de prestige…).
 * Ces effets sont stockés en TEXTE VERBATIM dans les capacités, pas sous forme
 * structurée. Le moteur calcule donc la valeur **de base** (caracs + niveau +
 * famille + équipement) et accepte un sac de modificateurs plats (`mods`)
 * fourni par l'appelant (saisies, surcharges, ou future couche d'effets
 * structurés). Il ne tente jamais d'interpréter le texte d'une capacité.
 */
import type { AbilityId, Die, Family, ProgressionRules } from '@/data/schema';

export type Abilities = Record<AbilityId, number>;

/** Plafond du niveau pris en compte par les valeurs d'attaque (p. 39). */
export const MAX_ATTACK_LEVEL = 10;

/**
 * Modificateurs plats apportés par les capacités/équipement/surcharges,
 * sommés par-dessus les formules de base. Tous optionnels, défaut 0.
 */
export interface DerivedMods {
  maxHp?: number;
  def?: number;
  initiative?: number;
  luckPoints?: number;
  manaPoints?: number;
  recoveryDiceCount?: number;
  meleeAttack?: number;
  rangedAttack?: number;
  magicAttack?: number;
}

/** Contribution de l'équipement porté au calcul de la défense. */
export interface DefenseEquipment {
  /** Somme des bonus de DEF (armure + bouclier). */
  defBonus: number;
  /** AGI maximale exploitable imposée par l'armure (p. 188) ; null = aucune. */
  maxAgi: number | null;
}

const m = (v: number | undefined): number => v ?? 0;

// ---------------------------------------------------------------------------
// Points de vigueur — p. 30 (création) et p. 39 (gain par niveau)
// ---------------------------------------------------------------------------

/**
 * PV maximum. Niveau 1 = 2 × baseHp + CON ; chaque niveau suivant ajoute
 * hpPerLevel + CON. La CON courante s'applique rétroactivement à tous les
 * niveaux (p. 39) — on recalcule toujours depuis la CON du moment.
 */
export function maxHp(level: number, family: Family, con: number, mods: DerivedMods = {}): number {
  const base = 2 * family.baseHp + con;
  const perLevels = Math.max(0, level - 1) * (family.hpPerLevel + con);
  return base + perLevels + m(mods.maxHp);
}

// ---------------------------------------------------------------------------
// Dés de récupération — p. 30
// ---------------------------------------------------------------------------

/** Nombre de dés de récupération = 2 + CON + bonus de famille, plancher 0. */
export function recoveryDiceCount(con: number, family: Family, mods: DerivedMods = {}): number {
  return Math.max(0, 2 + con + family.bonusRecoveryDiceOnCreation + m(mods.recoveryDiceCount));
}

/** Type du dé de récupération (déterminé par la famille). */
export function recoveryDie(family: Family): Die {
  return family.recoveryDie;
}

// ---------------------------------------------------------------------------
// Dés évolutifs (d4°) — table p. 43
// ---------------------------------------------------------------------------

/**
 * Valeur courante d'un dé évolutif (« d4° ») pour un niveau donné, d'après la
 * table p. 43 (`progression.scalingDice` : 1-5 d4, 6-8 d6, 9-11 d8, 12-14 d10,
 * 15+ d12). Le dé affiché n'est jamais « d4° » mais le dé concret atteint au
 * niveau ; le marqueur « ° » de l'UI sert seulement à signaler qu'il évoluera.
 * Retourne le dé du seuil le plus élevé dont `minLevel` est atteint.
 */
export function scalingDie(level: number, progression: ProgressionRules): Die {
  let die = progression.scalingDice[0]?.die ?? 'd4';
  for (const tier of progression.scalingDice) {
    if (level >= tier.minLevel) die = tier.die;
  }
  return die;
}

// ---------------------------------------------------------------------------
// Points de chance — p. 30
// ---------------------------------------------------------------------------

/** PC = 2 + CHA + bonus de famille (aventuriers +1), plancher 0. */
export function luckPoints(cha: number, family: Family, mods: DerivedMods = {}): number {
  return Math.max(0, 2 + cha + family.bonusLuckPointsOnCreation + m(mods.luckPoints));
}

// ---------------------------------------------------------------------------
// Points de mana — p. 31 et 42
// ---------------------------------------------------------------------------

/**
 * PM = VOL + nombre de capacités de sorts connues — uniquement si le
 * personnage possède au moins un sort (sinon il n'a pas de réserve de mana).
 * Retourne null quand spellCount vaut 0.
 */
export function manaPoints(vol: number, spellCount: number, mods: DerivedMods = {}): number | null {
  if (spellCount <= 0) return null;
  return Math.max(0, vol + spellCount + m(mods.manaPoints));
}

// ---------------------------------------------------------------------------
// Initiative — p. 31
// ---------------------------------------------------------------------------

/** Initiative = 10 + PER (+ modificateurs de capacités). */
export function initiative(per: number, mods: DerivedMods = {}): number {
  return 10 + per + m(mods.initiative);
}

// ---------------------------------------------------------------------------
// Défense — p. 31 et 188
// ---------------------------------------------------------------------------

/**
 * DEF = 10 + AGI + bonus d'armure/bouclier (+ modificateurs). L'AGI prise en
 * compte est plafonnée par l'« AGI maximale » de l'armure portée (p. 188).
 */
export function defense(agi: number, equip: DefenseEquipment, mods: DerivedMods = {}): number {
  const effectiveAgi = equip.maxAgi === null ? agi : Math.min(agi, equip.maxAgi);
  return 10 + effectiveAgi + equip.defBonus + m(mods.def);
}

// ---------------------------------------------------------------------------
// Valeurs d'attaque — p. 32 et 39
// ---------------------------------------------------------------------------

/** Valeur de base d'attaque = niveau, plafonnée au niveau 10 (p. 39). */
export function baseAttack(level: number): number {
  return Math.min(level, MAX_ATTACK_LEVEL);
}

/** Attaque au contact = base + FOR. */
export function meleeAttack(level: number, strength: number, mods: DerivedMods = {}): number {
  return baseAttack(level) + strength + m(mods.meleeAttack);
}

/** Attaque à distance = base + AGI. */
export function rangedAttack(level: number, agi: number, mods: DerivedMods = {}): number {
  return baseAttack(level) + agi + m(mods.rangedAttack);
}

/** Attaque magique = base + VOL. */
export function magicAttack(level: number, vol: number, mods: DerivedMods = {}): number {
  return baseAttack(level) + vol + m(mods.magicAttack);
}

// ---------------------------------------------------------------------------
// Agrégat
// ---------------------------------------------------------------------------

export interface DerivedInput {
  abilities: Abilities;
  level: number;
  family: Family;
  /** Contribution de l'équipement porté à la DEF. */
  defenseEquipment: DefenseEquipment;
  /** Nombre de capacités de sorts connues (pour les PM). */
  spellCount: number;
  /** Modificateurs plats issus des capacités/surcharges. */
  mods?: DerivedMods;
}

export interface DerivedStats {
  maxHp: number;
  recoveryDiceCount: number;
  recoveryDie: Die;
  luckPoints: number;
  manaPoints: number | null;
  initiative: number;
  defense: number;
  meleeAttack: number;
  rangedAttack: number;
  magicAttack: number;
}

/** Calcule toutes les statistiques dérivées d'un personnage. */
export function deriveStats(input: DerivedInput): DerivedStats {
  const { abilities, level, family, defenseEquipment, spellCount } = input;
  const mods = input.mods ?? {};
  return {
    maxHp: maxHp(level, family, abilities.CON, mods),
    recoveryDiceCount: recoveryDiceCount(abilities.CON, family, mods),
    recoveryDie: recoveryDie(family),
    luckPoints: luckPoints(abilities.CHA, family, mods),
    manaPoints: manaPoints(abilities.VOL, spellCount, mods),
    initiative: initiative(abilities.PER, mods),
    defense: defense(abilities.AGI, defenseEquipment, mods),
    meleeAttack: meleeAttack(level, abilities.FOR, mods),
    rangedAttack: rangedAttack(level, abilities.AGI, mods),
    magicAttack: magicAttack(level, abilities.VOL, mods),
  };
}
