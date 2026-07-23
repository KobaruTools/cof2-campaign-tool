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
// Dégâts d'arme — modèle structuré (PER-217)
// ---------------------------------------------------------------------------

/**
 * Dé de DM d'une arme (PER-217). `Die` (d4…d20, jeu d'icônes) plus `d3`, présent
 * sur quelques armes (mains nues, stylet, lance-pierre — p. 183/185) mais absent
 * du jeu d'icônes polyédriques : il est rendu en texte, jamais en icône.
 */
export type DamageDie = Die | 'd3';

/**
 * Dégâts STRUCTURÉS d'une arme (PER-217) — remplace l'ancienne chaîne libre pour
 * les seules ARMES/ÉQUIPEMENT (les créatures et les sorts restent en chaîne, cf.
 * ADR 0002). Grammaire fermée et régulière : nombre de dés × dé, `+N` plat des
 * armes magiques, marqueur non létal.
 *
 * Le `°` évolutif (p. 43) est EXCLU (aucune arme n'en porte) ; une carac n'est
 * JAMAIS un `modifier` (elle est ajoutée par la formule d'attaque du moteur).
 * L'affichage passe par `formatWeaponDamage` (cf. `src/lib/character/weaponDamage.ts`),
 * qui produit la chaîne consommée par `<DamageValue>`.
 */
export interface WeaponDamage {
  /** Nombre de dés lancés (≥ 1), ex. 2 pour « 2d6 ». */
  count: number;
  /** Type de dé lancé. */
  die: DamageDie;
  /** Modificateur PLAT signé (armes magiques : « 1d8+2 »). Jamais une carac. Absent = 0. */
  modifier?: number;
  /** DM temporaires / non létaux, affichés entre parenthèses « (…) » (gourdin, mains nues). */
  nonLethal?: boolean;
}

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

/**
 * Accès d'un profil au bouclier, interprété depuis le texte « Armes & armures
 * maîtrisées ». Le livre distingue petit bouclier (DEF +1) et grand bouclier
 * (DEF +2) — table p. 188 — et certains profils ne débloquent que le petit :
 * - `all` : tous les boucliers (petit et grand) — ex. guerrier, chevalier, barbare ;
 * - `small` : petit bouclier seulement — ex. druide, prêtre ;
 * - `none` : aucun bouclier — ex. arquebusier, magicien.
 */
export type ShieldAccess = 'all' | 'small' | 'none';

/**
 * Reskin d'un objet du catalogue pour un profil donné (PER-181) : substitution de
 * NOM D'AFFICHAGE uniquement, aucune stat modifiée. Cf. `CharacterClass.equipmentReskins`.
 */
export interface EquipmentReskin {
  /** Id de l'objet du catalogue à renommer à l'affichage pour ce profil. */
  itemId: string;
  /** Nom affiché à la place du nom de catalogue (valeur en français). */
  name: string;
}

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
  /**
   * Accès au bouclier — voir `ShieldAccess`. Distingue petit/grand bouclier car
   * certains profils (druide, prêtre) ne maîtrisent que le petit (p. 188, p. 62).
   */
  shieldAccess: ShieldAccess;
  /**
   * Les sorts de ce profil se lancent en portant N'IMPORTE QUELLE armure, SANS
   * surcoût de mana (« Les sorts issus des voies de prêtre peuvent être lancés en
   * portant n'importe quelle armure », p. 178). Seul le prêtre en bénéficie ; tous
   * les autres lanceurs paient un surcoût de PM égal à la DEF de l'armure au-delà de
   * leur armure autorisée (cf. `spellcastingArmorAllowance`, PER-82). Absent/`false`
   * → le profil subit le surcoût d'armure normal.
   */
  spellsIgnoreArmor?: boolean;
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
  /**
   * Nom alternatif du profil quand les armes à feu sont interdites dans l'univers
   * de jeu (`Character.firearmsAllowed === false`). L'arquebusier privé de poudre
   * combat à l'arbalète et prend alors le nom d'« Arbalétrier » (p. 62). Absent →
   * le profil garde `name` quelle que soit l'autorisation des armes à feu.
   */
  nameWithoutFirearms?: string;
  /** Nuances verbatim non structurables (choix du joueur, exceptions…). */
  weaponNotes?: string;
  /**
   * Reskins d'objet propres au profil (PER-181) : noms d'AFFICHAGE alternatifs
   * d'objets du catalogue pour CE profil, à stats INCHANGÉES. C'est le SECOND
   * déclencheur de la primitive de substitution — un TRAIT DE CLASSE PERMANENT,
   * indépendant des campagnes — en miroir du premier, la règle de campagne « armes
   * à feu » (`nameWithoutFirearms` / `pathIdsWithoutFirearms`). Ex. druide : le
   * `baton-ferre` (bâton alourdi de métal) s'affiche « Bâton noueux » (simple bois),
   * mêmes DM, p. 113. Résolu par `reskinnedItemName` (cf.
   * `src/lib/character/classDisplay.ts`). Absent → l'objet garde son nom du catalogue.
   */
  equipmentReskins?: EquipmentReskin[];
  /** Équipement de départ — ex. p. 62. */
  startingEquipment: StartingEquipmentRef[];
  /** Les 5 voies du profil, dans l'ordre du livre — ex. table p. 61. */
  pathIds: string[];
  /**
   * Voies EFFECTIVES quand les armes à feu sont interdites (`Character.firearmsAllowed === false`).
   * Arquebusier → « Arbalétrier » : la voie des explosifs est supprimée et remplacée par la voie du
   * maître des arbalètes (clone limité aux arbalètes de la voie du maître d'armes du guerrier),
   * encadré « Poudre ou pas poudre ? », p. 62. Absent → `pathIds` s'applique quelle que soit
   * l'autorisation des armes à feu. Résolu par `effectiveClassPathIds` (cf.
   * `src/lib/character/classDisplay.ts`), miroir de `nameWithoutFirearms`.
   */
  pathIdsWithoutFirearms?: string[];
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
 * Une OPTION d'un choix d'équipement de départ « X ou Y » (PER-220). Chaque option
 * porte un libellé français et la LISTE des objets du catalogue qu'elle octroie —
 * une seule dans le cas courant (« Épée à deux mains »), plusieurs pour un LOT
 * (« Arme à une main + bouclier » du barbare, p. 79). Résolue par le joueur via la
 * modale « Choisir » sur la fiche ; la ligne placeholder est alors remplacée par
 * ces objets.
 */
export interface StartingEquipmentChoiceOption {
  /** Libellé de l'option (français), ex. « Hache à deux mains (2d6) ». */
  label: string;
  /** Objet(s) du catalogue octroyés par cette option (un LOT peut en contenir plusieurs). */
  items: { itemId: string; quantity: number }[];
}

/**
 * Ligne d'équipement de départ d'un profil. `itemId` pointe vers le
 * catalogue quand l'objet y figure ; `label` conserve le texte du livre
 * (ex. « pétoire (DM 1d10, portée 20 m) » — p. 62).
 *
 * `choice` (PER-220) : quand la ligne est un CHOIX « X ou Y » (`itemId: null`),
 * la liste des options concrètes résolvables par le joueur. `label` reste le texte
 * du livre affiché tant que le choix n'est pas fait.
 */
