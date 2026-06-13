/**
 * Modèle de données « Personnage » — entièrement sérialisable en JSON
 * (contrainte structurante pour localStorage, export/import et la future
 * migration Supabase — PRD §7).
 *
 * Principes (PRD §7) :
 *  - `schemaVersion` en tête : tout chargement/import passe par la migration
 *    si la version est ancienne (voir `src/lib/engine/migrations.ts`).
 *  - le personnage stocke des **références** aux données de règles (ids) + ses
 *    **saisies propres** ; jamais de copie des textes de règles.
 *  - les valeurs dérivées ne sont **pas** stockées (recalculées à l'affichage),
 *    sauf surcharges manuelles explicites (`overrides`).
 */
import type { AbilityId } from '@/data/schema';
import type { AncestryChoice } from './ancestry';

/**
 * Version courante du schéma de personnage. Incrémenter à chaque évolution.
 * v2 : passage des clés du modèle en anglais (migration depuis v1 dans
 * `src/lib/engine/migrations.ts`).
 * v3 : ajout de `portraitVariant` (choix de l'illustration de profil).
 * v4 : ajout de `baseAbilities` + `ancestryChoices` (valeurs de base saisies à
 *   la création et résolution des modificateurs de peuple), pour afficher le
 *   détail « base + peuple = total » d'une caractéristique sur la fiche.
 */
export const SCHEMA_VERSION = 4;

/**
 * Statistiques dérivées surchargeables manuellement (règle maison, cf. PRD
 * §5.4). Une surcharge présente remplace la valeur calculée ; elle est
 * réversible (suppression de la clé = retour au calcul automatique).
 */
export type DerivedStatId =
  | 'maxHp'
  | 'def'
  | 'initiative'
  | 'luckPoints'
  | 'manaPoints'
  | 'recoveryDiceCount'
  | 'meleeAttack'
  | 'rangedAttack'
  | 'magicAttack';

/** Sexe du personnage (code interne, affiché en français). */
export type Sex = 'male' | 'female';

/**
 * Variante d'illustration du profil : chaque profil dispose d'une illustration
 * standard (`default` → `/classes/<id>.webp`) et d'une alternative
 * (`alt` → `/classes/<id>-2.webp`). Choix purement esthétique.
 */
export type PortraitVariant = 'default' | 'alt';

/** Champs d'identité libres (PRD §5.2 étape 6). */
export interface Identity {
  sex?: Sex;
  age?: string;
  height?: string;
  weight?: string;
  description?: string;
}

/** Ligne d'équipement référençant le catalogue. */
export interface EquipmentRef {
  itemId: string;
  quantity: number;
}

/**
 * Objet personnalisé hors catalogue (saisie libre sur la fiche permissive).
 * `custom: true` discrimine de `EquipmentRef`.
 */
export interface CustomItem {
  custom: true;
  name: string;
  quantity: number;
  /** Notes libres (DM, DEF, propriétés…). */
  details?: string;
}

export type EquipmentLine = EquipmentRef | CustomItem;

/** Entrée d'historique : ce qui a été choisi à un niveau donné. */
export interface LevelUpEntry {
  level: number;
  /** Ids des capacités acquises à ce niveau (et autres choix sérialisables). */
  chosenFeatureIds: string[];
}

export interface Character {
  schemaVersion: number;
  id: string; // uuid
  name: string;
  identity: Identity;

  ancestryId: string;
  classId: string;
  level: number;

  /** Variante d'illustration de profil retenue (esthétique). */
  portraitVariant: PortraitVariant;

  /**
   * Valeurs des 7 caractéristiques telles qu'elles figurent sur la fiche
   * (saisie libre, modificateurs de peuple déjà appliqués — décision PRD #13 :
   * ce sont directement les « valeurs » du livre, -3 à +5 à la création).
   */
  abilities: Record<AbilityId, number>;

  /**
   * Valeurs de base saisies à la création, **avant** modificateurs de peuple.
   * Sert uniquement à expliquer d'où vient chaque caractéristique (détail
   * « base + peuple = total »). Invariant maintenu : `baseAbilities[x]` +
   * modificateurs de peuple résolus = `abilities[x]` ; l'édition d'une valeur
   * finale sur la fiche réajuste la base en conséquence.
   */
  baseAbilities: Record<AbilityId, number>;

  /**
   * Résolution des modificateurs de peuple, dans le même ordre que
   * `ancestry.abilityModifiers` : indique quelle caractéristique reçoit chaque
   * modificateur (utile pour les peuples « au choix », ex. demi-elfe
   * « +1 PER ou CHA »). Permet d'attribuer le bonus/malus à la bonne ligne du
   * détail.
   */
  ancestryChoices: AncestryChoice;

  /**
   * Voie de peuple effectivement retenue (le demi-elfe choisit ; un mage peut
   * prendre la voie du mage à la place). `null` tant que non déterminée.
   */
  ancestryPathId: string | null;

  /** Ids des capacités acquises (toutes voies confondues). */
  featureIds: string[];

  /** Historique des montées de niveau (permet « qu'ai-je pris au niveau N ? »). */
  levelUpHistory: LevelUpEntry[];

  /** Équipement possédé (références catalogue + objets personnalisés). */
  equipment: EquipmentLine[];

  /** Surcharges manuelles de valeurs dérivées (réversibles). */
  overrides: Partial<Record<DerivedStatId, number>>;

  /** Notes libres du joueur. */
  notes: string;

  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** Garde de type : distingue un objet personnalisé d'une référence catalogue. */
export function isCustomItem(line: EquipmentLine): line is CustomItem {
  return 'custom' in line && line.custom === true;
}
