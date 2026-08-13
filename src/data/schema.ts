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

import type { ItemIconId } from './item-icons';

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

/** Dés proposés à la saisie (jeu d'icônes polyédriques) — bourses de pièces, potions. */
export const DICE: Die[] = ['d4', 'd6', 'd8', 'd10', 'd12', 'd20'];

// ---------------------------------------------------------------------------
// Dégâts d'arme — modèle structuré (PER-217)
// ---------------------------------------------------------------------------

/**
 * Dé de DM d'une arme (PER-217). `Die` (d4…d20, jeu d'icônes) plus `d3`, présent
 * sur quelques armes (mains nues, stylet, lance-pierre — p. 183/185) mais absent
 * du jeu d'icônes polyédriques : il est rendu en texte, jamais en icône.
 */
export type DamageDie = Die | 'd3';

/** Dés proposés à la saisie incluant `d3` — DM d'arme, dés Fléau/Élément custom, potions. */
export const DAMAGE_DICE: DamageDie[] = ['d3', 'd4', 'd6', 'd8', 'd10', 'd12', 'd20'];

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
  /**
   * Dé ÉVOLUTIF (« ° », p. 43 : le dé qui fait son maximum est relancé et cumulé). Absent = dé
   * ordinaire. Aucune arme de la table p. 185 n'en a — c'est une arme OCTROYÉE par capacité qui
   * l'introduit : la couleuvrine (`artilleur-r5`, p. 63, « [5d4° + INT] DM »). Rendu par
   * `formatWeaponDamage` (« 5d4° ») puis par `<DamageValue>`, qui sait déjà dessiner le marqueur.
   */
  evolving?: boolean;
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
  /**
   * Capacités portant un CHOIX D'IDENTITÉ de peuple (`Feature.choices`, type `option`) posé à la
   * CRÉATION dans l'étape « Peuple » de l'assistant et éditable ensuite depuis le mode édition de la
   * section « Identité » de la fiche. Ces capacités ne sont PAS des rangs de voie (absentes des
   * `AncestryPath.featureIds`) : elles ne sont jamais rendues comme des capacités et ne comptent pas
   * comme rang. Ex. le type de souffle du drakonide (feu/froid/électricité/acide), qui alimente la RD
   * typée du rang 3 via `elementFromChoice`. Résolu identiquement par `getOptionSelections` quel que
   * soit le rang. Absent = le peuple n'a aucun choix d'identité de ce genre.
   */
  identityChoiceFeatureIds?: string[];
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
  /**
   * La voie EXIGE de manier une arme À DISTANCE d'un des SOUS-TYPES donnés (`RangedWeaponKind`)
   * pour que ses capacités fonctionnent (PER-74) — ex. Voie de l'archer arcanique (p. 137 :
   * « Les capacités issues de cette voie peuvent être déclinées pour un arc ou pour une
   * arbalète » → `['bow', 'crossbow']`). Miroir à distance de `requiresShield` : quand AUCUNE
   * arme à distance de ces sous-types n'est portée, toutes les capacités acquises de la voie
   * sont DÉSACTIVÉES (grisées + effets non comptés, cf. `rangedWeaponDisabledFeatureIds`) ;
   * équiper une telle arme les réactive AUTOMATIQUEMENT, sans interrupteur manuel. Absent =
   * aucune exigence d'arme à distance.
   */
  requiresRangedKinds?: RangedWeaponKind[];
  /**
   * La voie EXIGE de manier UNE ARME DANS CHAQUE MAIN (combat à deux armes) pour que ses capacités
   * fonctionnent (PER-74) — ex. Voie du combat à deux armes du rôdeur (p. 73 : « Les capacités de
   * cette voie nécessitent toutes l'usage d'une arme dans chaque main, à l'exception de Combattant
   * héroïque. »). Miroir de `requiresShield` : quand le personnage NE tient PAS deux armes (une par
   * main), les capacités concernées sont DÉSACTIVÉES (grisées + effets non comptés, cf.
   * `dualWieldDisabledFeatureIds`) ; tenir deux armes les réactive AUTOMATIQUEMENT. La détection
   * s'appuie sur `twoWeaponCombatStatus`. Absent/false = aucune exigence.
   */
  requiresDualWield?: boolean;
  /**
   * Capacités de cette voie EXEMPTÉES de `requiresDualWield` (elles fonctionnent sans deux armes en
   * main) — ex. « Combattant héroïque » (p. 73), un boost passif de caractéristique. Absent = aucune
   * exemption (toutes les capacités de la voie sont soumises à l'exigence).
   */
  dualWieldExemptFeatureIds?: string[];
  /**
   * La voie impose une ARMURE MAXIMALE pour que ses capacités fonctionnent (PER-74) — ex. Voie du
   * danseur de guerre (p. 150 : « Pour pouvoir utiliser les capacités de cette voie, le personnage
   * ne doit pas porter d'armure plus encombrante qu'une chemise de mailles. »). Id d'armure du
   * catalogue fixant le plafond (comparé en DEF MONDAINE, bonus magique exclu — la restriction porte
   * sur le TYPE d'armure, comme les plafonds de PROFIL, p. 178/188).
   *
   * Miroir de `requiresShield` : au-delà du plafond, toutes les capacités acquises de la voie sont
   * DÉSACTIVÉES (grisées + effets non comptés, cf. `pathArmorDisabledFeatureIds`) ; retirer/alléger
   * l'armure les réactive AUTOMATIQUEMENT, sans interrupteur manuel. À DISTINGUER des plafonds
   * portés par le PROFIL d'origine d'une capacité (PER-80/83/86, `maxArmorId` de `CharacterClass`) :
   * ici la contrainte est portée par LA VOIE, indépendamment du profil du personnage. Absent =
   * aucune contrainte d'armure propre à la voie.
   */
  maxArmorId?: string;
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
  /**
   * PER-370 — override RAW de la caractéristique de sort d'une voie de MYSTIQUE (p. 166 : « certaines
   * voies utilisent la VOL ou la PER : cela est voulu et, dans ce cas, un prêtre aura l'obligation
   * d'utiliser la caractéristique indiquée »). Verbatim de CETTE voie, remplace le CHA par défaut pour
   * TOUTES les classes (y compris druide/moine, dont le repli structurel est déjà PER). Absent = règle
   * générale (CHA, PER pour druide/moine). Sans effet hors `category: 'mystic'`. Résolu par
   * `mysticSpellAbility` (effects.ts).
   */
  mysticSpellAbility?: 'PER' | 'VOL';
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
  | StatBonusFromAbilityChoiceEffect
  | ConditionalStatBonusEffect
  | AbilityBonusEffect
  | AbilityBonusFromChoiceEffect
  | AbilityBonusFromFamiliarEffect
  | ActiveFormAbilityBonusEffect
  | AbilityBonusDieEffect
  | AbilityBonusDieFromChoiceEffect
  | LowHpTestDieEffect
  | LowHpAttackDieEffect
  | TestDieEffect
  | TestBonusEffect
  | TestBonusFromChoiceEffect
  | ManaAbilityOverrideEffect
  | UniversalTestBonusEffect
  | ImmunityEffect
  | ArmorAccessEffect
  | ArmorDefBonusEffect
  | ArmorPenaltyReductionEffect
  | HeavyArmorDefBonusEffect
  | TwoHandedWeaponDefBonusEffect
  | StaffDefBonusEffect
  | WeaponDamageBonusEffect
  | AttackBonusEffect
  | RangedAttackMagicalEffect
  | RangedAttackElementalEffect
  | BoundWeaponAttackDieEffect
  | WeaponAuraElementalEffect
  | ScalingDieTierBonusEffect
  | FinesseAttackEffect;

/**
 * Décale d'un ou plusieurs CRANS le dé évolutif (« d4° », table p. 43) du personnage :
 * le cran atteint au niveau courant est augmenté de `value` catégories dans la suite
 * d4 → d6 → d8 → d10 → d12 (ex. Capacité d'apprentissage du demi-elfe, Le Compagnon :
 * +1 cran → d6 au lieu de d4). Le moteur PLAFONNE au dernier cran (d12) : le passage
 * « d12 → 2d6 » au niveau 15 n'est pas exprimable dans le type `Die` (deux dés) et reste
 * appliqué à la table (verbatim de la capacité). S'applique à TOUS les dés évolutifs du
 * personnage (DM de capacités, dés bonus…), résolus par `scalingDie`.
 */
export interface ScalingDieTierBonusEffect {
  kind: 'scaling-die-tier-bonus';
  /** Nombre de crans ajoutés (entier positif ; +1 = une catégorie de dé). */
  value: number;
}

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
  | PathRankCountScalingValue
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
 * Valeur égale au NOMBRE DE RANGS ACQUIS dans la VOIE de la capacité hôte (× un
 * facteur), 0 si la voie est absente. À DISTINGUER de `path-rank` qui rend le NUMÉRO
 * du rang le plus élevé atteint : pour une voie numérotée normalement (rangs 1→5) les
 * deux coïncident, mais elles DIVERGENT sur la voie du familier fantastique, numérotée
 * 3→7 (anomalie du livre, capacité Familier de rang 3, p. 132). « Le familier transmet
 * une RD de 1 par rang de la voie » (Résistance, r5, p. 133) compte les rangs INVESTIS
 * (5 au sommet), et non le numéro 7. Utiliser ce scaling — et non `path-rank` — chaque
 * fois que le livre dit « par rang de la voie » sur une voie non numérotée à partir de 1.
 */
export interface PathRankCountScalingValue {
  scale: 'path-rank-count';
  /** Multiplicateur appliqué au nombre de rangs (défaut 1). */
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
 * Bonus PERMANENT à une stat DÉRIVÉE dont la VALEUR est la valeur (effective) d'une CARACTÉRISTIQUE
 * CHOISIE par le joueur sur la même capacité (choix `ability`). Ex. Provoquer la chance (elfe pâle,
 * Le Compagnon, r4) : « il ajoute sa PER ou sa VOL (au choix) à son nombre de PC » →
 * `{ kind: 'stat-bonus-from-ability-choice', stat: 'luckPoints', choiceIndex: 0 }` avec un choix
 * `ability` restreint à `['PER', 'VOL']`. Distinct d'`ability-bonus-from-choice` (qui ajoute une
 * CONSTANTE à la carac choisie) : ici on lit la VALEUR de la carac choisie et on l'ajoute à une stat
 * dérivée. Résolu depuis `Character.featureChoices` (carac choisie) + les caractéristiques effectives
 * du contexte (`ctx.abilities`). Sans sélection / sans contexte : aucune contribution.
 */
export interface StatBonusFromAbilityChoiceEffect {
  kind: 'stat-bonus-from-ability-choice';
  /** Stat dérivée visée (cf. `DERIVED_STAT_IDS`). */
  stat: DerivedStatId;
  /** Index du choix `ability` dans `Feature.choices` qui détermine la carac lue. En général 0. */
  choiceIndex: number;
  /** Multiplicateur appliqué à la valeur de la carac choisie (défaut 1). */
  factor?: number;
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
  /**
   * L'interrupteur est FORCÉ ACTIF tant que la monture CHEVAUCHÉE (`Character.mountedKey`) provient
   * d'une de ces OPTIONS de choix (PER-74, chevalier dragon r4, p. 147 : « Lorsqu'il porte les
   * insignes de son ordre **ou chevauche son drake**… »). Le livre énonce deux déclencheurs pour un
   * seul effet : l'un est un état libre que le joueur bascule (les insignes), l'autre se DÉDUIT de
   * l'état de jeu (la monture en selle). On modélise donc un OU à la LECTURE : `isEffectActive`
   * renvoie `true` dès que la monture qualifiante est chevauchée, SANS jamais écrire dans
   * `effectToggles` — l'interrupteur propre du joueur garde sa valeur, si bien que descendre de la
   * monture n'éteint pas des insignes délibérément portés.
   *
   * Les ids listés sont ceux d'`FeatureChoiceOption` (ex. `'drake'` pour Monture fantastique) : une
   * monture quelconque ne déclenche donc RIEN, seule celle que le livre nomme compte. Absent =
   * aucun forçage (interrupteur purement manuel). Résolu par `ridingQualifyingMount`.
   */
  autoActiveWhenRidingOptionIds?: string[];
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
  /**
   * GATING par ÉLÉMENT RÉSOLU de la capacité (PER-74, Métamorphose élémentaire, élémentaliste r8,
   * p. 157) : ce bonus, au sein d'un `ConditionalStatBonusEffect` partagé par PLUSIEURS branches
   * (une capacité, un seul interrupteur), ne compte que si l'élément de prédilection résolu
   * (`Feature.elementFromChoice` de LA MÊME capacité) vaut CE type précis — ex. « +3 DEF » ne
   * s'applique que sous la forme Terre, même si l'interrupteur « Forme élémentaire active » est
   * commun aux 4 branches. Absent = aucun gating par élément (cas d'usage historiques : un seul
   * déclencheur pour un seul bonus).
   */
  requiresElement?: ResistibleDamageType;
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
   * Tant que cet effet est ACTIF, confère un DÉ BONUS à TOUS les tests (les 7 caractéristiques, donc
   * chaque test de carac ET de compétence) — pas un bonus chiffré, un DÉ (« 2d20, garde le meilleur »).
   * Piloté par le MÊME interrupteur que `bonuses` (qui peut être vide : effet purement « dé bonus
   * conditionnel à tout »). Ex. L'amour du risque (casse-cou r6, p. 139) : « un dé bonus à tous ses
   * tests » en lieu dangereux, via l'interrupteur « Lieu dangereux ». À DISTINGUER de `testDieDomains`
   * (dés ciblant des domaines précis) et de `low-hp-test-die` (même dé « à tout » mais AUTO-déclenché
   * par les PV, sans interrupteur). Agrégé par `activeAllTestsDieSources` quand l'interrupteur est
   * actif, puis injecté sur les 7 caracs par la vue d'affichage. Absent = aucun.
   */
  allTestsDie?: boolean;
  /**
   * Tant que cet effet est ACTIF, le personnage IMPOSE un DÉ MALUS (« 2d20, garde le pire ») à tous les
   * jets d'ATTAQUE À DISTANCE qui le prennent pour cible (PER-74, Cape d'ombre r7, p. 139). Effet
   * DÉFENSIF SITUATIONNEL : il porte sur les jets de l'ADVERSAIRE, pas sur une stat du personnage — donc
   * AUCUNE valeur numérique sur la fiche. Rendu par un BADGE sous la carte Défense (variante 'ranged-malus')
   * quand l'interrupteur est actif. Piloté par le MÊME interrupteur que `bonuses`/`testDieDomains` (ici :
   * « Cape d'ombre déployée »). Agrégé par `activeRangedTargetMalusDieSources`. Absent = aucun.
   */
  imposesRangedTargetMalusDie?: boolean;
  /**
   * Domaines de test (ids du catalogue) recevant un BONUS DE COMPÉTENCE CHIFFRÉ (« rang + 2 »,
   * valeur déduite de la catégorie de voie comme un `TestBonusEffect` sans `value`) tant que cet
   * effet est ACTIF (PER-117). Pour les bonus de compétence CONDITIONNELS d'une situation de jeu
   * (ex. « en milieu naturel » : Survie/survie-r1, Éclaireur/traqueur-r1) — `bonuses` peut être
   * vide. Agrégé par `testBonusSources` via l'interrupteur. Absent = aucun.
   */
  testBonusDomains?: string[];
  /**
   * Valeur EXPLICITE du bonus de `testBonusDomains` (PER-74, Vision des ombres r4, p. 139 :
   * « +5 à ses tests de discrétion et de PER basés sur la vue » dans la pénombre). PRÉSENT →
   * override du fallback de catégorie (le prestige fixe vaut +5, alors que `2 + min(rang, 5)`
   * donnerait 7) ; symétrique du `value` explicite d'un `TestBonusEffect`. ABSENT → la valeur
   * reste déduite de la catégorie de la voie hôte (cas d'usage historique « rang + 2 »).
   * Constante ou scalante. Sans `testBonusDomains`, ce champ n'a aucun effet.
   */
  testBonusValue?: EffectValue;
  /**
   * DÉPENDANCE intra-capacité À SENS UNIQUE : index (dans `Feature.effects`) d'un effet dont CET
   * effet dépend — DÉSACTIVER l'effet référencé désactive aussi celui-ci (PER-109). Ex. Parade
   * croisée : le « bonus doublé » dépend de « une arme dans chaque main » (on ne double qu'un bonus
   * qu'on a) → éteindre le 1ᵉʳ éteint le 2ᵉ, mais pas l'inverse. Absent = aucune dépendance.
   */
  deactivatesWithEffectIndex?: number;
  /**
   * GATING par OPTION de choix de la MÊME capacité : cet effet (et son interrupteur) n'existe que si
   * l'option d'id `optionId` est retenue au choix `choiceIndex` de la capacité. Quand l'option n'est
   * PAS retenue, l'interrupteur n'est pas proposé (`FeatureEffectToggles`) et `isEffectActive` renvoie
   * toujours faux (l'effet est donc inactif même si un ancien état ON traînait dans `effectToggles`) —
   * les bonus qui en dépendent via `requiresActiveEffectIndex` (DM d'arme, mains nues) suivent. Ex.
   * drakonide-r4 : le buff « Fureur » n'existe que si l'option `fureur` (et non `ailes`) est choisie.
   * Absent = aucun gating par option (cas historique : effet toujours présent). Le choix visé doit
   * être un `OptionFeatureChoice` porté par la même capacité.
   */
  requiresChoiceOption?: { choiceIndex: number; optionId: string };
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
  /**
   * SURCHARGE ABSOLUE des caractéristiques du personnage tant que cet interrupteur est ACTIF (PER-74) :
   * une TRANSFORMATION qui impose un nouveau stat-block (ex. Transformation en loup, voie du lycanthrope
   * p. 131 : « FOR +3, AGI +1 » — « le personnage conserve toutes ses caractéristiques sauf celles-ci »).
   * Chaque entrée REMPLACE (SET, valeur absolue) la caractéristique homonyme — ce n'est PAS un delta — et
   * se répercute sur TOUTE la fiche (attaque, DM, DEF, tests, PV dérivés), via `effectiveAbilities`. Les
   * caractéristiques absentes gardent leur valeur normale. La surcharge ÉCRASE aussi les modificateurs
   * permanents (`ability-bonus`) de la caractéristique visée (la forme impose sa valeur). Distinct de
   * `bonuses` (stats dérivées) et de `abilityTestBonus` (jets seuls). Absent = pas de surcharge.
   */
  abilityOverrides?: Partial<Record<AbilityId, number>>;
  /**
   * Quand CET interrupteur est ACTIF, désactive TOUTES les capacités ACQUISES d'une voie de PROFIL
   * (`Path.type === 'class'`) du personnage — patron d'une TRANSFORMATION qui prive de l'accès aux
   * capacités de classe (PER-74, Métamorphose de la voie de l'ours, p. 152 : « ne peut plus utiliser
   * ses capacités de profil »). À DISTINGUER de `disablesFeatures` (liste EXPLICITE et fixe) : ici la
   * cible est TOUTE voie de type 'class' possédée, quel que soit le profil du personnage — le moteur
   * la découvre dynamiquement, sans lister d'id. Les voies d'ASCENDANCE et de PRESTIGE restent
   * utilisables (le verbatim ne les mentionne pas). Résolu par `profileFeaturesDisabledByTransformation`
   * (effects.ts), qui grise ces capacités ET les exclut des mods actifs. Absent = aucune capacité de
   * profil désactivée.
   */
  disablesProfileFeatures?: boolean;
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
 * Bonus de caractéristique dont la CIBLE dépend du FAMILIER FANTASTIQUE choisi au rang 3 de la voie
 * du familier fantastique (PER-74). Porté par le rang 7 (« Pouvoir supérieur ») : « +1 sur la valeur
 * de caractéristique indiquée dans la description du familier ». La carac visée n'est PAS un choix du
 * joueur mais une donnée de l'entité `FantasticFamiliar` retenue (`superiorPower.abilityBonus`, ex.
 * Animal céleste → CHA, Araignée géante → AGI). Le moteur lit le choix du rang 3
 * (`FANTASTIC_FAMILIAR_R3_ID`) via `familiarFromOptionId` et applique `value` à cette carac ; si aucun
 * familier n'est retenu, l'effet ne contribue à rien. Distinct d'`ability-bonus-from-choice` (qui lit
 * un choix `ability` de LA MÊME capacité).
 */
export interface AbilityBonusFromFamiliarEffect {
  kind: 'ability-bonus-from-familiar';
  /** Valeur ajoutée à la carac désignée par le familier (rang 7 : +1). */
  value: number;
}

/**
 * Bonus de caractéristique CONDITIONNEL EN DELTA, actif tant qu'AU MOINS UNE des transformations
 * référencées est active (PER-74, ex. lycanthrope « Forme puissante » r8 : « +2 en FOR sous forme de
 * loup OU d'hybride »). Contrairement à `abilityOverrides` d'un `conditional-stat-bonus` (qui IMPOSE une
 * valeur ABSOLUE), ce delta s'AJOUTE — et il est appliqué APRÈS les overrides dans `effectiveAbilities` :
 * sous forme de loup (FOR imposée à 3), un +2 porte le total à 5 ; sous forme hybride (aucun override),
 * il s'ajoute à la valeur de base. L'activation n'est PAS un interrupteur propre : elle SUIT les
 * interrupteurs d'AUTRES capacités (les formes), listés dans `whenAnyActive`. Distinct d'`ability-bonus`
 * (permanent) et d'`abilityOverrides` (absolu, propre à une forme).
 */
