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
import type { CaracId, De, Famille } from '@/data/schema';

export type Caracs = Record<CaracId, number>;

/** Plafond du niveau pris en compte par les valeurs d'attaque (p. 39). */
export const NIVEAU_MAX_ATTAQUE = 10;

/**
 * Modificateurs plats apportés par les capacités/équipement/surcharges,
 * sommés par-dessus les formules de base. Tous optionnels, défaut 0.
 */
export interface DerivedMods {
  pvMax?: number;
  def?: number;
  initiative?: number;
  pointsChance?: number;
  pointsMana?: number;
  nbDesRecuperation?: number;
  attaqueContact?: number;
  attaqueDistance?: number;
  attaqueMagique?: number;
}

/** Contribution de l'équipement porté au calcul de la défense. */
export interface DefenseEquipement {
  /** Somme des bonus de DEF (armure + bouclier). */
  bonusDef: number;
  /** AGI maximale exploitable imposée par l'armure (p. 188) ; null = aucune. */
  agiMax: number | null;
}

const m = (v: number | undefined): number => v ?? 0;

// ---------------------------------------------------------------------------
// Points de vigueur — p. 30 (création) et p. 39 (gain par niveau)
// ---------------------------------------------------------------------------

/**
 * PV maximum. Niveau 1 = 2 × pvBase + CON ; chaque niveau suivant ajoute
 * pvParNiveau + CON. La CON courante s'applique rétroactivement à tous les
 * niveaux (p. 39) — on recalcule toujours depuis la CON du moment.
 */
export function pvMax(niveau: number, famille: Famille, con: number, mods: DerivedMods = {}): number {
  const base = 2 * famille.pvBase + con;
  const parNiveaux = Math.max(0, niveau - 1) * (famille.pvParNiveau + con);
  return base + parNiveaux + m(mods.pvMax);
}

// ---------------------------------------------------------------------------
// Dés de récupération — p. 30
// ---------------------------------------------------------------------------

/** Nombre de dés de récupération = 2 + CON + bonus de famille, plancher 0. */
export function nbDesRecuperation(con: number, famille: Famille, mods: DerivedMods = {}): number {
  return Math.max(0, 2 + con + famille.bonusDrCreation + m(mods.nbDesRecuperation));
}

/** Type du dé de récupération (déterminé par la famille). */
export function deRecuperation(famille: Famille): De {
  return famille.deRecuperation;
}

// ---------------------------------------------------------------------------
// Points de chance — p. 30
// ---------------------------------------------------------------------------

/** PC = 2 + CHA + bonus de famille (aventuriers +1), plancher 0. */
export function pointsChance(cha: number, famille: Famille, mods: DerivedMods = {}): number {
  return Math.max(0, 2 + cha + famille.bonusPcCreation + m(mods.pointsChance));
}

// ---------------------------------------------------------------------------
// Points de mana — p. 31 et 42
// ---------------------------------------------------------------------------

/**
 * PM = VOL + nombre de capacités de sorts connues — uniquement si le
 * personnage possède au moins un sort (sinon il n'a pas de réserve de mana).
 * Retourne null quand nbSorts vaut 0.
 */
export function pointsMana(vol: number, nbSorts: number, mods: DerivedMods = {}): number | null {
  if (nbSorts <= 0) return null;
  return Math.max(0, vol + nbSorts + m(mods.pointsMana));
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
export function defense(agi: number, equip: DefenseEquipement, mods: DerivedMods = {}): number {
  const agiEffective = equip.agiMax === null ? agi : Math.min(agi, equip.agiMax);
  return 10 + agiEffective + equip.bonusDef + m(mods.def);
}

// ---------------------------------------------------------------------------
// Valeurs d'attaque — p. 32 et 39
// ---------------------------------------------------------------------------

/** Valeur de base d'attaque = niveau, plafonnée au niveau 10 (p. 39). */
export function baseAttaque(niveau: number): number {
  return Math.min(niveau, NIVEAU_MAX_ATTAQUE);
}

/** Attaque au contact = base + FOR. */
export function attaqueContact(niveau: number, force: number, mods: DerivedMods = {}): number {
  return baseAttaque(niveau) + force + m(mods.attaqueContact);
}

/** Attaque à distance = base + AGI. */
export function attaqueDistance(niveau: number, agi: number, mods: DerivedMods = {}): number {
  return baseAttaque(niveau) + agi + m(mods.attaqueDistance);
}

/** Attaque magique = base + VOL. */
export function attaqueMagique(niveau: number, vol: number, mods: DerivedMods = {}): number {
  return baseAttaque(niveau) + vol + m(mods.attaqueMagique);
}

// ---------------------------------------------------------------------------
// Agrégat
// ---------------------------------------------------------------------------

export interface DerivedInput {
  caracs: Caracs;
  niveau: number;
  famille: Famille;
  /** Contribution de l'équipement porté à la DEF. */
  defenseEquipement: DefenseEquipement;
  /** Nombre de capacités de sorts connues (pour les PM). */
  nbSorts: number;
  /** Modificateurs plats issus des capacités/surcharges. */
  mods?: DerivedMods;
}

export interface DerivedStats {
  pvMax: number;
  nbDesRecuperation: number;
  deRecuperation: De;
  pointsChance: number;
  pointsMana: number | null;
  initiative: number;
  defense: number;
  attaqueContact: number;
  attaqueDistance: number;
  attaqueMagique: number;
}

/** Calcule toutes les statistiques dérivées d'un personnage. */
export function deriveStats(input: DerivedInput): DerivedStats {
  const { caracs, niveau, famille, defenseEquipement, nbSorts } = input;
  const mods = input.mods ?? {};
  return {
    pvMax: pvMax(niveau, famille, caracs.CON, mods),
    nbDesRecuperation: nbDesRecuperation(caracs.CON, famille, mods),
    deRecuperation: deRecuperation(famille),
    pointsChance: pointsChance(caracs.CHA, famille, mods),
    pointsMana: pointsMana(caracs.VOL, nbSorts, mods),
    initiative: initiative(caracs.PER, mods),
    defense: defense(caracs.AGI, defenseEquipement, mods),
    attaqueContact: attaqueContact(niveau, caracs.FOR, mods),
    attaqueDistance: attaqueDistance(niveau, caracs.AGI, mods),
    attaqueMagique: attaqueMagique(niveau, caracs.VOL, mods),
  };
}