export interface StartingEquipmentRef {
  itemId: string | null;
  label: string;
  quantity: number;
  choice?: StartingEquipmentChoiceOption[];
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
  /**
   * Rappel COURT à afficher quand une capacité de cette voie est EMPRUNTÉE dans une
   * autre voie (« Don étrange », « Touche-à-tout », « Appel à une autre capacité »…).
   * Contrairement à `note` (grab-bag pouvant contenir du RP ou de longs encadrés de
   * gestion), ce champ ne porte QUE la particularité de voie qui suit la capacité une
   * fois isolée de son contexte (ex. envoûteur : immunité 24 h ; nécromancie : sans
   * effet sur les non-vivants). Rendu en encadré au-dessus de la carte de la capacité
   * empruntée (cf. `BorrowedFeatureBlock`), là où le titre de voie natif — et donc son
   * infobulle `note` — n'apparaît pas. Absent = aucun rappel. */
  borrowedNote?: string;
  /**
   * La voie EXIGE de manier un bouclier pour que ses capacités fonctionnent (PER-142) —
   * ex. Voie du bouclier du guerrier (p. 87 : « Pour utiliser les capacités suivantes,
   * le guerrier doit obligatoirement manier un bouclier. »). Quand AUCUN bouclier n'est
   * porté, toutes les capacités de la voie sont DÉSACTIVÉES (grisées + effets non comptés,
   * cf. `shieldDisabledFeatureIds`) ; un bouclier porté les réactive AUTOMATIQUEMENT, sans
   * interrupteur manuel. Absent/false = aucune exigence de bouclier.
   */
  requiresShield?: boolean;
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
 *
 * Genres à ce jour :
 *  - `stat-bonus` : bonus PERMANENT à une stat DÉRIVÉE, toujours appliqué (valeur
 *    éventuellement scalante, PER-67) ;
 *  - `conditional-stat-bonus` : bonus CONDITIONNEL / TEMPORAIRE à une stat dérivée,
 *    compté seulement quand l'interrupteur manuel du personnage l'active (PER-67) ;
 *  - `ability-bonus` : modificateur PERMANENT à une CARACTÉRISTIQUE (« +1 en CON »),
 *    déterministe, qui s'ajoute au total de la carac PAR-DESSUS la valeur saisie ;
 *  - `ability-bonus-die` : DÉ BONUS permanent aux tests d'une caractéristique
 *    (« lance 2d20, garde le meilleur ») — mécanique core CO2, drapeau par carac ;
 *  - `test-bonus` : BONUS DE COMPÉTENCE à un ou plusieurs DOMAINES de test nommés
 *    (« +3 aux tests de discrétion », « rang + 2 aux tests de persuasion ou de
 *    séduction ») — axe distinct des stats dérivées et des caractéristiques (PER-89).
 */
export type FeatureEffect =
  | StatBonusEffect
  | ConditionalStatBonusEffect
  | AbilityBonusEffect
  | AbilityBonusFromChoiceEffect
  | AbilityBonusDieEffect
  | AbilityBonusDieFromChoiceEffect
  | TestBonusEffect
  | ManaAbilityOverrideEffect
  | UniversalTestBonusEffect
  | ImmunityEffect
  | ArmorAccessEffect
  | ArmorDefBonusEffect
  | WeaponDamageBonusEffect
  | AttackBonusEffect;

/**
 * Valeur d'un effet (PER-67) : soit une CONSTANTE (cas courant — ex. « +1 en
 * DEF »), soit une valeur SCALANTE calculée depuis le personnage (`ScalingValue`,
 * ex. « ajoute sa FOR à ses PV », « passe à +2 au rang 5 de la voie »). La couche
 * données ne porte que la DÉFINITION ; la résolution numérique est faite par le
 * moteur, qui connaît le niveau, les caractéristiques et la progression dans les
 * voies (cf. `src/lib/character/effects.ts`).
 */
export type EffectValue = number | ScalingValue;

/** Valeur scalante (PER-67), discriminée par `scale`. */
export type ScalingValue =
  | SteppedScalingValue
  | AbilityScalingValue
  | LevelScalingValue
  | MilestoneCountScalingValue
  | PathRankScalingValue
  | MinScalingValue
  | SumScalingValue;

/**
 * Valeur par PALIERS selon la progression : on retient la valeur du palier de
 * plus haut seuil atteint (≤ référence), 0 sous le premier seuil. Couvre les
 * bonus qui « passent à +2 » à un certain rang/niveau (ex. Parade croisée :
 * +1 en DEF, +2 au rang 5 de la voie — p. 73).
 */
export interface SteppedScalingValue {
  scale: 'stepped';
  /**
   * Référence d'échelle :
   *  - 'level' : niveau du personnage ;
   *  - 'path-rank' : rang le plus élevé atteint dans la VOIE de la capacité hôte.
   */
  by: 'level' | 'path-rank';
  /** Paliers `{ min, value }`, triés par seuil croissant. */
  steps: Array<{ min: number; value: number }>;
}

/**
 * Valeur égale à une CARACTÉRISTIQUE (× un facteur), ex. « le barbare ajoute sa
 * FOR à son maximum de PV » (Argument de taille, p. 79) → `maxHp += FOR`.
 */
export interface AbilityScalingValue {
  scale: 'ability';
  ability: AbilityId;
  /** Multiplicateur appliqué à la valeur de la caractéristique (défaut 1). */
  factor?: number;
}

/**
 * Valeur égale au NIVEAU du personnage (× un facteur), ex. le plafond d'absorption
 * d'Armure de pierre « niveau × 3 » (p. 104) → `{ scale: 'level', factor: 3 }`.
 */
export interface LevelScalingValue {
  scale: 'level';
  /** Multiplicateur appliqué au niveau (défaut 1). */
  factor?: number;
}

/**
 * Valeur par PALIERS DE FAMILLE (cross-voie) : `per` points pour CHAQUE voie de
 * profil (des profils `classIds`, et — si `includeMagePath` — la voie du mage) dont
 * le personnage a atteint le rang `rank`. Couvre les bonus « +1 chaque fois que le
 * personnage atteint le rang N dans une voie de <profil> » (ex. Armure de mana :
 * +1 en DEF par voie de magicien — ou du mage — au rang 5, p. 104). Le moteur a
 * besoin du rang atteint dans CHAQUE voie du personnage (cf. `effects.ts`).
 */
export interface MilestoneCountScalingValue {
  scale: 'milestone-count';
  /** Points octroyés par voie qualifiante (en général 1). */
  per: number;
  /** Rang à atteindre dans une voie pour qu'elle compte (ex. 5). */
  rank: number;
  /** Profils dont les voies de profil comptent (ex. `['magicien']`). */
  classIds: string[];
  /** Compter aussi la voie du mage si elle atteint `rank` (« ou dans la voie du mage »). */
  includeMagePath?: boolean;
}

/**
 * Valeur égale au RANG BRUT atteint dans la VOIE de la capacité hôte (× un
 * facteur), 0 si la voie est absente. À distinguer de `stepped` `path-rank` qui
 * mappe le rang vers des paliers arbitraires : ici la valeur EST le rang. Sert
 * notamment de composant à un plafond « ne peut pas dépasser le rang atteint dans
 * la voie » (Dentelles et rapière, barde, seduction-r2, p. 68 — via `min`).
 */
export interface PathRankScalingValue {
  scale: 'path-rank';
  /** Multiplicateur appliqué au rang (défaut 1). */
  factor?: number;
}

/**
 * MINIMUM de plusieurs composantes — pour PLAFONNER une valeur par une autre
 * (symétrique de `sum`). Ex. Dentelles et rapière (barde, seduction-r2, p. 68) :
 * DEF += min(CHA, rang atteint dans la voie) → `{ scale: 'min', parts: [CHA,
 * path-rank] }`. Non résoluble (null) si un composant l'est (ex. sans contexte).
 */
export interface MinScalingValue {
  scale: 'min';
  parts: EffectValue[];
}

/**
 * SOMME de plusieurs composantes — pour additionner une part plate / un palier
 * IN-VOIE (`stepped` `path-rank`) et un palier de famille CROSS-VOIE
 * (`milestone-count`). Ex. Armure de mana : base 3 → 4 au rang 3 de la voie
 * (`stepped`) PLUS +1 par voie de magicien au rang 5 (`milestone-count`).
 */
export interface SumScalingValue {
  scale: 'sum';
  parts: EffectValue[];
}

/**
 * Bonus chiffré PERMANENT à une statistique dérivée, toujours appliqué par le
 * moteur (ex. « bonus permanent de +1 en Init. et en DEF » — voie de l'air r1,
 * p. 93). La valeur est le plus souvent une constante, mais peut être scalante
 * (PER-67, ex. `maxHp += FOR`). Une capacité partiellement plate n'expose ici que
 * sa part inconditionnelle ; sa part conditionnelle relève de
 * `ConditionalStatBonusEffect`.
 */
export interface StatBonusEffect {
  kind: 'stat-bonus';
  /** Stat dérivée visée (cf. `DERIVED_STAT_IDS`). */
  stat: DerivedStatId;
  /** Valeur ajoutée (signée) : constante ou scalante. */
  value: EffectValue;
}

/**
 * Déclencheur d'un effet conditionnel / temporaire (PER-67). Côté moteur, les
 * deux natures se ramènent à un INTERRUPTEUR on/off ; la distinction `kind` sert
 * l'UI et la documentation. L'état courant n'est PAS dans la couche données
 * (figée) : il est porté par un interrupteur manuel persistant sur le personnage
 * (`Character.effectToggles`), dans la lignée de la surcharge manuelle des stats
 * dérivées (`overrides`, PER-48).
 */
export interface EffectActivation {
  /**
   *  - 'condition' : situation de jeu (« une arme dans chaque main », « premier
   *    tour », « contre une cible désignée »…) ;
   *  - 'temporary' : effet de durée ou d'usage limité (« pendant la rage », « X
   *    tours »).
   */
  kind: 'condition' | 'temporary';
  /** Description française du déclencheur, ex. « une arme dans chaque main ». */
  label: string;
  /**
   * L'effet compte-t-il tant que le joueur n'a pas explicitement basculé son
   * interrupteur ? Défaut `false` (un effet conditionnel est inactif par défaut).
   */
  activeByDefault?: boolean;
}

/**
 * Bonus à une statistique dérivée qui n'est compté QUE lorsqu'il est actif
 * (PER-67) : effet conditionnel (« +1 en DEF avec une arme dans chaque main »)
 * ou temporaire (« −2 en DEF pendant la rage »). La valeur suit les mêmes règles
 * que `StatBonusEffect` (constante ou scalante). L'activation est manuelle (cf.
 * `EffectActivation` et `Character.effectToggles`).
 *
 * FRONTIÈRE milestone Armures : ce genre fournit le MÉCANISME générique
 * (condition + interrupteur). Les conditions spécifiques au PORT D'ARMURE
 * (capacités désactivées en armure, etc.) seront câblées côté milestone Armures,
 * qui réutilise cette couche — on ne modélise ici aucune sémantique d'armure.
 */
/** Un bonus chiffré à une stat dérivée (valeur constante ou scalante). */
export interface StatBonus {
  /** Stat dérivée visée (cf. `DERIVED_STAT_IDS`). */
  stat: DerivedStatId;
  /** Valeur ajoutée (signée) : constante ou scalante. */
  value: EffectValue;
}

export interface ConditionalStatBonusEffect {
  kind: 'conditional-stat-bonus';
  /**
   * Bonus accordés ENSEMBLE lorsque l'effet est actif : un seul déclencheur /
   * interrupteur les pilote tous. Ex. Familier (magie-universelle r2) : « +2 en
   * Initiative ET en DEF lorsque son familier est en vue » → deux bonus, un toggle.
   *
   * Peut être VIDE : l'effet n'est alors qu'un MARQUEUR D'ÉTAT on/off, sans
   * contribution chiffrée (ex. Invocation d'un démon, demon-r5 : le démon agit via
   * sa propre mini-fiche, le toggle suit seulement son état d'invocation ;
   * Armure de pierre / Déphasage : le toggle ne porte que l'exclusion mutuelle —
   * la réduction de DM vit dans `Feature.damageReduction`).
   */
  bonuses: StatBonus[];
  /**
   * Bonus (signé) à TOUS les TESTS DE CARACTÉRISTIQUE du personnage, piloté par le
   * MÊME interrupteur que `bonuses`. Axe DISTINCT des stats dérivées : il ne modifie
   * pas la valeur des caractéristiques (donc ni les PV, ni la DEF, ni les formules),
   * seulement le jet d20 + carac d'un test (PER-89). Ex. Bénédiction (prêtre,
   * priere-r1, p. 124) : « +1 à tous les tests de caractéristique » (→ +2 au rang 5),
   * doublé d'un bonus aux tests d'attaque modélisé dans `bonuses`. Constante ou
   * scalante. Absent = l'effet ne touche pas les tests de carac.
   */
  abilityTestBonus?: EffectValue;
  /**
   * Bonus CHIFFRÉ aux tests d'UNE caractéristique précise, piloté par le MÊME interrupteur (PER-137).
   * À DISTINGUER de `abilityTestBonus` (uniforme à TOUTES les caracs, ex. Bénédiction) : ici une seule
   * carac. Ex. Prescience (divination-r5) : « +10 à tous les tests de PER » tant que la vision est
   * active. Constante ou scalante. Agrégé par `abilityTestBonusByAbility` quand l'interrupteur est actif.
   */
  abilityTestBonusFor?: { ability: AbilityId; value: EffectValue };
  /**
   * Domaines de test (ids du catalogue `src/data/test-domains.ts`) dont les tests gagnent un
   * DÉ BONUS tant que cet effet est ACTIF (PER-108) — pas un bonus chiffré, un DÉ (« 2d20, garde
   * le meilleur »). Ex. Travail d'équipe (rôdeur, compagnon-animal-r2) : « dé bonus aux tests pour
   * pister ou éviter d'être surpris (Vigilance) » quand le loup est au contact. Piloté par le MÊME
   * interrupteur que `bonuses` (qui peut être vide : effet purement « dé bonus conditionnel »).
   * Rendu par un `BonusDieBadge` sur le domaine dans l'encadré « Compétences & tests ». Absent = aucun.
   */
  testDieDomains?: string[];
  /**
   * Domaines de test (ids du catalogue) recevant un BONUS DE COMPÉTENCE CHIFFRÉ (« rang + 2 »,
   * valeur déduite de la catégorie de voie comme un `TestBonusEffect` sans `value`) tant que cet
   * effet est ACTIF (PER-117). Pour les bonus de compétence CONDITIONNELS d'une situation de jeu
   * (ex. « en milieu naturel » : Survie/survie-r1, Éclaireur/traqueur-r1) — `bonuses` peut être
   * vide. Agrégé par `testBonusSources` via l'interrupteur. Absent = aucun.
   */
  testBonusDomains?: string[];
  /**
   * DÉPENDANCE intra-capacité À SENS UNIQUE : index (dans `Feature.effects`) d'un effet dont CET
   * effet dépend — DÉSACTIVER l'effet référencé désactive aussi celui-ci (PER-109). Ex. Parade
   * croisée : le « bonus doublé » dépend de « une arme dans chaque main » (on ne double qu'un bonus
   * qu'on a) → éteindre le 1ᵉʳ éteint le 2ᵉ, mais pas l'inverse. Absent = aucune dépendance.
   */
  deactivatesWithEffectIndex?: number;
  /** Déclencheur (condition / durée) et état par défaut de l'interrupteur. */
  activation: EffectActivation;
  /**
   * EXCLUSION MUTUELLE entre capacités : ids des capacités que CET interrupteur,
   * LORSQU'IL EST ACTIF, désactive. Le livre l'énonce verbatim (« ne se cumule pas
   * avec X », « incompatible avec X… y met fin »). Côté UI, une capacité ainsi
   * désactivée est grisée et son propre interrupteur est éteint + rendu
   * non-interactif (mais son détail reste consultable). La réciprocité se déclare
   * des DEUX côtés (ex. Armure de pierre `magie-elementaire-r5` ↔ Déphasage
   * `magie-protectrice-r3`) ; un lien à sens unique est légitime (Aspect du démon
   * `demon-r4` désactive Beauté de la succube `demon-r2`, pas l'inverse). Absent =
   * la capacité n'en désactive aucune.
   */
  disablesFeatures?: string[];
  /**
   * EXCLUSION MUTUELLE d'INTERRUPTEURS (PER-130, ≠ `disablesFeatures`) : ids des capacités dont
   * l'interrupteur est ÉTEINT quand CET interrupteur est ACTIVÉ — mais SANS désactiver/griser la
   * capacité (les deux restent pleinement interactives, c'est un simple basculement ON/OFF). Cas :
   * Rage du berserk ↔ Furie du berserk (le barbare est dans l'un OU l'autre état, jamais les deux).
   * Réciprocité déclarée des DEUX côtés. Absent = aucun basculement.
   */
  mutuallyExclusiveWith?: string[];
}

/**
 * Modificateur PERMANENT à une CARACTÉRISTIQUE du personnage (ex. « augmente sa CON
 * de +1 » — Endurer/metal-r5, Pacte ténébreux/sombre-magie-r5, Perception
 * héroïque/divination-r4). Déterministe (≠ dés lancés à la table) : il s'ajoute au
 * total affiché et au détail de la carac, PAR-DESSUS la valeur saisie (qui reste
 * la base + modificateurs de peuple, cf. `abilityBreakdown`). À distinguer des
 * stats DÉRIVÉES (`StatBonusEffect`) : ici la cible est une `AbilityId`.
 */
export interface AbilityBonusEffect {
  kind: 'ability-bonus';
  /** Caractéristique visée (cf. `ABILITY_IDS`). */
  ability: AbilityId;
  /** Valeur ajoutée (signée) — constante (les cas du livre sont des +1). */
  value: number;
}

/**
 * Modificateur PERMANENT à une CARACTÉRISTIQUE dont la CIBLE est déterminée par un
 * choix `ability` de la même capacité (ex. Projection mentale : « augmente de +1 la
 * plus faible carac »). Résolu dynamiquement depuis `Character.featureChoices`.
 */
export interface AbilityBonusFromChoiceEffect {
  kind: 'ability-bonus-from-choice';
  /**
   * Index du choix `ability` dans `Feature.choices` qui détermine la carac visée.
   * En général 0 (premier et unique choix de la capacité).
   */
  choiceIndex: number;
  /** Valeur ajoutée — constante (les cas du livre sont des +1). */
  value: number;
}

/**
 * DÉ BONUS permanent aux tests d'une caractéristique (« il obtient un dé bonus aux
 * tests de CON »). Mécanique core CO2 : un test avec dé bonus se lance « 2d20, on
 * garde le meilleur ». Drapeau par caractéristique, SANS valeur chiffrée — rendu
 * par une icône double-d20 à côté du chiffre de la carac (fiche + mini-fiches de
 * créatures). Le cumul ne s'empile pas : une carac n'affiche qu'un seul dé bonus.
 *
 * Règle de population : tout « dé bonus aux tests de [CARAC] » PERMANENT se balise
 * ici ; les dés bonus TEMPORAIRES (pendant un sort, une transformation…) restent
 * en texte verbatim (ils relèveront d'un interrupteur, pas d'un drapeau permanent).
 */
export interface AbilityBonusDieEffect {
  kind: 'ability-bonus-die';
  /** Caractéristique dont les tests bénéficient du dé bonus (cf. `ABILITY_IDS`). */
  ability: AbilityId;
}

/**
 * DÉ BONUS aux tests d'une caractéristique dont la CIBLE est déterminée par un choix
 * `ability` de la même capacité, ÉVENTUELLEMENT restreint à certaines caractéristiques
 * (PER-110). Ex. Combattant héroïque (rôdeur, combat-a-deux-armes-r4) : « augmente AGI
 * +1 ET dé bonus aux tests d'AGI. Plutôt qu'AGI, FOR +1 (PAS de dé bonus). » → le +1
 * suit le choix (`ability-bonus-from-choice`), mais le dé bonus n'est accordé QUE si la
 * carac choisie est AGI (`onlyIfAbility: ['AGI']`). Résolu depuis `Character.featureChoices`.
 */
export interface AbilityBonusDieFromChoiceEffect {
  kind: 'ability-bonus-die-from-choice';
  /** Index du choix `ability` dans `Feature.choices` qui détermine la carac visée. */
  choiceIndex: number;
  /**
   * Si présent : le dé bonus n'est accordé que si la carac CHOISIE figure dans cette
   * liste (ex. `['AGI']` — l'option FOR ne donne pas de dé). Absent = dé bonus pour la
   * carac choisie quelle qu'elle soit.
   */
  onlyIfAbility?: AbilityId[];
}

/**
 * BONUS DE COMPÉTENCE à un ou plusieurs DOMAINES de test nommés (« +3 aux tests de
 * discrétion », « rang + 2 aux tests de persuasion ou de séduction ») — concept de
 * règles nommé (p. 202-203). Axe distinct des stats DÉRIVÉES (`StatBonusEffect`) et des
 * CARACTÉRISTIQUES (`ability-bonus`/`ability-bonus-die`). PER-89.
 *
 * PÉRIMÈTRE : domaines NOMMÉS, INCONDITIONNELS, sur le PORTEUR. Hors périmètre, laissés
 * verbatim : bonus aux tests de CARAC chiffrés (« +3 aux tests de FOR »), SITUATIONNELS
 * (« pour résister à la peur »), aux ALLIÉS, et CONDITIONNELS / temporaires (→ PER-67).
 *
 * CUMUL (≠ somme) : le moteur applique la règle du livre — par domaine, MAX par catégorie
 * de source (voie de profil/prestige évolutive `2 + min(rang, 5)` ≤ +7 ; voie de peuple
 * +3 ; voie de prestige fixe +5 ; objet magique), maxima ADDITIONNÉS entre catégories,
 * total PLAFONNÉ à +15. La catégorie est DÉDUITE de la voie hôte (`Path.type` ; `mage`
 * compte comme peuple), pas stockée ici (cf. `src/lib/character/effects.ts`).
 */
/**
 * Domaine de compétence du catalogue (`src/data/test-domains.ts`) — PER-89. CO2 ne
 * fournit PAS de liste fermée : le livre donne des EXEMPLES (p. 202, regroupés par
 * caractéristique gouvernante) et autorise le MJ à en inventer (`humain-r1`, p. 57).
 * Ce catalogue est donc une liste OUVERTE et VIVANTE de SUGGESTIONS + des domaines
 * NOMMÉS dans les capacités (référencés par `TestBonusEffect.domains` /
 * `FeatureChoiceOption.testBonusDomains`), enrichie famille par famille.
 */
export interface TestDomain {
  /** Id stable (slug anglais) — clé de contenu référencée par les effets. */
  id: string;
  /** Libellé affiché au joueur (français). */
  label: string;
  /**
   * Note d'aide (français) affichée en info-bulle sur la ligne du domaine, pour préciser
   * son PÉRIMÈTRE quand le libellé seul est ambigu ou qu'il ABSORBE un domaine voisin (ex.
   * Bricolage inclut « réparer / comprendre des mécanismes » depuis la fusion de l'ancien
   * domaine `mechanisms`). Absente = pas d'info-bulle de description (seul le détail du
   * calcul du bonus s'affiche, s'il y en a un).
   */
  description?: string;
  /**
   * Caractéristique(s) gouvernante(s) : un test = d20 + carac + bonus de compétence.
   * PLUSIEURS quand le livre teste le domaine sur des caracs différentes selon la
   * situation (ex. équitation : CON pour l'endurance, CHA pour mener la monture — p. 233).
   * Le modificateur affiché retient alors la MEILLEURE carac du personnage (choix joueur).
   */
  abilities: AbilityId[];
  /** Page source quand le domaine provient d'un exemple/d'une capacité sourcé(e). */
  sourcePage?: SourcePage;
  /**
   * Domaine à coloration COMBAT (PER-73) : réaction défensive ou manœuvre (ex. Esquive,
   * Intimidation). Sert à exclure ces domaines du gagne-pain LIBRE d'`humain-r1`, dont le
   * texte précise que « le bonus obtenu ne s'applique jamais à des tests de combat » (p. 57).
   * N'a AUCUN autre effet moteur (on ne simule pas le combat). Absent = domaine hors combat.
   */
  combat?: boolean;
}

/**
 * SUBSTITUTION de la caractéristique servant à calculer la réserve de POINTS DE MANA.
 * Par défaut, PM = VOL + nombre de sorts connus (p. 31/42). Certaines capacités
 * autorisent une AUTRE caractéristique « au lieu de la VOL » (ex. Charisme héroïque
 * du barde, seduction-r4 : « utiliser son CHA au lieu de sa VOL pour calculer le
 * nombre de PM »). Le moteur retient la MEILLEURE des deux (VOL ou la carac
 * d'override) — c'est le choix systématique du joueur, donc on n'applique le swap
 * que s'il est avantageux. PER-71 / PER-101.
 */
export interface ManaAbilityOverrideEffect {
  kind: 'mana-ability-override';
  /** Caractéristique utilisable à la place de la VOL pour la réserve de PM. */
  ability: AbilityId;
}

/**
 * Bonus de compétence UNIVERSEL à TOUS les tests, NON-CUMULATIF (PER-71 / PER-102).
 * Ex. Éclectique (barde, vagabond-r2) : « +1 à tous les tests de compétence… ne se
 * cumule à aucun autre bonus de compétence SAUF celui de la voie de peuple… augmente
 * de +1 chaque fois qu'il atteint le rang 4 dans une voie de barde ».
 *
 * La VALEUR est 1 (bonus de base) + le nombre de voies du profil `classId` ayant atteint
 * `rank` (cross-voie, voie hôte comprise). Le moteur l'applique par domaine : il NE se
 * cumule PAS avec les bonus de profil/prestige (il PRIME au MAX — c'est le plus élevé qui
 * s'applique), mais SE cumule avec le bonus de PEUPLE → total = peuple + max(universel,
 * profil + prestige). Cf. `universalTestBonus` / `testBonusSources`.
 */
export interface UniversalTestBonusEffect {
  kind: 'universal-test-bonus';
  /** Valeur = nombre de voies de ce profil au rang `rank` atteint (plancher 1). */
  scaleByPathsAtRank: { classId: string; rank: number };
}

/** États/effets auxquels une capacité peut rendre IMMUNISÉ (liste fermée, extensible). PER-103. */
export const IMMUNITY_IDS = ['fear', 'mind-control', 'slowed', 'immobilized', 'magic-sleep'] as const;
export type ImmunityId = (typeof IMMUNITY_IDS)[number];

/** Libellés français des immunités (affichés au joueur). */
export const IMMUNITY_LABELS: Record<ImmunityId, string> = {
  fear: 'Peur',
  'mind-control': 'Charme / possession',
  slowed: 'Ralenti',
  immobilized: 'Immobilisé',
  // Force d'âme (elfe haut, elfe-haut-r2, p. 50) : « immunisé à la peur et au sommeil magique ».
  'magic-sleep': 'Sommeil magique',
};

/**
 * États PRÉJUDICIABLES de CO2 (liste fermée, extensible). Catalogue COMPLET du glossaire « États
 * préjudiciables » du livre de base (p. 214-215, PER-208) — étend l'amorce PER-206 (le sous-ensemble
 * que Botte secrète, spadassin-r5 p. 77, peut infliger) aux 10 états officiels. Ordre du livre.
 *
 * SOURCE UNIQUE partagée par deux couches : la MÉCANIQUE (états infligeables, `InflictableStates`,
 * PER-206) et la PRÉSENTATION (balisage auto des noms d'états dans les textes de capacités, PER-208 —
 * cf. `GAME_TERMS` catégorie `status` dans `glossary.ts`). Distinct de `ImmunityId` (ce à quoi ON EST
 * immunisé), même si certains ids se recoupent (ralenti, immobilisé).
 */
export const STATUS_EFFECT_IDS = [
  'blinded',
  'weakened',
  'winded',
  'dazed',
  'immobilized',
  'crippled',
  'paralyzed',
  'slowed',
  'prone',
  'surprised',
] as const;
export type StatusEffectId = (typeof STATUS_EFFECT_IDS)[number];

/** Une entrée du catalogue des états : libellé FR, effet VERBATIM du glossaire, page source. */
export interface StatusEffectEntry {
  /** Libellé français (nom de l'état, tel qu'affiché). */
  label: string;
  /** Effet VERBATIM du glossaire CO2 (p. 214-215), rendu dans les info-bulles. */
  effect: string;
  /** Page du livre de base où l'état est défini. */
  sourcePage: number;
}

/**
 * Catalogue des états préjudiciables (glossaire p. 214-215). Effets recopiés VERBATIM du livre.
 * `STATUS_EFFECT_LABELS` en est dérivé pour les usages qui n'ont besoin que du nom (PER-206).
 */
export const STATUS_EFFECTS: Record<StatusEffectId, StatusEffectEntry> = {
  blinded: {
    label: 'Aveuglé',
    effect:
      "-5 en Init., attaque et DEF, -10 en attaque à distance. Les attaques magiques nécessitant de voir la cible sont impossibles.",
    sourcePage: 214,
  },
  weakened: { label: 'Affaibli', effect: 'Dé malus à tous les tests.', sourcePage: 214 },
  winded: {
    label: 'Essoufflé',
    effect: 'Le déplacement est limité à 5 m par action de mouvement.',
    sourcePage: 214,
  },
  dazed: { label: 'Étourdi', effect: 'Aucune action possible et -5 en DEF.', sourcePage: 214 },
  immobilized: {
    label: 'Immobilisé',
    effect: "Pas de déplacement et dé malus aux tests d'attaque.",
    sourcePage: 214,
  },
  crippled: {
    label: 'Invalide',
    effect: 'Le déplacement est limité à 5 m par action de mouvement.',
    sourcePage: 214,
  },
  paralyzed: {
    label: 'Paralysé',
    effect: "Aucune action possible, en cas d'attaque touché automatiquement et subit un critique.",
    sourcePage: 215,
  },
  slowed: {
    label: 'Ralenti',
    effect: "Une seule action par round (action d'attaque ou de mouvement).",
    sourcePage: 215,
  },
  prone: {
    label: 'Renversé',
    effect: "-5 en attaque et DEF, nécessite une action d'attaque pour se relever.",
    sourcePage: 215,
  },
  surprised: {
    label: 'Surpris',
    effect: 'Pas d’action et -5 en DEF au premier round de combat.',
    sourcePage: 215,
  },
};

/** Libellés français des états préjudiciables (affichés au joueur). Dérivé de `STATUS_EFFECTS`. */
export const STATUS_EFFECT_LABELS: Record<StatusEffectId, string> = Object.fromEntries(
  STATUS_EFFECT_IDS.map((id) => [id, STATUS_EFFECTS[id].label]),
) as Record<StatusEffectId, string>;

/**
 * IMMUNITÉ permanente à un ou plusieurs états/effets (PER-103). Ex. Liberté d'action
 * (barde, saltimbanque-r4) : immunisé à la peur, aux sorts d'asservissement mental
 * (charme/possession), aux états ralenti et immobilisé. Agrégé sur le porteur et rendu
 * dans un encadré « Immunités » dédié de la fiche (cf. `aggregateImmunities`).
 */
export interface ImmunityEffect {
  kind: 'immunity';
  /** États/effets dont le porteur est immunisé (cf. `IMMUNITY_IDS`). */
  immunities: ImmunityId[];
}

/**
 * AMÉLIORATION de l'accès aux ARMURES d'un profil par un rang de voie (PER-81).
 * Certaines capacités relèvent la meilleure armure qu'un personnage peut PORTER
 * au-delà du plafond de son profil (p. 178) :
 *  - barbare, Tour de force (brute-r2) → chemise de mailles (DEF +4) ;
 *  - barbare, Briseur d'os (brute-r5) → cotte de mailles (DEF +5) ;
 *  - chevalier, Autorité naturelle (noblesse-r3) → plaque complète (DEF +7, p. 86).
 * L'effet déclare l'armure débloquée par son `maxArmorId` ; le moteur en dérive la
 * DEF plafond effective (cf. `armorRestrictions.ts`), qui prime si elle est plus
 * élevée que le plafond du profil. Purement PORT (pas de sorts) — la restriction
 * fine par capacité d'origine reste PER-86.
 */
export interface ArmorAccessEffect {
  kind: 'armor-access';
  /** Id (catalogue `armors`) de la meilleure armure débloquée par cette capacité. */
  maxArmorId: string;
  /**
   * Relèvements d'accès CROISÉS propres à un profil HYBRIDE de combattant (note de bas de
   * page d'Autorité naturelle, `noblesse-r3`, p. 86) : cette capacité relève d'un cran
   * l'armure d'USAGE des AUTRES voies de combattant. Ne concerne QUE la restriction FINE
   * d'usage par capacité d'origine (PER-86), PAS le plafond de PORT global (PER-80/81, qui
   * ne lit que `maxArmorId`) — le relèvement n'existe que « pour utiliser les capacités » des
   * autres voies de combattant, il ne dispense pas de maîtriser l'armure pour la porter. Ex.
   * `noblesse-r3` : guerrier → armure de plaques (DEF +6), barbare → chemise de mailles (DEF +4).
   * Chaque `maxArmorId` relève le profil `classId` cité ; il ne bénéficie qu'aux capacités de
   * CE profil effectivement possédées (un hybride, donc). Absent = la capacité ne relève que son
   * propre profil (`maxArmorId`).
   */
  hybridClassRaises?: Array<{ classId: string; maxArmorId: string }>;
}

/**
 * Bonus de DEF conditionné à l'ARMURE RÉELLEMENT PORTÉE (PER-132), résolu
 * AUTOMATIQUEMENT depuis l'état d'équipement du personnage — sans interrupteur
 * manuel (contrairement à `ConditionalStatBonusEffect`). Ex. Armure de vent
 * (barbare, primitif-r2, p. 81) : « sans armure, +2 en DEF (+3 au rang 5) ; avec
 * une armure, +1 en DEF ». Les deux branches sont mutuellement exclusives et
 * couvrent tous les cas — le moteur en applique toujours une (cf. `armorWorn`
 * dans `EffectContext`). Chaque valeur peut être scalante (`EffectValue`).
 */
export interface ArmorDefBonusEffect {
  kind: 'armor-def-bonus';
  /** Bonus de DEF quand AUCUNE armure n'est portée (ex. +2, passant à +3 au rang 5). */
  whenUnarmored: EffectValue;
  /** Bonus de DEF quand une armure EST portée (ex. +1). */
  whenArmored: EffectValue;
}

/**
 * Condition d'application d'un bonus de DM d'arme (PER-115), selon le mode d'attaque et l'arme
 * réellement en main. Le filtrage automatique porte sur `attackMode`, `rangedKinds` et
 * `weaponCategories` ; `label` ne sert qu'à afficher une condition situationnelle non modélisable.
 */
export interface WeaponDamageCondition {
  /** Mode d'attaque requis. Absent = les deux (contact ET distance). */
  attackMode?: 'melee' | 'ranged';
  /**
   * Sous-types d'arme à DISTANCE admissibles (ex. `['bow']` pour « à l'arc »). Implique une arme
   * à distance de ce sous-type en main. Absent = tout sous-type (aucune contrainte de sous-type).
   */
  rangedKinds?: RangedWeaponKind[];
  /**
   * Catégories d'arme de CONTACT admissibles (ex. `['light']` pour « arme légère »). Implique une
   * arme de contact de cette catégorie en main. Absent = toute catégorie.
   */
  weaponCategories?: WeaponCategory[];
  /**
   * Condition situationnelle NON modélisable mécaniquement (ex. « contre les animaux », « sur un
   * adversaire surpris »), affichée en toutes lettres sur le badge. N'entre PAS dans le filtrage
   * automatique. Absent = aucune (bonus applicable dès que les critères ci-dessus sont remplis).
   */
  label?: string;
  /**
   * Index d'un choix `option` de la capacité hôte dont les LIBELLÉS des options retenues sont
   * ajoutés dynamiquement à `label` (PER-115). Ex. Chasseur émérite (`traqueur-r3`) : la condition
   * « contre les animaux » se complète des ENNEMIS JURÉS choisis (un par voie de rôdeur au rang 5) →
   * « …, les dragons, les morts-vivants ». Résolu au rendu depuis `Character.featureChoices`. Absent
   * = `label` reste tel quel.
   */
  appendChoiceLabels?: number;
  /**
   * L'arme portée doit appartenir à une des FAMILLES de prédilection choisies sur la capacité
   * `choiceFeatureId` (choix `option` à l'index 0, ids = `MasterAtArmsCategory` — ex. Armes de
   * prédilection `maitre-d-armes-r1`), comparées aux `weaponFamilies` de l'arme. Miroir de
   * `WeaponCriticalCondition.weaponFamiliesFromChoice` (PER-136) pour le +1 en attaque / +DM du
   * maître d'armes (PER-72/PER-226). Implique une arme (du bon mode) en main. Absent = aucune
   * contrainte de famille.
   */
  weaponFamiliesFromChoice?: { choiceFeatureId: string };
  /**
   * L'arme portée doit appartenir à une des FAMILLES données EN DUR (sans choix joueur), comparées
   * aux `weaponFamilies` de l'arme. Pendant STATIQUE de `weaponFamiliesFromChoice`, pour un octroi
   * FIXE indépendant de tout choix — capacité de peuple du nain « Haches et marteaux » (PER-154) :
   * `['axes', 'hammers']`, le nain manie toujours haches et marteaux de guerre. Implique une arme (du
   * bon mode) en main. Absent = aucune contrainte de famille statique.
   */
  weaponFamilies?: WeaponFamily[];
}

/**
 * Bonus aux DM d'ARME (PER-115) — une capacité ajoute une CARACTÉRISTIQUE (ex. Archer émérite :
 * +PER aux DM à l'arc) ou un/des DÉ(S) (ex. Chasseur émérite : +1d4° contre les animaux) aux DM
 * de l'arme utilisée, sous une `condition` portant sur le mode d'attaque et le type d'arme portée.
 *
 * Deux natures d'affichage :
 *  - PERMANENT (`situational` absent/false) : agrégé DIRECTEMENT à l'expression de DM de l'arme
 *    portée dès que la condition est satisfaite (arc en main → « 1d8 + PER »).
 *  - SITUATIONNEL (`situational: true`) : rendu en BADGE distinct sous la carte d'attaque (une
 *    attaque précise, une cible désignée…), sans entrer dans le DM principal.
 *
 * `ability` et `dice` sont exclusifs (l'un OU l'autre). La règle de base — contact +FOR, distance
 * sans carac (p. 185) — n'est PAS un effet : elle vit dans le rendu de l'arme portée. Ici on ne
 * modélise QUE les suppléments accordés par les capacités.
 */
export interface WeaponDamageBonusEffect {
  kind: 'weapon-damage-bonus';
  /** Caractéristique ajoutée aux DM (ex. `'PER'`, `'AGI'`, `'FOR'`). Exclusif avec `dice`/`flat`. */
  ability?: AbilityId;
  /** Dé(s) de DM ajoutés, situationnels (ex. +1d4°). Exclusif avec `ability`/`flat`. */
  dice?: { count: number; die: DamageDie; evolving?: boolean };
  /**
   * Bonus PLAT (entier) aux DM, agrégé à l'expression comme une carac. Valeur FIXE (nombre),
   * SCALANTE (`ScalingValue` — ex. Cavalier émérite : +1, passant à +2 au rang 5 de la voie,
   * `stepped` `path-rank`, PER-139) ou dérivée du NOMBRE d'instances retenues d'une option
   * répétable d'un choix (Spécialisation du maître d'armes : « +1 DM » ×N, plafonné à +6 —
   * PER-72/PER-226). Exclusif avec `ability`/`dice`.
   */
  flat?: number | ScalingValue | WeaponDamageFlatFromChoice;
  /** Condition d'application (mode d'attaque, type d'arme, libellé situationnel). */
  condition: WeaponDamageCondition;
  /**
   * Index d'un effet `conditional-stat-bonus` de la MÊME capacité (INTERRUPTEUR d'état) qui doit
   * être ACTIF pour que ce bonus compte (PER-139). Ex. Cavalier émérite (`cavalier-r2`) : le +DM au
   * contact ne s'applique que « en selle » — le même interrupteur qui pilote la DEF de la monture
   * (effet index 0). Absent = aucun interrupteur requis (bonus permanent dès que la condition d'arme
   * est remplie). Résolu par `weaponDamageBonuses` via `isEffectActive`.
   */
  requiresActiveEffectIndex?: number;
  /** Bonus SITUATIONNEL (badge séparé) au lieu de permanent (agrégé au DM). Défaut `false`. */
  situational?: boolean;
}

/**
 * Bonus plat aux DM dérivé du NOMBRE d'instances retenues d'une option répétable d'un choix
 * `option` (PER-72). Ex. Spécialisation du maître d'armes : chaque « +1 DM » (`optionId: 'dm-bonus'`)
 * retenu sur `maitre-d-armes-r1` (choix index 0) ajoute +1, plafonné par `max` (6). Résolu par le
 * moteur au rendu depuis `Character.featureChoices`.
 */
export interface WeaponDamageFlatFromChoice {
  /** Capacité portant le choix `option` répétable. */
  featureId: string;
  /** Index du choix sur la capacité. */
  choiceIndex: number;
  /** Id de l'option répétable dont on compte les instances (ex. `'dm-bonus'`). */
  optionId: string;
  /**
   * Socle AJOUTÉ au nombre d'instances (avant plafonnement). Ex. Spécialisation du maître d'armes :
   * `base: 1` = le +1 DM acquis dès r3 avec une arme de prédilection, INDÉPENDAMMENT des jalons de
   * rang 5 (verbatim p. 89 : « il gagne un bonus de +1 DM » — la couche `dm-bonus` s'y ajoute).
   * Absent = 0.
   */
  base?: number;
  /** Plafond du bonus (ex. 6). Absent = aucun plafond. */
  max?: number;
}

/**
 * Bonus à la VALEUR D'ATTAQUE (touche), conditionné au type d'arme réellement portée (PER-72/PER-226).
 * Ex. maître d'armes r1 : « +1 en attaque avec une arme de prédilection » ; nain « Haches et
 * marteaux » (PER-154) : +1 avec hache/marteau. Le mode (contact/distance) et le type d'arme sont
 * filtrés par `condition` — la MÊME que `weapon-damage-bonus`. Agrégé par `weaponAttackBonuses`, puis
 * ajouté à la touche de la carte d'attaque du mode concerné. Distinct d'un `stat-bonus meleeAttack`
 * (inconditionnel, global) : ce bonus-ci ne s'applique que si une arme du bon type est en main.
 */
export interface AttackBonusEffect {
  kind: 'attack-bonus';
  /** Valeur du bonus (constante — ex. +1 —, ou scalante par rang de voie). */
  value: EffectValue;
  /** Condition d'application (mode d'attaque + type d'arme). Cf. `WeaponDamageCondition`. */
  condition: WeaponDamageCondition;
}

export interface TestBonusEffect {
  kind: 'test-bonus';
  /**
   * Domaines visés (ids du catalogue `src/data/test-domains.ts`). Plusieurs car le livre
   * groupe souvent (« course, saut ou escalade ») : même valeur pour chacun, l'agrégation
   * dé-plie ensuite par domaine. Intégrité référentielle vérifiée par `validate:data`.
   */
  domains: string[];
  /**
   * Valeur du bonus. ABSENT → déduite de la catégorie de source de la voie hôte (profil
   * `2 + min(rang, 5)`, peuple +3). PRÉSENT → override explicite, requis pour le prestige
   * fixe (+5) et les rares exceptions. Constante ou scalante (`EffectValue`).
   */
  value?: EffectValue;
}

// ---------------------------------------------------------------------------
// Statistiques avancées — réduction de dégâts (préparation du terrain)
// ---------------------------------------------------------------------------

/**
 * Types de dégâts auxquels une capacité peut RÉSISTER (réduire / annuler), au-delà
 * de la catégorie physique des armes (`DAMAGE_TYPES` : tranchant/perforant/contondant,
 * qui décrit l'arme, pas la résistance). Axe distinct : éléments (Maîtrise des éléments,
 * p. 104), opposition magique / non-magique (Forme éthérée, Forme gazeuse, démon invoqué),
 * physique global. Liste EXTENSIBLE : on ajoutera un type le jour où une capacité l'exige.
 */
export const RESISTIBLE_DAMAGE_TYPES = [
  'physical',
  'non-magical',
  'magical',
  'fire',
  'cold',
  'lightning',
  'acid',
  // PER-137 : types ajoutés au fil du rescan transversal des RD (liste extensible).
  'poison',
  'disease',
  // Projectiles à pointes métalliques (Magnétisme, forgesort metal-r3).
  'metallic-projectile',
  // Armes qui ne sont pas en argent (lycanthrope).
  'non-silver-weapon',
  // « Naturels non magiques » — regroupement large du livre (druide Résistant, nature-r5) :
  // froid, feu, chutes, poisons, DM d'animaux/insectes… On garde un seul type plutôt que
  // d'énumérer toutes les sources (décision PER-137).
  'natural-non-magical',
  // Attaques de ZONE et souffles (guerrier Défense au bouclier, bouclier-r3) : sorts de zone
  // (Explosion de feu, mains brûlantes, foudre…) et souffles. Mode de DÉLIVRANCE plutôt que type
  // élémentaire — une boule de feu est à la fois `fire` ET `area` ; les RD se cumulent par source.
  'area',
] as const;
export type ResistibleDamageType = (typeof RESISTIBLE_DAMAGE_TYPES)[number];

/**
 * RÉDUCTION DE DÉGÂTS (RD) accordée par une capacité — concept de règles nommé dans
 * le livre (« les réductions de dommages (voie du colosse…) ne s'appliquent pas »,
 * p. 105). PRÉPARATION DU TERRAIN : la couche données porte la DÉFINITION ; le moteur
 * ne la consomme PAS encore (les « statistiques avancées », dont les DM, viendront
 * dans un ticket dédié). On la pose dès maintenant pour ne pas perdre l'information.
 *
 * La DURÉE n'est pas portée ici : ces RD sont temporaires et suivent l'interrupteur
 * de la capacité (`ConditionalStatBonusEffect`), ou sont permanentes (capacité passive).
 * L'EXCLUSION mutuelle (Armure de pierre ↔ Déphasage) relève de `disablesFeatures`,
 * pas de la RD.
 *
 * Inventaire des capacités mage concernées (peuplées vs à peupler) dans
 * `docs/extraction/effets-conditionnels-cadrage.md`. Cas hors de ce modèle, laissés
 * verbatim : la négation PROBABILISTE (Image décalée, illusions-r2 : « sur 5-6, pas de
 * DM ») et la RD portée par une CRÉATURE invoquée (démon, demon-r5 → `CreatureProfile`).
 */
export interface DamageReduction {
  /**
   * Mode de réduction :
   *  - 'flat' : retrait d'un nombre plat de DM (« retranche 5 », « rang + 2 ») ;
   *  - 'divide' : division des DM (« divisés par 2 ») ;
   *  - 'immunity' : aucun DM (« ne peut subir aucun DM physiques »).
   */
  kind: 'flat' | 'divide' | 'immunity';
  /**
   * 'flat' : DM retranchés (constante ou scalante, ex. 5, `[rang + 2]`) ;
   * 'divide' : diviseur entier (2 = moitié) ; 'immunity' : omis.
   */
  value?: EffectValue;
  /**
   * Types de DM réduits ; ABSENT = tous les DM subis (ex. Armure de pierre).
   * Plusieurs types = la RD couvre chacun (Maîtrise des éléments : les 4 éléments).
   */
  scopes?: ResistibleDamageType[];
  /**
   * Plafond TOTAL de DM absorbés avant dissipation de l'effet (Armure de pierre :
   * `[niveau × 3]`) ; absent = pas de plafond (réduction continue tant qu'active).
   */
  absorptionCap?: EffectValue;
  /**
   * Rang MINIMUM atteint dans la voie hôte pour que CETTE entrée s'applique (PER-137). Sert aux
   * capacités dont la protection CHANGE de nature avec le rang — ex. Invulnérable (moine) : les
   * poisons/maladies sont ÷2 jusqu'au rang 4, puis IMMUNITÉ à partir du rang 5. Absent = dès l'acquisition.
   */
  minPathRank?: number;
  /**
   * Rang MAXIMUM dans la voie hôte au-delà duquel cette entrée ne s'applique PLUS (PER-137) — ex. la
   * réduction ÷2 poison/maladie d'Invulnérable, remplacée par l'immunité au rang 5 → `maxPathRank: 4`.
   * Absent = pas de plafond de rang.
   */
  maxPathRank?: number;
  /**
   * SCOPE choisi À LA TABLE (PER-137) : au lieu d'une portée figée (`scopes`), le joueur PICKE l'un de
   * ces types pendant une session — ex. Maîtrise des éléments (le magicien choisit l'élément résisté,
   * échangeable « à la table »). Le choix est un ÉTAT DE JEU (`Character.effectInputs[featureId]`,
   * éditable HORS mode édition de la fiche), pas une donnée figée. La RD n'est comptée/affichée que si un
   * élément valide est choisi. Exclusif avec `scopes`.
   */
  scopeChoice?: ResistibleDamageType[];
  /**
   * SCOPE dérivé d'un CHOIX PERMANENT de construction (PER-138) : index du choix `option` de la même
   * capacité (`Feature.choices`) dont la VALEUR retenue (un id de `ResistibleDamageType`) fixe la portée
   * de la RD. Contrairement à `scopeChoice` (état de jeu échangeable « à la table », `effectInputs`), c'est
   * un choix FIGÉ fait à l'acquisition (`Character.featureChoices`, immuable hors mode édition, rendu en
   * « choix à faire » orange) — ex. Ascendance draconique (sang-dragon) : on choisit une fois la couleur/
   * l'énergie du souffle, pas censé changer. La RD n'est comptée que si le choix est fait et valide.
   * Exclusif avec `scopes` et `scopeChoice`.
   */
  scopeFromChoice?: number;
}

/**
 * PLAGE DE CRITIQUE élargie accordée par une capacité (PER-133) — concept de règles du
 * livre : un critique est normalement obtenu sur un 20 naturel (p. 213), et certaines
 * capacités « augmentent les chances d'obtenir un critique » (« 19-20 au lieu de 20 »).
 *
 * Comme la RÉDUCTION DE DÉGÂTS (`DamageReduction`), c'est une donnée d'AFFICHAGE INFORMATIF :
 * le moteur ne la consomme PAS (aucun jet d'attaque simulé — les dés sont lancés à la table).
 * Elle est rendue en puce sous la carte « Attaque au contact » ou « à distance » selon `scope`,
 * sur le même patron UI que la RD (cf. `criticalRangeSources`, `formatCriticalRange`).
 *
 * ACTIVATION : si la capacité est PASSIVE (aucun effet conditionnel), la plage est permanente
 * (ex. Briseur d'os, Écuyer, Tir précis). Si l'élargissement est CONDITIONNÉ À L'ARME
 * (« arme de prédilection », « mains nues », « arme légère »), il suit un INTERRUPTEUR MANUEL :
 * la capacité porte alors un `ConditionalStatBonusEffect` à `bonuses` vide (marqueur d'état) et
 * `criticalRangeSources` ne retient la plage que si l'interrupteur est actif — exactement comme
 * la RD d'Armure de pierre suit son interrupteur. Le câblage AUTOMATIQUE au type d'arme PORTÉE
 * est différé à la milestone « Armures et équipement porté » (PER-76) ; ces capacités portent
 * en attendant un badge `wip`.
 */
/**
 * Condition d'ARME sous laquelle une plage de critique de capacité s'applique (PER-136). Absente =
 * la plage est PERMANENTE (Briseur d'os, Écuyer, Tir précis) ou pilotée par un interrupteur d'état
 * indépendant de l'arme (cf. `criticalRangeSources`). Présente = le moteur détermine l'activation
 * AUTOMATIQUEMENT d'après l'arme de contact réellement PORTÉE (`wornMeleeWeapon`, PER-76/77), sans
 * interrupteur manuel :
 *  - `unarmed` : combat À MAINS NUES (aucune arme de contact en main) — Morsure du serpent (moine).
 *    Rendue par la vue « mains nues » de la carte d'attaque (`unarmedStrike`), donc IGNORÉE par
 *    `criticalRangeSources` (qui décrit la vue « arme »).
 *  - `weaponCategory` : arme de la CATÉGORIE mécanique donnée (`light`…) — Frappe chirurgicale (voleur).
 *  - `weaponFamiliesFromChoice` : l'arme portée appartient à une des FAMILLES choisies par le
 *    personnage sur la capacité `choiceFeatureId` (choix `option`, ex. Armes de prédilection du
 *    guerrier, `maitre-d-armes-r1`) — Science du critique (maître d'armes).
 */
export type WeaponCriticalCondition =
  | { kind: 'unarmed' }
  | { kind: 'weaponCategory'; category: WeaponCategory }
  | { kind: 'weaponFamiliesFromChoice'; choiceFeatureId: string };

export interface CriticalRange {
  /** Portée concernée : attaques au contact (`melee`) ou à distance (`ranged`). */
  scope: 'melee' | 'ranged';
  /**
   * ÉLARGISSEMENT = nombre de points retranchés au seuil de 20 : 1 → critique sur 19-20,
   * 2 → 18-20. Constante (cas courant) ou SCALANTE (Tir précis, arquebusier : 1, puis 2 au
   * rang 5 de la voie — `stepped` `path-rank`). Résolue à l'affichage par `criticalRangeSources`.
   */
  value: EffectValue;
  /**
   * Condition d'arme conditionnant l'élargissement (PER-136). Absente = plage permanente / pilotée
   * hors de l'arme portée. Cf. `WeaponCriticalCondition`.
   */
  weaponCondition?: WeaponCriticalCondition;
}

// ---------------------------------------------------------------------------
// Choix portés par une capacité — PER-66
// ---------------------------------------------------------------------------

/**
 * Choix qu'une capacité fait faire au joueur — couche DÉFINITION (portée par
 * `Feature.choices`), STRICTEMENT distincte de la VALEUR retenue, qui est
 * persistée sur le personnage (`Character.featureChoices`, cf.
 * `src/lib/character/types.ts`). Union discriminée par `kind`.
 *
 * Trois natures relevées à l'inventaire (PER-62, `feature-classification`) :
 *  - `ability` : choisir une caractéristique (ex. « augmentez d'un point une
 *    caractéristique au choix ») ;
 *  - `feature-from-path` : emprunter une capacité à d'autres voies (ex. demi-orc
 *    r2 — « une capacité de rang 1 de n'importe quelle voie de barbare ou de
 *    guerrier ») ; la capacité retenue est effectivement acquise, donc ses
 *    propres `effects` comptent côté moteur (cf. `modsFromFeatures`) ;
 *  - `option` : choisir dans une liste énumérée explicitement (ex. maître
 *    d'armes r1 — épées / haches / mains nues / masses / lances / armes de jet).
 *
 * Une capacité peut porter plusieurs choix (`Feature.choices`) ; chaque choix est
 * identifié par sa POSITION dans le tableau (clé d'alignement avec la sélection
 * persistée). On ne modélise ici QUE le domaine de valeurs autorisées ; l'effet
 * mécanique d'un choix relève du moteur et des tickets d'effets.
 */
export type FeatureChoice =
  | AbilityFeatureChoice
  | PathFeatureChoice
  | OptionFeatureChoice
  | CustomSkillFeatureChoice;
export type FeatureChoiceKind = FeatureChoice['kind'];

interface FeatureChoiceBase {
  /** Invite affichée au joueur (français), ex. « Caractéristique à augmenter ». */
  prompt: string;
  /**
   * Visibilité CONDITIONNELLE à une OPTION sœur (PER-73) : le choix n'est proposé (et n'est « dû »)
   * que si le choix d'index `choiceIndex` de la MÊME capacité a l'option `optionId` retenue. Sert le
   * gagne-pain LIBRE d'`humain-r1` : la saisie personnalisée n'apparaît que si l'origine « Libre » est
   * choisie. Résolu par `isChoiceActionable`. Absent = toujours proposé.
   */
  visibleIfOption?: { choiceIndex: number; optionId: string };
}

/** Choix d'une caractéristique parmi un domaine autorisé. */
export interface AbilityFeatureChoice extends FeatureChoiceBase {
  kind: 'ability';
  /** Caractéristiques admissibles ; absent = les 7. */
  allowed?: AbilityId[];
  /**
   * Si true : le choix est censé porter sur la caractéristique la plus faible.
   * L'UI affiche un hint et un avertissement si la valeur retenue dévie.
   */
  lowestHint?: boolean;
}

/**
 * Choix d'une capacité empruntée à d'autres voies. Le domaine est exprimé par
 * CONTRAINTES (rangs, profils, voies, portée relative au personnage) plutôt
 * qu'énuméré en dur : la liste réelle se calcule depuis le catalogue de voies
 * (cf. `eligibleFeaturesForChoice`, `src/lib/character/choices.ts`).
 *
 * Règle des **poupées russes** (p. 41) : une capacité empruntée ne peut pas être
 * elle-même « emprunteuse » (porter un `feature-from-path`) — pas de chaînage,
 * un seul niveau d'emprunt. Filtrée par `eligibleFeaturesForChoice`.
 */
export interface PathFeatureChoice extends FeatureChoiceBase {
  kind: 'feature-from-path';
  /** Rangs autorisés pour la capacité empruntée (ex. `[1]` ou `[1, 2]`). */
  allowedRanks: number[];
  /**
   * Restreint aux voies de ces profils (ids de `CharacterClass`). Absent (et
   * `pathIds`/`familyScope` absents) = n'importe quelle voie de profil.
   */
  classIds?: string[];
  /** Restreint à ces voies précises (ids de `Path`). */
  pathIds?: string[];
  /**
   * Domaine RELATIF au personnage : `same-family` = voies des profils de la
   * même famille que lui (ex. voie de l'expert, p. 129). Résolu par le moteur,
   * qui connaît le personnage.
   */
  familyScope?: 'same-family';
  /**
   * Exclut du domaine toute capacité qui octroie un bonus de DEF *à soi* (plat ou
   * conditionnel). Sert la restriction explicite de Talent pour la magie (elfe haut,
   * p. 50) : « il peut utiliser cette capacité en armure sans pénalité (mais pas une
   * capacité qui offre un bonus de DEF) » — sans quoi on empilerait Armure de mana
   * sur une armure physique et l'on monterait dans des DEF ahurissantes. Détection
   * via les `effects` structurés (cf. `featureGrantsDefBonus`).
   */
  excludeDefBonus?: boolean;
  /**
   * EXCEPTION d'armure de la voie A (PER-143, encadré « Appel à une autre capacité », p. 41 :
   * « Lorsqu'il existe des exceptions, elles sont indiquées dans le texte de la capacité de la
   * voie A »). Par défaut une capacité EMPRUNTÉE suit les limitations d'armure de son profil
   * d'origine (voie B) ; ce champ RELÈVE le plafond d'usage de l'emprunt jusqu'à l'armure
   * désignée (id de catalogue). Ex. Enfant de la forêt (elfe sylvain, p. 52) : l'emprunt de
   * druide/rôdeur est utilisable « jusqu'à l'armure de cuir renforcé sans pénalité »
   * (`'cuir-renforce-broigne'`), au-delà du plafond natif du druide (cuir simple). Le plafond
   * effectif = MAX(plafond du profil d'origine, ce plafond). Absent = règle de base (plafond de
   * la voie B). Résolu par `featureArmorRestrictionViolations` (armorRestrictions.ts).
   */
  borrowArmorMax?: string;
}

/** Une option énumérée d'un `OptionFeatureChoice`. */
export interface FeatureChoiceOption {
  /** Id stable persisté sur le personnage (clé de contenu, en anglais). */
  id: string;
  /** Libellé affiché au joueur (français). */
  label: string;
  /**
   * Libellé COURT pour la puce compacte sur la carte (vues colonne ET liste), quand le `label`
   * complet est trop long (ex. Peau de pierre/pagne-r2 : « Remplacer l'AGI par la CON pour la DEF »
   * → « CON »). PER-130. Absent → on retombe sur le `label` (coupé à son premier complément entre
   * parenthèses). N'affecte QUE l'affichage ; le menu de sélection garde le `label` complet.
   */
  shortLabel?: string;
  /**
   * Dé bonus aux tests d'une caractéristique octroyé à la CRÉATURE de la même voie
   * lorsque cette option est retenue (ex. Golem supérieur : « Forme de félin » →
   * dé bonus en AGI du golem, « Puissant » → dé bonus en FOR). Mécanique core,
   * affichée par une icône double-d20 sur la mini-fiche de la créature
   * (`CreatureStatBlock`). Voir `creatureBonusDiceForPath`.
   */
  creatureAbilityBonusDie?: AbilityId;
  /**
   * Caractéristique utilisée pour les PV À LA PLACE de la CON lorsque cette option
   * est retenue (ex. Grosse tête, golem-r1 : « il peut ajouter son INT à ses PV au
   * lieu de la CON », p. 100). La règle remplace la contribution de CON d'UN seul
   * niveau (celui de la prise) par celle de cette caractéristique ; comme la CON
   * s'applique uniformément et rétroactivement à chaque niveau (cf. `maxHp`),
   * l'effet net est constant quel que soit le niveau de la prise : `+(carac − CON)`
   * appliqué une seule fois. Voir `hpAbilitySwapSources`.
   */
  hpFromAbility?: AbilityId;
  /**
   * Domaines de compétence (ids du catalogue `src/data/test-domains.ts`) octroyés par cette
   * option lorsqu'elle est retenue (ex. `humain-r1` : origine « Montagnard » → escalade +
   * résistance au froid). La VALEUR suit la catégorie de la voie hôte (peuple → +3), comme
   * un `TestBonusEffect` sans `value`. Agrégé par `testBonusSources` (PER-89), au même titre
   * que les effets `test-bonus` statiques. Voir le précédent `hpFromAbility`.
   */
  testBonusDomains?: string[];
  /**
   * Bonus à des STATS DÉRIVÉES octroyés lorsque cette option est retenue (PER-111). Ex.
   * Éclaireur (rôdeur, traqueur-r1) : option « +1 DR au lieu du +1 PC de famille » →
   * `[{ stat: 'recoveryDiceCount', value: 1 }, { stat: 'luckPoints', value: -1 }]`. Agrégé au
   * sac `DerivedMods` (et au détail « Capacités / divers ») par `optionStatBonusSources`, au
   * même titre qu'un `StatBonusEffect`. Valeur constante ou scalante. Absent = aucun.
   */
  statBonuses?: StatBonus[];
  /**
   * Caractéristique utilisée pour calculer la DEF À LA PLACE de l'AGI lorsque cette option
   * est retenue (PER-131). Ex. Peau de pierre (barbare, pagne-r2, p. 80) : option « CON pour
   * la DEF » → `defAbility: 'CON'`. Le plafond d'armure (« AGI maximale », p. 188) s'applique
   * alors à cette caractéristique de substitution (le moteur plafonne la valeur qu'il reçoit,
   * cf. `defense`). Résolu par `defenseAbility` puis passé au moteur via `DerivedInput.defAbility`.
   * Absent = DEF sur l'AGI (cas standard).
   */
  defAbility?: AbilityId;
  /**
   * Bonus CHIFFRÉ aux tests d'UNE caractéristique octroyé lorsque cette option est retenue
   * (ex. Tatouages, barbare pagne-r3 : Taureau → +3 aux tests de FOR). PER-125. Axe DISTINCT du
   * bonus de compétence par domaine (`testBonusDomains`) et de la valeur de la caractéristique
   * (`ability-bonus`, qui change PV/DEF/formules) : ici on ne modifie QUE le jet « d20 + carac » des
   * tests de cette caractéristique (et donc des domaines qu'elle gouverne). Agrégé par
   * `abilityTestBonusByAbility` et rendu sur la ligne de la carac dans « Compétences & tests ».
   * Le livre précise « bonus de magie, non cumulable avec un objet magique » — non modélisé (pas
   * d'objets magiques) → reste verbatim. Absent = aucun.
   */
  abilityTestBonus?: { ability: AbilityId; value: number };
  /**
   * Niveau de personnage MINIMUM requis pour retenir cette option (PER-140). Absent = aucune
   * condition. Ex. Monture fantastique (cavalier-r5) : les montures VOLANTES (pégase, griffon,
   * hippogriffe) ne sont possibles qu'à partir du niveau 9. L'UI grise l'option en deçà ; la fiche
   * reste permissive (une sélection devenue illégale n'est pas effacée d'office).
   */
  minLevel?: number;
  /**
   * Profil de créature octroyé QUAND cette option est retenue (PER-140) — il PRIME sur le
   * `Feature.creatureProfile` de base. Ex. Monture fantastique : chaque monture (cheval de guerre
   * lourd, ours, félin géant, pégase…) a sa propre mini-fiche. Absent = pas de créature propre à
   * l'option (on retombe sur le profil de la capacité, s'il existe).
   */
  creatureProfile?: CreatureProfile;
  /**
   * AMÉLIORATIONS apportées à la CRÉATURE de la même voie lorsque cette option est retenue
   * (PER-94, ex. Golem supérieur, golem-r5, p. 100) — appliquées PAR-DESSUS le profil de base
   * (`golem-r2`) par `applyCreatureUpgrades`, et CUMULÉES si plusieurs options sont retenues (une
   * par voie de forgesort au rang 5). À DISTINGUER de `creatureProfile` (qui REMPLACE le profil,
   * ex. Monture fantastique) : ici on n'ajoute que des deltas chiffrés à un profil existant. Le dé
   * bonus reste porté séparément par `creatureAbilityBonusDie`. Absent = aucune amélioration.
   */
  creatureUpgrade?: {
    /** Deltas de caractéristiques de la créature (ex. Forme de félin → AGI +3). */
    abilities?: Partial<Record<AbilityId, number>>;
    /** Bonus de DÉFENSE (ex. Armure → +5, Forme de félin → +3). */
    def?: number;
    /** PV supplémentaires PAR NIVEAU du maître (ex. Grande taille → +2/niveau). */
    hitPointsPerLevel?: number;
    /** Bonus PLAT aux DM au contact (ex. Grande taille → +1, Puissant → +2). */
    meleeDamageFlat?: number;
    /** Dé supplémentaire aux DM au contact, au format richText (ex. Arme à deux mains → `1d4°`). */
    meleeDamageDice?: string;
    /**
     * Attaque SUPPLÉMENTAIRE octroyée (ex. Baliste → attaque à distance). Le DM est un dé + la
     * caractéristique de la CRÉATURE `damageAbility` (baked en nombre par le résolveur, car le DM
     * d'un compagnon se résout sinon contre le maître). Rendue en chip d'attaque distinct.
     */
    extraAttack?: { label: string; damageDice: string; damageAbility?: AbilityId; ranged?: boolean };
    /** Note libre ajoutée à la fiche de la créature (ex. Vol, « doué de parole »). */
    note?: string;
  };
  /**
   * Option RÉPÉTABLE au sein d'un choix `repeat` (PER-72) : contrairement aux options normales
   * (DISTINCTES, retenues une seule fois), celle-ci peut être retenue PLUSIEURS fois dans le même
   * choix — ex. Spécialisation (maitre-d-armes-r3) : « +1 DM » dépensable à CHAQUE jalon de rang 5,
   * jusqu'à +6. Ses sélections ne sont donc PAS dédoublonnées par `getOptionSelections` (les autres
   * options du choix le restent). Chaque instance consomme une unité du budget `repeat`. Absent =
   * option distincte classique. N'a de sens que sur un `OptionFeatureChoice` avec `repeat`.
   */
  repeatable?: boolean;
}

/**
 * Détermine COMBIEN d'options distinctes un choix répétable octroie. Une seule
 * variante à ce jour : autant que de voies (de profils donnés) dont le personnage
 * a atteint un rang — ex. Golem supérieur : « une amélioration de plus à chaque
 * fois qu'il atteint le rang 5 dans une voie de forgesort » (p. 100). Le compte
 * est DYNAMIQUE (dépend de la progression) ; il est résolu par le moteur de choix
 * (`repeatableChoiceCount`, `src/lib/character/choices.ts`).
 */
export interface ChoiceRepeat {
  by: 'paths-at-rank';
  /** Profils dont les voies de profil sont comptées (ex. `['forgesort']`). */
  classIds: string[];
  /** Rang à atteindre dans une voie pour octroyer une sélection (ex. 5). */
  rank: number;
  /**
   * Picks TOUJOURS accordés, indépendamment de la progression (PER-72) — ex. la catégorie de
   * BASE d'Armes de prédilection (maitre-d-armes-r1 : 1 catégorie dès le rang 1). Les picks
   * `paths-at-rank` s'ajoutent PAR-DESSUS. Défaut 0 (cas Golem supérieur / Langage des animaux).
   */
  base?: number;
  /**
   * Les picks de progression (`paths-at-rank`) ne sont DÉBLOQUÉS que si cette capacité est acquise
   * (PER-72) — ex. Armes de prédilection n'octroie catégories/« +1 DM » supplémentaires qu'une fois
   * Spécialisation (maitre-d-armes-r3) prise. Tant qu'elle ne l'est pas, seul le `base` compte
   * (`budget > base` ⟺ capacité acquise ET au moins une voie au rang requis). Absent = toujours actif.
   */
  requiresFeatureId?: string;
}

/** Choix d'une option dans une liste énumérée explicitement. */
export interface OptionFeatureChoice extends FeatureChoiceBase {
  kind: 'option';
  options: FeatureChoiceOption[];
  /**
   * Choix RÉPÉTABLE : le joueur retient PLUSIEURS options DISTINCTES, le nombre
   * autorisé étant déterminé par la progression (`repeat`). Absent = choix simple
   * (une seule option). La valeur persistée à cette position est alors un TABLEAU
   * d'ids d'options (cf. `FeatureChoiceSelection`).
   */
  repeat?: ChoiceRepeat;
}

/**
 * Choix d'une compétence PERSONNALISÉE (PER-73) — le gagne-pain/origine LIBRE d'`humain-r1` :
 * « Le MJ peut en inventer d'autres (…) le joueur peut remplacer un des bonus d'origine (…) par un
 * bonus en relation avec (…) un gagne-pain de son choix » (p. 57). Le joueur saisit un NOM libre
 * (le gagne-pain) et choisit `domainCount` domaines de test DISTINCTS dans le catalogue
 * (`test-domains.ts`), qui reçoivent chacun le bonus de la voie hôte (peuple → +3), au même titre
 * que les `testBonusDomains` d'une option preset. Les domaines à coloration COMBAT (`TestDomain.combat`)
 * sont exclus des listes (« le bonus obtenu ne s'applique jamais à des tests de combat », p. 57).
 *
 * PERSISTANCE : la sélection est un `string[]` de la forme `[nom, ...domaines]` (`FeatureChoiceSelection`).
 * Le NOM est purement décoratif (libellé d'origine affiché) ; seuls les domaines portent un effet.
 * Typiquement gardé derrière un `visibleIfOption` (l'option « Libre » d'un choix sœur).
 */
export interface CustomSkillFeatureChoice extends FeatureChoiceBase {
  kind: 'custom-skill';
  /** Invite du champ NOM libre (ex. « Nom de l'origine ou du gagne-pain »). */
  namePrompt: string;
  /** Nombre de domaines de test distincts à choisir (ex. 2 pour `humain-r1`). */
  domainCount: number;
}

// ---------------------------------------------------------------------------
// Profil de créature / compagnon invoqué — PER-69
// ---------------------------------------------------------------------------

/**
 * Profil chiffré d'une CRÉATURE/compagnon octroyé(e) par une capacité (golem,
 * familier, démon, zombie… et, à venir, le compagnon animal du rôdeur ou le
 * familier fantastique). Mini-fiche structurée, rendue par le composant
 * `CreatureStatBlock`, EN PLUS du `text` verbatim (qui reste la source) et en
 * remplacement du bloc de stats recopié dans `richText`.
 *
 * Les champs dérivés sont des chaînes au FORMAT `richText` (dés, formules,
 * `rang`/`niveau`), résolues à l'affichage contre le personnage — `rang` = rang de
 * la VOIE HÔTE, `niveau` = niveau du personnage. Certaines valeurs renvoient au
 * MAÎTRE (« Init. du forgesort », « attaque magique du sorcier ») : pas de jeton
 * pour les stats dérivées d'autrui, elles restent donc en texte littéral.
 */
/**
 * Stat dérivée du MAÎTRE (le personnage) recopiée dans le profil de la créature —
 * ex. « Initiative [Init. du forgesort] » → l'initiative du golem EST celle de son
 * maître. Résolu à l'affichage depuis les stats dérivées du personnage.
 */
export interface MasterStatRef {
  fromMaster: DerivedStatId;
}

export interface CreatureProfile {
  /** Nom de la créature (ex. « Golem »). */
  name: string;
  /** Mention de nature/type si le livre la donne (ex. « Créature non vivante »). */
  type?: string;
  /**
   * Les 7 caractéristiques (valeurs fixes de la créature). ABSENT pour les créatures que le
   * livre décrit SANS bloc de caractéristiques — seulement Init/DEF/PV/Att/DM (ex. écuyer du
   * chevalier, `noblesse-r2`) : la mini-fiche omet alors la grille de caractéristiques.
   */
  abilities?: Record<AbilityId, number>;
  /**
   * Caractéristiques dont les TESTS bénéficient d'un DÉ BONUS INNÉ (notées « * » dans
   * les blocs de stats du livre, ex. loup « CON +1* | PER +2* »). Rendu par l'icône
   * double-d20 (`BonusDieBadge`) à droite de la valeur, sur la mini-fiche — système
   * UNIFIÉ avec la fiche de personnage (PER-107). À DISTINGUER des dés bonus octroyés
   * par une OPTION de voie (`FeatureChoiceOption.creatureAbilityBonusDie`, ex. golem) :
   * les deux ensembles fusionnent à l'affichage. Absent = aucun dé bonus inné.
   */
  bonusDieAbilities?: AbilityId[];
  /**
   * Défense (S) : nombre fixe ou expression `richText` (« 10 + rang »). OPTIONNELLE : absente
   * pour une créature que le livre décrit SANS bloc de stats (« une force, pas une créature »,
   * ex. Serviteur invisible, invocation-r2, p. 96) — voir `descriptionRich`.
   */
  defense?: string;
  /**
   * DÉFENSE ALTERNATIVE conditionnelle (PER-72, cavalier). Quand une capacité du maître
   * l'accorde et que son interrupteur est actif, la DEF affichée devient cette valeur —
   * typiquement une stat dérivée du maître (`MasterStatRef`). Cas : Cavalier émérite
   * (cavalier-r2) — « en selle, la monture obtient une DEF égale à celle du chevalier ».
   * Rendu : la mini-fiche montre la DEF effective + une info-bulle détaillant l'alternative
   * (base hors selle ↔ DEF du maître en selle). L'activation est résolue EN AMONT (par
   * `isEffectActive` sur `sourceFeatureId`) et passée à `CreatureStatBlock`.
   * NB : la propagation GÉNÉRALE maître→créature est l'objet de PER-94 ; ce champ couvre le
   * seul cas d'AFFICHAGE trivial (DEF = celle du maître) traité en avance.
   */
  defenseAlt?: {
    /** Valeur de DEF quand l'alternative est active (souvent `{ fromMaster: 'def' }`). */
    value: string | MasterStatRef;
    /** Condition d'activation, affichée en info-bulle (ex. « en selle »). */
    conditionLabel: string;
    /** Nom de la capacité source, affiché en info-bulle (ex. « Cavalier émérite »). */
    sourceLabel: string;
    /** Capacité du maître qui octroie l'alternative (ex. `cavalier-r2`) ; interrupteur index 0. */
    sourceFeatureId: string;
  };
  /**
   * Points de vigueur (V) : expression `richText` (« niveau × 5 »). OPTIONNELS : absents pour
   * une créature SANS PV (Serviteur invisible, p. 96 : « ne peut pas être combattu ») — la
   * section « Compagnons » n'affiche alors PAS de barre de vie (`resolveCreatureMaxHp` → `null`).
   */
  hitPoints?: string;
  /**
   * Initiative (I) : nombre fixe (`richText`, ex. « 8 ») ou recopie d'une stat du maître.
   * OPTIONNELLE (même raison que `defense`/`hitPoints`).
   */
  initiative?: string | MasterStatRef;
  /**
   * Attaque, si la créature attaque. Le jet est SOIT recopié d'une stat dérivée du
   * MAÎTRE (`fromMaster`, ex. « attaque magique du rôdeur » du loup), SOIT une valeur
   * PROPRE à la créature (`value`, bonus fixe affiché tel quel, ex. « Ruade +5 » de la
   * fidèle monture, qui attaque avec sa propre FOR et non celle du chevalier).
   * Exactement l'un des deux. `label` nomme le jet (défaut « Attaque », ex. « Ruade »).
   * `damage` est au format `richText` (dés + constantes uniquement : une carac s'y
   * résoudrait contre le MAÎTRE, pas contre la créature).
   */
  attack?: { label?: string; fromMaster?: DerivedStatId; value?: string; damage: string };
  /**
   * Attaques SUPPLÉMENTAIRES de la créature, en plus de `attack` (PER-94) — ex. Baliste du Golem
   * supérieur (attaque à distance ajoutée par une amélioration). Le `damage` est déjà résolu (dé +
   * constante bakée : la carac d'une créature ne peut pas être un token richText, qui se résoudrait
   * contre le maître). Rendu en chips d'attaque additionnels. Absent = aucune. Alimenté par
   * `applyCreatureUpgrades` depuis `FeatureChoiceOption.creatureUpgrade.extraAttack`.
   */
  extraAttacks?: { label: string; damage: string; ranged?: boolean }[];
  /** Particularités libres (déplacement, « trop petit pour attaquer »…). */
  note?: string;
  /**
   * Description ENRICHIE d'une créature que le livre présente SANS bloc de stats (PER-235) :
   * une « force, pas une créature » (Serviteur invisible, invocation-r2, p. 96). Rendue en une
   * ligne `richText` (résolution des caractéristiques/formules du MAÎTRE, ex. `[CHA]`, `[=CHA]`)
   * À LA PLACE des blocs DEF/PV/Init./attaque (absents ici), sans barre de vie ni grille de
   * caractéristiques. Ne pas cumuler avec `defense`/`hitPoints`/`abilities` : c'est le rendu de
   * repli pour les créatures atypiques dont on ne connaît pas les 7 caractéristiques.
   */
  descriptionRich?: string;
  /**
   * La créature s'invoque en PLUSIEURS EXEMPLAIRES INDÉPENDANTS (PER-235), chacun avec ses
   * propres PV suivis à part (ex. Zombie, outre-tombe-r3, p. 109 : « le sorcier peut contrôler un
   * seul zombie, plus un zombie chaque fois qu'il atteint le rang 5 dans une voie de sorcier »).
   * Absent = compagnon à instance UNIQUE (cas par défaut). Présent = la section « Compagnons »
   * affiche un bloc par instance créée (bouton « Invoquer » sur la carte du rang), avec
   * suppression manuelle et auto-suppression à 0 PV. La persistance des instances vit dans
   * `Character.companionInstances` (ids d'instance) + `Character.companionDepletion` (PV par
   * instance, clé composite `<featureId>#<instanceId>`).
   */
  instances?: {
    /**
     * Limite d'instances simultanées = `base` + nombre de voies d'un profil des `classIds` dont
     * le rang `rank` est atteint (même comptage cross-voie que `MilestoneCountScalingValue` /
     * `UsageCounter.maxByRankCount`). Ex. zombie : `{ base: 1, rank: 5, classIds: ['sorcier'] }`
     * → 1 + une par voie de sorcier au rang 5. Résolu par `resolveCompanionInstanceLimit`.
     */
    limit: { base: number; rank: number; classIds: string[] };
  };
}

/**
 * Capacité EXISTANTE d'un profil, CONFÉRÉE au maître par un familier fantastique (PER-84,
 * p. 133-136). Descriptif verbatim tel que le livre le donne — la RÉSOLUTION vers un
 * `featureId` réel est DIFFÉRÉE : les voies de profil citées (divination, mort, sang,
 * illusions, air, envoûteur, invocation, végétaux, animaux, magie élémentaire/universelle,
 * spiritualité, musicien…) ne sont pas toutes peuplées dans les données. On stocke donc la
 * référence descriptive (nom/rang/voie/profil) suffisante pour l'afficher et la retrouver
 * plus tard. Absente quand le pouvoir est PROPRE au familier (ex. « Toile », « Clone ») et
 * ne renvoie à aucune capacité de profil.
 */
export interface FamiliarGrantedPower {
  /** Nom de la capacité conférée, verbatim (ex. « Prescience »). Absent si le livre ne la nomme pas. */
  name?: string;
  /** Rang de la capacité dans sa voie d'origine (ex. 5). Absent si non précisé. */
  rank?: number;
  /** Voie d'origine, verbatim (ex. « voie de la divination »). */
  pathName: string;
  /** Profil d'origine (id de profil, ex. 'ensorceleur'). */
  profile: string;
  /** Fréquence d'usage verbatim si précisée (ex. « une fois par jour »). */
  usage?: string;
  /** featureId résolu si la capacité existe déjà dans les données. Différé → généralement absent. */
  featureId?: string;
}

/**
 * FAMILIER FANTASTIQUE (PER-84) — une des 12 créatures de l'encadré « Les familiers
 * fantastiques » (p. 133-136) que le joueur CHOISIT en prenant la voie du familier
 * fantastique (`prestige-familier-fantastique`). Le stat-block de base (taille minuscule)
 * est porté par la capacité de RANG 3 de la voie ; chaque familier n'apporte que ses
 * PARTICULARITÉS et surtout les éléments référencés par les rangs 4/5/7 de la voie :
 * un pouvoir mineur (R4), un profil de magie dont on apprend un ou deux sorts (R5), un
 * pouvoir supérieur + un bonus de +1 à une caractéristique (R7).
 */
export interface FantasticFamiliar {
  /** Slug d'id (clé de contenu, français conservé comme les autres entités). */
  id: string;
  /** Voie hôte — toujours `'prestige-familier-fantastique'`. */
  pathId: string;
  /** Nom affiché (français, ex. « Animal céleste »). */
  name: string;
  /** Texte de présentation verbatim (aspect, déplacement, attaque innée…). */
  description: string;
  /**
   * Écarts au stat-block générique de rang 3 exprimables en valeurs fixes
   * (ex. lézard voltaïque `{ FOR: -2 }`, fée/lutin `{ CHA: 2 }`). Absent = suit le bloc
   * générique tel quel. Les écarts non réductibles à des valeurs fixes vont dans `abilityNote`.
   */
  abilityOverrides?: Partial<Record<AbilityId, number>>;
  /**
   * Note verbatim sur les caractéristiques quand l'écart ne se réduit pas à des valeurs
   * fixes (ex. minimoï : « FOR -3 et AGI [AGI du personnage + 2] ; autres = perso - 2 »).
   */
  abilityNote?: string;
  /** R4 — Pouvoir mineur conféré au maître. */
  minorPower: {
    /** Texte verbatim complet. */
    text: string;
    /** Capacité de profil référencée, si le pouvoir en est une (sinon pouvoir propre au familier). */
    grants?: FamiliarGrantedPower;
  };
  /**
   * R5 — Profil de magie associé : le maître apprend un ou deux sorts de rang 1 ou 2 de ce
   * profil. Id de profil (ex. `'sorcier'`) OU la valeur spéciale `'main-profile'` (minimoï :
   * « le profil principal du personnage »).
   */
  spellProfile: string;
  /** R7 — Pouvoir supérieur conféré au maître + caractéristique recevant le +1. */
  superiorPower: {
    /** Texte verbatim complet. */
    text: string;
    /** Capacité de profil référencée, si le pouvoir en est une. */
    grants?: FamiliarGrantedPower;
    /** Caractéristique bénéficiant du bonus de +1 (rang 7). */
    abilityBonus: AbilityId;
  };
  /** Page source dans le livre de base. */
  sourcePage: number;
}

/**
 * ÉVÉNEMENT qui remet un compteur d'usages à son maximum (PER-73). Déclaratif : aucun
 * consommateur moteur pour l'instant — le futur bouton « Nouvelle journée » lira `resetOn === 'day'`
 * pour savoir quels compteurs recharger d'un clic. Les valeurs plus fines (`short-rest`, `combat`)
 * anticipent les rangs classés « par récupération rapide » / « par combat » (catégorie E du scan
 * PER-73) qui relèveront d'un autre bouton de reset. `manual` = jamais rechargé automatiquement
 * (compteur « à vie » comme les sept vies du chat, ou remis à plein par une autre règle : absorption
 * d'Armure de pierre rechargée au relancement du sort).
 */
export type UsageResetTrigger = 'day' | 'short-rest' | 'combat' | 'manual';

/**
 * Surcoût en mana CROISSANT d'un sort (PER-162) — modèle ISOLÉ, distinct de `UsageCounter`
 * (« usages restants / max ») car sa sémantique est INVERSE : il démarre à 0 et s'incrémente à
 * chaque lancement, sans plafond, puis retombe à 0 à un déclencheur (pas « remis au max »).
 * Cas du livre : Foudres divines (foi-r5, prêtre) — « son coût augmente de +1 PM à chaque
 * utilisation tant que le prêtre n'a pas terminé une récupération rapide » (`resetOn: 'short-rest'`).
 *
 * Le décompte courant (nombre de lancements depuis le dernier reset) est un état de jeu porté par
 * `Character.usageCounters` sous l'id de la capacité (absence ⇒ 0). Coût effectif du sort =
 * `spellManaCost` + `lancements × step`. N'a de sens que si `isSpell`.
 */
export interface EscalatingManaCost {
  /** PM ajoutés à CHAQUE lancement. Défaut 1 (seul cas du livre). */
  step?: number;
  /** Déclencheur qui remet le surcoût cumulé à 0. Cas du livre : `'short-rest'`. */
  resetOn: UsageResetTrigger;
}

/**
 * Compteur d'USAGES LIMITÉS d'une capacité (PER-70) — concept de règles nommé
 * (« cette capacité ne peut être utilisée que N fois »). DÉCLARATION côté données
 * (le maximum) ; le décompte courant est un état de jeu porté par le personnage
 * (`Character.usageCounters`, aligné par id de capacité). Le compteur démarre à
 * `max` et descend jusqu'à 0 (épuisé). Cas du livre : Les sept vies du chat
 * (fauve-r5, p. 115) — 6 usages, malgré le nom « sept vies » (le druide vit déjà
 * l'une des sept). La sous-règle « pas plus d'une fois par niveau » n'est pas
 * automatisable proprement → laissée en verbatim, le décrément restant manuel.
 */
export interface UsageCounter {
  /**
   * Nombre d'usages disponibles au départ (valeur la plus haute du compteur). CONSTANT.
   * Optionnel uniquement si un maximum scalant est utilisé (`maxByPathRank`, `maxByLevel` ou `maxByRankCount`).
   * Au moins l'un des quatre (`max`, `maxByPathRank`, `maxByLevel`, `maxByRankCount`) doit être présent.
   */
  max?: number;
  /**
   * Maximum SCALANT (PER-119) : si vrai, le maximum vaut le RANG ATTEINT dans la voie hôte
   * (1→5), pas une constante — il grandit avec la progression. Prioritaire sur `max`. Cas :
   * les charges explosives de l'arquebusier (réserve quotidienne = rang dans la voie des
   * explosifs). Le moteur ne stocke que la déclaration ; le maximum effectif est résolu à
   * l'affichage à partir du rang de voie courant.
   */
  maxByPathRank?: boolean;
  /**
   * Maximum SCALANT PAR PALIERS de rang de voie (PER-159) : le max prend la valeur du palier de plus
   * haut `minRank` atteint dans la voie hôte (0 sous le premier palier). Ex. Réflexes félins (voleur,
   * `deplacement-r2`) : 1 usage/combat, puis 2 au rang 5 de la voie →
   * `[{ minRank: 1, max: 1 }, { minRank: 5, max: 2 }]`. Prioritaire sur `max` ; résolu à l'affichage
   * à partir du rang de voie courant.
   */
  maxByPathRankSteps?: { minRank: number; max: number }[];
  /**
   * Maximum SCALANT par NIVEAU (PER-137) : max = `niveau du personnage × maxByLevel`. Sert au SUIVI
   * D'ABSORPTION d'Armure de pierre (le sort prend fin après avoir absorbé `niveau × 3` DM →
   * `maxByLevel: 3`) : le compteur démarre plein (capacité d'absorption) et descend à mesure que le
   * joueur enregistre les DM absorbés. Prioritaire sur `max`. Résolu à l'affichage.
   */
  maxByLevel?: number;
  /**
   * Maximum SCALANT par COMPTAGE CROSS-VOIE (PER-130) : max = `base` + nombre de capacités
   * ACQUISES de rang `rank` dans une voie de profil des `classIds`. Ex. réserve de rage du
   * barbare : 1 + une par capacité de rang 4 atteinte dans une voie de barbare (« le personnage
   * peut entrer en rage une fois de plus par jour pour chaque capacité de rang 4 qu'il atteint
   * dans une voie de barbare »). Prioritaire sur `max` et `maxByPathRank`. Résolu à l'affichage.
   *
   * PER-73 — deux modulateurs optionnels pour les formules « rang de la voie + comptage » :
   * - `addPathRank` : ajoute le RANG ATTEINT dans la voie hôte au total (terme « une fois par
   *   rang acquis dans la voie »). Ex. Récupération mineure (prêtre, soins-r1) et pool d'élixirs
   *   (forgesort) : `rang(voie hôte) + nb de voies de la classe à rang ≥ 3`.
   * - `excludeHostPath` : ne compte PAS la capacité de la voie hôte dans le comptage (pour les
   *   règles « dans une AUTRE voie de … », ex. soins-r1). Défaut : la voie hôte est incluse
   *   (comportement de la rage). Astuce : « atteindre le rang 3 dans une voie » = avoir acquis sa
   *   capacité de rang 3, d'où `rank: 3`.
   */
  maxByRankCount?: {
    classIds: string[];
    rank: number;
    base: number;
    addPathRank?: boolean;
    excludeHostPath?: boolean;
  };
  /**
   * Coût en points décrémentés à CHAQUE usage de CETTE capacité (PER-130). Défaut 1. Sert aux
   * réserves PARTAGÉES (`sharedKey`) où certaines capacités consomment plus : ex. Furie du berserk
   * consomme 2 points de rage et n'est utilisable que s'il en reste au moins 2. Le décrément et
   * l'incrément se font alors par pas de `cost`, et le décrément est bloqué si le reste est inférieur.
   */
  cost?: number;
  /**
   * ACTIVER l'interrupteur d'un état temporaire à compteur le CONSOMME-t-il automatiquement (un cran
   * de `cost`) ? Défaut `true` — patron Rage/Furie du berserk (PER-130) : entrer en rage dépense un
   * usage. Mettre `false` pour les compteurs de SUIVI dont l'activation ne consomme rien et qui se
   * décrémentent à la main (ex. absorption d'Armure de pierre, PER-137 : on décompte les DM absorbés
   * au fil des coups, pas au lancement du sort).
   */
  consumeOnActivate?: boolean;
  /**
   * Clé d'état PARTAGÉE (PER-119) : plusieurs capacités d'une même voie peuvent puiser dans
   * une réserve COMMUNE. Le décompte courant est alors stocké sous cette clé dans
   * `Character.usageCounters` (au lieu de l'id de la capacité), si bien que les capacités qui
   * la partagent affichent et décomptent le MÊME compteur. Ex. `'explosifs-charges'` partagé
   * par Démolition, Piège explosif et Boulet explosif. Défaut = id de la capacité (compteur propre).
   */
  sharedKey?: string;
  /**
   * Quand le compteur se recharge à plein (PER-73). Défaut : `'day'` (repos long / « Nouvelle
   * journée ») — cas de très loin le plus courant. À renseigner explicitement pour les compteurs
   * qui NE suivent PAS le cycle journalier (`'manual'` pour les compteurs à vie ou rechargés par
   * une autre règle), afin que le futur bouton « Nouvelle journée » ne les remette pas à tort.
   */
  resetOn?: UsageResetTrigger;
  /**
   * Verrou « une seule dépense entre deux récupérations rapides » (PER-160). Quand `true`, dès qu'un
   * point est dépensé, toute nouvelle dépense est BLOQUÉE jusqu'au prochain repos court — INDÉPENDAMMENT
   * du total restant (ex. Transe de guérison : 3/jour, mais « une récupération rapide entre deux usages »).
   * Ce n'est PAS un second compteur : l'UI désactive simplement le décrément avec une note ; le verrou
   * est un état de jeu levé par tout repos court/long. Sans effet si absent.
   */
  oncePerShortRest?: boolean;
  /**
   * Ne PAS remonter ce compteur en jauge dans le bloc « État du personnage » (PER-150). Réservé aux
   * usages QUOTIDIENS à faible cadence (pouvoirs 1–3/jour) qui n'ont pas vocation à occuper le tableau
   * de bord : ils restent suivis UNIQUEMENT au niveau de la carte de capacité (indicateur compact +
   * édition en modale, « scope du rang de voie »). Les vraies RÉSERVES tactiques dépensées en jeu
   * (rage, charges explosives, doses de poison, sept vies, absorption d'Armure de pierre) restent,
   * elles, des jauges du bloc d'état. Défaut : `false` (le compteur apparaît en jauge).
   */
  hideFromStatusPanel?: boolean;
  /**
   * Afficher cette réserve comme une BARRE COMPACTE sous l'en-tête de la VOIE (au lieu d'une jauge
   * d'état ou d'un compteur par carte). Réservé aux réserves PARTAGÉES « à préparation systématique »
   * comme le pool d'élixirs du forgesort (p. 98) : il prépare toujours 100 % de ses doses, donc une
   * jauge « restant/max » d'état n'a pas de sens — la réserve se suit au niveau de la voie, chaque
   * carte offrant un bouton « Créer l'élixir » qui décompte d'un cran (`cost`). Implique de NE PAS
   * remonter le compteur en jauge d'état (`capacityResourceGauges` l'ignore) ni en compteur ±1 par
   * carte. Défaut : `false`.
   */
  poolInPathHeader?: boolean;
  /**
   * N'afficher la jauge d'état de ce compteur QUE lorsqu'un effet conditionnel de la capacité
   * porteuse est ACTIF (PER-150). Réservé aux compteurs de SUIVI d'un effet temporaire à interrupteur
   * dont la valeur n'a de sens que le sort/état lancé : l'absorption d'Armure de pierre (le plafond
   * `niveau × 3` ne se décompte que pendant que le sort est actif — hors sort, la barre « Absorption
   * restante » n'aurait aucun sens). À la différence d'une réserve quotidienne (rage, charges) qui
   * reste utile à voir même inactive. Défaut : `false` (jauge toujours visible). N'affecte que le bloc
   * « État du personnage » ; la carte de capacité continue de suivre le compteur.
   */
  visibleWhenEffectActive?: boolean;
  /**
   * ACTIVER l'interrupteur d'un effet temporaire de la capacité porteuse remet ce compteur à PLEIN
   * (PER-150). Pour les compteurs de SUIVI rechargés au (re)lancement du sort : l'absorption d'Armure
   * de pierre repart à `niveau × 3` à chaque activation. À distinguer de `consumeOnActivate` (qui, lui,
   * DÉPENSE un cran à l'activation, patron Rage/Furie). Défaut : `false`.
   */
  resetOnActivate?: boolean;
  /**
   * Atteindre 0 sur ce compteur COUPE l'interrupteur des effets conditionnels de la capacité porteuse
   * (PER-150). Pour les compteurs de SUIVI dont l'épuisement met fin à l'effet : Armure de pierre prend
   * fin dès qu'elle a absorbé son plafond de DM (`niveau × 3`). Défaut : `false`.
   */
  endsEffectAtZero?: boolean;
  /** Libellé affiché (français). Défaut : « Usages restants ». */
  label?: string;
}

/**
 * ÉTATS PRÉJUDICIABLES infligeables par une capacité, chacun UNE SEULE FOIS entre deux reset
 * (Botte secrète, spadassin-r5, p. 77 : « il inflige à sa cible un état préjudiciable au choix parmi
 * affaibli, aveuglé, étourdi, immobilisé ou ralenti … Vous ne pouvez infliger chaque état préjudiciable
 * qu'une seule fois par combat »), PER-206. Modèle calqué sur `borrowedPowers` (Artefact étrange) : un
 * ensemble de sous-éléments, chacun doté d'un marqueur d'état de jeu propre suivi dans
 * `Character.usageCounters` sous une clé dérivée (`inflictedStateKey`), convention « absence =
 * disponible » (état non encore infligé ce combat). Rendu en boutons-bascule (un par état).
 */
export interface InflictableStates {
  /** États infligeables (catalogue `STATUS_EFFECT_IDS`), dans l'ordre du texte de règles. */
  stateIds: StatusEffectId[];
  /**
   * Quand les marqueurs « déjà infligé » se réinitialisent. Défaut `'combat'` (donc réinitialisés
   * par toute récupération rapide / repos long, comme toute capacité « par combat »).
   */
  resetOn?: UsageResetTrigger;
  /** Libellé de la section (français). Défaut « États infligés ce combat ». */
  label?: string;
}

/**
 * SUBSTITUTION de caractéristique (PER-163) : remplacer `from` par `to` dans les formules d'un sort
 * REPRODUIT/EMPRUNTÉ, quand le lanceur effectif utilise une autre caractéristique de magie (forgesort →
 * INT). Voir `Feature.reproducedAbilitySubstitutions`. La substitution n'est effective que si `to` est
 * strictement plus avantageuse ; elle est alors signalée à l'affichage.
 */
export interface AbilitySubstitution {
  from: AbilityId;
  to: AbilityId;
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
  /**
   * Types d'action SUPPLÉMENTAIRES débloqués À PARTIR D'UN RANG atteint dans la voie hôte (PER-72),
   * EN PLUS de `actionTypes`. Le livre énonce parfois « à partir du rang N, la capacité peut être
   * utilisée en action gratuite » : c'est un MODE de plus, AU CHOIX du joueur (ni interrupteur, ni
   * remplacement). Affiché comme un marqueur d'action additionnel uniquement quand le rang atteint
   * dans la voie est connu ET ≥ `rank` (le rendu de la fiche fournit ce rang ; dans les contextes
   * sans rang de voie — wizard, historique — ces types ne sont pas affichés). Ex. Parer un coup
   * (bouclier-r2) : (M) par défaut, et (G) à partir du rang 5 de la voie.
   */
  actionTypesFromRank?: { rank: number; actionTypes: ActionType[] };
  /** Texte de règles complet, verbatim. Reste la SOURCE, jamais perdu. */
  text: string;
  /**
   * Texte balisé pour l'affichage ENRICHI (PER-64, étendu PER-90), EN PLUS de
   * `text` (qui reste la source). Couche de PRÉSENTATION uniquement (distincte de
   * `effects`, qui nourrit le moteur). Mini-langage parsé par `parseRichText`
   * (cf. `src/lib/ui/featureRichText.ts` et `docs/extraction/rich-text-format.md`) :
   * - dé : `{1d4°}`, `{d6}`, `{2d6}` (entre accolades, notation du livre ; `°` =
   *   dé évolutif rendu à sa valeur au niveau courant). Le nombre de dés peut SCALER
   *   par rang de voie via des paliers `|C@R` (« passe à C dés au rang R ») :
   *   `{1d4°|2@4}`, `{2d4°|3@4|4@5}`, utilisable aussi en formule (`[1d4°|2@4 + INT]`).
   *   Quand la TAILLE du dé monte par rang, les paliers portent un dé complet `|CdF@R`
   *   (« passe à CdF au rang R ») : `{1d6|1d8@2|1d10@3|1d12@4|2d6@5}` (Poings de fer) ;
   * - formule de MODIFICATEUR : `[FOR + 1]`, `[CHA]`, `[1d4° + CHA]`, `[10 + rang]`,
   *   `[niveau × 3]` (entre crochets) — une suite de termes (caractéristique, dé,
   *   nombre, `rang`, `niveau`), chacun éventuellement multiplié par une constante
   *   (`CHA × 100`), séparés par `+`/`-`. Sans dé : calculée et affichée en encadré
   *   signé ; avec un dé : rendue dé(s) + variables résolues. `niveau` = niveau du
   *   personnage ; `rang` = rang ATTEINT dans la voie hôte (« son rang » dynamique),
   *   pas le rang figé de la capacité — un « rang du sort/de la cible » reste littéral.
   *   Un terme peut être la MEILLEURE de plusieurs caractéristiques (`FOR/AGI`, codes
   *   séparés de `/`) — substitution optionnelle, rendue à la carac la plus forte ;
   * - QUANTITÉ : `[=CHA]`, `[=CHA × 100]`, `[=rang]`, `[=niveau × 5]` (crochets
   *   préfixés de `=`) — même grammaire, mais rendue en VALEUR BRUTE (durée, portée,
   *   nombre de cibles), sans signe : « pendant [=CHA] minutes » → « 5 minutes » ;
   * - TERME NOMMÉ : `[#rang]`, `[#niveau]`, `[#INT]`, `[#AGI + 2]` (crochets préfixés
   *   de `#`) — expression DÉTERMINISTE employée comme SUBSTANTIF, rendue en encadré
   *   « symboles (valeur) » (teinte verte) : « égal au [#rang] » → « égal au rang (5) »,
   *   « égal à votre [#AGI + 2] » → « égal à votre AGI + 2 (4) ». À préférer à `[=…]`
   *   quand la prose garde un déterminant (« au rang », « votre AGI + 2 ») où un nombre
   *   nu (« au 5 », « votre 4 ») se lirait mal. Un dé y est refusé → littéral ;
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
   * Choix portés par cette capacité (PER-66), EN PLUS du `text` verbatim (qui
   * reste la source). Une entrée par choix indépendant ; la valeur retenue est
   * persistée sur le personnage (`Character.featureChoices`), alignée par
   * POSITION sur ce tableau. Absent = la capacité n'impose aucun choix.
   */
  choices?: FeatureChoice[];
  /**
   * Coût de base en points de mana pour LANCER ce sort — DÉROGATION explicite au
   * coût standard (PER-65). La règle générale (p. 228) est : « Lancer un sort
   * coûte un nombre de points de mana égal au rang de la capacité à laquelle il
   * est associé. » On ne duplique donc PAS le rang ici : le coût de base se
   * dérive du rang (cf. `spellManaCost`, `src/lib/engine/derived.ts`).
   *
   * Ce champ ne porte que les EXCEPTIONS INCONDITIONNELLES énoncées verbatim dans
   * le texte du sort :
   * - coût fixe différent du rang, sans condition ni mécanique dynamique ;
   * - sort réellement gratuit (« aucun coût de mana » sur le lancement lui-même)
   *   → `manaCost: 0`.
   *
   * À ce jour aucun sort du livre n'en a : les coûts « bizarres » rencontrés sont
   * tous des réductions DYNAMIQUES (Concentration, arme élémentaire, action de
   * mouvement, coût lié au NC de la cible…) qui se calculent PAR-DESSUS le coût de
   * base. Piège typique : Rune de garde (rang 5) annonce « coûte seulement 3 PM »,
   * mais c'est le rang − 2 dû à sa Concentration automatique (p. 228) — donc PAS
   * de `manaCost`, son coût de base reste 5.
   *
   * Absent = le coût suit la règle du rang. N'a de sens que si `isSpell`.
   * HORS PÉRIMÈTRE (ne PAS encoder ici) : les réductions DYNAMIQUES ci-dessus et
   * le surcoût d'armure (= bonus de DEF de l'armure, p. 178, milestone Armures).
   */
  manaCost?: number;
  /**
   * Surcoût en mana CROISSANT (PER-162) : le coût du sort augmente de `step` PM (défaut 1) à
   * chaque lancement jusqu'au `resetOn` (ex. Foudres divines / foi-r5 : +1 PM par lancement,
   * remis à 0 au repos court). S'ajoute PAR-DESSUS `manaCost`/rang, sans le modifier. Modèle isolé
   * (cf. `EscalatingManaCost`) : n'affecte pas les compteurs d'usages classiques. N'a de sens que
   * si `isSpell`. Absent = le coût ne croît pas à l'usage.
   */
  escalatingManaCost?: EscalatingManaCost;
  /**
   * Profil chiffré de la créature/compagnon octroyé(e) par la capacité (golem,
   * familier, démon, zombie…), EN PLUS du `text` verbatim. Rendu en mini-fiche
   * (`CreatureStatBlock`) plutôt qu'en bloc de stats recopié. Absent = la capacité
   * n'invoque pas de créature.
   */
  creatureProfile?: CreatureProfile;
  /**
   * Réduction de dégâts accordée par la capacité (« retranche 5 à tous les DM »,
   * « DM divisés par 2 »…), EN PLUS du `text` verbatim. PRÉPARATION : posée dans les
   * données, pas encore lue par le moteur (cf. `DamageReduction`). Absent = la
   * capacité n'accorde aucune RD modélisée.
   *
   * Peut porter PLUSIEURS entrées (tableau, PER-137) quand une capacité combine des modes
   * distincts — ex. Insensible au feu (immunité au feu ET ÷2 froid), Invulnérable (÷2 éléments,
   * puis immunité poison/maladie au rang 5). Chaque entrée est agrégée et affichée séparément.
   */
  damageReduction?: DamageReduction | DamageReduction[];
  /**
   * Plage de critique élargie accordée par la capacité (« 19-20 au lieu de 20 »), EN PLUS du
   * `text` verbatim (PER-133). Donnée d'affichage informatif (non lue par le moteur), rendue en
   * puce sous la carte Attaque au contact / à distance selon `scope`, sur le patron de la RD. Une
   * plage CONDITIONNÉE À L'ARME suit l'interrupteur d'un `conditional-stat-bonus` marqueur d'état
   * (cf. `CriticalRange`). Absent = la capacité n'élargit pas la plage de critique.
   */
  criticalRange?: CriticalRange;
  /**
   * Compteur d'usages limités (« utilisable N fois ») — déclare le maximum ; le
   * décompte courant est un état de jeu du personnage (`Character.usageCounters`).
   * Absent = la capacité n'a pas d'usage limité décompté.
   */
  usageCounter?: UsageCounter;
  /**
   * États préjudiciables que cette capacité peut infliger, chacun UNE SEULE FOIS par combat (Botte
   * secrète, spadassin-r5, p. 77), EN PLUS du `text` verbatim (PER-206). Rendu en boutons-bascule
   * (un par état) ; le marqueur « déjà infligé ce combat » de chaque état est suivi dans
   * `Character.usageCounters` sous une clé dérivée (`inflictedStateKey`, convention « absence =
   * disponible »). À DISTINGUER d'un `usageCounter` (compteur global sans distinction d'état). Absent
   * = la capacité n'inflige aucun état suivi.
   */
  inflictableStates?: InflictableStates;
  /**
   * REMPLACEMENT INCONDITIONNEL entre capacités d'une même voie : ids des capacités
   * que CETTE capacité, DÈS QU'ELLE EST ACQUISE, supplante définitivement (« la
   * panthère devient un animal fabuleux ou est remplacée par un félin plus grand » —
   * Grand félin/fauve-r4 remplace Panthère/fauve-r2, p. 115). À DISTINGUER de
   * `ConditionalStatBonusEffect.disablesFeatures`, qui est conditionnel à un
   * interrupteur ACTIF (exclusion mutuelle). Ici il n'y a pas d'interrupteur : la
   * capacité remplacée est grisée + accompagnée d'un message dès l'acquisition de la
   * remplaçante (le détail reste consultable). Absent = la capacité n'en remplace aucune.
   */
  replacesFeatures?: string[];
  /**
   * Capacités CITÉES à titre INDICATIF par cette capacité (Élixirs mineurs/majeurs,
   * p. 98 : « préparer des élixirs parmi Forme gazeuse, Maîtrise des éléments… »). La
   * recette REPRODUIT l'effet d'un sort d'une AUTRE voie sans que ce sort soit acquis ni
   * actif sur le personnage — à distinguer d'une capacité EMPRUNTÉE (choix
   * `feature-from-path`, réellement acquise). Rendu : chaque id est aussi balisé `[&id|nom]`
   * dans le `richText` (puce aux couleurs du profil source) ET déplié à la demande dans un
   * accordéon sous la description, montrant son texte enrichi (résolu sur les carac du
   * personnage) pour référence. Volontairement cross-voie. Absent = aucune citation dépliable.
   */
  referencedFeatures?: string[];
  /**
   * Pouvoirs EMPRUNTÉS par un artefact (PER-163) — Artefact étrange (forgesort, `artefacts-r5`,
   * p. 97) : cette capacité donne accès à plusieurs sorts d'AUTRES voies, chacun doté d'un DOUBLE
   * cycle d'état de jeu propre :
   *  - usage QUOTIDIEN : « chacune une fois par jour » → 1×/jour, rechargé au repos long ;
   *  - PANNE : à chaque utilisation le joueur lance 1d6 et, sur 1-2, l'artefact « ne fonctionne
   *    pas » pour CE pouvoir jusqu'à une réparation lors d'une récupération rapide → cassé, réparé
   *    au repos court (donc a fortiori au repos long).
   * À DISTINGUER de `referencedFeatures` (citation indicative SANS état de jeu) : ici chaque sort
   * porte un état suivi. L'état est stocké dans `Character.usageCounters` sous des clés dérivées
   * (`borrowedPowerUsedKey`/`borrowedPowerIntegrityKey`) suivant la convention « absence = plein »
   * (disponible / intact). Chaque id est aussi rendu en puce `[&id|nom]` dans le `richText` et déplié
   * en accordéon sous la description (comme `referencedFeatures`). Les cibles sont validées par
   * `validate-data`. Absent = la capacité n'emprunte aucun pouvoir cassable.
   */
  borrowedPowers?: string[];
  /**
   * SUBSTITUTIONS de caractéristique appliquées aux sorts que cette capacité REPRODUIT ou EMPRUNTE
   * (`referencedFeatures` + `borrowedPowers`), PER-163. Le forgesort lance ces sorts avec sa propre
   * caractéristique de magie (INT) au lieu de celle de l'auteur d'origine : ex. Forme éthérée (durée
   * en CHA de l'ensorceleur) via Artefact étrange → `[{ from: 'CHA', to: 'INT' }]` ; Masque du prédateur
   * (durée en PER du druide) via Élixirs majeurs → `[{ from: 'PER', to: 'INT' }]`. La substitution n'est
   * appliquée QUE si elle est bénéfique (`to` strictement supérieure à `from`) et est alors SIGNALÉE
   * par un avertissement à l'affichage. N'affecte que le rendu contextuel des sorts reproduits/empruntés,
   * jamais l'usage NORMAL du sort par sa classe d'origine. Absent = aucune substitution.
   */
  reproducedAbilitySubstitutions?: AbilitySubstitution[];
  /**
   * Marqueur de TRAVAIL EN COURS (badge « WIP » sur la carte) — suivi de relecture, pas une règle de
   * jeu. Présent quand la capacité dépend d'un ticket EXTÉRIEUR non terminé (ex. calcul de DEF de
   * Peau de pierre en attente de la milestone Armures, PER-131) : une partie de son effet n'est donc
   * pas encore branchée. La chaîne sert d'info-bulle (raison + ticket). Recensement systématique des
   * capacités concernées : PER-236 (milestone « Structuration des capacités »). Absent = rien.
   */
  wip?: string;
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

/**
 * Catégories d'« armes de prédilection » du maître d'armes (guerrier) — p. 88 : « épées, haches,
 * mains nues, masses, lances (épieu, lance, pique) et enfin armes de jet (dague de lancer, javelot,
 * etc.) ». C'est un classement PAR TYPE d'arme, distinct des `WEAPON_CATEGORIES` mécaniques
 * (légère / à une ou deux mains…). Les ids sont EXACTEMENT les options du choix `maitre-d-armes-r1`.
 * Le livre ne donne aucune liste pour « masses » (interprétation maison : armes contondantes hors
 * bâton — cf. `weaponFamilies` sur les armes) ; « bâton / bâton ferré » y est traité à part (p. 184)
 * et reste donc sans famille de prédilection.
 */
export const MASTER_AT_ARMS_CATEGORIES = [
  'swords',
  'axes',
  'unarmed',
  'maces',
  'polearms',
  'thrown',
] as const;
export type MasterAtArmsCategory = (typeof MASTER_AT_ARMS_CATEGORIES)[number];

/**
 * Familles d'armes SUPPLÉMENTAIRES, hors des catégories de prédilection du maître d'armes
 * (`MASTER_AT_ARMS_CATEGORIES`). `hammers` (« marteau de guerre ») isole le marteau des autres
 * armes contondantes (`maces` = masse, fléau, gourdin…) pour la capacité de peuple du nain
 * « Haches et marteaux » (PER-154, p. 59) : le nain ne gagne son bonus et sa maîtrise qu'avec une
 * hache ou un marteau de guerre, pas avec une masse. Le marteau reste AUSSI dans `maces` (une
 * prédilection « Masses » du maître d'armes le couvre toujours). Ces familles ne sont donc PAS des
 * options de prédilection : c'est une taxonomie d'arme, dont les catégories de prédilection sont un
 * sous-ensemble.
 */
export const EXTRA_WEAPON_FAMILIES = ['hammers'] as const;
export type WeaponFamily = MasterAtArmsCategory | (typeof EXTRA_WEAPON_FAMILIES)[number];

/**
 * Sous-type d'une arme d'attaque à DISTANCE (PER-115) — le livre ne le nomme pas comme une
 * catégorie formelle, mais plusieurs capacités ciblent un sous-type précis : Archer émérite
 * s'applique « à l'arc », sa variante « voie du lancer » aux « armes de jet (dague, hachette,
 * javelot) ». On distingue donc l'arc, l'arbalète, l'arme de jet, la fronde et l'arme à poudre
 * (table p. 185). Ne concerne que les armes `ranged: true` ; absent sur les armes de contact pures.
 */
export const RANGED_WEAPON_KINDS = ['bow', 'crossbow', 'thrown', 'sling', 'firearm'] as const;
export type RangedWeaponKind = (typeof RANGED_WEAPON_KINDS)[number];

/** Types de DM provoqués par les armes — p. 183 (colonne « Type de DM »). */
export const DAMAGE_TYPES = ['bludgeoning', 'piercing', 'slashing'] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export interface Weapon extends EquipmentBase {
  category: 'weapon';
  weaponCategory: WeaponCategory;
  /**
   * Familles d'« armes de prédilection » du maître d'armes auxquelles l'arme appartient (PER-136).
   * Sert aux capacités conditionnées au TYPE d'arme (Science du critique du guerrier, et à terme le
   * +1 att / +DM des armes de prédilection, PER-72). Une arme lançable cumule sa famille de contact
   * et `thrown` (ex. épieu = `['polearms', 'thrown']`). Absent = aucune catégorie de prédilection ne
   * s'applique (bâton/bâton ferré, stylet, armes sacrées, arcs/arbalètes/frondes/poudre). Cf.
   * `MASTER_AT_ARMS_CATEGORIES` et `EXTRA_WEAPON_FAMILIES` (ex. `hammers` = marteau de guerre).
   */
  weaponFamilies?: WeaponFamily[];
  /** L'arme est-elle une arme de contact, à distance, ou les deux (lancer) ? */
  melee: boolean;
  ranged: boolean;
  /** Dés de dommages STRUCTURÉS (PER-217), ex. `{ count: 1, die: 'd8' }`. */
  damage: WeaponDamage;
  /** DM à deux mains STRUCTURÉS pour les armes à une ou deux mains (PER-217). */
  twoHandedDamage?: WeaponDamage;
  /**
   * PLAGE DE CRITIQUE INTRINSÈQUE de l'arme (PER-225) — certaines armes élargissent le
   * critique par leur nature même (rapière, vivelame : 19-20 au lieu de 20, p. 183),
   * indépendamment de toute capacité. MÊME modèle que `Feature.criticalRange` : `value`
   * = points retranchés au seuil de 20 (1 → 19-20). `scope` explicite (`melee` pour une
   * arme de contact) pour rester générique. Sur une arme, `value` est un LITTÉRAL fixe
   * (pas de valeur scalante : une arme n'a pas de rang). Donnée d'affichage cumulée avec
   * les plages des capacités (`criticalRangeSources` → `combineCriticalRanges`), non
   * consommée par le moteur (aucun jet simulé). Champ GÉNÉRIQUE : une future arme à
   * critique élargi se déclare ici, sans code spécifique.
   */
  criticalRange?: CriticalRange;
  /**
   * Sous-type d'arme à distance (PER-115) — arc, arbalète, arme de jet, fronde, arme à poudre.
   * Requis sur une arme `ranged: true`, sinon absent. Sert à cibler les capacités qui ne dopent
   * qu'un sous-type précis (Archer émérite « à l'arc », sa variante « armes de jet »).
   */
  rangedKind?: RangedWeaponKind;
  /**
   * Équivalent arbalète de remplacement quand les armes à poudre sont interdites dans
   * l'univers (p. 62 / p. 185) — id d'une arme du catalogue de sous-type `crossbow`
   * (pétoire → arbalète de poing, mousquet → arbalète lourde). Renseigné UNIQUEMENT sur
   * les armes à poudre (`rangedKind: 'firearm'`), sinon absent. Représente en DONNÉE la
   * substitution du livre (PER-234), qui n'était jusqu'ici qu'une liste de noms en dur.
   */
  equivalentCrossbowId?: string;
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
  /**
   * Objet consommable (potion, parchemin…) : une utilisation dépense une unité.
   * Seuls ces objets exposent le bouton « Utiliser » sur la fiche ; absent = non
   * consommable (matériel durable, monture…). Voir `isConsumable`.
   */
  consumable?: boolean;
  /**
   * Emplacement d'équipement du matériel ÉQUIPABLE (PER-220). Absent = objet rangé
   * dans le sac, jamais « équipé » (torche… non, briquet, corde, ration, etc.) :
   *  - `'hand'` : tenu en main principale OU secondaire, comme une arme légère
   *    (torche, grimoire, instrument de musique — outils actifs tenus en main) ;
   *  - `'accessory'` : porté sur soi sans occuper de main (sac à dos, carquois…).
   * Note : tout objet portant un bonus de DEF magique (`magicDef`) reste équipable
   * en accessoire indépendamment de ce champ (objets enchantés, PER-85).
   */
  equipSlot?: 'hand' | 'accessory';
}

export type EquipmentItem = Weapon | Armor | Shield | Gear;
export type EquipmentCategory = EquipmentItem['category'];

// ---------------------------------------------------------------------------
// Panthéon d'Osgild — dieux du prêtre spécialiste (table p. 126-127)
// ---------------------------------------------------------------------------

/**
 * Divinité du panthéon d'Osgild (« Principales religions d'Osgild », p. 126-127).
 *
 * Sert au choix du prêtre **spécialiste** (héraut d'un seul dieu, p. 122) : il
 * MAÎTRISE l'arme sacrée de son dieu (exception à la restriction d'armes du prêtre
 * — câblage maîtrise différé à la milestone Armures, PER-96) et obtient une
 * CAPACITÉ DIVINE issue d'un autre profil, qui remplace une capacité de même rang
 * d'une voie de prêtre choisie. Pour le prêtre **généraliste**, cette liste n'est
 * qu'une inspiration (aucun effet mécanique).
 *
 * Convention (CLAUDE.md) : `id` = slug (clé de contenu persistée sur le personnage) ;
 * `name`/`domain`/`symbol` = français verbatim.
 */
export interface PriestGod {
  /** Id stable (slug du nom), ex. `'arcanna'`. Persisté sur le personnage. */
  id: string;
  /** Nom de la divinité (français), ex. « Arcanna ». */
  name: string;
  /** Domaine (français, verbatim), ex. « déesse de la magie blanche ». */
  domain: string;
  /** Symbole sacré (français, verbatim), ex. « une étoile ». */
  symbol: string;
  /**
   * Arme(s) sacrée(s) maîtrisée(s) par le spécialiste de ce dieu (ids d'équipement).
   * PLUSIEURS = choix du joueur (ex. arc long ou court ; faux ou rouleau/poêle).
   * Intégrité référentielle vérifiée par `validate:data`.
   */
  sacredWeaponIds: string[];
  /**
   * Capacité divine octroyée : feature d'un AUTRE profil (id), qui remplace une
   * capacité de même rang d'une voie de prêtre choisie (p. 122). Emprunt
   * déterministe — câblage de la feature « prêtre spécialiste » à venir.
   */
  divineFeatureId: string;
  sourcePage: SourcePage;
}

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

// ---------------------------------------------------------------------------
// Bestiaire — créatures du livre de base (PER-95)
// ---------------------------------------------------------------------------

/**
 * BESTIAIRE (chapitre 3 « Opposition », p. 259-303). Entité DISTINCTE du
 * `CreatureProfile` (qui décrit une créature OCTROYÉE par une capacité et résout
 * ses stats contre le personnage MAÎTRE) : une créature de bestiaire est un
 * adversaire AUTONOME à stats FIXES, lu directement depuis le bloc de stats du
 * livre. Textes affichés (nom, description, capacités) en français verbatim
 * (décision PRD #3) ; clés en anglais.
 *
 * Chaque BLOC de stats imprimé = une entrée `Creature`. Les variantes nommées
 * (« Grand mâle », « Chef gnoll », « Vampire ancien », « Cryohydre »…) sont des
 * entrées top-level à part entière reliées à leur base par `baseCreatureId`.
 *
 * Source : CBHS_06_Chroniques_Oubliees_2_web_v2.pdf, p. 259-303.
 */

/** Section du livre dont la créature provient (« Profils de créatures : … »). */
export const CREATURE_CATEGORIES = ['humanoides', 'animaux', 'creatures-fantastiques'] as const;
export type CreatureCategory = (typeof CREATURE_CATEGORIES)[number];

/** Catégorie de taille (table p. 260). */
export const CREATURE_SIZES = [
  'minuscule',
  'tres-petite',
  'petite',
  'moyenne',
  'grande',
  'enorme',
  'colossale',
] as const;
export type CreatureSize = (typeof CREATURE_SIZES)[number];

/** Type de créature (p. 259-261) ; une créature peut en cumuler deux (ex. humanoïde non vivant). */
export const CREATURE_NATURES = ['vivant', 'humanoide', 'vegetatif', 'non-vivant'] as const;
export type CreatureNature = (typeof CREATURE_NATURES)[number];

/**
 * Une attaque du bloc de stats, verbatim. Le livre l'écrit « Mode +bonus · DM dégâts »,
 * avec parfois « (N attaques) », une portée « (30 m) » et un effet accolé (« + poison »).
 */
export interface CreatureAttack {
  /** Mode d'attaque, verbatim (ex. « Morsure », « Morsure et griffes », « Attaque magique »). */
  name: string;
  /** Nombre d'attaques quand le livre précise « (N attaques) ». Absent = 1. */
  attackCount?: number;
  /** Bonus à l'attaque, verbatim (ex. « +3 »). Absent si le livre n'en donne pas. */
  bonus?: string;
  /** Portée d'une attaque à distance, verbatim (ex. « 30 m »). Absent = attaque au contact. */
  range?: string;
  /** Dégâts, verbatim (ex. « 1d6+1 », « 2d10+12 »). Absent si l'attaque n'inflige pas de DM chiffrés. */
  damage?: string;
  /** Effet additionnel accolé aux DM, verbatim (ex. « + poison », « + étreinte », « + 1d6 de froid »). */
  rider?: string;
}

/** Capacité spéciale : titre (marqueur d'action inclus) + texte de règle, verbatim. */
export interface CreatureSpecialAbility {
  /** Nom de la capacité, verbatim, marqueur d'action inclus (ex. « Charge (L) », « Souffle (L) »). */
  name: string;
  /** Texte de règle verbatim. */
  text: string;
}

export interface Creature {
  /** Slug FR unique (ex. 'loup', 'ours-brun', 'lion-grand-male'). */
  id: string;
  /** Nom affiché, verbatim (ex. « Loup », « Grand mâle »). */
  name: string;
  /** Section du livre. */
  category: CreatureCategory;
  /**
   * Niveau de créature (NC) — indicateur de puissance (p. 259). Valeur numérique
   * du NC principal imprimé (« 1/2 » → 0.5). Quand l'imprimé n'est pas un simple
   * nombre (NC conditionnel « 2 (3) », « 8+ », modificateur « +1 Niveau »), la
   * forme exacte est conservée dans `ncNote` et `nc` porte le nombre principal.
   * ABSENT pour une entrée GABARIT que le livre imprime sans NC ni bloc chiffré
   * (ex. « Zombie », p. 301 : recette générique appliquée à n'importe quelle
   * créature, dont deux exemples chiffrés dérivent via `baseCreatureId`).
   */
  nc?: number;
  /** NC verbatim quand il diffère d'un simple nombre (ex. « 2 (3) », « 8+ », « +1 Niveau »). */
  ncNote?: string;
  /** Taille. Absente si le livre n'en imprime pas (rare). */
  size?: CreatureSize;
  /** Type(s) de créature, depuis le badge du bloc (ex. « Créature non vivante · Taille grande »). */
  nature?: CreatureNature[];
  /** Paragraphe d'introduction/description imprimé avant/avec le bloc, verbatim. */
  description?: string;
  /**
   * Les 7 caractéristiques (valeurs fixes). Absentes quand la variante renvoie aux
   * caractéristiques de la base (« Voir ci-dessus ») → voir `baseCreatureId` / `sharedAbilitiesNote`.
   */
  abilities?: Record<AbilityId, number>;
  /** Caractéristiques marquées d'un « * » (dé bonus inné à leurs tests, hors attaque, p. 261). */
  bonusDieAbilities?: AbilityId[];
  /** Défense (valeur principale imprimée). */
  defense?: number;
  /** Précision entre parenthèses sur la DEF, verbatim (ex. « 16 » pour « Défense 13 (16) » du loup). */
  defenseNote?: string;
  /** Points de vigueur (valeur principale imprimée). */
  hitPoints?: number;
  /** Précision entre parenthèses sur les PV, verbatim (ex. « RD3 » pour « 90 (RD3) »). */
  hitPointsNote?: string;
  /** Initiative. */
  initiative?: number;
  /** Précision entre parenthèses sur l'Initiative, verbatim (ex. « 19 » pour « Initiative 14 (19) » du skrambler). */
  initiativeNote?: string;
  /** Attaques du bloc « gras » (les attaques de zone/souffle restent dans `specialAbilities`). */
  attacks?: CreatureAttack[];
  /** Capacités spéciales, verbatim. */
  specialAbilities?: CreatureSpecialAbility[];
  /** Variante d'une créature de base : id de la créature de base (ex. 'lion' pour « Grand mâle »). */
  baseCreatureId?: string;
  /** Renvoi verbatim aux capacités de la base (« Voir ci-dessus ») quand la variante ne les réimprime pas. */
  sharedAbilitiesNote?: string;
  sourcePage: SourcePage;
}
