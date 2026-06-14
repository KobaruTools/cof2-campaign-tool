/**
 * Schéma des données de règles — Chroniques Oubliées Fantasy 2e édition (CO2).
 *
 * Jalon J1 du PRD : types des entités de règles, validés contre le sommaire
 * et un échantillon de pages du livre de base
 * (`CBHS_06_Chroniques_Oubliees_2_web_v2.pdf`, 358 pages).
 *
 * Convention : chaque entité porte un champ `sourcePage` (numéro de page PDF,
 * = numéro de page imprimé dans ce fichier) pour la relecture et les
 * corrections. Les textes de règles sont stockés en verbatim (décision PRD #3).
 *
 * Les nombres de page cités dans les commentaires ci-dessous renvoient au
 * livre de base.
 */

/** Numéro de page du livre de base d'où provient l'entité. */
export type SourcePage = number;

// ---------------------------------------------------------------------------
// Caractéristiques — p. 26-27
// ---------------------------------------------------------------------------

/**
 * Les 7 caractéristiques de CO2 : 4 physiques (AGI, CON, FOR, PER) et
 * 3 mentales (CHA, INT, VOL). Ce sont directement des « valeurs »
 * (échelle -3 à +5, création de -2 à +5 — p. 27), ajoutées telles quelles
 * au d20 lors des tests (p. 202) et consommées telles quelles par les
 * formules dérivées. Pas de couche score → modificateur (PRD §3 #13,
 * vérifié contre le livre : prétirés p. 349).
 */
export const ABILITY_IDS = ['AGI', 'CON', 'FOR', 'PER', 'CHA', 'INT', 'VOL'] as const;
export type AbilityId = (typeof ABILITY_IDS)[number];

/** Plage indicative affichée à la saisie libre (jamais bloquante) — p. 27. */
export const ABILITY_MIN = -3;
export const ABILITY_MAX = 5;

/**
 * Séries de valeurs officielles proposées à la création (Polyvalent, Expert,
 * Spécialiste) — p. 27. Affichées à titre informatif dans le wizard, la
 * saisie restant libre (décision PRD #5).
 */
export interface ValueSet {
  id: string;
  name: string;
  values: number[]; // 7 valeurs à répartir
  sourcePage: SourcePage;
}

/**
 * Entrée de la table d20 « Idéaux héroïques / Travers » utilisée à la touche
 * finale de la création — p. 33. Purement indicative (tirage réel à la table
 * ou choix libre).
 */
export interface IdealFlaw {
  d20: number;
  ideal: string;
  flaw: string;
  sourcePage: SourcePage;
}

// ---------------------------------------------------------------------------
// Dés
// ---------------------------------------------------------------------------

export type Die = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

// ---------------------------------------------------------------------------
// Familles de profils — p. 30-31, 61, 78, 91, 112
// ---------------------------------------------------------------------------

export const FAMILY_IDS = ['adventurers', 'fighters', 'mages', 'mystics'] as const;
export type FamilyId = (typeof FAMILY_IDS)[number];

/**
 * Une famille regroupe des profils et détermine PV, dé de récupération et
 * bonus éventuels. PV niveau 1 = (2 × baseHp) + CON (p. 30) ;
 * gain par niveau = hpPerLevel + CON (p. 39).
 */
export interface Family {
  id: FamilyId;
  name: string;
  /** PV de base de la famille (aventuriers 4, combattants 5, mages 3, mystiques 4) — p. 30. */
  baseHp: number;
  /** Gain de PV par montée de niveau, avant ajout de CON — p. 39. */
  hpPerLevel: number;
  /** Type du dé de récupération (d8 / d10 / d6 / d8) — p. 30. */
  recoveryDie: Die;
  /** DR supplémentaires à la création (mystiques : +1) — p. 30. */
  bonusRecoveryDiceOnCreation: number;
  /** PC supplémentaires à la création (aventuriers : +1) — p. 30. */
  bonusLuckPointsOnCreation: number;
  sourcePage: SourcePage;
}

