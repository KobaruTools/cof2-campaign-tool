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
export const CARAC_IDS = ['AGI', 'CON', 'FOR', 'PER', 'CHA', 'INT', 'VOL'] as const;
export type CaracId = (typeof CARAC_IDS)[number];

/** Plage indicative affichée à la saisie libre (jamais bloquante) — p. 27. */
export const CARAC_MIN = -3;
export const CARAC_MAX = 5;

/**
 * Séries de valeurs officielles proposées à la création (Polyvalent, Expert,
 * Spécialiste) — p. 27. Affichées à titre informatif dans le wizard, la
 * saisie restant libre (décision PRD #5).
 */
export interface SerieDeValeurs {
  id: string;
  nom: string;
  valeurs: number[]; // 7 valeurs à répartir
  sourcePage: SourcePage;
}

/**
 * Entrée de la table d20 « Idéaux héroïques / Travers » utilisée à la touche
 * finale de la création — p. 33. Purement indicative (tirage réel à la table
 * ou choix libre).
 */
export interface IdealTravers {
  d20: number;
  ideal: string;
  travers: string;
  sourcePage: SourcePage;
}

// ---------------------------------------------------------------------------
// Dés
// ---------------------------------------------------------------------------

export type De = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';

// ---------------------------------------------------------------------------
// Familles de profils — p. 30-31, 61, 78, 91, 112
// ---------------------------------------------------------------------------

export const FAMILLE_IDS = ['aventuriers', 'combattants', 'mages', 'mystiques'] as const;
export type FamilleId = (typeof FAMILLE_IDS)[number];

/**
 * Une famille regroupe des profils et détermine PV, dé de récupération et
 * bonus éventuels. PV niveau 1 = (2 × pvBase) + CON (p. 30) ;
 * gain par niveau = pvParNiveau + CON (p. 39).
 */
export interface Famille {
  id: FamilleId;
  nom: string;
  /** PV de base de la famille (aventuriers 4, combattants 5, mages 3, mystiques 4) — p. 30. */
  pvBase: number;
  /** Gain de PV par montée de niveau, avant ajout de CON — p. 39. */
  pvParNiveau: number;
  /** Type du dé de récupération (d8 / d10 / d6 / d8) — p. 30. */
  deRecuperation: De;
  /** DR supplémentaires à la création (mystiques : +1) — p. 30. */
  bonusDrCreation: number;
  /** PC supplémentaires à la création (aventuriers : +1) — p. 30. */
  bonusPcCreation: number;
  sourcePage: SourcePage;
}

// ---------------------------------------------------------------------------
// Peuples — chap. 3, p. 44-60
// ---------------------------------------------------------------------------

/**
 * Ajustement de caractéristique offert par un peuple. `caracs` liste les
 * caractéristiques admissibles : un seul élément = ajustement fixe,
 * plusieurs = choix du joueur (ex. demi-elfe « +1 PER ou CHA » — p. 46).
 */
export interface ModificateurCarac {
  valeur: number;
  caracs: CaracId[];
}

/** Repères physiques d'un peuple (encadré « Repères ») — ex. p. 46. */
export interface ReperesPeuple {
  ageDepart: string;
  esperanceVie: string;
  taille: string;
  poids: string;
  traits: string;
}

export interface Peuple {
  id: string;
  nom: string;
  /** Description / interprétation (verbatim ou condensé fidèle). */
  description: string;
  reperes: ReperesPeuple;
  /**
   * La plupart des peuples ont 2 modificateurs ; les humains un seul — p. 26.
   */
  modificateurs: ModificateurCarac[];
  /**
   * Voies de peuple accessibles. Un seul id en général ; plusieurs si le
   * peuple laisse le choix (demi-elfe : voie de l'humain, de l'elfe haut ou
   * de l'elfe sylvain — p. 46).
   */
  voieDePeupleIds: string[];
  sourcePage: SourcePage;
}

// ---------------------------------------------------------------------------
// Profils — chap. 4-7, p. 61-127
// ---------------------------------------------------------------------------