export interface ActiveFormAbilityBonusEffect {
  kind: 'active-form-ability-bonus';
  /** Deltas signés par caractéristique (ex. `{ FOR: 2 }`). */
  abilities: Partial<Record<AbilityId, number>>;
  /**
   * Interrupteurs de forme qui activent ce bonus : `{ featureId, index }` désigne un
   * `conditional-stat-bonus` (marqueur de forme) d'une AUTRE capacité. Le bonus compte dès qu'au
   * moins un de ces interrupteurs est actif (« loup OU hybride »).
   */
  whenAnyActive: { featureId: string; index: number }[];
  /**
   * GATING par ÉLÉMENT RÉSOLU de la capacité PORTEUSE (PER-74, Métamorphose élémentaire, élémentaliste
   * r8, p. 157) : ce delta ne compte que si l'élément de prédilection résolu (`Feature.elementFromChoice`
   * DE CETTE capacité, pas de celle référencée par `whenAnyActive`) vaut CE type précis — ex. « +3 FOR »
   * ne s'applique que sous la forme Terre, même si le même interrupteur « Forme élémentaire active »
   * est actif pour les 3 autres branches. Même sémantique que `DamageReduction.requiresElement`.
   * Absent = aucun gating par élément (cas d'usage historique du lycanthrope).
   */
  requiresElement?: ResistibleDamageType;
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
 * DÉ BONUS AUTO à TOUS les tests (attaque, caractéristique, compétence…) tant que les PV
 * COURANTS du personnage sont ≤ à son NIVEAU (casse-cou r4, « Au pied du mur », p. 138). À la
 * différence de `ability-bonus-die` (permanent, une carac), c'est un dé bonus UNIFORME sur les
 * 7 caractéristiques, CONDITIONNÉ à l'état de PV — mais AUTO-évalué depuis la jauge de PV, SANS
 * interrupteur manuel (contrairement à `conditional-stat-bonus`). Le seuil (PV ≤ niveau) est
 * implicite : ce genre ne porte aucun paramètre. Rendu = badge double-d20 sur chaque carac (donc
 * sur chaque test de carac et de compétence). Résolu par `lowHpTestDieSources` (effects.ts).
 */
export interface LowHpTestDieEffect {
  kind: 'low-hp-test-die';
}

/**
 * DÉ BONUS AUTO à toutes les ATTAQUES (contact, distance, magie) tant que les PV COURANTS du
 * personnage sont STRICTEMENT INFÉRIEURS à son NIVEAU (flibustier r8, « Pas de quartier », p. 142 :
 * « Il obtient les mêmes bonus à toutes ses attaques lorsqu'il lui reste moins de [niveau] PV »).
 * Analogue de `low-hp-test-die` (dé aux TESTS), mais ciblé sur les JETS D'ATTAQUE — donc rendu par un
 * `BonusDieBadge` sur les CARTES d'attaque (et non sur la grille de caracs). Seuil STRICT (« moins de »,
 * ≠ le `≤` de `low-hp-test-die`). AUTO-évalué depuis la jauge de PV, SANS interrupteur. Aucun paramètre.
 * Résolu par `lowHpAttackDieSources` (effects.ts).
 */
export interface LowHpAttackDieEffect {
  kind: 'low-hp-attack-die';
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
export const IMMUNITY_IDS = [
  'fear',
  'mind-control',
  'slowed',
  'immobilized',
  'magic-sleep',
  // PER-260 : états ajoutés au fil de la passe défensive du BESTIAIRE (`Creature.statusImmunities`).
  // Dragon des forêts (p. 274) : « immunisé au sommeil et à la paralysie » ; garde du corps
  // (p. 265) / garde animé : « immunisée aux états préjudiciables Surpris, Immobilisé, Renversé ».
  'paralyzed',
  'prone',
  'surprised',
  // Esprit impénétrable (magie de l'esprit r4, p. 161, PER-74/PER-365) : « immunisé à toutes les
  // tentatives de détection des mensonges, des sentiments ou des émotions… ne peut pas non plus être
  // localisé ou scruté par des moyens magiques ». Catégorie DÉTECTION/SCRYING, distincte des états de
  // combat ci-dessus mais même mécanique de badge (aucune logique de blocage automatique, purement
  // informatif — comme les 10 autres immunités).
  'magic-detection',
] as const;
export type ImmunityId = (typeof IMMUNITY_IDS)[number];

/** Libellés français des immunités (affichés au joueur). */
export const IMMUNITY_LABELS: Record<ImmunityId, string> = {
  fear: 'Peur',
  'mind-control': 'Charme / possession',
  slowed: 'Ralenti',
  immobilized: 'Immobilisé',
  // Force d'âme (elfe haut, elfe-haut-r2, p. 50) : « immunisé à la peur et au sommeil magique ».
  'magic-sleep': 'Sommeil magique',
  // PER-260 — libellés des états préjudiciables du glossaire (p. 214-215), cf. `STATUS_EFFECT_IDS`.
  paralyzed: 'Paralysé',
  prone: 'Renversé',
  surprised: 'Surpris',
  'magic-detection': 'Détection magique',
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

/**
 * Part CHIFFRÉE d'un état de combat (PER-277) — le « mécanique », par opposition au « comportemental »
 * (« aucune action », « touché automatiquement », « déplacement 5 m »…) qui reste géré à l'oral et
 * n'existe que dans le verbatim `effect`. Format PLAT et dédié (pas l'union `FeatureEffect`) : un état
 * n'a ni valeur scalante, ni condition, ni choix — juste des modificateurs constants. Réutilise le
 * vocabulaire du moteur (`DerivedStatId`) pour que la résolution produise un `DerivedMods` injectable
 * tel quel dans le calcul dérivé (tranches PER-280/281). Pour un état CUMULATIF (cf. `stacking`), les
 * valeurs numériques sont exprimées PAR PALIER d'intensité (le résolveur les multiplie par l'intensité).
 */
export interface StatusModifiers {
  /**
   * Modificateurs plats (signés, négatifs pour un préjudice) aux stats DÉRIVÉES, keyés par
   * `DerivedStatId` — la même forme que `DerivedMods`. Ex. Aveuglé → `{ def: -5, initiative: -5,
   * meleeAttack: -5, magicAttack: -5, rangedAttack: -10 }`. Absent = aucun modificateur de stat dérivée.
   */
  derived?: Partial<Record<DerivedStatId, number>>;
  /**
   * L'état impose un DÉ MALUS (« 2d20, garde le PIRE ») à TOUS les tests du combattant (Affaibli, p. 214).
   * Aucun primitif d'effet existant ne convient (`allTestsDie`/`test-die`/`low-hp-test-die` sont des dés
   * BONUS) : d'où ce drapeau dédié. Le rendu viendra avec les tranches d'UI. Absent = pas de dé malus.
   */
  allTestsMalusDie?: boolean;
  /**
   * Dé malus (« garde le pire ») limité aux tests d'ATTAQUE (Immobilisé, p. 214 : « dé malus aux tests
   * d'attaque »). Distinct de `allTestsMalusDie` (tous les tests). Absent = pas de dé malus d'attaque.
   */
  attackTestsMalusDie?: boolean;
  /**
   * Modificateur CHIFFRÉ PLAT (pas un dé) à TOUS les tests, PAR PALIER d'intensité. SIGNÉ : négatif pour
   * un préjudice — Attaque invalidante (p. 140, « -1 à tous les tests … jusqu'à -3 »), combiné à
   * `stacking: { max: 3 }`, donne −1/−2/−3 —, POSITIF pour un buff (PER-104) — Chant des héros (p. 67)
   * et Bénédiction (p. 124), `+1` combiné à `stacking: { max: 2 }`, donnent +1/+2. Absent = 0.
   *
   * « Tous les tests » couvre à la fois les tests de CARACTÉRISTIQUE et les trois jets d'ATTAQUE
   * (leurs jets SONT des tests) : les deux ventilations sont faites par `statusSheetImpact`.
   */
  allTestsFlat?: number;
  /**
   * Modificateur CHIFFRÉ PLAT aux DM INFLIGÉS par le combattant, PAR PALIER d'intensité. SIGNÉ :
   * négatif pour un préjudice — Attaque invalidante (p. 140, « … et aux DM infligés par la cible ») —,
   * positif pour un buff (PER-359) — Aura du chef de guerre (p. 161, « +1 en DEF et aux DM »). Absent = 0.
   *
   * Ne porte QUE des DM plats : un bonus de DM en DÉ (« +1d4° DM » de Charge fantastique p. 86 ou
   * d'Arme de lumière p. 123) n'est PAS exprimable ici et reste, à ce jour, du verbatim.
   */
  damageDealt?: number;
  /**
   * Bonus/malus CHIFFRÉ PLAT limité à certains DOMAINES de test (PER-359), PAR PALIER d'intensité —
   * là où `allTestsFlat` frappe TOUS les tests sans distinction. Deux capacités du livre en ont besoin,
   * toutes deux au bénéfice des alliés :
   *  - Sans peur (chevalier, `meneur-d-hommes-r1`, p. 85) : « un bonus égal à son CHA aux tests de tous
   *    ses alliés » contre les effets de peur → domaine `fear-resistance` ;
   *  - Argument de taille (barbare, `brute-r1`, p. 79) : la FOR du barbare s'ajoute aux tests « de
   *    négociation, de persuasion ou d'intimidation » de ses alliés au contact.
   *
   * `domains` = ids du catalogue `src/data/test-domains.ts` (intégrité vérifiée par `validate:data`),
   * même convention que `TestBonusEffect.domains`. Plusieurs domaines reçoivent la MÊME valeur, le
   * livre les groupant par énumération. Absent = l'état ne vise aucun domaine en particulier.
   */
  testDomains?: { domains: string[]; value: number };
}

/**
 * Une entrée du catalogue des états : libellé FR, effet VERBATIM du glossaire, page source, et
 * (PER-277) la part CHIFFRÉE structurée (`modifiers`) + le mode de cumul (`stacking`).
 */
export interface StatusEffectEntry {
  /** Libellé français (nom de l'état, tel qu'affiché). */
  label: string;
  /** Effet VERBATIM du glossaire CO2 (p. 214-215), rendu dans les info-bulles. */
  effect: string;
  /** Page du livre de base où l'état est défini. */
  sourcePage: number;
  /**
   * Part CHIFFRÉE de l'état, réellement appliquée aux stats calculées (PER-277). ABSENT = état
   * PUREMENT comportemental (ex. Essoufflé, Invalide, Ralenti, Paralysé) : rien à calculer, tout est
   * dans le verbatim `effect`. Le verbatim reste TOUJOURS la source des clauses comportementales.
   */
  modifiers?: StatusModifiers;
  /**
   * Mode de CUMUL (PER-277). ABSENT = état BINAIRE (présent/absent — les 10 états du glossaire).
   * PRÉSENT = état CUMULATIF avec un compteur d'intensité plafonné à `max` (effets situationnels, ex.
   * Attaque invalidante ×1→×3) ; les valeurs numériques de `modifiers` sont alors PAR PALIER.
   */
  stacking?: { max: number };
  /**
   * PORTÉE de l'effet (PER-104, élargie par PER-359). ABSENT = INDIVIDUEL : l'effet se pose sur UN
   * combattant, celui de la carte survolée (tous les états préjudiciables, situationnels et
   * d'environnement). Deux valeurs ouvrent au contraire la fenêtre de pose sur le CAMP du porteur :
   *  - `'group'` : la règle vise « ses alliés et lui » (Chant des héros p. 67, Bénédiction p. 124,
   *    Aura du chef de guerre p. 161) → cases à cocher, tout le camp coché par défaut ;
   *  - `'single-ally'` : la règle ne vise qu'UN allié désigné (Protéger un allié p. 87) → choix
   *    EXCLUSIF d'un seul combattant, et rien n'est coché d'avance.
   *
   * La distinction est bien une affaire de RÈGLE et non de commodité : cocher tout le camp pour un
   * « un allié à son contact » ferait dire au livre ce qu'il ne dit pas.
   *
   * Ce champ décrit la RÈGLE, pas le stockage : côté état de combat, un buff reste une entrée
   * `AppliedStatus` par combattant — c'est la POSE qui est collective (`applyStatusToKeys`).
   */
  scope?: 'group' | 'single-ally';
  /**
   * Le LANCEUR est-il EXCLU du bénéfice (PER-359) ? Le livre distingue nettement deux formulations,
   * et l'application doit les distinguer aussi :
   *  - « ses alliés ET LUI » (Chant des héros p. 67, Bénédiction p. 124) → le porteur en profite,
   *    drapeau ABSENT ;
   *  - « TOUS VOS ALLIÉS » (Aura du chef de guerre p. 161), « ses alliés » (Sans peur p. 85, Argument
   *    de taille p. 79), « un allié » (Protéger un allié p. 87) → le porteur est hors du bénéfice,
   *    drapeau à `true`.
   *
   * Conséquence concrète : la fenêtre de pose ne coche PAS le lanceur d'avance, et la cible unique ne
   * le propose pas du tout. L'enjeu n'est pas cosmétique — le barbare d'Argument de taille possède
   * DÉJÀ le bonus par ses propres `effects` : le lui poser en plus le compterait DEUX FOIS, exactement
   * le travers que PER-314 a corrigé pour les buffs à interrupteur.
   */
  excludesCarrier?: boolean;
  /**
   * D'OÙ SORT LE PALIER du buff (PER-359) — c'est-à-dire l'intensité que la fenêtre de pose
   * pré-remplit, les valeurs de `modifiers` étant exprimées PAR PALIER. Le MJ n'arbitre pas : la
   * règle donne toujours le chiffre, encore faut-il dire où le lire. Trois provenances, une par
   * gabarit rencontré dans le livre :
   *  - `path-rank` : +1, puis 2 paliers à partir du rang `rank` de la voie PORTEUSE — gabarit des
   *    deux premiers buffs (« Le bonus passe à +2 au rang 5 », p. 67 et p. 124) ;
   *  - `character-level` : idem mais sur le NIVEAU du personnage — Aura du chef de guerre (p. 161,
   *    « À partir du niveau 16, ce bonus passe à +2 »), dont l'escalade ne suit pas le rang de voie ;
   *  - `ability` : le palier EST la valeur d'une caractéristique du LANCEUR — Sans peur (p. 85,
   *    « un bonus égal à son CHA ») et Argument de taille (p. 79, « ajoute sa FOR »). `modifiers`
   *    vaut alors 1 par palier, et `stacking.max` doit couvrir le maximum de la carac (`ABILITY_MAX`).
   *
   * ABSENT = état non escaladant (palier 1), cas de tous les états subis et de Protéger un allié
   * (« +2 de DEF », valeur fixe portée directement par `modifiers`).
   */
  intensityFrom?:
    | { kind: 'path-rank'; rank: number }
    | { kind: 'character-level'; level: number }
    | { kind: 'ability'; ability: AbilityId };
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
    // « attaque » générique = -5 (contact/magie) ; « attaque à distance » = -10 (total, remplace le -5).
    // L'impossibilité des attaques magiques à vue reste comportementale (verbatim).
    modifiers: {
      derived: { initiative: -5, def: -5, meleeAttack: -5, magicAttack: -5, rangedAttack: -10 },
    },
  },
  weakened: {
    label: 'Affaibli',
    effect: 'Dé malus à tous les tests.',
    sourcePage: 214,
    modifiers: { allTestsMalusDie: true },
  },
  winded: {
    label: 'Essoufflé',
    // Purement comportemental (déplacement) : aucun modificateur chiffré.
    effect: 'Le déplacement est limité à 5 m par action de mouvement.',
    sourcePage: 214,
  },
  dazed: {
    label: 'Étourdi',
    // « Aucune action possible » = comportemental ; seul le -5 en DEF est chiffré.
    effect: 'Aucune action possible et -5 en DEF.',
    sourcePage: 214,
    modifiers: { derived: { def: -5 } },
  },
  immobilized: {
    label: 'Immobilisé',
    // « Pas de déplacement » = comportemental ; « dé malus aux tests d'attaque » = chiffré.
    effect: "Pas de déplacement et dé malus aux tests d'attaque.",
    sourcePage: 214,
    modifiers: { attackTestsMalusDie: true },
  },
  crippled: {
    label: 'Invalide',
    // Purement comportemental (déplacement) : aucun modificateur chiffré.
    effect: 'Le déplacement est limité à 5 m par action de mouvement.',
    sourcePage: 214,
  },
  paralyzed: {
    label: 'Paralysé',
    // Entièrement comportemental (aucune action, touché automatiquement, critique) : rien de chiffré.
    effect: "Aucune action possible, en cas d'attaque touché automatiquement et subit un critique.",
    sourcePage: 215,
  },
  slowed: {
    label: 'Ralenti',
    // Purement comportemental (économie d'actions) : aucun modificateur chiffré.
    effect: "Une seule action par round (action d'attaque ou de mouvement).",
    sourcePage: 215,
  },
  prone: {
    label: 'Renversé',
    // « -5 en attaque et DEF » = chiffré ; « se relever » = comportemental.
    effect: "-5 en attaque et DEF, nécessite une action d'attaque pour se relever.",
    sourcePage: 215,
    modifiers: { derived: { def: -5, meleeAttack: -5, rangedAttack: -5, magicAttack: -5 } },
  },
  surprised: {
    label: 'Surpris',
    // « Pas d'action » + « au premier round » = comportemental ; seul le -5 en DEF est chiffré.
    effect: 'Pas d’action et -5 en DEF au premier round de combat.',
    sourcePage: 215,
    modifiers: { derived: { def: -5 } },
  },
};

/** Libellés français des états préjudiciables (affichés au joueur). Dérivé de `STATUS_EFFECTS`. */
export const STATUS_EFFECT_LABELS: Record<StatusEffectId, string> = Object.fromEntries(
  STATUS_EFFECT_IDS.map((id) => [id, STATUS_EFFECTS[id].label]),
) as Record<StatusEffectId, string>;

/**
 * EFFETS SITUATIONNELS (PER-74 première entrée, taxonomie figée par PER-288). MÊME schéma qu'un état
 * préjudiciable (`StatusEffectEntry` : libellé FR + effet verbatim + page source) mais catalogue DISTINCT
 * et OUVERT. Il complète — sans les remplacer — les DEUX autres familles conceptuelles d'effets négatifs
 * du jeu ; bien situer un effet dans l'une des trois évite d'en dupliquer la mécanique :
 *
 *   (a) ÉTATS DU GLOSSAIRE — les 10 états fermés p. 214-215 (`STATUS_EFFECTS`). Vocabulaire UNIVERSEL,
 *       chiffrage porté par `StatusModifiers`. Une capacité qui inflige l'un d'eux le route via le champ
 *       `inflictableStates` (bascule « déjà infligé ce combat ») ; elle N'a PAS d'entrée ici.
 *   (b) EFFETS SITUATIONNELS NOMMÉS — CE catalogue, et SON SEUL contenu légitime : les malus/effets à
 *       mécanique PROPRE conférés par une capacité de voie, NON réductibles à un état de base.
 *   (c) MODIFICATEURS DE CIRCONSTANCE — couvert, portée longue, visibilité, désarmement, poussée… (cf.
 *       PER-40). Conditions de la scène, pas des états infligés : HORS de ce catalogue. Ceux d'entre eux
 *       qui se SUIVENT par combattant sur la durée d'une scène (ex. « Combat aquatique », p. 215) ont
 *       leur propre catalogue, `ENVIRONMENTAL_EFFECTS`.
 *
 * CRITÈRE D'ADMISSION STRICT (PER-288) : un effet qui se réduit MÉCANIQUEMENT à un état de base — « Cécité »
 * = Aveuglé ; « dé malus à tous les tests » = Affaibli — route vers l'état de base via `inflictableStates`
 * et n'obtient PAS d'entrée situationnelle. N'entre ici QUE l'effet à mécanique propre (ex. « Attaque
 * invalidante », chasseur de prime r7 p. 140 : malus PLAT cumulatif de -1 à tous les tests + aux DM
 * infligés, jusqu'à -3 — aucun état de base ne fait un malus chiffré PLAT, Affaibli étant un *dé*).
 *
 * DoT = COMPORTEMENTAL (PER-288) : saignement / poison / asphyxie ne sont PAS chiffrés (on n'étend pas
 * `StatusModifiers`). Verbatim seul, DM appliqués à l'oral par le MJ — comme toute clause comportementale.
 *
 * Destinés à être APPLIQUÉS/SUIVIS dans le Combat Tracker : le catalogue est la source unique, la
 * mécanique d'application vit ailleurs. La liste s'étoffe au fil des voies (peuplement PER-289→291).
 */
export const SITUATIONAL_EFFECT_IDS = [
  'invalidating-attack',
  'silenced',
  'locust-swarm',
  'insect-swarm',
  'bleeding',
  'internal-hemorrhage',
  'grievous-wounds',
  'frightened',
  'polymorphed',
  'unconscious',
  'cursed',
  'burning',
  'fascinated',
  'imprisoned',
  'mind-controlled',
  'time-displaced',
  'hypnotized',
] as const;
export type SituationalEffectId = (typeof SITUATIONAL_EFFECT_IDS)[number];

/** Catalogue des effets situationnels. Effet recopié VERBATIM de la capacité source. */
export const SITUATIONAL_EFFECTS: Record<SituationalEffectId, StatusEffectEntry> = {
  'invalidating-attack': {
    label: 'Attaque invalidante',
    effect:
      "Malus cumulatif de -1 à tous les tests et aux DM infligés par la cible pour le reste du combat, jusqu'à un cumul maximal de -3.",
    sourcePage: 140,
    // CUMULATIF : -1 PAR PALIER (le résolveur multiplie par l'intensité), plafonné à 3 paliers (-3).
    modifiers: { allTestsFlat: -1, damageDealt: -1 },
    stacking: { max: 3 },
  },
  // « Faire taire » (tueur à gages, r4, p. 145). Effet PUREMENT comportemental (la cible ne peut plus
  // parler) : rien à chiffrer sur les stats du porteur de l'état. Le « dé malus » ne frappe QUE les
  // lanceurs de sorts muets (sur l'attaque magique) et reste dans le verbatim (aucun champ de
  // `StatusModifiers` ne cible l'attaque magique seule, et l'effet est conditionnel au type de cible).
  silenced: {
    label: 'Muet',
    effect:
      "La cible est rendue muette : elle ne peut plus parler ni appeler à l'aide. À la fin de son tour à chaque round, elle peut faire un test de CON pour retrouver l'usage de la parole. Un lanceur de sort muet subit un dé malus à ses tests d'attaque magique (ou peut choisir d'utiliser la magie discrète, règle de concentration).",
    sourcePage: 145,
  },
  // « Nuées de criquets » (vermines, r5, p. 175). NON cumulatif (nuée = intensité 1) : le malus PLAT de
  // -3 à toutes les actions s'applique UNE seule fois. Le DoT (« 2 DM par tour ») reste comportemental
  // (verbatim seul, appliqué à l'oral) — on ne chiffre pas les DM (cf. « DoT = comportemental », PER-288).
  'locust-swarm': {
    label: 'Nuée de criquets',
    effect:
      "S'il réussit un test opposé d'attaque magique (portée 20 m), le personnage libère sur sa cible une nuée de criquets affamés qui la dévorent pendant [5 + CHA] rounds. La victime subit 2 DM par tour et un malus de -3 à toutes ses actions. Les DM de zone détruisent la nuée (minimum 1 DM).",
    sourcePage: 175,
    modifiers: { allTestsFlat: -3 },
  },
  // « Nuée d'insectes » (druide, voie des animaux, r3, p. 114). NON cumulatif : le malus PLAT de -2 à tous
  // les tests s'applique UNE seule fois. Le DoT (« 1 DM par round ») et l'aveuglement décrit restent
  // comportementaux (verbatim seul) — non chiffrés (cf. « DoT = comportemental », PER-288).
  'insect-swarm': {
    label: "Nuée d'insectes",
    effect:
      "En réussissant un test d'attaque magique contre la DEF de sa cible (portée 20 m), le druide libère sur celle-ci une nuée d'insectes volants qui piquent, aveuglent et la suivent pendant [3 + PER] rounds. La victime subit 1 DM par round et un malus de -2 à tous les tests. Les DM de zone détruisent la nuée.",
    sourcePage: 114,
    modifiers: { allTestsFlat: -2 },
  },
  // « Armes dentelées » (écorcheur r4, p. 150). DoT PUR (aucun malus de test) : rien à chiffrer
  // (cf. « DoT = comportemental », PER-288). L'escalade 1→2 DM au rang 8 de la voie hôte et la
  // condition d'arrêt (soins ou action limitée + test d'AGI 10) restent dans le verbatim.
  bleeding: {
    label: 'Saignement',
    effect:
      "La victime subit 1 DM par round pour le reste du combat (2 DM à partir du rang 8 de la voie de l'écorcheur). Pour stopper l'hémorragie, elle doit recevoir des soins, ou prendre une action limitée et réussir un test d'AGI difficulté 10. Ne se cumule pas.",
    sourcePage: 150,
  },
  // « Hémorragie interne » (écorcheur r7, p. 151). DoT déclenché par un critique, durée fixe de 3
  // rounds ; PUR (aucun malus de test) : rien à chiffrer (cf. « DoT = comportemental », PER-288).
  'internal-hemorrhage': {
    label: 'Hémorragie interne',
    effect:
      "À la suite d'un critique, la victime subit 1d4° DM supplémentaires à chaque round suivant, pendant 3 rounds.",
    sourcePage: 151,
  },
  // « Blessures affreuses » (écorcheur r6, p. 151). Pas un DoT (aucun DM en soi) : une pénalité de
  // GUÉRISON durable sur les blessures que ce personnage a infligées. Aucun modifier chiffré (le
  // moteur ne calcule pas les soins reçus par un tiers) — verbatim seul, rappel pour le MJ.
  'grievous-wounds': {
    label: 'Blessures affreuses',
    effect:
      "Les effets de soins ou de régénération appliqués aux DM infligés par les attaques au contact de ce personnage sont divisés par 2.",
    sourcePage: 151,
  },
  // « Grondement » (voie de l'ours, r4, p. 151). Effet PUREMENT comportemental (la cible s'enfuit en
  // courant) : aucun état de base ne représente une fuite forcée (ni Ralenti, ni Immobilisé — c'est
  // l'inverse). Le test de VOL et la durée restent dans le verbatim/richText de la capacité source.
  frightened: {
    label: 'Effrayé',
    effect:
      "La cible échoue à un test de VOL contre un grondement terrifiant et s'enfuit en courant pendant 1d4 rounds.",
    sourcePage: 151,
  },
  // « Métamorphose d'autrui » (archimage r8, p. 155). Aucun des 10 états du glossaire ne représente
  // une transformation physique en animal (durée variable par NC, PV réduits, retour à la forme
  // initiale à 0 PV) → mécanique PROPRE, admissible (PER-288). PUREMENT comportemental (aucun
  // `modifiers` : les stats du personnage TRANSFORMÉ sont celles décrites dans le texte du sort, pas
  // un modificateur générique appliqué au porteur).
  polymorphed: {
    label: 'Métamorphosé',
    effect:
      "Transformé en un animal de taille petite ou inférieure (1-2 PV). Retour à la forme initiale si réduit à 0 PV (test de CON difficulté 10, échec = mort) ou à l'expiration de la durée (dépend du NC de la cible, de permanent à 1 round).",
    sourcePage: 155,
  },
  // « Arc-en-ciel » (voie du chaos, r4, p. 155, et son AoE « Explosion multicolore » r7). Aucun des 10
  // états du glossaire ne représente l'inconscience (distincte d'« assommé », déduit des PV via
  // `hpHealthState` — cf. statusEffects.ts) → mécanique PROPRE, admissible (PER-288). Les deux autres
  // paliers de la même capacité (aveuglé/affaibli) restent SANS tag : ce sont des états de base déjà
  // auto-glosés dans le verbatim, et la capacité est répétable (pas de cap « 1×/combat », PER-290).
  unconscious: {
    label: 'Inconscient',
    effect: "Rendue inconsciente par le rayon (ou l'explosion) arc-en-ciel, pour la durée indiquée par le sort.",
    sourcePage: 155,
  },
  // « Malédiction » (sorcier, voie du démon, r1, p. 108). Dé malus (comme Affaibli), mais NON réductible
  // à cet état de base : la durée se compte en NOMBRE DE TESTS (1 ou 3 selon l'action d'incantation),
  // pas en rounds, et s'arrête d'elle-même une fois ces tests faits — Affaibli, lui, dure tant que les PV
  // ne remontent pas au-dessus de 1. Mécanique PROPRE, admissible (PER-288). Le nombre de tests couverts
  // et le plafond « 1×/combat par cible » restent COMPORTEMENTAUX (verbatim seul, décompte à l'oral par
  // le MJ) : aucun champ de `StatusModifiers` ne borne un dé malus à un nombre de tests.
  cursed: {
    label: 'Maudit',
    effect:
      "Le sorcier effectue un test opposé d'attaque magique contre une cible à moins de 20 m. En cas de succès, si l'incantation était une action de mouvement (M), la victime subit un dé malus à son prochain test. Si l'incantation était une action limitée (L), le dé malus s'applique à ses 3 prochains tests. Dans tous les cas, la cible ne peut subir les effets de ce sort qu'une fois par combat.",
    sourcePage: 108,
    modifiers: { allTestsMalusDie: true },
  },
  // « Flèche de feu » (magicien, voie de la magie destructrice, r3, p. 104). DoT PUR déclenché par le
  // sort (aucun malus de test) : rien à chiffrer (cf. « DoT = comportemental », PER-288). Le décompte
  // (1d6/round), la condition d'arrêt (résultat 1 ou 2) et le non-cumul si relancé restent COMPORTEMENTAUX
  // (verbatim seul, décompte à l'oral par le MJ) — même traitement que `bleeding` / `internal-hemorrhage`.
  burning: {
    label: 'En flammes',
    effect:
      "Chaque round de combat suivant, le feu inflige 1d6 DM supplémentaires à la cible. Sur un résultat de 1 ou 2, le sort prend fin. Les DM sur la durée ne sont pas cumulables si le sort est lancé plusieurs fois.",
    sourcePage: 104,
  },
  // « Chant fascinant » (magie des mots, r4, p. 162). Entièrement comportemental (cesse toute
  // activité, suit le chanteur, rien de chiffrable) : rien dans `StatusModifiers` ne représente
  // une fascination. Le NC maximal affecté (qui augmente avec le rang) et la durée restent verbatim.
  fascinated: {
    label: 'Fasciné',
    effect:
      "Cesse toute activité et suit le lanceur du sort tant que celui-ci continue de chanter (une action de mouvement à chaque round), pour une durée maximale de [1d6 + INT] minutes. Une créature blessée reprend immédiatement ses esprits et devient immunisée pendant 24 h.",
    sourcePage: 162,
  },
  // « Prison mentale » (magie de l'esprit, r6, p. 162). Entièrement comportemental (retrait effectif
  // du combat) : la table de durée par NC et le fait d'être « hors jeu » ne sont chiffrables par
  // aucun `StatusModifiers` (le moteur ne modélise pas le retrait d'un combattant). Arbitrage
  // propriétaire 2026-08-11 : posé pour le suivi à l'écran MJ malgré l'absence d'effet chiffré.
  imprisoned: {
    label: 'Emprisonné',
    effect:
      "Enfermé dans un labyrinthe extradimensionnel, hors de combat, pour une durée dépendant du NC de la cible (table verbatim de la capacité source). Un test d'INT réussi divise la durée par deux (minimum 1 round). Sans effet si la cible a une INT supérieure ou égale à celle du lanceur.",
    sourcePage: 162,
  },
  // « Contrôle mental » (magie de l'esprit, r8, p. 162). Même limite que ci-dessus : prise de contrôle
  // TOTALE d'une créature déjà en jeu, aucune primitive de « changement temporaire de camp ».
  'mind-controlled': {
    label: 'Contrôlé',
    effect:
      "Ses actions sont dictées par le lanceur du sort (le corps de celui-ci reste inactif pendant ce temps), pour une durée dépendant du NC de la cible (table verbatim de la capacité source). Un test d'INT réussi divise la durée par deux (minimum 1 round). Sans effet si la cible a une INT supérieure ou égale à celle du lanceur.",
    sourcePage: 162,
  },
  // « Décalage » (magie du temps, r6, p. 164). Retrait de combat COURT (1d4° minutes au maximum,
  // contre les jours/NC d'emprisonné/contrôlé) mais même limite : aucun `StatusModifiers` ne
  // représente un combattant rendu immatériel et immobile, hors de portée. Nouveau tag posé
  // (arbitrage propriétaire 2026-08-11) pour suivi à l'écran MJ malgré la courte durée.
  'time-displaced': {
    label: 'Décalage temporel',
    effect:
      "Devient une image transparente, immatérielle et immobile, hors de portée, jusqu'à son retour (durée choisie par le lanceur, 1d4° minutes au maximum). Reprend consistance et son activité normale à la fin. Si un obstacle occupe sa position à son retour, elle réapparaît au plus près et subit des DM.",
    sourcePage: 164,
  },
  // « Motif hypnotique » (voie de la vision, r6, p. 165). Entièrement comportemental (cesse toute
  // activité pour contempler, riposte si attaquée puis reprend sa contemplation) : NON réductible
  // à Paralysé (qui interdit toute action, y compris riposter) ni à un autre état de base → mécanique
  // PROPRE, admissible (PER-288). La difficulté [12 + INT], la durée d'INT min et le plafond de NC
  // restent dans le verbatim/richText de la capacité source.
  hypnotized: {
    label: 'Hypnotisé',
    effect:
      "Cesse toute activité pour contempler intensément un motif hypnotique. Riposte si elle est attaquée, mais reprend immédiatement sa contemplation dès son adversaire vaincu ou en fuite.",
    sourcePage: 165,
  },
};

/** Libellés français des effets situationnels (affichés au joueur). Dérivé de `SITUATIONAL_EFFECTS`. */
export const SITUATIONAL_EFFECT_LABELS: Record<SituationalEffectId, string> = Object.fromEntries(
  SITUATIONAL_EFFECT_IDS.map((id) => [id, SITUATIONAL_EFFECTS[id].label]),
) as Record<SituationalEffectId, string>;

/**
 * ÉTATS D'ENVIRONNEMENT — troisième catalogue, MÊME schéma qu'un état préjudiciable
 * (`StatusEffectEntry`) mais famille (c) de la taxonomie PER-288 : ce ne sont NI des états infligés par
 * une capacité, NI des effets nommés de voie, mais des CONDITIONS DE LA SCÈNE que le MJ pose sur un
 * combattant tant qu'elle dure (« Autres conditions particulières », p. 215).
 *
 * Ce catalogue n'accueille QUE les conditions qui se SUIVENT par combattant sur la durée (on les
 * applique/retire comme un état, elles modifient des chiffres). Les modificateurs ponctuels résolus au
 * coup par coup (couvert, portée longue, désarmement, poussée…) restent HORS catalogue : ils ne se
 * « portent » pas. Universel comme le glossaire (aucun déblocage par capacité), donc TOUJOURS proposé
 * dans la palette du Combat Tracker — mais distingué visuellement (teinte bleue, cf. `statusTone`)
 * pour ne pas se confondre avec un état subi.
 */
export const ENVIRONMENTAL_EFFECT_IDS = ['aquatic-combat'] as const;
export type EnvironmentalEffectId = (typeof ENVIRONMENTAL_EFFECT_IDS)[number];

/** Catalogue des états d'environnement. Effet recopié VERBATIM du livre de base. */
export const ENVIRONMENTAL_EFFECTS: Record<EnvironmentalEffectId, StatusEffectEntry> = {
  // « Combat en milieu aquatique » (p. 215). Chiffré : « dé malus en attaque » → `attackTestsMalusDie`
  // (même mécanique qu'Immobilisé), « -5 en DEF » → `derived.def`. La division du déplacement par deux
  // reste COMPORTEMENTALE (verbatim seul, comme toute clause de déplacement). Ne s'applique qu'aux
  // créatures NON adaptées au combat aquatique (les PJ) : c'est le MJ qui choisit à qui il le pose.
  'aquatic-combat': {
    label: 'Combat aquatique',
    effect:
      "Lorsqu'elles combattent complètement immergées, les créatures qui ne sont pas adaptées au combat aquatique (comme les PJ) divisent leurs déplacements par deux et subissent un dé malus en attaque et -5 en DEF.",
    sourcePage: 215,
    modifiers: { derived: { def: -5 }, attackTestsMalusDie: true },
  },
};

/** Libellés français des états d'environnement (affichés au joueur). Dérivé de `ENVIRONMENTAL_EFFECTS`. */
export const ENVIRONMENTAL_EFFECT_LABELS: Record<EnvironmentalEffectId, string> = Object.fromEntries(
  ENVIRONMENTAL_EFFECT_IDS.map((id) => [id, ENVIRONMENTAL_EFFECTS[id].label]),
) as Record<EnvironmentalEffectId, string>;

/**
 * BUFFS DE GROUPE (PER-104) — QUATRIÈME catalogue, MÊME schéma qu'un état (`StatusEffectEntry`), mais
 * la première famille BÉNÉFIQUE : les trois autres (glossaire p. 214-215, effets situationnels de voie,
 * conditions d'environnement) ne portent que des préjudices. D'où un catalogue à part plutôt qu'une
 * entrée de plus chez les situationnels, dont le critère d'admission (PER-288) vise les malus subis.
 *
 * N'entre ici QUE l'effet dont la RÈGLE vise « ses alliés et lui » (`scope: 'group'`) : un bonus qui ne
 * profite qu'à son porteur reste un `conditional-stat-bonus` à interrupteur sur la fiche, il n'a rien à
 * faire dans un catalogue d'états posés en séance. Les deux premières entrées sont les deux faces du
 * même gabarit — Chant des héros (barde, `musicien-r1`, p. 67) et Bénédiction (prêtre, `priere-r1`,
 * p. 124) — dont les verbatims NE sont PAS fusionnés : le barde dit « à tous leurs tests », le prêtre
 * « à tous leurs tests de caractéristique et d'attaque ». Deux textes du livre, deux entrées.
 *
 * DURÉE : « CHA minutes » n'est PAS converti en manches (aucune règle du livre ne le fait) — le buff se
 * pose sans compteur et c'est le MJ qui, s'il le veut, lui donne une durée en tours (`untilRound`,
 * PER-305). En pratique un repos de groupe (PER-312) y met fin en purgeant les états du tracker.
 *
 * PALIER : modélisé comme tout état cumulatif — la valeur de `modifiers` vaut PAR PALIER et
 * `stacking.max` borne l'intensité. Où lire le palier n'est PAS une règle générale : chaque entrée le
 * DÉCLARE par `intensityFrom` (rang de la voie porteuse, niveau du personnage, ou caractéristique du
 * lanceur). La palette le pré-remplit de là ; le MJ garde la main.
 *
 * RECENSEMENT (PER-359) : les 665 capacités ont été balayées à la recherche de tout ce qui touche
 * autrui (« allié », « le groupe », « ses compagnons », « à portée de voix »…), soit 52 capacités
 * classées. Sont entrées ici les seules dont le chiffre tient dans les canaux du moteur. Restent
 * DEHORS, faute de canal, toutes celles qui donnent un DÉ BONUS (Charge fantastique p. 86, Exemplaire
 * p. 86, Meneur d'hommes p. 142, Arme de lumière p. 123) ou un bonus de DM en DÉ : `StatusModifiers`
 * ne connaît que des dés MALUS et des DM plats. Restent également dehors, par nature, les soins, les
 * déplacements, les compagnons, et tout ce qui vise un ADVERSAIRE (canal `situationalEffectIds`).
 */
export const BENEFICIAL_EFFECT_IDS = [
  'heroes-song',
  'blessing',
  'warlord-aura',
  'fearless-rally',
  'towering-argument',
  'shield-ally',
  'precision-strike',
] as const;
export type BeneficialEffectId = (typeof BENEFICIAL_EFFECT_IDS)[number];

/** Catalogue des buffs de groupe. Effet recopié VERBATIM de la capacité source. */
export const BENEFICIAL_EFFECTS: Record<BeneficialEffectId, StatusEffectEntry> = {
  // « Chant des héros » (barde, musicien-r1, p. 67). Le verbatim s'arrête au palier de rang 5 : la
  // dernière phrase de la capacité (« son rang + 2 aux tests pour jouer d'un instrument ») est un
  // bonus de compétence PERMANENT du seul barde, sans rapport avec le buff posé sur le groupe.
  'heroes-song': {
    label: 'Chant des héros',
    effect:
      "Le barde peut chanter et inspirer ses compagnons, tous ses alliés à portée de voix et lui obtiennent un bonus de +1 à tous leurs tests pendant un nombre de minutes égal à sa valeur de CHA. Pendant toute la durée du sort, il fredonne (action gratuite qui ne l'empêche pas de lancer d'autres sorts de barde). Le bonus passe à +2 au rang 5.",
    sourcePage: 67,
    modifiers: { allTestsFlat: 1 },
    stacking: { max: 2 },
    scope: 'group',
    intensityFrom: { kind: 'path-rank', rank: 5 },
  },
  // « Bénédiction » (prêtre, priere-r1, p. 124). Même gabarit chiffré que le Chant des héros, texte
  // DISTINCT (« tests de caractéristique et d'attaque » là où le barde dit « tous leurs tests »). Le
  // bonus permanent de théologie/cosmologie de la fin de la capacité est hors du buff, donc hors verbatim.
  blessing: {
    label: 'Bénédiction',
    effect:
      "Le prêtre entonne un chant pour encourager ses compagnons en vue. Ses alliés et lui bénéficient d'un bonus de +1 à tous leurs tests de caractéristique et d'attaque pendant CHA minutes. Ce bonus passe à +2 au rang 5.",
    sourcePage: 124,
    modifiers: { allTestsFlat: 1 },
    stacking: { max: 2 },
    scope: 'group',
    intensityFrom: { kind: 'path-rank', rank: 5 },
  },
  // « Aura du chef de guerre » (mage de guerre, prestige-mage-de-guerre-r6, p. 161). Le buff le plus
  // proche du gabarit des deux premiers, à ceci près que son palier suit le NIVEAU du personnage et
  // non le rang de la voie. Deux canaux chiffrés distincts : +1 en DEF (stat dérivée) et +1 aux DM
  // infligés — première valeur POSITIVE de `damageDealt`, jusqu'ici réservé aux malus.
  'warlord-aura': {
    label: 'Aura du chef de guerre',
    effect:
      "Tous vos alliés dans un rayon de 20 m autour de vous bénéficient d'un bonus de +1 en DEF et aux DM pendant INT minutes. À partir du niveau 16, ce bonus passe à +2.",
    sourcePage: 161,
    modifiers: { derived: { def: 1 }, damageDealt: 1 },
    stacking: { max: 2 },
    scope: 'group',
    intensityFrom: { kind: 'character-level', level: 16 },
    excludesCarrier: true,
  },
  // « Sans peur » (chevalier, meneur-d-hommes-r1, p. 85). Le verbatim GARDE l'immunité du chevalier,
  // sans quoi « ce type d'effet » ne renverrait à rien — mais seule la clause des alliés est chiffrée
  // ici (l'immunité du porteur est déjà un `immunity` sur sa propre fiche). La seconde phrase de la
  // capacité (rang + 2 en tactique et commandement) est un bonus PERMANENT du seul chevalier : hors buff.
  // Le bonus n'étant ni plat ni universel — « son CHA », et seulement contre la peur — il exige les
  // deux nouveautés de PER-359 : `testDomains` et un palier lu sur une CARACTÉRISTIQUE du lanceur.
  'fearless-rally': {
    label: 'Sans peur',
    effect:
      "Le chevalier est immunisé aux effets de peur et il offre un bonus égal à son CHA aux tests de tous ses alliés contre ce type d’effet.",
    sourcePage: 85,
    modifiers: { testDomains: { domains: ['fear-resistance'], value: 1 } },
    // Plafond = maximum d'une caractéristique (p. 27) : le palier EST le CHA du chevalier.
    stacking: { max: ABILITY_MAX },
    scope: 'group',
    intensityFrom: { kind: 'ability', ability: 'CHA' },
    excludesCarrier: true,
  },
  // « Argument de taille » (barbare, brute-r1, p. 79). Capacité MIXTE dont seule la part PORTEUR était
  // modélisée (+FOR aux PV et aux tests sociaux du barbare) : « et à ceux de ses alliés au contact »
  // n'entrait nulle part. C'est cette part-là, et elle seule, que porte cette entrée — le verbatim est
  // conservé entier, la phrase ne se laissant pas couper sans perdre son sujet.
  // Buff PERMANENT et non un sort : il vaut tant que les alliés sont AU CONTACT du barbare. Le MJ le
  // pose donc sur les combattants concernés et le lève quand le groupe se disperse.
  'towering-argument': {
    label: 'Argument de taille',
    effect:
      "Le barbare ajoute sa FOR à son maximum de PV ainsi qu’à ses tests de CHA et à ceux de ses alliés au contact pour les tests de négociation, de persuasion ou d’intimidation.",
    sourcePage: 79,
    modifiers: {
      testDomains: { domains: ['negotiation', 'persuasion', 'intimidation'], value: 1 },
    },
    stacking: { max: ABILITY_MAX },
    scope: 'group',
    intensityFrom: { kind: 'ability', ability: 'FOR' },
    excludesCarrier: true,
  },
  // « Protéger un allié » (guerrier, bouclier-r1, p. 87). PREMIER buff à CIBLE UNIQUE : le livre dit
  // « à UN allié à son contact », pas « à ses alliés ». La dernière phrase de la capacité (rang + 2
  // pour éviter d'être surpris) est un bonus permanent du seul guerrier : hors verbatim.
  //
  // ÉCART ASSUMÉ : la règle borne le bonus à « une attaque par round », alors qu'un état posé vaut
  // tant qu'il est là. Aucun canal ne sait exprimer « la prochaine attaque subie » ; le verbatim le
  // dit, et c'est au MJ de lever l'état. Le noter plutôt que de laisser croire à une DEF durablement
  // relevée.
  'shield-ally': {
    label: 'Protéger un allié',
    effect:
      "S’il n’est pas surpris, le guerrier peut accorder un bonus de DEF de +2 à un allié à son contact contre une attaque par round. Il doit annoncer son intention avant de connaître le résultat de l’attaque.",
    sourcePage: 87,
    // Valeur FIXE (+2) : ni escalade ni palier, donc aucun `stacking` ni `intensityFrom`.
    modifiers: { derived: { def: 2 } },
    scope: 'single-ally',
    excludesCarrier: true,
  },
  // « Coup au but » (mage de guerre, prestige-mage-de-guerre-r4, p. 161). CIBLE UNIQUE, mais SANS
  // `excludesCarrier` : le livre dit « le personnage OU la cible », le lanceur peut se le poser à
  // lui-même (contrairement à « Protéger un allié », qui exclut le porteur).
  //
  // ÉCART ASSUMÉ (même famille que `shield-ally` ci-dessus) : la règle borne le bonus à UN SEUL jet
  // d'attaque, d'un type choisi par le joueur (contact/distance/magique), avant la fin du round.
  // Aucun canal ne sait exprimer « le prochain jet, une seule fois » : le bonus est posé comme un état
  // qui dure tant qu'il est là, sur LES TROIS jets à la fois (comme Vision, mages.ts, pour la même
  // raison). Au joueur/MJ de le lever après le jet effectivement utilisé.
  'precision-strike': {
    label: 'Coup au but',
    effect:
      "Le personnage ou la cible (portée 10 m) bénéficie d'un bonus de +10 sur son prochain test d'attaque contre DEF (au contact, à distance ou magique au choix) qui doit être exécuté avant la fin du round.",
    sourcePage: 161,
    // Valeur FIXE (+10) : ni escalade ni palier, donc aucun `stacking` ni `intensityFrom`.
    modifiers: { derived: { meleeAttack: 10, rangedAttack: 10, magicAttack: 10 } },
    scope: 'single-ally',
  },
};

/** Libellés français des buffs de groupe (affichés au joueur). Dérivé de `BENEFICIAL_EFFECTS`. */
export const BENEFICIAL_EFFECT_LABELS: Record<BeneficialEffectId, string> = Object.fromEntries(
  BENEFICIAL_EFFECT_IDS.map((id) => [id, BENEFICIAL_EFFECTS[id].label]),
) as Record<BeneficialEffectId, string>;

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
 * Réduction du MALUS D'ARMURE (« malus d'encombrement », p. 188) apporté par cette capacité :
 * le personnage n'ajoute que `1/divisor` de la DEF de son armure aux tests que celle-ci pénalise.
 * Ex. Armure sur mesure (chevalier, `guerre-r1`, p. 84) : « n'ajoute que la MOITIÉ de sa DEF » →
 * `divisor: 2`. Résolu par `armorEncumbrancePenalty` (arrondi à l'inférieur, favorable au joueur) ;
 * ne touche ni la DEF ni les autres calculs. PER-236.
 */
export interface ArmorPenaltyReductionEffect {
  kind: 'armor-penalty-reduction';
  /** Diviseur du malus d'armure (2 = moitié). Arrondi à l'inférieur. */
  divisor: number;
}

/**
 * Bonus de DEF conditionné au port d'une armure LOURDE (plaque / plaque complète, cf.
 * `HEAVY_ARMOR_IDS`), résolu AUTOMATIQUEMENT depuis l'équipement (comme `ArmorDefBonusEffect`,
 * sans interrupteur). Distinct de ce dernier qui ne distingue qu'armure/pas-armure. La valeur
 * est le plus souvent SCALANTE : Armure sur mesure (`guerre-r1`, p. 84) octroie « +1 en DEF à
 * chaque fois qu'il atteint le rang 5 dans une voie de chevalier » →
 * `{ scale: 'milestone-count', per: 1, rank: 5, classIds: ['chevalier'] }`. PER-236.
 */
export interface HeavyArmorDefBonusEffect {
  kind: 'heavy-armor-def-bonus';
  /** Bonus de DEF appliqué UNIQUEMENT en armure lourde (constante ou scalante). */
  value: EffectValue;
}

/**
 * PER-74 — Bonus de DEF conditionné au fait de TENIR une arme de CONTACT à DEUX MAINS, résolu
 * AUTOMATIQUEMENT depuis l'équipement porté (comme `ArmorDefBonusEffect`/`HeavyArmorDefBonusEffect`,
 * sans interrupteur manuel). Ex. « Tenir à distance » (voie des armes à deux mains, r6, p. 146) :
 * « lorsque le personnage tient une arme à deux mains, il gagne un bonus de +1 en DEF. Ce bonus
 * passe à +2 au rang 8 » → `{ scale: 'stepped', by: 'path-rank', steps: [{ min: 6, value: 1 },
 * { min: 8, value: 2 }] }`.
 *
 * La condition suit la PRISE RÉELLE (`wornWeaponIsTwoHanded`, PER-76/219) : une arme polyvalente
 * (épée bâtarde, lance) compte tant que la prise « Deux mains » est choisie, et cesse de compter à
 * une main. Restreinte aux armes de CONTACT : arcs, arbalètes et mousquets relèvent aussi de la
 * catégorie `twoHands`, mais « tenir à distance » décrit l'allonge d'une arme de mêlée (cf.
 * `isTwoHandedMeleeWeaponWielded`). Nul (aucune contribution) sans arme à deux mains en main.
 */
export interface TwoHandedWeaponDefBonusEffect {
  kind: 'two-handed-weapon-def-bonus';
  /** Bonus de DEF appliqué UNIQUEMENT avec une arme de contact tenue à deux mains. */
  value: EffectValue;
}

/**
 * PER-74 — Bonus de DEF conditionné au fait de TENIR un bâton (ou bâton ferré, même famille de
 * maîtrise, p. 184) en main, résolu AUTOMATIQUEMENT depuis l'équipement porté — même patron que
 * `TwoHandedWeaponDefBonusEffect` (« Tenir à distance »), sans interrupteur manuel. Sceptre défensif
 * (voie de l'archimage, r4, p. 154) : « lorsqu'il tient son bâton en main, le personnage gagne un
 * bonus de +1 en DEF (...) Ce bonus passe à +2 au rang 6 et +3 au rang 8 » → `{ scale: 'stepped',
 * by: 'path-rank', steps: [{ min: 4, value: 1 }, { min: 6, value: 2 }, { min: 8, value: 3 }] }`.
 * Le second volet du texte (bonus aux tests opposés de magie pour résister aux sorts) reste
 * VERBATIM : hors périmètre moteur, comme le bonus équivalent de l'elfe (p. 50) et du halfelin
 * (p. 56). Nul (aucune contribution) sans bâton en main (cf. `isStaffWielded`, equipment.ts).
 */
export interface StaffDefBonusEffect {
  kind: 'staff-def-bonus';
  /** Bonus de DEF appliqué UNIQUEMENT avec un bâton/bâton ferré en main. */
  value: EffectValue;
}

/**
 * PER-74 — DÉ BONUS en attaque octroyé par l'ARME LIÉE (voie de l'arme liée, r4 « Fidèle »,
 * p. 147 : « l'arme […] octroie au PJ un dé bonus en attaque »). Affiché sur la carte d'attaque
 * du MODE de l'arme liée (au contact pour une arme de contact, à distance pour une arme à
 * distance), et SEULEMENT si les trois conditions sont réunies :
 *  - une arme liée est choisie (`boundWeaponLine`) ;
 *  - elle est effectivement TENUE EN MAIN ;
 *  - la charge de la capacité porteuse n'est pas dépensée (`usageCounter` au maximum).
 * Le dé disparaît donc dès que le joueur décrémente le compteur, et revient à la recharge.
 * Aucun paramètre : la capacité porteuse fournit son propre compteur.
 */
export interface BoundWeaponAttackDieEffect {
  kind: 'bound-weapon-attack-die';
}

/**
 * PER-74 — AURA ÉLÉMENTAIRE imprégnée dans une arme (voie de l'arme liée, r7, p. 147). L'élément
 * est choisi À LA TABLE, pas à la construction : il est stocké dans `Character.effectInputs` et
 * s'échange librement hors mode édition, comme l'élément résisté d'une RD à `scopeChoice` ou
 * l'élément des flèches (`ranged-attack-elemental`). À DISTINGUER du choix PERMANENT du
 * sang-dragon (couleur figée à la construction).
 *
 * Le livre fige l'élément « une fois pour toutes » dans la fiction (« l'élément choisi reste
 * toujours le même »), mais l'arbitrage propriétaire est de le laisser échangeable : le lien peut
 * être refait avec une autre arme, et le suivi table par table prime.
 */
export interface WeaponAuraElementalEffect {
  kind: 'weapon-aura-elemental';
  /** Éléments proposés (un seul retenu à la fois dans `effectInputs`). */
  choices: ResistibleDamageType[];
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
   * Le bonus vaut AUSSI à MAINS NUES (PER-74) : `attackMode: 'melee'` n'exige alors plus d'arme de
   * contact en main. Réservé aux effets qui portent sur l'attaque elle-même et non sur l'arme —
   * Métamorphose élémentaire, forme Feu (élémentaliste r8, p. 157) : « +2d4° DM de feu à toutes ses
   * attaques au contact », le personnage EST fait de feu, il n'a pas besoin d'une épée pour brûler.
   * Absent = comportement par défaut (PER-139 : un supplément de DM d'ARME n'a rien à agrémenter
   * sans arme).
   */
  includesUnarmed?: boolean;
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
  /**
   * GATING par ÉLÉMENT RÉSOLU de la capacité (PER-74, Métamorphose élémentaire, élémentaliste r8,
   * p. 157) : ce bonus ne compte que si l'élément de prédilection résolu (`Feature.elementFromChoice`
   * de LA MÊME capacité) vaut CE type précis — ex. « +2d4° DM de feu au contact » ne s'applique que
   * sous la forme Feu. Même sémantique que `DamageReduction.requiresElement`. Absent = aucun gating
   * par élément (bonus valable pour toute forme, comme les cas d'usage historiques).
   */
  requiresElement?: ResistibleDamageType;
  /** Bonus SITUATIONNEL (badge séparé) au lieu de permanent (agrégé au DM). Défaut `false`. */
  situational?: boolean;
  /**
   * PER-74 — le bonus n'est actif que tant que les PV COURANTS sont STRICTEMENT INFÉRIEURS au NIVEAU
   * (flibustier r8 « Pas de quartier », p. 142 : « +1d4° aux DM … lorsqu'il lui reste moins de niveau PV »).
   * Gate AUTO (aucun interrupteur), évalué depuis la jauge de PV — nécessite donc que `weaponDamageBonuses`
   * reçoive le `maxHp`. Sans `maxHp` (contexte qui l'ignore), un bonus `requiresLowHp` est traité comme
   * INACTIF (pas de faux positif). Se combine avec `condition` (mode/arme). Absent = aucune condition de PV.
   */
  requiresLowHp?: boolean;
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

/**
 * Les ATTAQUES À DISTANCE du personnage sont considérées comme MAGIQUES (PER-74) — ex. Voie de
 * l'archer arcanique « Flèche magique » (r4, p. 137 : « Les DM de ses flèches sont considérés
 * comme magiques »). Effet PUREMENT DESCRIPTIF (aucun jet redéfini) : la carte « Attaque à
 * distance » de la fiche affiche un badge « Magique », comme la vue mains nues du moine (Mains
 * d'énergie). Sans valeur ni condition — la portée dépend uniquement de l'ACTIVITÉ de la capacité
 * porteuse (une voie gatée `requiresRangedKinds` ne compte plus quand l'arme requise n'est pas en
 * main, cf. `activeFeatureIdsForMods`), donc le badge n'apparaît qu'avec l'arme adéquate équipée.
 */
export interface RangedAttackMagicalEffect {
  kind: 'ranged-attack-magical';
}

/**
 * Les ATTAQUES À DISTANCE gagnent un ÉLÉMENT de DM choisi À LA TABLE (PER-74) — ex. Voie de l'archer
 * arcanique « Flèche élémentaire » (r7, p. 137 : « choisit une source de DM parmi poison, feu, froid,
 * foudre et acide … +1d4° aux DM »). L'élément est un ÉTAT DE JEU échangeable à chaque combat (stocké
 * dans `Character.effectInputs[featureId]`, éditable HORS mode édition — comme le `scopeChoice` d'une
 * RD), PAS un choix figé de construction. Purement DESCRIPTIF côté fiche : le +1d4° reste en `richText`
 * verbatim ; cet effet ne pilote QUE la puce d'élément affichée sur la carte « Attaque à distance ».
 * Comme `ranged-attack-magical`, la portée dépend de l'ACTIVITÉ de la capacité (voie gatée
 * `requiresRangedKinds`) → la puce n'apparaît qu'avec l'arme requise en main ET un élément choisi.
 */
export interface RangedAttackElementalEffect {
  kind: 'ranged-attack-elemental';
  /** Éléments proposés au choix (un seul retenu à la fois dans `effectInputs`). */
  choices: ResistibleDamageType[];
  /**
   * Notation du DÉ de DM bonus ajouté par l'effet (ex. `1d4°`, marqueur `°` = évolutif), affichée sur
   * la puce d'attaque à distance à côté de l'élément — comme le dé de bonus de la Rage du barbare.
   * Absent = puce sans dé (élément seul). Le dé reste aussi en `richText` verbatim (source unique de
   * la règle) ; ce champ ne sert qu'au rendu compact de la puce.
   */
  bonusDie?: string;
}

/**
 * Modes d'une ATTAQUE EN FINESSE (`finesse-attack`) : la substitution de caractéristique s'applique
 * SOIT à la touche (`'attack'`) SOIT aux DM (`'damage'`), jamais aux deux (verbatim p. 140). Le mode
 * retenu « à la table » est stocké dans `effectInputs[featureId]` ; son absence = finesse inactive.
 */
export const FINESSE_ATTACK_MODES = ['attack', 'damage'] as const;
export type FinesseAttackMode = (typeof FINESSE_ATTACK_MODES)[number];

/**
 * PER-74 — ATTAQUE EN FINESSE (Vive attaque du duelliste r4, p. 140). Avec une arme éligible EN MAIN
 * PRINCIPALE (dague, épée courte/longue, rapière, ou vivelame tenue à deux mains), le personnage
 * remplace sa FOR par son AGI SOIT à la touche au contact SOIT aux DM (au choix, jamais les deux en
 * même temps). C'est un ÉTAT DE JEU ÉCHANGEABLE « à la table » — stocké dans `effectInputs[featureId]`
 * (`'attack'` = AGI à la touche, `'damage'` = AGI aux DM, absent = inactif), comme le `scopeChoice`
 * d'une RD et NON un choix permanent de construction (cf. [[choix-permanent-vs-dynamique]]). Gaté par
 * l'arme requise : sans arme éligible en main, aucune substitution ne s'applique (résolveur
 * `finesseAttackChoice`).
 */
export interface FinesseAttackEffect {
  kind: 'finesse-attack';
  /** Caractéristique de substitution proposée (AGI). */
  ability: AbilityId;
  /** Caractéristique remplacée (FOR au contact). */
  replaces: AbilityId;
  /**
   * Ids d'armes de contact éligibles TENUES À UNE MAIN (« lorsqu'il emploie une arme légère à une
   * main », p. 66/77 ; « sur les attaques de sa main principale », p. 140). Une arme de cette liste
   * empoignée à DEUX mains (`worn.grip === 'twoHands'`) ne compte PAS.
   */
  weaponIds: string[];
  /**
   * Ids d'armes éligibles alors qu'elles sont tenues À DEUX MAINS — dérogation portée par l'arme
   * elle-même, pas par la capacité : la vivelame (p. 183) admet la substitution AGI→FOR « s'il
   * maîtrise les armes de contact à deux mains », d'où la condition de MAÎTRISE vérifiée par le
   * résolveur. Absent = aucune arme à deux mains n'ouvre droit à la finesse.
   *
   * Une arme `oneOrTwoHands` (lance, danseur de guerre r4, p. 150) peut figurer ICI **et** dans
   * `weaponIds` : elle est éligible dans les deux prises. Aucune maîtrise n'est alors exigée — la
   * dérogation de la p. 183 vise les armes qui ne s'emploient QUE à deux mains, pas celles que le
   * personnage peut de toute façon manier à une main.
   */
  twoHandedWeaponIds?: string[];
  /**
   * Modes OFFERTS par la capacité. Absent = les deux (arbitrage « touche OU DM » du duelliste).
   * Précision (barde, p. 66) et Attaque en finesse (voleur, p. 77) ne substituent QU'À LA TOUCHE
   * (« mais pas aux DM ») → `['attack']`.
   */
  modes?: FinesseAttackMode[];
  /**
   * Substitution appliquée D'OFFICE, sans réglage « à la table », dès qu'une arme éligible est en
   * main ET que la substitution est AVANTAGEUSE (carac de substitution > carac remplacée). Réservé
   * aux capacités SANS arbitrage (un seul mode offert) : « le barde PEUT remplacer sa FOR par son
   * AGI » n'a alors aucune contrepartie — le joueur retiendrait toujours la meilleure carac, donc
   * la fiche la calcule pour lui (≠ duelliste r4, où choisir la touche interdit les DM).
   */
  automatic?: boolean;
}

/**
 * DÉ BONUS PERMANENT aux tests d'un ou plusieurs DOMAINES nommés (ids du catalogue
 * `test-domains.ts`) — « 2d20, garde le meilleur ». Symétrique de `test-bonus` (bonus CHIFFRÉ de
 * compétence) et de `ability-bonus-die` (dé permanent d'une CARAC), mais ciblé DOMAINE, et TOUJOURS
 * appliqué (aucun interrupteur ; ≠ `conditional-stat-bonus.testDieDomains`, conditionnel). Ex. L'amour
 * du risque (casse-cou r6, p. 139) : « (permanent) sur les tests réalisés pour résister à la peur »
 * → `{ kind: 'test-die', domains: ['fear-resistance'] }`. Rendu par un `BonusDieBadge` sur la LIGNE du
 * domaine dans « Compétences & tests » (via `permanentTestDieDomains`, fusionné aux dés conditionnels).
 */
export interface TestDieEffect {
  kind: 'test-die';
  /** Domaines visés (ids du catalogue `test-domains.ts`). Intégrité vérifiée par `validate:data`. */
  domains: string[];
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

/**
 * Bonus de compétence dont le DOMAINE est déterminé par un choix `test-domain` de la même capacité
 * (PER-74, Expertise r4 : « +5 sur une compétence acquise par une capacité », p. 129). Analogue de
 * `ability-bonus-from-choice` (carac lue depuis un choix `ability`) : ici le domaine visé est lu
 * depuis `Character.featureChoices[id][choiceIndex]` (la compétence choisie), et `value` (le +5) lui
 * est appliqué. La catégorie de cumul est celle de la voie hôte (prestige → +5 fixe, max par
 * catégorie p. 203). Sans sélection, aucune contribution. Résolu par `rawTestContributions`.
 */
export interface TestBonusFromChoiceEffect {
  kind: 'test-bonus-from-choice';
  /** Index du choix `test-domain` de `Feature.choices` qui détermine le domaine visé. */
  choiceIndex: number;
  /** Valeur du bonus (constante — ex. +5 — ou scalante). */
  value: EffectValue;
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
  // PER-260 : types ajoutés au fil de la passe défensive du BESTIAIRE. Les trois catégories
  // PHYSIQUES du livre (`DAMAGE_TYPES`, qui décrit l'arme) deviennent aussi des portées de RD —
  // le bestiaire les nomme explicitement (squelette « sauf arme contondante » = tranchant +
  // perforant, golem de chair « ainsi que les DM contondants », limace « DM tranchant ou de feu »).
  'bludgeoning',
  'piercing',
  'slashing',
  // Matières/qualités d'arme dont l'ABSENCE laisse la RD s'appliquer, sur le patron de
  // `non-silver-weapon` : fer froid (licorne p. 285, créatures féeriques) et armes bénies/sacrées
  // (morts-vivants). La RD ne joue PAS contre l'arme nommée.
  'non-cold-iron-weapon',
  'non-blessed-weapon',
  // PER-261 : « RD N contre les ARMES » — tournure propre au supplément Bestiaire (arthropodes
  // « Cuirassé », arme/armure animée « Solide », golems de pierre et de métal), à distinguer de
  // `physical` (« contre tous les DM physiques », tricératops) et de `non-magical` (« armes
  // ordinaires »). Ne couvre pas les sorts ni les DM d'environnement.
  'weapon',
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
  /**
   * SCOPE dérivé de l'ÉLÉMENT DRACONIQUE de la capacité (PER-74) : la portée est le type d'énergie
   * résolu par `Feature.elementFromChoice` — un choix porté par une AUTRE capacité. Pendant
   * CROSS-CAPACITÉ de `scopeFromChoice` (qui, lui, ne lit que la capacité elle-même) : la voie du
   * chevalier dragon tire sa couleur de Monture fantastique (voie du cavalier), pas d'un choix propre.
   * La RD n'est comptée que si la couleur est effectivement choisie. Exclusif avec `scopes`,
   * `scopeChoice` et `scopeFromChoice`.
   *
   * Fonctionne aussi sur une RD de `CreatureUpgrade` (RD du drake au rang 4), résolue par
   * `applyCreatureUpgrades` — le seul endroit où une RID de créature voit le personnage.
   */
  scopeFromElement?: boolean;
  /**
   * GATING par ÉLÉMENT RÉSOLU de la capacité (PER-74, Métamorphose élémentaire, élémentaliste r8,
   * p. 157) : cette entrée ne compte que si l'élément de prédilection résolu (`Feature.elementFromChoice`
   * de LA MÊME capacité) vaut CE type précis — ex. la RD passe à 10 (au lieu de 5) UNIQUEMENT sous la
   * forme Air. Distinct de `scopeFromElement` (qui fixe la PORTÉE depuis l'élément) : ici l'élément
   * décide si l'entrée s'applique DU TOUT, sa portée restant `scopes` (ou absente = tous DM). Plusieurs
   * entrées `requiresElement` différentes peuvent coexister sur la même capacité (une par branche).
   */
  requiresElement?: ResistibleDamageType;
  /**
   * Gating CROSS-CAPACITÉ (PER-74) : cette entrée de RD n'est ACTIVE que si l'interrupteur
   * (`conditional-stat-bonus`) d'une AUTRE capacité est actif. Ex. lycanthrope « Résistance
   * surnaturelle » (r7) : la RD −5 (armes non argentées) ne s'applique que « sous forme hybride » —
   * or l'interrupteur de forme hybride vit sur « Forme hybride » (r4), pas sur r7. Le gating par
   * interrupteur PROPRE (cf. `damageReductionSources`) ne couvre pas ce cas ; ce champ pointe
   * explicitement l'interrupteur porteur. Absent = gating par interrupteur(s) propre(s) (défaut).
   */
  requiresActiveEffect?: { featureId: string; index: number };
  /**
   * PRÉCISION courte affichée en SOURCE du badge (PER-260) : exception ou condition que la portée
   * typée ne sait pas exprimer — « Sauf les armes en argent et le feu. », « Les armes contondantes
   * infligent des DM pleins. », « Seulement tant qu'au moins 4 créatures sous ses ordres sont à
   * moins de 20 m. ». Reformulation COURTE du verbatim (qui reste affiché en entier à côté), pour
   * qu'un badge ne laisse jamais croire à une protection plus large qu'elle ne l'est. Purement
   * informatif (comme le reste de la RD, non lu par le moteur).
   */
  note?: string;
  /**
   * La protection ne joue QUE contre un type d'AGRESSEUR nommé (PER-74) — voie du combat du mal,
   * rang 8 (p. 149) : « immunisé aux effets de corruption : … empoisonnement ou maladie **provoqués
   * par les morts-vivants, les démons ou les animaux maléfiques ou corrompus** ». C'est la NATURE DE
   * L'ADVERSAIRE qui déclenche la protection, ce qu'aucune portée (`scopes`) ne sait exprimer : une
   * portée décrit le TYPE DE DÉGÂT, jamais sa SOURCE. Une immunité au poison d'un serpent ordinaire
   * n'a rien à voir avec celle-ci.
   *
   * Le texte (verbatim court, français) bascule le badge du cadre Défense en variante
   * SITUATIONNELLE (tête de démon, teinte d'avertissement) au lieu du bouclier vert de l'immunité
   * permanente, qui laisserait croire à une protection générale ; il est repris dans l'info-bulle.
   * Empêche aussi le regroupement avec une protection PERMANENTE de même portée
   * (cf. `stackedDamageReductions`) : les deux ne décrivent pas la même chose.
   */
  againstAggressors?: string;
  /**
   * Cette entrée REMPLACE la « RD N » imprimée avec les points de vigueur d'une CRÉATURE, même si
   * sa valeur DIFFÈRE (PER-261). Sert aux incohérences du livre : l'ange (Bestiaire p. 13) imprime
   * « RD 11 » dans sa ligne de stats et « RD 10 » dans sa capacité « Réduction des DM » — c'est une
   * seule et même protection, et le propriétaire a tranché pour la valeur de la CAPACITÉ. Sans ce
   * drapeau, `defenseCoversPrintedRd` ne dédoublonne que les valeurs ÉGALES, et les deux badges
   * s'afficheraient côte à côte. À n'utiliser QUE quand les deux chiffres décrivent la même
   * protection : deux RD réellement distinctes (RD imprimée + RD conditionnelle d'une capacité)
   * doivent rester deux badges.
   */
  replacesPrintedRd?: boolean;
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
 *  - `rangedKinds` : l'arme À DISTANCE portée appartient à un des SOUS-TYPES donnés (`bow`, `crossbow`…,
 *    cf. `RangedWeaponKind`) — Science du critique de l'arquebusier (`crossbow`), Archer émérite de
 *    l'elfe (`bow`). Ne s'évalue que sur une plage `scope: 'ranged'` (arme à distance portée).
 *  - `weaponFamiliesFromChoice` : l'arme portée appartient à une des FAMILLES choisies par le
 *    personnage sur la capacité `choiceFeatureId` (choix `option`, ex. Armes de prédilection du
 *    guerrier, `maitre-d-armes-r1`) — Science du critique (maître d'armes).
 */
export type WeaponCriticalCondition =
  | { kind: 'unarmed' }
  | { kind: 'weaponCategory'; category: WeaponCategory }
  /**
   * PER-74 — l'arme de CONTACT en main est TENUE À DEUX MAINS (« Critique destructeur », voie des
   * armes à deux mains r7, p. 146 : « avec toutes les armes à deux mains »). Distinct de
   * `weaponCategory: 'twoHands'` (égalité stricte de catégorie) : suit la PRISE réelle, donc une
   * arme polyvalente (épée bâtarde, lance) compte quand la prise « Deux mains » est choisie
   * (`wornWeaponIsTwoHanded`, PER-76/219) et cesse de compter à une main.
   */
  | { kind: 'twoHandedMelee' }
  | { kind: 'rangedKinds'; rangedKinds: RangedWeaponKind[] }
  | { kind: 'weaponFamiliesFromChoice'; choiceFeatureId: string };

/**
 * ATTAQUE NATURELLE CONFÉRÉE PAR UNE FORME (PER-74) — une capacité de transformation octroie une
 * attaque propre à la forme prise, active seulement tant que la forme est active. Ex. lycanthrope
 * « Forme hybride » (r4, p. 130) : « sous cette forme, il ne peut pas lancer de sort ou utiliser
 * d'arme pour attaquer à distance, en revanche il obtient une attaque de morsure (Attaque au
 * contact) qui inflige 1d4°+FOR DM en action gratuite une fois par round ».
 *
 * Comme la RD (`DamageReduction`) et la plage de critique (`CriticalRange`), c'est une donnée
 * d'AFFICHAGE : aucun jet n'est résolu. La TOUCHE n'est pas redéfinie ici — l'attaque suit la
 * valeur d'attaque du `scope` (au contact = « son attaque au contact habituelle »).
 *
 * `replacesRangedAttack` matérialise l'interdiction du tir sous la forme : la carte « Attaque à
 * distance » de la fiche est REMPLACÉE par celle de l'attaque conférée (aucune bascule — ce n'est
 * pas un choix du joueur, contrairement à l'arme ⇄ mains nues de PER-141).
 */
export interface FormAttack {
  /** Nom de l'attaque conférée, verbatim (« Morsure »). */
  name: string;
  /** Dés de DM structurés (`{ count: 1, die: 'd4' }`). */
  damage: WeaponDamage;
  /** Dé ÉVOLUTIF « ° » (p. 43), rendu « 1d4° ». Absent = dé fixe. */
  evolving?: boolean;
  /**
   * Caractéristique(s) ajoutée(s) aux DM (best-of si plusieurs, comme la notation `FOR/AGI` du
   * livre). Vide = dé seul.
   */
  damageAbilities: AbilityId[];
  /** Portée de l'attaque → valeur de touche employée (contact ou distance). */
  scope: 'melee' | 'ranged';
  /** Types d'action de l'attaque elle-même (`['G']` = action gratuite). Vide = non précisé. */
  actionTypes: ActionType[];
  /** Cadence VERBATIM de l'attaque (« une fois par round »). Absent = aucune limite énoncée. */
  frequency?: string;
  /**
   * L'attaque REMPLACE la carte « Attaque à distance » de la fiche : la forme interdit d'utiliser
   * une arme à distance (verbatim). Absent = l'attaque s'ajoute sans rien remplacer (non rendu
   * à ce jour — aucune donnée du livre n'en a besoin).
   */
  replacesRangedAttack?: boolean;
  /**
   * Interrupteur (`conditional-stat-bonus`) qui doit être ACTIF pour que l'attaque existe — même
   * patron que `DamageReduction.requiresActiveEffect`. Pointe normalement l'interrupteur de forme
   * de la capacité elle-même (Forme hybride r4, effet 0), mais reste cross-capacité.
   */
  requiresActiveEffect: { featureId: string; index: number };
}

/**
 * PER-74 — CONDITION D'ARME EN MAIN requise pour qu'une capacité d'ACTION soit JOUABLE (voie du
 * flibustier, p. 141-142). PUREMENT VISUELLE, sur le patron de la Voie du bouclier sans bouclier
 * (`requiresShield`, PER-142) : quand la condition n'est pas remplie, le rang est GRISÉ et une notice
 * « non jouable » s'affiche, mais la capacité reste ACQUISE et ses éventuels ACQUIS PERMANENTS restent
 * valides (ex. « Coup de crosse » octroie la maîtrise des armes à poudre, gérée à part). Valeurs :
 *  - `'firearm'` : au moins une arme à poudre en main (« Coup de crosse » — on frappe avec la crosse) ;
 *  - `'firearm-and-melee'` : une arme à poudre dans une main ET une arme de contact dans l'autre
 *    (« Sabre au poing » — tir d'une main + attaque de contact de l'autre, condition cumulée).
 */
export type WieldRequirement = 'firearm' | 'firearm-and-melee';

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
  | KnownFeatureChoice
  | TestDomainFeatureChoice
  | OptionFeatureChoice
  | OwnedWeaponFeatureChoice
  | CustomSkillFeatureChoice
  | FreeTextFeatureChoice;
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
  visibleIfOption?: { choiceIndex: number; optionId: string | string[] };
  /**
   * Précision affichée SOUS le champ (encadré d'information) : ce que le choix engage au-delà de sa
   * seule invite. Sert quand la portée d'un choix dépasse la capacité qui le porte — ex. la couleur du
   * drake (PER-74), choisie sur Monture fantastique mais qui pilote toute la voie de prestige du
   * chevalier dragon, ce que rien dans son libellé ne laisserait deviner. Absent = aucune précision.
   */
  note?: string;
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
  /**
   * Si true : le choix est censé porter sur la caractéristique la plus HAUTE (symétrique de
   * `lowestHint`). Le livre décrit certains bonus comme automatiques sur « la plus haute
   * caractéristique » (Caractéristique fabuleuse, spécialiste r6, p. 130) — on le modélise, comme
   * « Projection mentale » (+1 à la plus faible), en choix GUIDÉ : l'UI pré-signale la/les carac(s)
   * la/les plus haute(s) et avertit en cas de dérogation, tout en laissant le joueur trancher une
   * égalité. Se combine à `ability-bonus-from-choice` pour appliquer le +1. Mutuellement exclusif
   * avec `lowestHint`.
   */
  highestHint?: boolean;
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
   * Domaine restreint à une FAMILLE de profils :
   *  - `'same-family'` = voies des profils de la même famille que le personnage
   *    (RELATIF au personnage — ex. voie de l'expert, p. 129) ;
   *  - une `FamilyId` LITTÉRALE (`'adventurers' | 'fighters' | 'mages' | 'mystics'`)
   *    = voies d'une famille FIXE, indépendante du personnage (PER-74, voie du touche
   *    à tout, p. 144 : r4 « une voie d'aventurier », r5 « de combattant », r6 « de
   *    mystique », r7 « de mage »).
   * Résolu par le moteur (`featuresInChoiceDomain`, choices.ts).
   */
  familyScope?: 'same-family' | FamilyId;
  /**
   * Domaine DYNAMIQUE dérivé du FAMILIER retenu (PER-74, Résistance r5, p. 133 : « le personnage
   * apprend un sort de rang 1 ou 2 de son choix d'un profil indiqué dans la description du familier »).
   * Quand `true`, les voies admissibles sont celles du PROFIL DE MAGIE du familier choisi au rang 3
   * (`FantasticFamiliar.spellProfile` — ex. dragon féérique → ensorceleur ; `main-profile` du minimoï →
   * le profil PRINCIPAL du personnage), et le domaine est restreint aux SORTS (`isSpell`), le livre
   * disant « un sort ». Se combine avec `allowedRanks: [1, 2]`. Résolu par `featuresInChoiceDomain`.
   */
  familiarSpellProfile?: boolean;
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
  /**
   * Liste BLANCHE explicite d'ids de capacités empruntables (PER-324, demi-elfe « Nomade » : « Survie
   * (rôdeur) OU Éclectique (barde) »). Quand présent, le domaine du choix se RÉDUIT exactement à ces
   * ids (privés des capacités déjà possédées et des emprunteuses, règle des poupées russes), en
   * IGNORANT `allowedRanks`/`classIds`/`pathIds`/`familyScope` : sert un choix binaire entre deux
   * capacités NOMMÉES de voies et de rangs différents, qu'aucune contrainte par rang/voie ne cible.
   * Absent = domaine dérivé des contraintes habituelles. Résolu par `featuresInChoiceDomain`.
   */
  featureIds?: string[];
  /**
   * Restreint le domaine aux SORTS (`Feature.isSpell`) — PER-324, demi-elfe « Sang féerique » : « un
   * sort d'ensorceleur ou de druide ». Distinct de `familiarSpellProfile` (qui dérive AUSSI les voies
   * du familier). Absent = pas de filtre sort/non-sort. Résolu par `featuresInChoiceDomain`.
   */
  spellsOnly?: boolean;
  /**
   * Étend le domaine aux voies de PRESTIGE en plus des voies de profil (PER-370, armure sacrée r7
   * « Pouvoir puissant » : sort de rang 5 à 7 « de n'importe quelle voie » — les voies de profil
   * plafonnant à 5, les rangs 6-7 n'existent que dans des voies de prestige). Les voies de prestige
   * ajoutées ne sont pas filtrées par `classIds`/`familyScope` (ces contraintes ne s'appliquent qu'aux
   * voies de profil) ; la voie hôte reste exclue (`f.pathId !== hostPathId`, comme toujours). Absent =
   * domaine restreint aux voies de profil (comportement historique). Résolu par `featuresInChoiceDomain`.
   */
  includePrestigePaths?: boolean;
  /**
   * Le SORT emprunté par ce choix ne rapporte PAS le +1 PM d'un sort connu (PER-324, demi-elfe « Sang
   * féerique » : « il ne reçoit pas de PM pour ce sort »). Symétrique du `noMana` des octrois FIXES
   * (`grantedFeatures`, PER-323) mais porté par un choix `feature-from-path`. La capacité reste connue
   * (ses effets comptent, elle s'affiche), seul son apport au réservoir de PM est retiré. Consommé par
   * `borrowedNoManaFeatureIds` (choices.ts) → agrégé au set noMana de `spellCount`. Absent = +1 PM normal.
   */
  noManaCost?: boolean;
  /**
   * Restreint le domaine du choix selon l'ASCENDANCE ELFE du demi-elfe « version Le Compagnon »
   * (PER-324, « Sang féerique » : « selon son ascendance ») : elfe haut → sorts d'ensorceleur seuls,
   * elfe sylvain → sorts de druide seuls. Lit `Character.demiElfeElfAncestry` ; si l'ascendance n'est
   * pas renseignée, on retombe sur les `classIds` déclarés (permissif). À combiner avec `spellsOnly`
   * et `classIds: ['ensorceleur', 'druide']` (repli). Absent = pas de restriction par ascendance.
   */
  restrictByDemiElfeAncestry?: boolean;
  /**
   * Ne PAS exclure du domaine les capacités déjà possédées (PER-74, archimage r5 « Bâton magique »,
   * p. 154 : retour proprio 2026-08-10). Par défaut, `featuresInChoiceDomain` exclut les capacités déjà
   * possédées — un emprunt redondant serait sans effet PUISQUE la capacité empruntée n'apporte alors
   * rien de plus que ce que le personnage a déjà. Ce n'est PAS le cas ici : lier un sort DÉJÀ connu au
   * bâton magique lui ajoute quand même l'action de mouvement sans dépense de mana
   * (`archmageStaffSpellGranted`), donc le choix reste PERTINENT même sur un sort possédé. Absent =
   * comportement par défaut (exclusion). Résolu par `featuresInChoiceDomain`.
   */
  includeOwned?: boolean;
  /**
   * Rang MINIMUM à atteindre dans la voie HÔTE (celle qui porte ce choix) pour que le choix soit
   * PROPOSÉ du tout (PER-74, archimage r5 « Bâton magique », p. 154 : « à partir du rang 7, il peut
   * AJOUTER » un 2e sort). Retour proprio 2026-08-10 : masquer le contrôle tant que le palier n'est
   * pas atteint plutôt que le laisser sélectionnable sans effet (la fiche est permissive PAR DÉFAUT,
   * mais un choix qu'on peut faire sans qu'il se passe quoi que ce soit se lit comme un bug). Même
   * traitement que `option.repeat` avant son premier palier (cf. `isChoiceActionable`, choices.ts).
   * Absent = toujours proposé (comportement historique).
   */
  unlockedAtHostPathRank?: number;
}

/**
 * Choix DÉSIGNANT une capacité que le personnage POSSÈDE DÉJÀ (PER-74, voie du spécialiste,
 * p. 129-130). À l'opposé de `feature-from-path` (qui EMPRUNTE une capacité NON possédée), ce choix
 * ne fait que POINTER une capacité connue : la voie du spécialiste améliore une capacité existante
 * — Capacité fabuleuse (r5), Capacité supérieure (r7), Capacité signature (r8).
 *
 * La sélection est PUREMENT DESCRIPTIVE : le moteur NE mécanise PAS la modification (réduction à une
 * action d'attaque, +1d4° aux DM, action supplémentaire) — aucune primitive ne l'exprime, elle reste
 * VERBATIM et s'applique à la table. On l'affiche seulement pour TRACER le choix du joueur. Persistée
 * comme l'id de la capacité (une chaîne, comme `feature-from-path`).
 *
 * Le domaine = les capacités ACQUISES du personnage (`featureIds`), restreintes aux capacités
 * ACTIONNABLES (au moins un type d'action) pour rester pertinent, puis affinées par les filtres
 * ci-dessous. Résolu par `knownFeaturesForChoice` (`src/lib/character/choices.ts`).
 */
export interface KnownFeatureChoice extends FeatureChoiceBase {
  kind: 'known-feature';
  /**
   * Restreint aux capacités dont le type d'action figure dans cette liste (ex. Capacité signature
   * r8 : « une capacité (A), (M) ou (L) » → `['A', 'M', 'L']`). Absent = pas de filtre sur l'action.
   */
  actionTypes?: ActionType[];
  /**
   * Restreint aux SORTS (`Feature.isSpell`). Sert la branche « sort » de Capacité fabuleuse (r5).
   * Absent = pas de filtre sort/non-sort.
   */
  spellsOnly?: boolean;
  /**
   * Domaine spécial de la Capacité fabuleuse (spécialiste r5, p. 129) : les capacités marquées **(L)**
   * que possède le personnage (transformables en action d'attaque), UNION les **sorts lancés en (A)**
   * (éligibles à la concentration sans passer en (L)). Dérivation des règles de base : quand présent,
   * il PRIME sur `actionTypes`/`spellsOnly` (résolu par `knownFeaturesForChoice`). La transformation
   * effective ((L)→(A) ou −2 PM permanent) est portée par le moteur `fabulousCapacityTarget`.
   */
  fabulousCapacity?: boolean;
}

/**
 * Choix d'une COMPÉTENCE (domaine de test) dans le catalogue exhaustif `src/data/test-domains.ts`
 * (PER-74, Expertise r4, branche « +5 sur une compétence acquise par une capacité », p. 129). Le
 * joueur choisit directement la compétence visée (ex. Discrétion) plutôt qu'une capacité. Descriptif :
 * le +5 n'est PAS calculé sur la fiche (verbatim, appliqué à la table). Persisté comme l'id du domaine.
 */
export interface TestDomainFeatureChoice extends FeatureChoiceBase {
  kind: 'test-domain';
  /**
   * Inclure les compétences à coloration COMBAT (`TestDomain.combat`, ex. Esquive/Intimidation) ?
   * Défaut `false` (comme le gagne-pain libre `custom-skill` : on liste les compétences hors combat).
   */
  includeCombat?: boolean;
}

/** Une option énumérée d'un `OptionFeatureChoice`. */
/**
 * AMÉLIORATIONS apportées à une CRÉATURE liée (PER-94) — deltas chiffrés appliqués PAR-DESSUS un
 * profil de base (`applyCreatureUpgrades`) et CUMULÉS. À DISTINGUER de `creatureProfile` (qui
 * REMPLACE le profil). Portée soit par une OPTION retenue (ex. Golem supérieur, golem-r5, p. 100),
 * soit directement par une CAPACITÉ (ex. Runes de défense → golem, cross-voie). Le dé bonus de la
 * créature reste porté séparément par `creatureAbilityBonusDie`.
 */
export interface CreatureUpgrade {
  /**
   * Voies des CRÉATURES ciblées par l'amélioration (PER-94). Absent = la créature de la voie de la
   * capacité/option SOURCE (rétro-compatible : Golem supérieur améliore le golem de sa propre voie).
   * Présent = ciblage CROSS-VOIE explicite — ex. Runes de défense (voie `runes`) → `['golem']`.
   */
  targetPaths?: string[];
  /**
   * Restriction FINE au SLOT de compagnon ciblé (`CreatureProfile.companionSlot`, PER-363), en plus
   * de `targetPaths` : nécessaire quand une voie octroie PLUSIEURS compagnons INDÉPENDANTS partageant
   * le même `pathId` (voie de l'invocation majeure : Monture fantôme r4 ET Chasseur ailé r7) — sans
   * cette restriction, `targetPaths` seul ne peut pas distinguer les deux compagnons d'une même voie,
   * et l'amélioration s'appliquerait aux DEUX. Absent = aucune restriction fine (comportement
   * historique : une seule créature par voie ciblée, cas de toutes les autres voies à ce jour).
   */
  targetSlot?: string;
  /** Deltas de caractéristiques de la créature (ex. Forme de félin → AGI +3). */
  abilities?: Partial<Record<AbilityId, number>>;
  /**
   * Bonus de DÉFENSE. Nombre plat (ex. Armure → +5) OU valeur scalante (PER-94), résolue contre la
   * voie de la capacité SOURCE — ex. Runes de défense : `stepped` par rang de la voie `runes`
   * (+2/+3/+4), identique à l'effet DEF que la rune confère au maître.
   */
  def?: number | ScalingValue;
  /** PV supplémentaires PAR NIVEAU du maître (ex. Grande taille → +2/niveau). */
  hitPointsPerLevel?: number;
  /** Bonus PLAT aux DM au contact (ex. Grande taille → +1, Puissant → +2). */
  meleeDamageFlat?: number;
  /** Dé supplémentaire aux DM au contact, au format richText (ex. Arme à deux mains → `1d4°`). */
  meleeDamageDice?: string;
  /**
   * Le jet d'ATTAQUE de la créature devient un DÉ BONUS (PER-74, invocation d'élémentaire, branche
   * eau/acide, p. 157 : « dé bonus en attaque »). Reporté sur `CreatureProfile.attack.bonusDie` par
   * `applyCreatureUpgrades`. Absent/`false` = aucun changement.
   */
  attackBonusDie?: boolean;
  /**
   * Attaque SUPPLÉMENTAIRE octroyée (ex. Baliste → attaque à distance). Le DM est un dé + la
   * caractéristique de la CRÉATURE `damageAbility` (baked en nombre par le résolveur, car le DM
   * d'un compagnon se résout sinon contre le maître). Rendue en chip d'attaque distinct.
   */
  extraAttack?: { label: string; damageDice: string; damageAbility?: AbilityId; ranged?: boolean };
  /**
   * RÉDUCTION DE DÉGÂTS accordée à la CRÉATURE (PER-74, chevalier dragon r4, p. 147 : « son drake
   * obtient une réduction des DM contre le feu de 10 »). Jusqu'ici les RD ne se posaient que sur le
   * PERSONNAGE (`Feature.damageReduction`) ; ce canal les porte sur une créature liée, cross-voie
   * comprise (`targetPaths`). Rendue en PUCE dans le cadre « Défense » de la mini-fiche, avec la même
   * `DefenseBadge` que les RD du personnage et celles du bestiaire. Cumulée si plusieurs
   * améliorations en apportent. Absent = aucune RD ajoutée.
   */
  damageReduction?: DamageReduction | DamageReduction[];
  /**
   * CAPACITÉS SPÉCIALES ajoutées à la créature (PER-74, chevalier dragon r8, p. 148 : le Souffle
   * enflammé du drake). Même modèle que `CreatureProfile.specialAbilities` (nom + verbatim +
   * `richText` résolu contre le maître) : une capacité de rang du MAÎTRE peut ainsi enrichir la
   * mini-fiche de SA créature, ce qui est la place naturelle d'une attaque de zone que la créature
   * exécute elle-même. AJOUTÉES à celles du profil de base (jamais substituées). Absent = aucune.
   */
  specialAbilities?: CreatureSpecialAbility[];
  /** Note libre ajoutée à la fiche de la créature (ex. Vol, « doué de parole »). */
  note?: string;
}

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
   * Accès d'armure amélioré octroyé UNIQUEMENT lorsque cette option est retenue (PER-236). Miroir,
   * porté par l'OPTION, de l'effet `armor-access` habituellement posé inconditionnellement sur
   * `Feature.effects` (barbare Tour de force, chevalier Autorité naturelle — PER-81). Sert au cas où
   * un même choix oppose un bénéfice d'armure à un autre bénéfice sans rapport : ex. Guerrier « Armure
   * lourde » (resistance-r3, p. 90) oppose « +1 en DEF » à « port de l'armure de plaque » ; seule la
   * seconde option doit débloquer l'accès. Agrégé aux effets `armor-access` des capacités par
   * `armorAccessEffects` (armorRestrictions.ts) — donc soumis au même relèvement de port (PER-80/82)
   * et d'usage par voie d'origine, y compris `hybridClassRaises` (PER-86). Absent = aucun accès.
   */
  armorAccess?: ArmorAccessEffect;
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
   * Absent = aucun.
   *
   * `magic: true` marque un **bonus de magie** au sens du livre (PER-134) : ce n'est pas un bonus
   * de compétence, et il ne se cumule PAS avec le bonus de magie d'un objet magique sur le même
   * test — on retient le meilleur (note de bas de page des Tatouages, p. 80). Arbitré par
   * `resolveTestBonus` avec les apports aux tests des objets portés (`ItemTestBonuses`, PER-275).
   */
  abilityTestBonus?: { ability: AbilityId; value: number; magic?: boolean };
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
   * Cette option retenue fait porter le NOM de `creatureProfile` par un choix `free-text` sœur, ciblé
   * par `Feature.creatureNameFromChoice` (ex. druide, Grand félin : option « Libre » → champ « Nom du
   * grand félin »). Absent/`false` = le nom fixe de `creatureProfile` s'applique tel quel.
   */
  useFreeTextName?: boolean;
  /**
   * AMÉLIORATIONS apportées à la CRÉATURE de la même voie lorsque cette option est retenue
   * (PER-94, ex. Golem supérieur, golem-r5, p. 100) — appliquées PAR-DESSUS le profil de base
   * (`golem-r2`) par `applyCreatureUpgrades`, et CUMULÉES si plusieurs options sont retenues (une
   * par voie de forgesort au rang 5). À DISTINGUER de `creatureProfile` (qui REMPLACE le profil,
   * ex. Monture fantastique) : ici on n'ajoute que des deltas chiffrés à un profil existant. Le dé
   * bonus reste porté séparément par `creatureAbilityBonusDie`. Absent = aucune amélioration.
   */
  creatureUpgrade?: CreatureUpgrade;
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
   * AFFICHAGE : quand une option est retenue, le descriptif de la capacité RAYE (barré + grisé) les
   * paragraphes qui décrivent les options NON retenues — repérés par leur préfixe « <libellé option> :
   * … ». Sert aux capacités « choisir l'une des deux » dont le texte détaille chaque branche (ex.
   * drakonide-r4 : Fureur drakonide / Ailes puissantes). Réutilise le visuel du bonus supprimé du bâton
   * archimage (`text.disabled` + `line-through`). Sans effet tant qu'aucune option n'est retenue.
   * Absent = descriptif rendu tel quel (aucun rayage).
   */
  strikeUnchosenParagraphs?: boolean;
  /**
   * AFFICHAGE : quand une (seule) option est retenue, le NOM affiché de la capacité DEVIENT le libellé
   * de cette option (partout : carte, modale de détail, wizard, montée de niveau — via
   * `useDeclinedFeatureName`), au lieu du nom générique « X / Y ». Comme le nom porte alors le choix, la
   * puce de valeur du choix est masquée dans la carte (`FeatureChoiceField` mode display). Sert aux
   * capacités « choisir l'une des deux » (ex. drakonide-r4 : « Fureur drakonide » ou « Ailes puissantes »).
   * Sans effet si aucune option (ou plusieurs) n'est retenue. Absent = nom générique conservé + puce visible.
   */
  nameFromChosenOption?: boolean;
  /**
   * Choix RÉPÉTABLE : le joueur retient PLUSIEURS options DISTINCTES, le nombre
   * autorisé étant déterminé par la progression (`repeat`). Absent = choix simple
   * (une seule option). La valeur persistée à cette position est alors un TABLEAU
   * d'ids d'options (cf. `FeatureChoiceSelection`).
   */
  repeat?: ChoiceRepeat;
  /**
   * Rang de la VOIE HÔTE à partir duquel TOUTES les options sont acquises d'office (PER-74, Héros
   * célèbre, prestige-heros-r6, p. 142 : « Choisissez entre héros du peuple et héros du royaume (…).
   * À partir du rang 8, vous êtes à la fois le héros du peuple ET celui du royaume ! »). Quand le
   * personnage atteint ce rang dans la voie de la capacité, l'UI affiche TOUTES les options comme
   * retenues (quelle que soit la sélection stockée) et le choix n'est plus « à faire ». Le choix reste
   * NARRATIF (aucun effet chiffré différencié) ; ce champ ne pilote qu'un affichage. Absent = choix
   * borné à une seule option quel que soit le rang.
   */
  allOptionsAtPathRank?: number;
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

/**
 * PER-74 — Choix d'une ARME PARMI CELLES QUE LE PERSONNAGE POSSÈDE (voie de l'arme liée, p. 147 :
 * « Le personnage choisit une arme et se lie avec l'objet par un rituel informel »). Le domaine
 * n'est pas un catalogue figé mais l'INVENTAIRE du personnage, résolu à l'affichage
 * (`ownedWeaponsForChoice`) : seules les lignes d'arme (catalogue ou variante) sont proposées.
 *
 * VALEUR PERSISTÉE : l'`instanceId` de la ligne quand elle en a un, sinon son `itemId` (ou
 * `custom:<nom>` pour un objet libre) — cf. `boundWeaponSelectionValue`. Le résolveur
 * (`boundWeaponLine`) fait correspondre d'abord l'`instanceId`, puis, à défaut, la PREMIÈRE ligne
 * de même `itemId` : deux exemplaires identiques de la même arme ne sont donc pas distingués, ce
 * qui est sans conséquence de jeu (ils ont les mêmes stats).
 *
 * Le lien est un choix de CONSTRUCTION (puce orange, modifiable en mode édition), conformément au
 * livre : « une fois par niveau, le personnage peut créer un lien avec une nouvelle arme ».
 */
export interface OwnedWeaponFeatureChoice extends FeatureChoiceBase {
  kind: 'owned-weapon';
}

/**
 * Choix de TEXTE LIBRE purement NARRATIF (PER-175) — sans aucun effet mécanique. Ex. le type
 * d'animal d'un familier fantastique (Animal céleste / mort-vivant : « rat, chat, corbeau… »),
 * laissé au RP. OPTIONNEL : jamais compté « à faire » (pas de badge « Choisir »). Typiquement
 * gardé derrière un `visibleIfOption` (n'apparaît que pour les options concernées). Persisté
 * comme une simple chaîne dans le slot de `featureChoices` (comme l'id d'une option).
 */
export interface FreeTextFeatureChoice extends FeatureChoiceBase {
  kind: 'free-text';
  /** Exemple/placeholder dans le champ (ex. « rat, chat, corbeau… »). */
  placeholder?: string;
  // `note` (précision sous le champ, ex. décision RP à convenir avec le MJ) est portée par
  // `FeatureChoiceBase` : tous les types de choix y ont droit.
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

/**
 * Taxonomie des compagnons (PER-175) — nature de la créature attachée au personnage.
 * Portée par le `CreatureProfile` (pas par la capacité) pour couvrir aussi les profils
 * venus d'une OPTION de choix (monture/familier fantastique). Valeurs fermées, code anglais :
 *  - `familiar`  : petit compagnon lié, souvent magique (familier du magicien/druide, les
 *                  12 familiers fantastiques) ;
 *  - `mount`     : monture (fidèle monture, monture magique, monture fantastique) ;
 *  - `companion` : allié / serviteur PNJ, ni familier ni monture (écuyer du chevalier) ;
 *  - `summon`    : créature invoquée, magique et/ou temporaire (golem, démon, zombie,
 *                  serviteur invisible, arbre animé) ;
 *  - `animal`    : compagnon animal / bête liée non magique — catégorie que CO2 distingue
 *                  du familier (loup du rôdeur, panthère puis grand félin du druide/fauve).
 *
 * PRÉSENCE ⟂ TAXONOMIE : le `companionType` ne présume PAS de la présence. Le gating de
 * présence (bloc affiché seulement quand « invoqué ») est piloté SÉPARÉMENT par un effet
 * d'activation TEMPORAIRE (`companionPresent` dans `src/lib/character/companions.ts`, marqueur
 * PER-235) — et ce marqueur s'applique à des compagnons de types variés, pas seulement aux
 * `summon` : le familier du magicien (`familiar`) est présence-gaté (p. 96, « le maître pourra
 * à nouveau invoquer son familier »), tandis que le golem (`summon`) est permanent et le zombie
 * (`summon`) est multi-instances. Les deux axes sont donc indépendants : aucune implication
 * « temporaire ⇒ `summon` » ni l'inverse.
 */
export const COMPANION_TYPES = ['familiar', 'mount', 'companion', 'summon', 'animal'] as const;
export type CompanionType = (typeof COMPANION_TYPES)[number];

export interface CreatureProfile {
  /** Nom de la créature (ex. « Golem »). */
  name: string;
  /** Mention de nature/type si le livre la donne (ex. « Créature non vivante »). */
  type?: string;
  /**
   * Taxonomie du compagnon (PER-175) : familier / monture / allié PNJ / invocation. Voir
   * `CompanionType`. Absent = créature non encore classée (ne devrait pas rester après la
   * passe d'annotation). Consommé par `listCompanions` (`CompanionEntry.companionType`).
   */
  companionType?: CompanionType;
  /**
   * Clé de DÉDOUBLONNAGE du compagnon (PER-363), pour les rares voies qui octroient PLUSIEURS
   * compagnons INDÉPENDANTS pouvant être actifs SIMULTANÉMENT (voie de l'invocation majeure, p. 158 :
   * Monture fantôme r4, seule OU en même temps qu'un futur second compagnon de la même voie) — deux
   * invocations distinctes, pas une créature qui « monte en gamme ». `listCompanions` ne garde
   * normalement qu'UN compagnon par VOIE (le rang le plus élevé actif) ; poser ici un identifiant
   * DISTINCT par rang (ex. l'id de la capacité elle-même) fait sortir ce rang du dédoublonnage
   * partagé de sa voie. Absent = `feature.pathId` (comportement historique, un seul compagnon par
   * voie) — à laisser absent dans l'immense majorité des cas.
   */
  companionSlot?: string;
  /**
   * La créature EST une FORME que le PERSONNAGE prend lui-même (PER-74) — ce n'est pas un
   * compagnon distinct, mais une transformation (ex. Transformation en loup, voie du lycanthrope
   * p. 131 : « Le personnage peut prendre la forme d'un loup »). Le stat-block est rendu EN LIGNE
   * dans la carte de la capacité (via `displayCreatureProfile`, comme n'importe quel profil), mais
   * la créature n'apparaît PAS dans la section « Compagnons » (`listCompanions` saute les profils
   * `transformation`). Mutuellement exclusif de `companionType` (une forme n'est pas un compagnon).
   * Absent = créature normale (compagnon si un `companionType` est posé).
   */
  transformation?: boolean;
  /**
   * Cette « invocation » est en réalité un ADVERSAIRE de combat, pas un allié (PER-363, Chasseur
   * ailé, voie de l'invocation majeure r7, p. 160 : le livre le décrit au service du personnage
   * tant que sa mission n'est pas jouée, mais dès qu'il entre en scène « il l'attaque jusqu'à ce
   * qu'il soit vaincu »). `listCompanions` saute TOUJOURS un profil `summonedEnemy` (jamais affiché
   * dans la section « Compagnons », ni côté joueur ni côté roster MJ) : son interrupteur d'invocation
   * (`Feature.effects`, `activation.kind: 'temporary'`) sert plutôt à l'AJOUTER comme ennemi dans
   * l'écran de combat (MJ uniquement, cf. `HAWK_HUNTER_CUSTOM_CREATURE` dans `majorSummoningPath.ts`)
   * — jamais sur la fiche du personnage. Mutuellement exclusif de `companionType` (mêmes raisons que
   * `transformation`, mais pour un adversaire plutôt qu'une forme). Absent = compagnon ordinaire.
   */
  summonedEnemy?: boolean;
  /**
   * Ce profil REMPLACE le compagnon déjà octroyé par ces VOIES (PER-74, chevalier dragon r7, p. 148 :
   * « Le drake atteint sa pleine maturité » — le stat-block adulte se substitue à celui du drake
   * juvénile obtenu par Monture fantastique, voie `cavalier`). À DISTINGUER de `CreatureUpgrade`, qui
   * ajoute des DELTAS chiffrés : ici le livre réécrit le bloc entier, on remplace donc le profil au
   * lieu d'empiler des bonus qui divergeraient du tableau imprimé.
   *
   * Le compagnon remplacé garde son IDENTITÉ : `listCompanions` conserve la capacité PORTEUSE
   * d'origine (donc la clé de PV et l'état « en selle », qui survivent au franchissement du rang) et
   * n'échange que le profil ; le rang remplaçant, lui, n'ajoute AUCUN compagnon distinct — sans quoi
   * la même créature apparaîtrait deux fois dans la section « Compagnons ». Les améliorations
   * (`CreatureUpgrade`) continuent de s'appliquer par-dessus, résolues contre la voie porteuse.
   * Absent = ce profil est un compagnon à part entière.
   */
  replacesCreatureFromPaths?: string[];
  /**
   * Taille de la créature (PER-175) — même échelle que le bestiaire (`CreatureSize`, p. 260).
   * Rendue en pastille « tag » (info-bulle « Taille ») à droite du nom, comme le bestiaire.
   * Absente = pas de pastille. Ex. familiers fantastiques : `minuscule` (stat-block générique
   * p. 132).
   */
  size?: CreatureSize;
  /**
   * Caractéristiques dérivées du MAÎTRE (PER-175), pour les créatures « clones/copies » dont
   * le livre exprime les valeurs relativement au personnage (ex. Minimoï, p. 135 : « AGI [AGI
   * du personnage + 2] ; autres = celles du personnage - 2 »). Chaque entrée est un DELTA
   * ajouté à la caractéristique homonyme du maître ; une caractéristique absente d'ici retombe
   * sur `abilities` (valeur fixe). Résolu à l'affichage (`resolveCreatureAbilities`) — comme
   * `defense`/`initiative` recopiées du maître. Coexiste avec `abilities` : le Minimoï a FOR
   * fixe (`abilities.FOR = -3`) et le reste en `abilitiesFromMaster`.
   */
  abilitiesFromMaster?: Partial<Record<AbilityId, number>>;
  /**
   * Capacités spéciales de la créature (PER-175) — MÊME modèle que le bestiaire
   * (`CreatureSpecialAbility` : nom + `text` verbatim + `richText` optionnel). Rendues sous la
   * ligne de stats via `RichInline`, dés/formules/`rang`/`niveau` résolus contre le MAÎTRE
   * (comme `attack.damage`). Remplacent les particularités RÈGLE jadis entassées en texte brut
   * dans `note` (poison, immunité, drain, sommeil…) — qui n'étaient donc pas parsées. `note`
   * reste réservé au pur descriptif sans règle (déplacement, « doué de parole »).
   */
  specialAbilities?: CreatureSpecialAbility[];
  /**
   * RÉDUCTIONS DE DÉGÂTS de la créature (PER-74), rendues en PUCES dans le cadre « Défense » de la
   * mini-fiche — même `DefenseBadge` que les RD du personnage et celles du bestiaire. Soit propres au
   * profil, soit accordées par une capacité du maître via `CreatureUpgrade.damageReduction` (chevalier
   * dragon r4, p. 147 : « son drake obtient une réduction des DM contre le feu de 10 »), auquel cas
   * `applyCreatureUpgrades` les fusionne ici. Absent = aucune RD.
   */
  damageReduction?: DamageReduction | DamageReduction[];
  /**
   * TEXTE D'ORIGINE verbatim de la créature + sa page source (PER-175), affiché en bas de la
   * mini-fiche (comme la description du bestiaire) pour que chaque stat/capacité DÉRIVÉE reste
   * traçable au livre. Ex. familier fantastique : la description complète de l'entité
   * `FantasticFamiliar` (p. 133-136), d'où sont tirés l'attaque, le poison, l'immunité, etc.
   */
  verbatimSource?: { text: string; sourcePage: SourcePage };
  /**
   * Caractéristiques FIXES de la créature. Généralement les 7, mais PARTIEL possible quand
   * certaines sont dérivées du maître (`abilitiesFromMaster`, ex. Minimoï : seul FOR est fixe).
   * ABSENT pour les créatures que le livre décrit SANS bloc de caractéristiques — seulement
   * Init/DEF/PV/Att/DM (ex. écuyer du chevalier, `noblesse-r2`) : la mini-fiche omet alors la
   * grille. Le rendu passe TOUJOURS par `resolveCreatureAbilities` (fusion fixe + maître).
   */
  abilities?: Partial<Record<AbilityId, number>>;
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
   *
   * `bonusDie` (PER-74, élémentaire d'eau/acide, invocation d'élémentaire p. 157) : la créature
   * lance CE jet d'attaque en dé bonus (« 2d20, garde le meilleur »), rendu par un `BonusDieBadge`
   * sur la mini-fiche — analogue de `LowHpAttackDieEffect` côté personnage, mais permanent tant que
   * la créature est affichée (aucun seuil de PV). Absent/`false` = jet normal.
   */
  attack?: { label?: string; fromMaster?: DerivedStatId; value?: string; damage?: string; bonusDie?: boolean };
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
     * ABSENT = ILLIMITÉ (PER-74, Gangue de glace, voie du gel r8, p. 158 : le sort ne pose
     * aucune limite de cibles simultanées et l'app ne suit pas de cible à cible, le joueur en
     * ajoute autant qu'il veut) — `resolveCompanionInstanceLimit` renvoie alors `Infinity`.
     */
    limit?: { base: number; rank: number; classIds: string[] };
    /**
     * Verbe du bouton d'ajout affiché sur la carte du rang (PER-74). Défaut « Invoquer »
     * (zombie, familier…) ; à surcharger pour un compagnon qui n'est pas VRAIMENT invoqué
     * (ex. « Ajouter une gangue », Gangue de glace — l'objet est posé, pas conjuré).
     */
    addLabel?: string;
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
 * Pouvoir PROPRE au familier (PER-74) — le pouvoir mineur/supérieur N'EST PAS une capacité de
 * profil empruntée (pas de `grants`/`featureId`), mais une aptitude inventée pour ce familier
 * (ex. Toile et Poison de l'araignée géante, Clone du minimoï, Télépathie du pseudo-dragon,
 * transformation du diablotin). Ce descripteur permet de le RENDRE EN CARTE — au même gabarit que
 * les capacités conférées — au lieu d'un simple encadré : titre + hexagones d'action + corps enrichi
 * (+ compteur d'usage via `usageLimit` du pouvoir quand une fréquence chiffrée existe).
 */
export interface FamiliarOriginalPower {
  /** Nom court servant de TITRE à la carte (ex. « Toile », « Poison », « Clone »). */
  name: string;
  /** Types d'action pour les hexagones de marqueur (ex. `['L']`). Absent = pouvoir passif, aucun marqueur. */
  actionTypes?: ActionType[];
  /**
   * Corps enrichi (mini-langage richText : dés `{1d6}`/`{1d4°}`, formules `[=INT]`…) SANS le libellé de
   * tête « Nom (X). » — celui-ci est relocalisé en titre + hexagone. Rendu quand les stats du perso sont
   * disponibles ; sinon repli sur le `text` verbatim du pouvoir. Absent = on rend `text` tel quel.
   */
  richText?: string;
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
    /** Descripteur de carte quand le pouvoir est PROPRE au familier (pas une capacité de profil). */
    original?: FamiliarOriginalPower;
    /**
     * Limite d'usage MÉCANISÉE du pouvoir conféré (PER-74), parsée de la fréquence verbatim
     * (« 2 fois par jour » → `{ max: 2, reset: 'day' }` ; « une fois par combat » → `{ max: 1,
     * reset: 'combat' }`). Le pouvoir est CONFÉRÉ par le familier : il s'utilise dans cette limite
     * SANS coût en mana (arbitrage proprio 2026-07-24). Absent = pouvoir non compté (propre au
     * familier sans fréquence, ou à volonté). Le compteur est suivi sous `familiarPowerUsedKey`.
     */
    usageLimit?: { max: number; reset: UsageResetTrigger };
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
    /** Descripteur de carte quand le pouvoir supérieur est PROPRE au familier (pas une capacité de profil). */
    original?: FamiliarOriginalPower;
    /** Caractéristique bénéficiant du bonus de +1 (rang 7). */
    abilityBonus: AbilityId;
    /** Limite d'usage MÉCANISÉE du pouvoir supérieur (PER-74) — mêmes règles que `minorPower.usageLimit`. */
    usageLimit?: { max: number; reset: UsageResetTrigger };
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
   * Compteur ACCUMULATEUR (PER-325, demi-ogre « points de violence », p. 12) : à l'INVERSE d'une réserve
   * « usages restants » (démarre plein, se dépense), il démarre à ZÉRO et s'ACCUMULE, SANS plafond
   * (`max`/`maxBy*` ignorés). Rendu dans « État du personnage » par une barre dédiée (`ViolencePointsBar`)
   * calquée sur les `GaugeRow` (cap d'icône + barre pleine + −/+/reset, un seul chiffre, sans chevron),
   * toujours visible tant que la capacité est acquise (afin de pouvoir AJOUTER des points). Sur la CARTE
   * de la capacité, le compteur détaillé cède la place à un simple bouton d'ajout (cf. `addLabel`), la
   * barre s'occupant du reste. Défaut `false` (réserve classique « restant/max »).
   */
  accumulator?: boolean;
  /**
   * Libellé du bouton d'ajout d'un point sur la carte de la capacité, pour un compteur `accumulator`
   * (ex. « Ajouter un point de violence »). Défaut « Ajouter un point ». Ignoré hors accumulateur.
   */
  addLabel?: string;
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
   * Cadence CONDITIONNELLE à la possession d'une AUTRE capacité (PER-74, voie des ombres p. 139).
   * Certaines capacités lèvent ou améliorent leur fréquence quand le personnage connaît déjà une
   * capacité citée : Ombre mouvante (r6) → usage ILLIMITÉ s'il connaît Disparition (assassin-r4) ;
   * Cape d'ombre (r7) → 1×/combat au lieu de 1×/jour s'il connaît Manteau d'ombre (sombre-magie-r4).
   * Quand le personnage possède `featureId` : `unlimited` → la limite tombe et le compteur est MASQUÉ
   * de l'affichage (plus rien à suivre) ; sinon `resetOn` REMPLACE le cycle de recharge. Sans possession,
   * la cadence de base (`max` + `resetOn` ci-dessus) s'applique. Résolu par `effectiveUsageResetOn` /
   * `isUsageCounterHidden` (effects.ts).
   */
  conditionalFrequency?: {
    /** Id de la capacité citée dont la POSSESSION modifie la cadence. */
    featureId: string;
    /** La possession rend l'usage ILLIMITÉ → compteur masqué de l'affichage. */
    unlimited?: boolean;
    /** La possession REMPLACE le cycle de recharge (ex. `'day'` → `'combat'`). */
    resetOn?: UsageResetTrigger;
  };
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
  /**
   * Compteur d'ACCUMULATION (PER-74, Botte mortelle du duelliste r8, p. 141) : au lieu d'un DÉCOMPTE
   * (max → 0, « absence = plein »), le compteur part de 0 et MONTE de `cost` à chaque cran, borné à
   * `max`. Convention INVERSÉE : « absence = 0 » (rien accumulé) ; le reset (bouton manuel ou
   * déclencheur `resetOn`) le ramène à 0. Sert à suivre une ressource qui se GAGNE en jeu (points de
   * préparation de la Botte mortelle : +1 par attaque réussie contre la cible défiée, dépensés d'un
   * coup, remis à 0 au repos). Rendu sans « épuisé » ni « /max » (le nombre nu suffit). Défaut :
   * `false` (compteur classique décroissant). Incompatible avec les jauges d'état → à combiner avec
   * `hideFromStatusPanel`.
   */
  countUp?: boolean;
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
 * Nature du poison appliqué à une arme (voie du maître des poisons, p. 143, PER-74).
 *  - `quick` : « poison rapide » (r5) — la première attaque réussie inflige des DM supplémentaires.
 *  - `weakening` : « poison affaiblissant » (r6) — la première attaque réussie inflige l'état Affaibli.
 * Codes neutres en anglais (les libellés français sont dans `POISON_KIND_LABELS`).
 */
export type PoisonKind = 'quick' | 'weakening';

/** Libellés français des natures de poison (affichés au joueur). */
export const POISON_KIND_LABELS: Record<PoisonKind, string> = {
  quick: 'Poison rapide',
  weakening: 'Poison affaiblissant',
};

/**
 * GESTION DE POISON APPLIQUÉ AUX ARMES (voie du maître des poisons, p. 143, PER-74). Déclare qu'une
 * capacité débloque la possibilité d'enduire un nombre limité d'armes de l'inventaire ; l'ÉTAT (quelles
 * armes, quel poison, dépensé ou non) vit dans `Character.poisonedWeapons` (état de jeu transitoire, hors
 * mode « Modifier »). Porté sur la capacité de RANG 5 (« Poison rapide ») ; le type `weakening` (r6) est
 * débloqué par la possession de `weakeningUnlockedBy`. Absent = la capacité ne gère aucun poison d'arme.
 */
/**
 * MODIFICATION PHYSIQUE D'ARMES octroyée par une capacité (PER-284) — l'arquebusier « bricole » des
 * armes précises de son inventaire, et c'est au JOUEUR de désigner lesquelles :
 *  - Arme à répétition (`artilleur-r2`, p. 62) : « L'arquebusier modifie jusqu'à DEUX armes de son
 *    choix pour les doter de chargeurs. » ;
 *  - Canon double (`artilleur-r4`, p. 63) : « L'arquebusier peut bricoler ses armes à poudre (mais
 *    pas une couleuvrine) pour les doter d'un second canon. » (aucun plafond annoncé).
 *
 * La spec décrit QUOI poser, sur QUELLES armes et COMBIEN au plus ; le champ correspondant est posé
 * sur l'INSTANCE d'arme choisie (`EquipmentRef.magazine` / `doubleBarrel`), parce que la
 * modification appartient à cette arme-là et lui survit au déséquipement. Rendu par
 * `WeaponModificationField` sous la carte du rang, résolu par `weaponLoading.ts`.
 */
export interface WeaponModificationLoadout {
  /** Champ d'instance posé sur la ligne d'équipement retenue. */
  modification: 'magazine' | 'doubleBarrel';
  /**
   * Armes éligibles : `reloadable` = toute arme que le livre fait recharger (arbalètes ET armes à
   * poudre — la variante « Arbalétrier » p. 62 doit pouvoir doter ses arbalètes d'un chargeur) ;
   * `firearm` = armes à poudre seulement (Canon double parle de « ses armes à poudre »).
   */
  scope: 'reloadable' | 'firearm';
  /** Nombre maximal d'armes modifiées (« jusqu'à deux », p. 62). Absent = aucun plafond annoncé. */
  maxWeapons?: number;
  /** Libellé de la section, affiché au joueur (ex. « Armes dotées d'un chargeur »). */
  label: string;
}

export interface PoisonWeaponLoadout {
  /** Nombre maximal d'armes enduites simultanément (« trois au maximum », p. 143). */
  maxWeapons: number;
  /**
   * Id de la capacité dont la POSSESSION débloque le poison `weakening` (« Poison affaiblissant » = r6).
   * Tant qu'elle n'est pas acquise, seul le poison `quick` est disponible. Absent = `quick` seulement.
   */
  weakeningUnlockedBy?: string;
}

/**
 * SUBSTITUTION de caractéristique (PER-163) : remplacer `from` par `to` dans les formules d'un sort
 * REPRODUIT/EMPRUNTÉ, quand le lanceur effectif utilise une autre caractéristique de magie (forgesort →
 * INT). Voir `Feature.reproducedAbilitySubstitutions`. Par défaut, la substitution n'est effective que
 * si `to` est strictement plus avantageuse ; elle est alors signalée à l'affichage. `unconditional`
 * (PER-370, voies de mystique, p. 166 : « les sorts des voies de mystique sont tous indexés sur le
 * CHA ») FORCE la substitution quel que soit l'écart entre les deux caractéristiques — la règle n'est
 * pas « la plus avantageuse », elle est impérative — et la marque de substitution reste affichée.
 */
export interface AbilitySubstitution {
  from: AbilityId;
  to: AbilityId;
  unconditional?: boolean;
}

/**
 * CURSEUR DE DURÉE CHOISIE PAR LE JOUEUR À L'INCANTATION, dont la difficulté du test suit
 * directement (Fuite en avant, magie du temps r4, p. 164 : « contre une difficulté égale à
 * [10 + durée choisie en min] », retour propriétaire PER-367). Premier rang du livre où la
 * difficulté dépend d'un choix libre du joueur (pas d'une carac ni d'un rang) : aucune primitive
 * antérieure, `difficulté = base + durée`. Rendu = curseur MUI borné à `sliderMax` (repère RAW mais
 * non contraignant) + champ numérique libre pour dépasser le curseur (`ChosenDurationDifficultyField`,
 * FeaturesByPath.tsx). AUCUNE persistance sur `Character` : le choix se refait à chaque incantation,
 * comme au livre — état local au composant.
 */
export interface ChosenDurationDifficulty {
  /** Borne haute du CURSEUR (repère visuel ; le champ numérique libre permet d'aller plus loin). */
  sliderMax: number;
  /** Terme constant de la formule (`difficulté = base + durée`). */
  base: number;
  /** Unité affichée (français), ex. « minutes ». */
  unit: string;
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
  /**
   * Octrois FIXES de capacités d'une AUTRE voie (PER-323 : cambion « Enfant des ténèbres » octroie
   * Ténèbres ; « La belle et la bête » octroie Beauté de la succube, puis Aspect du démon au niv. 10).
   * À la différence de l'emprunt par CHOIX (`feature-from-path`, où le joueur pioche une capacité
   * éligible), la capacité octroyée est IMPOSÉE. Chaque octroi entre dans le pool effectif du
   * personnage (ses `effects` comptent) et se rend comme une capacité EMPRUNTÉE sous la voie hôte, sans
   * surcoût d'armure (la cible est affranchie de la pénalité d'incantation en armure — sur la carte
   * octroyée ET sur la version native si le personnage la possède aussi par sa voie d'origine). Si le
   * personnage possède DÉJÀ nativement une cible, l'octroi n'a PAS lieu (aucun doublon) ; le livre
   * prévoit alors un autre bénéfice (ex. lancement en action gratuite), décrit par `freeActionIfOwned`.
   */
  grantedFeatures?: {
    /** Id de la capacité octroyée (ex. `sombre-magie-r1` = Ténèbres, `demon-r2` = Beauté de la succube). */
    featureId: string;
    /**
     * Niveau de personnage minimal pour que l'octroi ait lieu (ex. `10` pour Aspect du démon, obtenu
     * « à partir du niveau 10 »). Absent = octroi dès l'acquisition de la capacité hôte.
     */
    minLevel?: number;
    /**
     * Le SORT octroyé NE donne PAS le +1 PM habituel d'un sort connu (« sans dépenser de mana… il n'en
     * obtient pas non plus lorsqu'il acquiert cette capacité », p. 10). Retire aussi ce +1 PM si le
     * personnage possède la même capacité par sa voie d'origine (ex. voie du démon).
     */
    noMana?: boolean;
    /**
     * Écarte le « bonus de compétence associé » de la capacité octroyée : ses effets `test-bonus` ne
     * comptent pas dans le moteur ni ne s'affichent (le cambion obtient le sort mais PAS l'érudition
     * occulte qui accompagne la capacité native — p. 10).
     */
    suppressTestBonus?: boolean;
    /**
     * Sous-chaîne (verbatim) du texte de la capacité octroyée à partir de laquelle la phrase décrivant
     * le « bonus de compétence associé » commence : sur la carte EMPRUNTÉE (et seulement là), cette
     * queue de texte est rendue BARRÉE (le sort natif reste intact). N'a de sens qu'avec
     * `suppressTestBonus`. Ex. Ténèbres : `'En plus de ce sort'`.
     */
    suppressTextMarker?: string;
    /**
     * Si le personnage possède DÉJÀ nativement `featureId` : au lieu de l'octroi (supprimé pour éviter
     * le doublon), l'action de lancement de la capacité NATIVE est remplacée par ces types (ex. `['G']`
     * = gratuite). Donnée consommée au rendu de la carte native.
     */
    freeActionIfOwned?: ActionType[];
  }[];
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
   * ÉLÉMENT DRACONIQUE de la capacité, dérivé d'un choix `option` porté par une AUTRE capacité
   * (PER-74). Rend la capacité DÉCLINABLE : son `name`, son `richText`, les libellés de ses effets et
   * les textes de ses capacités spéciales de créature peuvent porter des TOKENS de déclinaison
   * (`%noun%`, `%of%`, `%toThe%`, `%theNoun%`, `%breathAdj%`, `%breathPhrase%`, `%swordAdj%`,
   * `%swordVerbPhrase%`, `%color%`, cf. `DragonElement`), et une RD peut tirer sa portée de l'élément
   * (`DamageReduction.scopeFromElement`).
   *
   * Sert la voie du chevalier dragon (p. 147), que le livre écrit « à partir des symboles liés au
   * dragon rouge, mais elle peut évidemment être déclinée pour d'autres couleurs » : la couleur est
   * choisie une fois pour toutes SUR LE DRAKE, au rang 5 de la voie du cavalier (Monture fantastique)
   * — d'où la lecture cross-capacité, sur le patron de `weaponFamiliesFromChoice.choiceFeatureId`.
   *
   * Les ids d'options du choix visé DOIVENT être des ids de `DragonElement` (= des
   * `ResistibleDamageType`). Absent = capacité non déclinable (cas général).
   *
   * MÉCANIQUE vs AFFICHAGE : sans couleur retenue, la mécanique reste INERTE (aucune RD, aucun bonus
   * de DM — décision propriétaire du 2026-08-04 : pas de repli implicite sur le feu), tandis que
   * l'AFFICHAGE retombe sur le texte IMPRIMÉ (le rouge), pour ne jamais montrer un token brut.
   * Cf. `resolveFeatureElement` / `declineText` (`src/lib/character/dragonElement.ts`).
   */
  elementFromChoice?: { choiceFeatureId: string; choiceIndex: number };
  /**
   * NOM affiché du profil de créature effectif, remplacé par la réponse d'un choix `free-text` (PER-175)
   * — sur le patron d'`elementFromChoice`, mais pour un nom LIBRE plutôt qu'une déclinaison. Sert le
   * grand félin du druide (fauve-r4, p. 115) : l'option « Libre » d'un choix `option` sœur (marquée
   * `FeatureChoiceOption.useFreeTextName`) fait apparaître un champ `free-text` où le joueur nomme sa
   * créature comme il le souhaite.
   *
   * Ne s'applique QUE si l'option retenue porte `useFreeTextName: true` — un texte saisi puis abandonné
   * en changeant d'option n'écrase pas le nom d'une autre option. Réponse vide/absente = on retombe sur
   * le nom fixe du profil de l'option (jamais un champ blanc affiché comme nom de créature).
   */
  creatureNameFromChoice?: { choiceFeatureId: string; choiceIndex: number };
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
   * AMÉLIORATION propagée à une CRÉATURE liée directement par cette capacité (PER-94) — cross-voie
   * possible via `targetPaths`. Ex. Runes de défense (`runes-r1`) qui octroie au golem le même bonus
   * de DEF `stepped` qu'à son maître. Cumulée par `applyCreatureUpgrades` avec les améliorations
   * portées par les options retenues (`FeatureChoiceOption.creatureUpgrade`). Absent = aucune.
   */
  creatureUpgrade?: CreatureUpgrade;
  /**
   * Attaque naturelle conférée par une FORME prise via cette capacité (PER-74) — morsure de la
   * forme hybride du lycanthrope. Donnée d'affichage, gatée par l'interrupteur de forme (cf.
   * `FormAttack`) : la carte d'attaque n'apparaît que forme active, et peut REMPLACER la carte
   * « Attaque à distance » quand la forme interdit le tir. Absent = aucune attaque de forme.
   */
  formAttack?: FormAttack;
  /**
   * PER-74 — CONDITION D'ARME EN MAIN pour que cette capacité d'ACTION soit jouable (flibustier
   * « Coup de crosse » / « Sabre au poing », p. 141-142). Purement VISUELLE (grisage + notice, patron
   * Voie du bouclier) ; la capacité reste acquise. Absent = aucune condition d'arme. Cf. `WieldRequirement`.
   */
  wieldRequirement?: WieldRequirement;
  /**
   * PER-74 — plafond d'armure propre à CETTE capacité (Métamorphose, voie de l'ours p. 152 : « ne
   * doit pas porter d'armure plus lourde que le cuir renforcé pour utiliser cette capacité »). Même
   * mécanisme que `Path.maxArmorId` (Voie du danseur de guerre) mais à la granularité d'UN RANG —
   * les autres rangs de la même voie de prestige (R4/R5/R7/R8 de l'ours) restent utilisables quelle
   * que soit l'armure portée. Résolu par `pathArmorDisabledFeatureIds`/`pathArmorDisabledReasons`
   * (armorRestrictions.ts), qui vérifient D'ABORD ce plafond, sinon retombent sur celui de la voie.
   * Absent = aucun plafond propre à cette capacité.
   */
  maxArmorId?: string;
  /**
   * Compteur d'usages limités (« utilisable N fois ») — déclare le maximum ; le
   * décompte courant est un état de jeu du personnage (`Character.usageCounters`).
   * Absent = la capacité n'a pas d'usage limité décompté.
   */
  usageCounter?: UsageCounter;
  /**
   * Curseur de durée choisie par le joueur à l'incantation, qui fixe la difficulté du test (cf.
   * `ChosenDurationDifficulty`). Absent = aucune difficulté de ce type sur cette capacité.
   */
  chosenDurationDifficulty?: ChosenDurationDifficulty;
  /**
   * Soin SUPPLÉMENTAIRE par dé de récupération dépensé lors d'un repos (Survie, rôdeur, p. 72 :
   * « s'il dépense 1 DR, il guérit 1d4° PV supplémentaire »). N'est accordé que si le PREMIER effet
   * conditionnel de la capacité est ACTIF (interrupteur « en milieu naturel » ON, cf. `isEffectActive`)
   * — sinon aucun bonus. Le dé (souvent évolutif « 1d4° », résolu par `scalingDie` au niveau + décalage
   * de cran) est LANCÉ à la table et saisi par le joueur dans la modale de repos (court ET long), puis
   * ajouté au soin de la dépense de DR. S'applique aussi bien à la capacité native qu'EMPRUNTÉE (l'octroi
   * demi-elfe, Le Compagnon). Absent = pas de bonus de soin au repos.
   */
  recoveryDieHealBonus?: {
    /** Dé du soin supplémentaire par DR (ex. `{ count: 1, die: 'd4', evolving: true }`). */
    dice: { count: number; die: Die; evolving?: boolean };
    /** Libellé du contexte requis, repris pour l'UI du repos (ex. « en milieu naturel »). */
    conditionLabel?: string;
    sourcePage?: number;
  };
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
   * EFFETS SITUATIONNELS (catalogue `SITUATIONAL_EFFECTS`) que cette capacité applique — malus/effets
   * NOMMÉS hors des 10 états fermés du glossaire (première : « Attaque invalidante », chasseur de prime
   * r7, p. 140). Data-only pour l'instant : la source unique du catalogue. L'APPLICATION/SUIVI en combat
   * relève du Combat Tracker (ticket dédié). Absent = la capacité n'applique aucun effet situationnel.
   */
  situationalEffectIds?: SituationalEffectId[];
  /**
   * BUFFS DE GROUPE (catalogue `BENEFICIAL_EFFECTS`) que cette capacité confère à « ses alliés et lui »
   * (PER-104) — symétrique de `situationalEffectIds`, du côté bénéfique. Déclarer l'id ici est ce qui
   * DÉBLOQUE la puce correspondante dans la palette de l'écran de MJ : elle n'apparaît que si un
   * personnage réclamé de la table possède la capacité (un groupe sans barde ni prêtre n'a rien à
   * poser). Absent = la capacité ne confère aucun buff de groupe.
   *
   * La part « porteur » du même buff reste modélisée sur la fiche par un `conditional-stat-bonus` à
   * interrupteur : les deux voies coexistent, l'arbitrage du double compte relève de PER-314.
   */
  groupBuffIds?: BeneficialEffectId[];
  /**
   * GESTION DE POISON APPLIQUÉ AUX ARMES (voie du maître des poisons, r5, p. 143, PER-74). Débloque, sous
   * cette capacité, une section « Poisons appliqués » : enduire jusqu'à `maxWeapons` armes de l'inventaire,
   * chacune d'un poison `quick` ou (si `weakeningUnlockedBy` acquis) `weakening`, dépensable à la première
   * attaque. L'état vit dans `Character.poisonedWeapons`. Absent = la capacité ne gère aucun poison d'arme.
   */
  poisonWeaponLoadout?: PoisonWeaponLoadout;
  /**
   * OBJET OCTROYÉ par cette capacité (PER-286) : la capacité Couleuvrine (`artilleur-r5`, p. 63)
   * commence par « L'arquebusier OBTIENT une couleuvrine » — l'objet arrive donc dans l'inventaire
   * à l'acquisition du rang, sans achat. `itemId` désigne l'objet du catalogue ; si les armes à
   * poudre sont interdites dans l'univers, c'est son `equivalentCrossbowId` qui est octroyé à la
   * place (« la couleuvrine par une baliste », p. 62) — la substitution est déjà en donnée.
   *
   * Voir `grantedEquipment.ts` : ajout automatique à la montée de niveau, et rappel dans
   * l'inventaire si l'objet manque (fiche permissive : on n'impose rien, on propose).
   */
  grantsEquipment?: { itemId: string };
  /**
   * ARMES À DEUX MAINS MANIABLES À UNE SEULE MAIN (PER-74) — Poigne de fer (voie du colosse, r7,
   * p. 149) : « Le colosse peut utiliser une arme à deux mains à une seule main (épée ou hache à
   * deux mains). » Sous cette capacité, une arme de CONTACT intrinsèquement à deux mains des
   * `weaponFamilies` déclarées se comporte comme une arme « à une ou deux mains » : le joueur
   * choisit sa prise (`WornState.grip`) et, tenue à une main, elle libère la seconde main (bouclier
   * ou seconde arme) au lieu de déclencher le conflit « les deux mains sont déjà prises ».
   *
   * Les FAMILLES sont explicites parce que le livre énumère (« épée ou hache ») : le catalogue
   * compte bien d'autres armes à deux mains (bâton, pique, fléau, faux…) que la capacité ne couvre
   * pas. Voir `oneHandableWeaponFamilies` (`equipment.ts`), qui agrège ce champ sur les capacités
   * acquises et se propage au comptage des mains, aux conflits de port et au combat à deux armes.
   * Absent = la capacité ne change aucune prise.
   *
   * `oneHandDamage` — SURCHARGE du dé de DM quand l'arme est tenue À UNE MAIN sous cette capacité
   * (PER-325, trait « Taille grande » du demi-ogre, p. 11) : « Il peut manier d'une seule main les
   * épées bâtardes et les épées à deux mains, et inflige alors 1d12 DM. » Le maniement à une main
   * RÉDUIT alors le dé natif (2d6 → 1d12). Une capacité de rang SUPÉRIEUR qui lève cette réduction
   * (demi-ogre r4 « Toujours plus lourd », p. 13 : plein dé natif à une main) déclare `weaponFamilies`
   * SANS `oneHandDamage` : la résolution (`oneHandDamageOverride`, equipment.ts) rend alors le dé natif
   * dès qu'UNE capacité couvrante n'impose pas de réduction. Absent = aucune surcharge (dé natif).
   */
  twoHandedInOneHand?: { weaponFamilies: WeaponFamily[]; oneHandDamage?: WeaponDamage };
  /**
   * MODIFICATION PHYSIQUE D'ARMES octroyée par cette capacité (PER-284) : débloque, sous elle, une
   * section où le joueur DÉSIGNE les armes de son inventaire à bricoler (chargeur de l'Arme à
   * répétition, second canon du Canon double). L'état vit sur les lignes d'équipement retenues
   * (`EquipmentRef.magazine` / `doubleBarrel`). Absent = la capacité ne modifie aucune arme.
   * Voir `WeaponModificationLoadout`.
   */
  weaponModification?: WeaponModificationLoadout;
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
  /**
   * SOUS-CATÉGORIE D'ICÔNE de cet objet — purement visuel (aucune règle CO2), mais porté par
   * la DONNÉE parce que c'est une propriété de l'objet du livre et non de son affichage : une
   * corde et un grappin sont tous deux de l'« équipement », et rien dans leurs règles ne
   * permet de les distinguer à l'œil.
   *
   * Absent = repli en cascade (cf. `itemIconId`) : sous-type d'arme DÉRIVÉ des règles pour une
   * arme (`weaponIconKind` — d'où l'inutilité d'annoter les armes une à une), sinon icône du
   * type d'objet. Une arme peut néanmoins déclarer ce champ pour surcharger sa dérivation.
   */
  icon?: ItemIconId;
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

/**
 * COÛT DE RECHARGEMENT d'une arme à distance (PER-284) — colonne « Notes complémentaires » de
 * la table des armes d'attaque à distance, p. 185 : arbalète de poing (« Action de mouvement
 * pour être rechargée »), arbalète légère (« Nécessite une action de mouvement pour être
 * rechargée »), arbalète lourde / pétoire / mousquet (« nécessite une action limitée pour être
 * rechargée »). Renseigné UNIQUEMENT sur les armes que le livre fait recharger — arbalètes et
 * armes à poudre ; absent sur les arcs, frondes et armes de jet, qu'aucune règle ne fait
 * recharger.
 *
 * Le livre déconseille explicitement de compter les MUNITIONS (p. 187 : « Nous vous conseillons
 * de ne pas tenir compte des dépenses de munitions, c'est fastidieux et il est souhaitable de ne
 * pas pénaliser les profils qui combattent à distance ») : il n'existe donc AUCUN stock de
 * projectiles dans l'application. Ce que ce champ permet de suivre, c'est un COMPTEUR de coups
 * prêts par ARME (`EquipmentRef.loaded`), donc l'état « chargée / déchargée », dont dépendent six
 * capacités d'arquebusier (Arme à répétition, Tir de barrage, Canon double, Couleuvrine, Tir de
 * grenaille, et le +5 en Initiative de Plus vite que son ombre, `pistolero-r1`, p. 65). Voir
 * `src/lib/character/weaponLoading.ts`.
 */
export interface WeaponReload {
  /**
   * Action nécessaire pour remettre UN coup dans l'arme (p. 185) : `'M'` action de mouvement
   * (arbalètes de poing et légère), `'L'` action limitée (arbalète lourde, pétoire, mousquet).
   * Restriction aux deux seules lettres employées par la table, prises sur `ACTION_TYPES`.
   */
  action: Extract<ActionType, 'M' | 'L'>;
  /**
   * Nombre de ROUNDS d'action `action` nécessaires pour un coup, quand le rechargement dépasse
   * un round. Absent = 1 (cas de toutes les armes de la table p. 185). Prévu pour la couleuvrine
   * (`artilleur-r5`, p. 63 : « Il faut ensuite deux rounds (L) pour la recharger »), arme octroyée
   * par capacité qui fait l'objet d'un ticket distinct (PER-286).
   */
  rounds?: number;
  /**
   * L'arme compte-t-elle dans la limite CONSEILLÉE d'armes à poudre chargées d'avance (p. 187 :
   * « Un arquebusier pourra raisonnablement avoir trois armes chargées en même temps, généralement
   * deux pétoires et un mousquet (plus éventuellement une couleuvrine qui ne compte pas dans ce
   * calcul). Plus d'armes surchargent le personnage. ») ? Absent = oui. À renseigner `false`
   * UNIQUEMENT sur la couleuvrine (PER-286), que le livre exclut nommément du décompte.
   */
  countsTowardLoadedLimit?: false;
}

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
  /**
   * Coût de RECHARGEMENT (PER-284, table p. 185). Présent = l'arme se suit « chargée /
   * déchargée » (arbalètes et armes à poudre) ; absent = rien à suivre (arc, fronde, arme de
   * jet). Voir `WeaponReload` et `src/lib/character/weaponLoading.ts`.
   */
  reload?: WeaponReload;
  /**
   * Caractéristique ajoutée aux DM DE CETTE ARME (PER-286). EXCEPTIONNEL : les armes à distance
   * n'ajoutent aucune carac (p. 185, « Les DM des armes d'attaque à distance ne reçoivent pas de
   * bonus de caractéristique ») — mais une arme OCTROYÉE par une capacité peut déroger, et c'est
   * le cas de la couleuvrine : « la couleuvrine inflige [5d4° + INT] DM » (p. 63). Absent = règle
   * générale. Rendu comme les caracs ajoutées par les capacités (puce de valeur sur la carte
   * d'attaque, « + INT » dans l'inventaire).
   */
  damageAbility?: AbilityId;
  /**
   * Modifications d'arquebusier que cette arme N'ACCEPTE PAS (PER-286), par `modification` (cf.
   * `WeaponModificationLoadout`). Absent = l'arme accepte tout ce que sa portée autorise.
   * Renseigné sur la couleuvrine et sa contrepartie baliste, seules armes que le livre traite en
   * pièce à part (cf. leurs commentaires dans `equipment.ts` : le refus du second canon est
   * VERBATIM — « mais pas une couleuvrine », p. 63 —, celui du chargeur est une règle maison).
   */
  excludedWeaponModifications?: WeaponModificationLoadout['modification'][];
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

/**
 * Section du livre dont la créature provient (« Profils de créatures : … »). Les trois
 * premières sont les sections du livre de base ; `pnj` désigne l'annexe II « Personnages
 * non joueurs » du supplément payant « Le Bestiaire » (p. 216-245) — des blocs de stats
 * mécaniquement identiques aux créatures, mais regroupés à part dans le navigateur (PER-250).
 * Placée en DERNIER : l'ordre du tableau pilote l'ordre d'affichage des sections.
 */
export const CREATURE_CATEGORIES = ['humanoides', 'animaux', 'creatures-fantastiques', 'pnj'] as const;
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
  /** Texte de règle verbatim. TOUJOURS conservé tel quel (relecture « comme dans le livre »). */
  text: string;
  /**
   * Version BALISÉE du même texte (mini-langage `richText`, cf. `featureRichText.ts`), pour le rendu
   * ENRICHI du bloc de bestiaire — dés en icônes (`{2d10}`), formules calculées contre les
   * caractéristiques FIXES de la créature (`[FOR + 2]`, `@CON`), refs de page cliquables (PER-238).
   * DOUBLE le `text` verbatim (ne le remplace pas) : absent → le rendu enrichi retombe sur `text`
   * (déjà glosé : états préjudiciables, DM/RD/DEF, codes de carac). Les créatures n'ayant ni dé
   * évolutif ni rang de voie, seuls les dés/formules/refs justifient de le renseigner.
   */
  richText?: string;
}

/**
 * Référence à une VOIE (de profil) que la créature POSSÈDE à un rang donné — le
 * livre l'imprime « Voie des illusions rang 5 » sous les attaques. La créature
 * possède la voie ENTIÈRE jusqu'au rang indiqué, c.-à-d. les capacités des rangs
 * 1..N (règle FINALE du propriétaire, 2026-07-27 ; comme un personnage qui atteint
 * le rang N). `pathId` référence une `Path` existante (`pathById`) ; le rendu résout
 * le nom canonique et affiche ces capacités au format « Voies & capacités ».
 */
export interface CreaturePathReference {
  /** id de la voie (`Path.id`, ex. 'illusions', 'envouteur'). */
  pathId: string;
  /** Rang atteint (1..5) — la créature possède les capacités des rangs 1..rank. */
  rank: number;
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
  /**
   * Précision entre parenthèses sur les PV, verbatim (ex. « RD3 » pour « 90 (RD3) »). La « RD N »
   * éventuelle est une PROTECTION : elle est remontée en badge dans le cadre DÉFENSE, pas à côté du
   * chiffre de PV (PER-260, cf. `creatureDefenseBadges`) ; seul le reste de la note s'affiche ici.
   */
  hitPointsNote?: string;
  /** Initiative. */
  initiative?: number;
  /** Précision entre parenthèses sur l'Initiative, verbatim (ex. « 19 » pour « Initiative 14 (19) » du skrambler). */
  initiativeNote?: string;
  /**
   * TRAITS DÉFENSIFS de la créature remontés en BADGE dans la cellule DEF du bloc de stats
   * (PER-260) : immunité à un type de dégâts (`kind: 'immunity'`), réduction plate ou typée
   * (`'flat'`), division des dégâts (`'divide'`). MÊME type que sur `Feature` → même rendu
   * (`DefenseBadge`) que la carte Défense d'une fiche de personnage.
   *
   * Le texte VERBATIM de la capacité qui décrit le trait reste affiché tel quel : ce champ ne
   * fait que le REPRÉSENTER visuellement pour qu'il saute aux yeux du MJ. Une entrée n'existe
   * donc que si le livre la décrit (aucune règle déduite) ; les champs de gating d'une capacité
   * (`minPathRank`, `scopeChoice`, `requiresActiveEffect`…) sont inertes ici — une créature n'a
   * ni rang de voie ni interrupteur. Absent → aucun badge de RD.
   *
   * Remplace l'ancien champ étroit `damageImmunities` (replié en `{ kind: 'immunity', scopes }`).
   */
  damageReduction?: DamageReduction | DamageReduction[];
  /**
   * Immunités aux ÉTATS préjudiciables (peur, sommeil magique, paralysie, renversé…) décrites
   * par une capacité, remontées en badge vert (icône d'état dédiée) dans la cellule DEF —
   * pendant des `immunities` d'une capacité de personnage (PER-260).
   */
  statusImmunities?: ImmunityId[];
  /** Attaques du bloc « gras » (les attaques de zone/souffle restent dans `specialAbilities`). */
  attacks?: CreatureAttack[];
  /** Capacités spéciales, verbatim. */
  specialAbilities?: CreatureSpecialAbility[];
  /**
   * Voies de profil que la créature POSSÈDE (ex. aberratus : illusions rang 5,
   * envoûteur rang 5), imprimées sous les attaques. Rendues au format « Voies &
   * capacités » de la fiche (nom canonique + cartes des capacités des rangs 1..N),
   * résolues contre les données de voies. À DISTINGUER d'une `specialAbility` :
   * ce n'est pas un texte verbatim mais un renvoi structuré vers une vraie voie.
   */
  paths?: CreaturePathReference[];
  /** Variante d'une créature de base : id de la créature de base (ex. 'lion' pour « Grand mâle »). */
  baseCreatureId?: string;
  /** Renvoi verbatim aux capacités de la base (« Voir ci-dessus ») quand la variante ne les réimprime pas. */
  sharedAbilitiesNote?: string;
  /**
   * Illustration détourée (die-cut, fond transparent), affichée en FILIGRANE derrière le bloc de
   * stats (semi-transparente, ancrée en haut à droite, rognée par le bloc — pur habillage).
   * Renseignée seulement sur les créatures que le livre illustre ; une VARIANTE sans illustration
   * propre retombe sur celle de sa base (`baseCreatureId`) côté rendu. Absente → aucun filigrane.
   *
   * Deux formes, selon que la source est gratuite ou payante — le rendu les traite à l'identique
   * (toutes deux valides dans `url(…)`) :
   *   - contenu GRATUIT : chemin public, ex. `/bestiary/loup.webp` (asset servi sans auth) ;
   *   - contenu PAYANT : **data URI** (`data:image/webp;base64,…`) embarquée dans le blob JSONB
   *     par le script d'ingestion, pour que l'image hérite de la même barrière RLS que le texte
   *     (PER-245). Une image payante ne doit JAMAIS être servie depuis `public/`.
   */
  illustration?: string;
  sourcePage: SourcePage;
}