// ---------------------------------------------------------------------------
// Peuples — chap. 3, p. 44-60
// ---------------------------------------------------------------------------

/**
 * Ajustement de caractéristique offert par un peuple. `abilities` liste les
 * caractéristiques admissibles : un seul élément = ajustement fixe,
 * plusieurs = choix du joueur (ex. demi-elfe « +1 PER ou CHA » — p. 46).
 */
export interface AbilityModifier {
  value: number;
  abilities: AbilityId[];
}

/** Repères physiques d'un peuple (encadré « Repères ») — ex. p. 46. */
export interface PhysicalProfile {
  startingAge: string;
  lifeExpectancy: string;
  height: string;
  weight: string;
  traits: string;
}

/**
 * Suggestions de noms d'un peuple — section « Noms typiques » du livre. Sert
 * d'aide au joueur et de source à un générateur de nom simple, d'où la
 * séparation par sexe.
 */
export interface AncestryNames {
  /**
   * Conseils de composition verbatim (sonorités, terminaisons, usages). Donne
   * le contexte des listes, et la règle quand le livre n'en fournit pas.
   */
  note: string;
  /**
   * Prénoms (ou noms complets) masculins proposés par le livre. Vide quand le
   * livre ne liste rien mais décrit une règle de composition (ex. demi-elfe).
   */
  male: string[];
  /** Prénoms (ou noms complets) féminins proposés. Vide si aucune liste. */
  female: string[];
  /**
   * Noms de famille proposés indépendamment du sexe, quand le livre les
   * distingue explicitement des prénoms (ex. halfelin). Absent sinon.
   */
  surnames?: string[];
  sourcePage: SourcePage;
}

export interface Ancestry {
  id: string;
  name: string;
  /** Description / interprétation (verbatim ou condensé fidèle). */
  description: string;
  physical: PhysicalProfile;
  /** Suggestions de noms « Noms typiques » — séparées par sexe. */
  names: AncestryNames;
  /**
   * La plupart des peuples ont 2 modificateurs ; les humains un seul — p. 26.
   */
  abilityModifiers: AbilityModifier[];
  /**
   * Voies de peuple accessibles. Un seul id en général ; plusieurs si le
   * peuple laisse le choix (demi-elfe : voie de l'humain, de l'elfe haut ou
   * de l'elfe sylvain — p. 46).
   */
  ancestryPathIds: string[];
  sourcePage: SourcePage;
}

// ---------------------------------------------------------------------------
// Profils — chap. 4-7, p. 61-127
// ---------------------------------------------------------------------------

/**
 * Accès d'un profil à une catégorie d'armes, interprété depuis le texte
 * « Armes & armures maîtrisées » (extraction validée) :
 * - `all` : toutes les armes de la catégorie ;
 * - `oneHanded` (contact seulement) : armes utilisables à une main — légères,
 *   à une main, et « une ou deux mains » tenues à une main ;
 * - `none` : aucune au titre de l'accès global ; seules celles listées dans
 *   `allowedWeaponIds` sont maîtrisées.
 */
export type WeaponAccess = 'all' | 'oneHanded' | 'none';

