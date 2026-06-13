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

/**
 * Version courante du schéma de personnage. Incrémenter à chaque évolution.
 * v2 : passage des clés du modèle en anglais (migration depuis v1 dans
 * `src/lib/engine/migrations.ts`).
 */
export const SCHEMA_VERSION = 2;

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

  /**
   * Valeurs des 7 caractéristiques telles qu'elles figurent sur la fiche
   * (saisie libre, modificateurs de peuple déjà appliqués — décision PRD #13 :
   * ce sont directement les « valeurs » du livre, -3 à +5 à la création).
   */
  abilities: Record<AbilityId, number>;

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
