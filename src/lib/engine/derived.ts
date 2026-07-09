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
import type { AbilityId, DerivedStatId, Die, Family, FamilyId, Feature, ProgressionRules } from '@/data/schema';

export type Abilities = Record<AbilityId, number>;

/** Plafond du niveau pris en compte par les valeurs d'attaque (p. 39). */
export const MAX_ATTACK_LEVEL = 10;

/**
 * Modificateurs plats apportés par les capacités/équipement/surcharges,
 * sommés par-dessus les formules de base. Tous optionnels, défaut 0. Les clés
 * sont la source unique `DERIVED_STAT_IDS` (cf. `schema.ts`), partagée avec les
 * `effects` des capacités et les surcharges manuelles.
 */
export type DerivedMods = Partial<Record<DerivedStatId, number>>;

/**
 * Composition du gain de PV d'un niveau (≥ 2) pour un profil hybride, à des fins
 * d'affichage uniquement (infobulle des PV). Voir `hpLevelGains` dans `hp.ts`.
 */
export interface HpLevelGain {
  /** Niveau concerné (2 au niveau courant). */
  level: number;
  /**
   * Familles de profil des capacités prises à ce niveau : une seule (gain = PV
   * de cette famille) ou deux (niveau « mixte » → moyenne, p. 177).
   */
  familyIds: FamilyId[];
  /** PV « famille » attribués à ce niveau, avant CON (moyenne arrondie si mixte). */
  familyGain: number;
  /**
   * Vrai si `familyGain` provient d'un **dé de vie lancé** (règle maison
   * `hitDieOnLevelUp`, PER-87) plutôt que du gain fixe de la famille : le résultat
   * a été saisi librement à la table. Sert à l'affichage (breakdown des PV) ;
   * absent/`false` = gain fixe habituel.
   */
  rolled?: boolean;
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
 *
 * `familyGains` (optionnel) : composante « famille » du gain de PV de chaque
 * niveau (du 2 au niveau courant), pour les profils hybrides dont les niveaux
 * mixtes ne rapportent pas tous le même nombre de PV (p. 177). Quand il est
 * fourni, il remplace le terme `(niveau − 1) × hpPerLevel`. Absent → profil
 * mono-famille : on retombe sur la formule fermée.
 *
 * `level1FamilyHp` (optionnel) : composante « famille » des PV de base (niveau
 * 1). Pour un profil standard elle vaut `2 × baseHp` (la valeur par défaut).
 * Pour un profil hybride construit dès la création (p. 180), le personnage
 * « ajoute les PV de chacun des deux profils dont sont issues ses capacités »,
 * soit `baseHp(famille A) + baseHp(famille B)` — c'est cette somme qu'on passe
 * ici pour remplacer le `2 × baseHp` par défaut.
 */
export function maxHp(
  level: number,
  family: Family,
  con: number,
  mods: DerivedMods = {},
  familyGains?: number[],
  level1FamilyHp?: number,
): number {
  const base = (level1FamilyHp ?? 2 * family.baseHp) + con;
  const levelsAbove1 = Math.max(0, level - 1);
  const familyHp = familyGains
    ? familyGains.reduce((sum, g) => sum + g, 0)
    : levelsAbove1 * family.hpPerLevel;
  return base + familyHp + levelsAbove1 * con + m(mods.maxHp);
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
 * PM = caractéristique de base + nombre de capacités de sorts connues — uniquement si
 * le personnage possède au moins un sort (sinon il n'a pas de réserve de mana). La
 * caractéristique de base est la VOL par défaut, mais peut être remplacée (ex. Charisme
 * héroïque : CHA, cf. `DerivedInput.manaAbility`) ; l'appelant passe ici sa VALEUR.
 * Retourne null quand spellCount vaut 0.
 */
export function manaPoints(castingAbilityValue: number, spellCount: number, mods: DerivedMods = {}): number | null {
  if (spellCount <= 0) return null;
  return Math.max(0, castingAbilityValue + spellCount + m(mods.manaPoints));
}

/**
 * Coût de base, en points de mana, pour lancer un sort donné — pendant du calcul
 * de la réserve (`manaPoints`) : la réserve est ce dont on dispose, ce coût est
 * ce qu'on dépense à chaque lancement (p. 228).
 *
 * Règle (p. 228) : « Lancer un sort coûte un nombre de points de mana égal au
 * rang de la capacité à laquelle il est associé. » Le coût se dérive donc du
 * `rank` ; `feature.manaCost`, quand il est présent, porte la DÉROGATION
 * verbatim du sort (coût fixe différent, ou 0 = gratuit — cf. `schema.ts`).
 *
 * Retourne `null` pour une capacité qui n'est pas un sort (elle ne dépense pas
 * de mana). Ne modélise PAS les réductions dynamiques (Concentration, arme
 * élémentaire…) ni le surcoût d'armure : celles-ci s'appliquent par-dessus ce
 * coût de base, dans leurs couches dédiées.
 */
export function spellManaCost(
  feature: Pick<Feature, 'isSpell' | 'rank' | 'manaCost'>,
): number | null {
  if (!feature.isSpell) return null;
  return Math.max(0, feature.manaCost ?? feature.rank);
}

/**
 * Réduction de coût en mana accordée par la Concentration accrue (p. 228).
 * Le plancher de coût reste 0 (les sorts de rang 1 et 2 tombent ainsi à 0 PM).
 */
export const CONCENTRATION_MANA_REDUCTION = 2;

/**
 * Vrai si un sort peut bénéficier de la Concentration accrue (p. 228) : la règle
 * la réserve aux sorts lancés en **action d'attaque (A)**. Il suffit donc que le
 * sort PROPOSE un mode de lancement en `(A)` — y compris les sorts à double mode
 * « (A) ou (L) » (Arme élémentaire, Invisibilité, Peur) : le joueur qui choisit
 * de lancer en (A) peut se concentrer (le mode (L) natif, lui, est un autre
 * lancement, non concerné). Faux pour une capacité qui n'est pas un sort, ou un
 * sort qui n'offre aucun mode (A) (purement (L)/(M)/(G)).
 */
export function canConcentrate(
  feature: Pick<Feature, 'isSpell' | 'actionTypes'>,
): boolean {
  return feature.isSpell && feature.actionTypes.includes('A');
}

/**
 * Coût en mana d'un sort lancé en se concentrant (Concentration accrue, p. 228) :
 * coût de base − 2 PM, plancher 0. Si le sort ne peut pas en bénéficier (capacité
 * non-sort, ou sort qui ne se lance pas en (A)), retourne le coût de base
 * inchangé (`null` pour un non-sort). Réduction dynamique appliquée par-dessus le
 * coût de base (`spellManaCost`) : ne touche pas ce dernier.
 */
export function concentratedSpellManaCost(
  feature: Pick<Feature, 'isSpell' | 'rank' | 'manaCost' | 'actionTypes'>,
): number | null {
  const base = spellManaCost(feature);
  if (base === null) return null;
  if (!canConcentrate(feature)) return base;
  return Math.max(0, base - CONCENTRATION_MANA_REDUCTION);
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
 *
 * Il n'existe AUCUN plafond de défense « global » à appliquer comme règle
 * indépendante (cadrage PER-75, `docs/extraction/armures.md` §1) : le seul
 * plafond réel est celui de l'AGI ci-dessous. Le fait que le cumul AGI + armure
 * ne dépasse pas +8 (+10 avec un grand bouclier) est une PROPRIÉTÉ calibrée par
 * la table des armures (p. 188), pas une seconde limite à faire respecter — ne
 * pas réintroduire de `Math.min` sur le total.
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
  /**
   * Caractéristique servant de BASE aux PM. Défaut `VOL` (règle p. 31/42) ; une capacité
   * peut la remplacer (ex. Charisme héroïque du barde : CHA au lieu de VOL — `manaCastingAbility`).
   */
  manaAbility?: AbilityId;
  /**
   * Composante « famille » du gain de PV par niveau (profils hybrides, p. 177).
   * Voir `maxHp`. Absent pour un profil mono-famille.
   */
  hpFamilyGains?: number[];
  /**
   * Composante « famille » des PV de base au niveau 1 (hybride créé au niveau 1,
   * p. 180). Voir `maxHp`. Absent → `2 × baseHp` (profil standard).
   */
  hpLevel1Family?: number;
  /**
   * Détail UNIQUEMENT pour l'affichage (infobulle) : familles des deux voies de
   * profil du niveau 1 en cas d'hybridation, pour détailler le calcul des PV de
   * base. N'entre pas dans le calcul du moteur (`hpLevel1Family` porte la somme).
   * Sa somme de `baseHp` doit valoir `hpLevel1Family`. Vide → profil standard.
   */
  hpLevel1Families?: FamilyId[];
  /**
   * Détail UNIQUEMENT pour l'affichage (infobulle) : composition du gain de PV
   * de chaque niveau (du 2 au niveau courant), pour expliquer pas à pas le
   * calcul d'un profil hybride (familles concernées, moyenne d'un niveau mixte,
   * p. 177). N'entre pas dans le calcul du moteur (`hpFamilyGains` porte les
   * nombres) ; ses `familyGain` doivent correspondre à `hpFamilyGains`.
   */
  hpLevelGains?: HpLevelGain[];
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
    maxHp: maxHp(level, family, abilities.CON, mods, input.hpFamilyGains, input.hpLevel1Family),
    recoveryDiceCount: recoveryDiceCount(abilities.CON, family, mods),
    recoveryDie: recoveryDie(family),
    luckPoints: luckPoints(abilities.CHA, family, mods),
    manaPoints: manaPoints(abilities[input.manaAbility ?? 'VOL'], spellCount, mods),
    initiative: initiative(abilities.PER, mods),
    defense: defense(abilities.AGI, defenseEquipment, mods),
    meleeAttack: meleeAttack(level, abilities.FOR, mods),
    rangedAttack: rangedAttack(level, abilities.AGI, mods),
    magicAttack: magicAttack(level, abilities.VOL, mods),
  };
}