export interface CharacterClass {
  id: string;
  name: string;
  familyId: FamilyId;
  description: string;
  /** Texte verbatim « Armes & armures maîtrisées » — ex. p. 62. */
  weaponsAndArmor: string;
  /**
   * Restriction d'armure exprimée par le livre sous la forme « peut porter
   * jusqu'à X » : id de l'armure la plus protectrice autorisée, null si
   * aucune armure (à confirmer profil par profil à l'extraction) — p. 31, 188.
   */
  maxArmorId: string | null;
  /** Le profil autorise-t-il le bouclier ? — ex. arquebusier : non (p. 62). */
  shieldAllowed: boolean;
  /** Accès aux armes de contact — voir `WeaponAccess`. Interprété du verbatim. */
  meleeAccess: WeaponAccess;
  /** Accès aux armes à distance : `all` (hors poudre, cf. `powderAllowed`) ou `none`. */
  rangedAccess: 'all' | 'none';
  /**
   * Armes précises maîtrisées en plus des accès globaux ; constitue la liste
   * complète quand `meleeAccess`/`rangedAccess` valent `none`
   * (ex. magicien : dague, bâton). Réfère des ids du catalogue d'armes.
   */
  allowedWeaponIds: string[];
  /** Armes retirées d'un accès `all` (ex. barbare : les arbalètes). */
  excludedWeaponIds?: string[];
  /**
   * Le profil maîtrise les armes à poudre — p.185 : « seul l'arquebusier
   * maîtrise les armes à poudre » par défaut. N'a d'effet que si les armes à
   * feu sont autorisées dans la partie (notion de campagne à venir).
   */
  powderAllowed?: boolean;
  /** Nuances verbatim non structurables (choix du joueur, exceptions…). */
  weaponNotes?: string;
  /** Équipement de départ — ex. p. 62. */
  startingEquipment: StartingEquipmentRef[];
  /** Les 5 voies du profil, dans l'ordre du livre — ex. table p. 61. */
  pathIds: string[];
  /**
   * Caractéristiques « les plus utiles au personnage », par ordre
   * d'importance, telles qu'indiquées entre crochets dans le résumé des
   * profils p. 24-25 (souvent 3 ; le druide a un 3e choix « CON ou AGI »,
   * encodé en 4 entrées). Sert à suggérer une série au wizard.
   */
  recommendedAbilities: AbilityId[];
  sourcePage: SourcePage;
}

/**
 * Ligne d'équipement de départ d'un profil. `itemId` pointe vers le
 * catalogue quand l'objet y figure ; `label` conserve le texte du livre
 * (ex. « pétoire (DM 1d10, portée 20 m) » — p. 62).
 */
export interface StartingEquipmentRef {
  itemId: string | null;
  label: string;
  quantity: number;
}

// ---------------------------------------------------------------------------
// Voies — chap. 4-8 + voies de peuple (chap. 3) + voie du mage (p. 60)
// ---------------------------------------------------------------------------

/** Catégories des voies de prestige — table récapitulative p. 128. */
export const PRESTIGE_CATEGORIES = [
  'generic',
  'adventurer',
  'fighter',
  'mage',
  'mystic',
] as const;
export type PrestigeCategory = (typeof PRESTIGE_CATEGORIES)[number];

interface PathBase {
  id: string;
  name: string;
  /** Capacités de la voie, ordonnées par rang croissant. */
  featureIds: string[];
  /** Encadré ou note spécifique à la voie (verbatim), le cas échéant. */
  note?: string;
  sourcePage: SourcePage;
}

/** Voie appartenant aux 5 voies d'un (ou plusieurs) profil(s). Rangs 1-5. */
export interface ClassPath extends PathBase {
  type: 'class';
  classIds: string[];
}

/** Voie de peuple : rang 1 gratuit à la création — p. 39. Rangs 1-5. */
export interface AncestryPath extends PathBase {
  type: 'ancestry';
  ancestryIds: string[];
}

/**
 * Voie du mage (p. 60) : remplace la voie de peuple pour les profils de la
 * famille des mages, au choix du joueur. Rangs 1-5.
 */
export interface MagePath extends PathBase {
  type: 'mage';
}

/**
 * Voie de prestige — chap. 8, p. 128+ : accessible à partir du niveau 5,
 * une seule par personnage, capacités de rangs 4 à 8.
 */
export interface PrestigePath extends PathBase {
  type: 'prestige';
  category: PrestigeCategory;
  /** Prérequis en texte verbatim (ex. voie de l'expert — p. 129). */
  prerequisites: string;
}