export interface Profil {
  id: string;
  nom: string;
  familleId: FamilleId;
  description: string;
  /** Texte verbatim « Armes & armures maîtrisées » — ex. p. 62. */
  armesEtArmures: string;
  /**
   * Restriction d'armure exprimée par le livre sous la forme « peut porter
   * jusqu'à X » : id de l'armure la plus protectrice autorisée, null si
   * aucune armure (à confirmer profil par profil à l'extraction) — p. 31, 188.
   */
  armureMaxId: string | null;
  /** Le profil autorise-t-il le bouclier ? — ex. arquebusier : non (p. 62). */
  bouclierAutorise: boolean;
  /** Équipement de départ — ex. p. 62. */
  equipementDepart: EquipementDepartRef[];
  /** Les 5 voies du profil, dans l'ordre du livre — ex. table p. 61. */
  voieIds: string[];
  /**
   * Les 3 caractéristiques conseillées (« vos trois meilleures valeurs ») —
   * p. 27. TODO(extraction) : vérifier où le livre les liste par profil.
   */
  caracsConseillees: CaracId[];
  sourcePage: SourcePage;
}

/**
 * Ligne d'équipement de départ d'un profil. `itemId` pointe vers le
 * catalogue quand l'objet y figure ; `libelle` conserve le texte du livre
 * (ex. « pétoire (DM 1d10, portée 20 m) » — p. 62).
 */
export interface EquipementDepartRef {
  itemId: string | null;
  libelle: string;
  quantite: number;
}

// ---------------------------------------------------------------------------
// Voies — chap. 4-8 + voies de peuple (chap. 3) + voie du mage (p. 60)
// ---------------------------------------------------------------------------

/** Catégories des voies de prestige — table récapitulative p. 128. */
export const PRESTIGE_CATEGORIES = [
  'generique',
  'aventurier',
  'combattant',
  'mage',
  'mystique',
] as const;
export type PrestigeCategorie = (typeof PRESTIGE_CATEGORIES)[number];

interface VoieBase {
  id: string;
  nom: string;
  /** Capacités de la voie, ordonnées par rang croissant. */
  capaciteIds: string[];
  /** Encadré ou note spécifique à la voie (verbatim), le cas échéant. */
  note?: string;
  sourcePage: SourcePage;
}

/** Voie appartenant aux 5 voies d'un (ou plusieurs) profil(s). Rangs 1-5. */
export interface VoieDeProfil extends VoieBase {
  type: 'profil';
  profilIds: string[];
}

/** Voie de peuple : rang 1 gratuit à la création — p. 39. Rangs 1-5. */
export interface VoieDePeuple extends VoieBase {
  type: 'peuple';
  peupleIds: string[];
}

/**
 * Voie du mage (p. 60) : remplace la voie de peuple pour les profils de la
 * famille des mages, au choix du joueur. Rangs 1-5.
 */
export interface VoieDuMage extends VoieBase {
  type: 'mage';
}

/**
 * Voie de prestige — chap. 8, p. 128+ : accessible à partir du niveau 5,
 * une seule par personnage, capacités de rangs 4 à 8.
 */
export interface VoieDePrestige extends VoieBase {
  type: 'prestige';
  categorie: PrestigeCategorie;
  /** Prérequis en texte verbatim (ex. voie de l'expert — p. 129). */
  prerequis: string;
}

export type Voie = VoieDeProfil | VoieDePeuple | VoieDuMage | VoieDePrestige;
export type VoieType = Voie['type'];

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
export const TYPES_ACTION = ['A', 'L', 'G', 'M'] as const;
export type TypeAction = (typeof TYPES_ACTION)[number];

