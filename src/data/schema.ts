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
  | TestBonusEffect;

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
   * Caractéristique(s) gouvernante(s) : un test = d20 + carac + bonus de compétence.
   * PLUSIEURS quand le livre teste le domaine sur des caracs différentes selon la
   * situation (ex. équitation : CON pour l'endurance, CHA pour mener la monture — p. 233).
   * Le modificateur affiché retient alors la MEILLEURE carac du personnage (choix joueur).
   */
  abilities: AbilityId[];
  /** Page source quand le domaine provient d'un exemple/d'une capacité sourcé(e). */
  sourcePage?: SourcePage;
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
export type FeatureChoice = AbilityFeatureChoice | PathFeatureChoice | OptionFeatureChoice;
export type FeatureChoiceKind = FeatureChoice['kind'];

interface FeatureChoiceBase {
  /** Invite affichée au joueur (français), ex. « Caractéristique à augmenter ». */
  prompt: string;
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
}

/** Une option énumérée d'un `OptionFeatureChoice`. */
export interface FeatureChoiceOption {
  /** Id stable persisté sur le personnage (clé de contenu, en anglais). */
  id: string;
  /** Libellé affiché au joueur (français). */
  label: string;
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
  /** Les 7 caractéristiques (valeurs fixes de la créature). */
  abilities: Record<AbilityId, number>;
  /** Défense (S) : nombre fixe ou expression `richText` (« 10 + rang »). */
  defense: string;
  /** Points de vigueur (V) : expression `richText` (« niveau × 5 »). */
  hitPoints: string;
  /** Initiative (I) : nombre fixe (`richText`, ex. « 8 ») ou recopie d'une stat du maître. */
  initiative: string | MasterStatRef;
  /** Attaque, si la créature attaque : jet = stat dérivée du maître + DM (`richText`). */
  attack?: { fromMaster: DerivedStatId; damage: string };
  /** Particularités libres (déplacement, « trop petit pour attaquer »…). */
  note?: string;
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
  /** Nombre d'usages disponibles au départ (valeur la plus haute du compteur). */
  max: number;
  /** Libellé affiché (français). Défaut : « Usages restants ». */
  label?: string;
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
   * - TERME NOMMÉ : `[#rang]`, `[#niveau]` (crochets préfixés de `#`, `rang`/`niveau`
   *   SEULS) — `rang`/`niveau` employé comme SUBSTANTIF, rendu en encadré « mot (valeur) »
   *   (teinte verte) : « égal au [#rang] » → « égal au rang (5) ». À préférer à `[=rang]`
   *   quand la prose garde un déterminant (« au rang », « le rang … atteint dans la
   *   voie ») où un nombre nu (« au 5 ») se lirait mal ;
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
   */
  damageReduction?: DamageReduction;
  /**
   * Compteur d'usages limités (« utilisable N fois ») — déclare le maximum ; le
   * décompte courant est un état de jeu du personnage (`Character.usageCounters`).
   * Absent = la capacité n'a pas d'usage limité décompté.
   */
  usageCounter?: UsageCounter;
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