export type Path = ClassPath | AncestryPath | MagePath | PrestigePath;
export type PathType = Path['type'];

// ---------------------------------------------------------------------------
// Capacités
// ---------------------------------------------------------------------------

/**
 * Type d'action consommé par la capacité, tel que noté entre parenthèses
 * après son nom : (A) attaque, (L) limitée, (G) gratuite, (M) mouvement —
 * p. 227. Absent pour les capacités passives.
 * TODO(extraction) : confirmer le libellé exact de chaque lettre au chap.
 * combat (p. 209-210) et relever les cas composés (« (M) ou (L) » — p. 343).
 */
export const ACTION_TYPES = ['A', 'L', 'G', 'M'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/**
 * Statistiques dérivées qu'un effet de capacité peut cibler. SOURCE UNIQUE des
 * clés partagées par le moteur (`DerivedMods`, sac de modificateurs plats) et
 * par les surcharges manuelles de la fiche (`DerivedStatId` côté personnage).
 * Définies ici, dans la couche données (la plus basse), pour que les `effects`
 * structurés des capacités s'y réfèrent sans dépendance circulaire.
 */
export const DERIVED_STAT_IDS = [
  'maxHp',
  'def',
  'initiative',
  'luckPoints',
  'manaPoints',
  'recoveryDiceCount',
  'meleeAttack',
  'rangedAttack',
  'magicAttack',
] as const;
export type DerivedStatId = (typeof DERIVED_STAT_IDS)[number];

/**
 * Effet structuré d'une capacité — couche SÉMANTIQUE lue par le moteur, en plus
 * du `text` verbatim (toujours conservé et sourcé). Union discriminée par
 * `kind` : on pourra introduire d'autres genres d'effets (ex. accès aux
 * armures modifié, milestone Armures) en ajoutant un membre à l'union, sans
 * rouvrir le schéma de `Feature`.
 */
export type FeatureEffect = StatBonusEffect;

/**
 * Bonus chiffré PERMANENT et INCONDITIONNEL à une statistique dérivée
 * (ex. « bonus permanent de +1 en Init. et en DEF » — voie de l'air r1, p. 93).
 * Hors périmètre : les bonus conditionnels / temporaires / scalants (un autre
 * genre d'effet, ticket dédié). Une capacité partiellement plate n'expose ici
 * que sa part plate inconditionnelle.
 */
export interface StatBonusEffect {
  kind: 'stat-bonus';
  /** Stat dérivée visée (cf. `DERIVED_STAT_IDS`). */
  stat: DerivedStatId;
  /** Valeur ajoutée (signée). */
  value: number;
}

export interface Feature {
  id: string;
  name: string;
  pathId: string;
  /** Rang dans la voie : 1-5 (voies normales), 4-8 (voies de prestige). */
  rank: number;
  /** Sort : capacité signalée par un astérisque (*) — p. 227. */
  isSpell: boolean;
  /**
   * Types d'action requis. Liste car certaines capacités en offrent
   * plusieurs (« Malédiction (M) ou (L)* » — p. 343). Vide = passive.
   */
  actionTypes: ActionType[];
  /** Texte de règles complet, verbatim. Reste la SOURCE, jamais perdu. */
  text: string;
  /**
   * Texte balisé pour l'affichage ENRICHI (PER-64, étendu PER-90), EN PLUS de
   * `text` (qui reste la source). Couche de PRÉSENTATION uniquement (distincte de
   * `effects`, qui nourrit le moteur). Mini-langage parsé par `parseRichText`
   * (cf. `src/lib/ui/featureRichText.ts` et `docs/extraction/rich-text-format.md`) :
   * - dé : `{1d4°}`, `{d6}`, `{2d6}` (entre accolades, notation du livre ; `°` =
   *   dé évolutif rendu à sa valeur au niveau courant) ;
   * - formule de MODIFICATEUR : `[FOR + 1]`, `[CHA]`, `[1d4° + CHA]`, `[10 + rang]`,
   *   `[niveau × 3]` (entre crochets) — une suite de termes (caractéristique, dé,
   *   nombre, `rang`, `niveau`), chacun éventuellement multiplié par une constante
   *   (`CHA × 100`), séparés par `+`/`-`. Sans dé : calculée et affichée en encadré
   *   signé ; avec un dé : rendue dé(s) + variables résolues ;
   * - QUANTITÉ : `[=CHA]`, `[=CHA × 100]`, `[=rang]`, `[=niveau × 5]` (crochets
   *   préfixés de `=`) — même grammaire, mais rendue en VALEUR BRUTE (durée, portée,
   *   nombre de cibles), sans signe : « pendant [=CHA] minutes » → « 5 minutes » ;
   * - référence de stat : `@FOR`, `@CHA` — mise en avant sans calcul (renvoi, ou
   *   stat d'une CIBLE qu'on ne peut pas évaluer).
   * Tout le reste est du texte littéral. Absent → on retombe sur `text` verbatim.
   */
  richText?: string;
  /**
   * Effets structurés lus par le moteur, EN PLUS du `text` verbatim (qui reste
   * la source). Optionnel et additif. Périmètre actuel (PER-63) : uniquement des
   * bonus plats permanents inconditionnels (`StatBonusEffect`). Une capacité
   * partiellement structurable (ex. Réflexes éclair : +3 Init / +1 DEF plat,
   * mais DEF +2 au rang 5) n'expose ici que sa part plate ; le reste relève des
   * tickets aval (effets conditionnels, choix). Absent = aucun effet structuré.
   */
  effects?: FeatureEffect[];
  /**
   * Coût de base en points de mana pour LANCER ce sort — DÉROGATION explicite au
   * coût standard (PER-65). La règle générale (p. 228) est : « Lancer un sort
   * coûte un nombre de points de mana égal au rang de la capacité à laquelle il
   * est associé. » On ne duplique donc PAS le rang ici : le coût de base se
   * dérive du rang (cf. `spellManaCost`, `src/lib/engine/derived.ts`).
   *
   * Ce champ ne porte que les EXCEPTIONS énoncées verbatim dans le texte du
   * sort :
   * - coût fixe différent du rang (ex. Rune de garde, rang 5 : « coûte seulement
   *   3 PM pour être lancé » → `manaCost: 3`) ;
   * - sort gratuit (« aucun coût de mana » sur le lancement lui-même) →
   *   `manaCost: 0`.
   *
   * Absent = le coût suit la règle du rang. N'a de sens que si `isSpell`.
   * HORS PÉRIMÈTRE (ne PAS encoder ici) : les réductions DYNAMIQUES (Concentration,
   * arme élémentaire, action de mouvement…) et le surcoût d'armure (milestone
   * Armures) — ils se calculent par-dessus ce coût de base, pas dedans.
   */
  manaCost?: number;
  sourcePage: SourcePage;
}

// ---------------------------------------------------------------------------
// Équipement — chap. 10, p. 181-196
// ---------------------------------------------------------------------------

/**
 * Prix en pièces. Unité monétaire relevée : « pa » (p. 188).
 * TODO(extraction) : relever le système monétaire complet (p. 181+) et
 * normaliser l'unité de ce champ. null = prix non indiqué.
 */
export type Price = { amount: number; unit: string } | null;

interface EquipmentBase {
  id: string;
  name: string;
  price: Price;
  /** Règles particulières (verbatim), ex. armes en italique p. 184+. */
  properties?: string;
  sourcePage: SourcePage;
}

/**
 * Catégories d'armes — p. 184. Le livre ne nomme que trois catégories
 * (légère / à une ou deux mains / à deux mains) ; `oneHand` couvre les armes
 * « standard » des tables p. 183 et 185 sans mention de catégorie.
 */
export const WEAPON_CATEGORIES = ['light', 'oneHand', 'oneOrTwoHands', 'twoHands'] as const;
export type WeaponCategory = (typeof WEAPON_CATEGORIES)[number];

/** Types de DM provoqués par les armes — p. 183 (colonne « Type de DM »). */
export const DAMAGE_TYPES = ['bludgeoning', 'piercing', 'slashing'] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export interface Weapon extends EquipmentBase {
  category: 'weapon';
  weaponCategory: WeaponCategory;
  /** L'arme est-elle une arme de contact, à distance, ou les deux (lancer) ? */
  melee: boolean;
  ranged: boolean;
  /** Dés de dommages, notation du livre (ex. « 1d8 », « 5d4° + INT »). */
  damage: string;
  /** DM à deux mains pour les armes à une ou deux mains (ex. « 1d6/1d10 »). */
  twoHandedDamage?: string;
  /** Portée, notation du livre (ex. « 20 m », « 1d6 à 10 m » pour le lancer). */
  range?: string;
}

export interface Armor extends EquipmentBase {
  category: 'armor';
  /** Bonus de défense — table p. 188. */
  def: number;
  /** Valeur maximale d'AGI exploitable avec cette armure — p. 188. */
  maxAgi: number | null;
}

export interface Shield extends EquipmentBase {
  category: 'shield';
  def: number;
}

/** Matériel d'aventurier, autres biens, équipement de qualité/exotique. */
export interface Gear extends EquipmentBase {
  category: 'gear';
  description?: string;
}

export type EquipmentItem = Weapon | Armor | Shield | Gear;
export type EquipmentCategory = EquipmentItem['category'];

// ---------------------------------------------------------------------------
// Règles de progression — chap. 1 (p. 29-33) et chap. 2 (p. 38-43)
// ---------------------------------------------------------------------------

/**
 * Constantes de progression extraites du livre. Une seule instance de cet
 * objet vivra dans `src/data/` ; le moteur de calcul est l'unique
 * consommateur.
 */
export interface ProgressionRules {
  /**
   * Niveau maximum jouable.
   * TODO(extraction) : non explicité dans les pages déjà lues (les dés
   * évolutifs vont jusqu'à « 15+ » p. 43, la table des rangs jusqu'au
   * niveau 13 p. 39, les valeurs d'attaque plafonnent au niveau 10 p. 39).
   */
  maxLevel: number;
  /** Points de capacité gagnés à chaque niveau (2) — p. 38. */
  featurePointsPerLevel: number;
  /** Coût en points : rangs 1-2 → 1 point, rangs 3+ → 2 points — p. 39. */
  costPerRank: Record<number, number>;
  /**
   * Niveau minimum requis par rang (1→1, 2→2, 3→3, 4→5, 5→7, 6→9, 7→11,
   * 8→13) — table p. 39. L'exception mage (rang 2 dès la création, « 2* »)
   * est portée par le moteur.
   */
  minLevelPerRank: Record<number, number>;
  /** Rangs réservés aux voies de prestige (6 à 8) — p. 39. */
  prestigeOnlyRanks: number[];
  /** Niveau d'accès aux voies de prestige (5) — p. 128. */
  prestigeAccessLevel: number;
  /** Plafond d'augmentation des valeurs d'attaque (+1/niveau jusqu'à 10) — p. 39. */
  maxAttackLevel: number;
  /**
   * Dés évolutifs (d4°) : valeur du dé selon le niveau — table p. 43
   * (1-5 : d4, 6-8 : d6, 9-11 : d8, 12-14 : d10, 15+ : d12).
   */
  scalingDice: Array<{ minLevel: number; die: Die }>;
  /** Contenu du sac d'aventurier remis à la création — p. 31. */
  adventurerPack: StartingEquipmentRef[];
  sourcePage: SourcePage;
}