export interface Capacite {
  id: string;
  nom: string;
  voieId: string;
  /** Rang dans la voie : 1-5 (voies normales), 4-8 (voies de prestige). */
  rang: number;
  /** Sort : capacité signalée par un astérisque (*) — p. 227. */
  estSort: boolean;
  /**
   * Types d'action requis. Liste car certaines capacités en offrent
   * plusieurs (« Malédiction (M) ou (L)* » — p. 343). Vide = passive.
   */
  typesAction: TypeAction[];
  /** Texte de règles complet, verbatim. */
  texte: string;
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
export type Prix = { montant: number; unite: string } | null;

interface EquipementBase {
  id: string;
  nom: string;
  prix: Prix;
  /** Règles particulières (verbatim), ex. armes en italique p. 184+. */
  proprietes?: string;
  sourcePage: SourcePage;
}

/**
 * Catégories d'armes — p. 184. Le livre ne nomme que trois catégories
 * (légère / à une ou deux mains / à deux mains) ; `uneMain` couvre les armes
 * « standard » des tables p. 183 et 185 sans mention de catégorie.
 */
export const CATEGORIES_ARME = ['legere', 'uneMain', 'uneOuDeuxMains', 'deuxMains'] as const;
export type CategorieArme = (typeof CATEGORIES_ARME)[number];

/** Types de DM provoqués par les armes — p. 183 (colonne « Type de DM »). */
export const TYPES_DM = ['contondants', 'perforants', 'tranchants'] as const;
export type TypeDm = (typeof TYPES_DM)[number];

export interface Arme extends EquipementBase {
  categorie: 'arme';
  categorieArme: CategorieArme;
  /** L'arme est-elle une arme de contact, à distance, ou les deux (lancer) ? */
  contact: boolean;
  distance: boolean;
  /** Dés de dommages, notation du livre (ex. « 1d8 », « 5d4° + INT »). */
  dm: string;
  /** DM à deux mains pour les armes à une ou deux mains (ex. « 1d6/1d10 »). */
  dmDeuxMains?: string;
  /** Portée, notation du livre (ex. « 20 m », « 1d6 à 10 m » pour le lancer). */
  portee?: string;
}

export interface Armure extends EquipementBase {
  categorie: 'armure';
  /** Bonus de défense — table p. 188. */
  def: number;
  /** Valeur maximale d'AGI exploitable avec cette armure — p. 188. */
  agiMax: number | null;
}

export interface Bouclier extends EquipementBase {
  categorie: 'bouclier';
  def: number;
}

/** Matériel d'aventurier, autres biens, équipement de qualité/exotique. */
export interface Materiel extends EquipementBase {
  categorie: 'materiel';
  description?: string;
}

export type EquipementItem = Arme | Armure | Bouclier | Materiel;
export type CategorieEquipement = EquipementItem['categorie'];

// ---------------------------------------------------------------------------
// Règles de progression — chap. 1 (p. 29-33) et chap. 2 (p. 38-43)
// ---------------------------------------------------------------------------

/**
 * Constantes de progression extraites du livre. Une seule instance de cet
 * objet vivra dans `src/data/` ; le moteur de calcul est l'unique
 * consommateur.
 */
export interface ReglesProgression {
  /**
   * Niveau maximum jouable.
   * TODO(extraction) : non explicité dans les pages déjà lues (les dés
   * évolutifs vont jusqu'à « 15+ » p. 43, la table des rangs jusqu'au
   * niveau 13 p. 39, les valeurs d'attaque plafonnent au niveau 10 p. 39).
   */
  niveauMax: number;
  /** Points de capacité gagnés à chaque niveau (2) — p. 38. */
  pointsCapaciteParNiveau: number;
  /** Coût en points : rangs 1-2 → 1 point, rangs 3+ → 2 points — p. 39. */
  coutParRang: Record<number, number>;
  /**
   * Niveau minimum requis par rang (1→1, 2→2, 3→3, 4→5, 5→7, 6→9, 7→11,
   * 8→13) — table p. 39. L'exception mage (rang 2 dès la création, « 2* »)
   * est portée par le moteur.
   */
  niveauMinParRang: Record<number, number>;
  /** Rangs réservés aux voies de prestige (6 à 8) — p. 39. */
  rangsPrestigeUniquement: number[];
  /** Niveau d'accès aux voies de prestige (5) — p. 128. */
  niveauAccesPrestige: number;
  /** Plafond d'augmentation des valeurs d'attaque (+1/niveau jusqu'à 10) — p. 39. */
  niveauMaxAttaque: number;
  /**
   * Dés évolutifs (d4°) : valeur du dé selon le niveau — table p. 43
   * (1-5 : d4, 6-8 : d6, 9-11 : d8, 12-14 : d10, 15+ : d12).
   */
  desEvolutifs: Array<{ niveauMin: number; de: De }>;
  /** Contenu du sac d'aventurier remis à la création — p. 31. */
  sacAventurier: EquipementDepartRef[];
  sourcePage: SourcePage;
}
