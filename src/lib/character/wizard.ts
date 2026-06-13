/**
 * Brouillon du wizard de création et sa matérialisation en `Character`.
 *
 * Le brouillon conserve les saisies « de travail » (valeurs de base avant
 * modificateurs de peuple, choix de voies, bonus de mage…). À la fin du wizard,
 * `materializeDraft` produit un personnage de niveau 1 conforme à la création
 * CO2 (p. 29-31).
 */
import type { CaracId, Peuple } from '@/data/schema';
import { CARAC_IDS } from '@/data/schema';
import { appliquerModificateurs, choixInitiaux, type PeupleChoix } from './peuple';
import { SCHEMA_VERSION, type Character, type EquipementLigne, type Identity } from './types';

/** Bonus de capacité supplémentaire des mages au niveau 1 (p. 29). */
export type MageBonus =
  | { type: 'profil-rang2'; voieId: string } // rang 2 d'une des 2 voies de profil choisies
  | { type: 'mage-rang2' }; // rang 2 de la voie du mage

export interface WizardDraft {
  characterId: string;
  step: number;

  // Étape peuple
  peupleId: string;
  /** Voie de peuple retenue (le demi-elfe choisit ; sinon l'unique voie). */
  voieDePeupleId: string | null;

  // Étape profil
  profilId: string;

  // Étape caractéristiques
  caracsBase: Record<CaracId, number>;
  peupleChoix: PeupleChoix;

  // Étape voies & capacités
  voiesChoisies: string[]; // 2 voies de profil
  /** Mages : la voie du mage remplace la voie de peuple comme « emplacement ». */
  slotVoieDuMage: boolean;
  /** Mages : capacité de rang 2 supplémentaire reçue au niveau 1. */
  mageBonus: MageBonus | null;

  // Étape équipement
  equipment: EquipementLigne[];

  // Étape identité
  name: string;
  identity: Identity;

  createdAt: string;
}

/** Identifiant de la voie du mage (remplace la voie de peuple pour les mages). */
export const VOIE_DU_MAGE_ID = 'mage';

function caracsZero(): Record<CaracId, number> {
  return CARAC_IDS.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as Record<CaracId, number>,
  );
}

/** Brouillon vierge pour un nouveau personnage. */
export function createDraft(characterId: string, now: string): WizardDraft {
  return {
    characterId,
    step: 0,
    peupleId: '',
    voieDePeupleId: null,
    profilId: '',
    caracsBase: caracsZero(),
    peupleChoix: [],
    voiesChoisies: [],
    slotVoieDuMage: false,
    mageBonus: null,
    equipment: [],
    name: '',
    identity: {},
    createdAt: now,
  };
}

/** Caractéristiques finales = base + modificateurs de peuple résolus. */
export function caracsFinales(draft: WizardDraft, peuple: Peuple): Record<CaracId, number> {
  return appliquerModificateurs(draft.caracsBase, peuple, draft.peupleChoix);
}

/**
 * Capacités acquises au niveau 1 :
 *  - rang 1 des 2 voies de profil choisies (gratuit) ;
 *  - rang 1 de la voie de peuple (gratuit) ;
 *  - mages : rang 1 de la voie du mage si elle occupe l'emplacement de peuple,
 *    et la capacité bonus de rang 2 (voie de profil ou voie du mage).
 * Retourne une liste dédupliquée, ordonnée.
 */
export function capaciteIdsNiveau1(draft: WizardDraft): string[] {
  const ids = new Set<string>();
  for (const voieId of draft.voiesChoisies) ids.add(`${voieId}-r1`);
  if (draft.voieDePeupleId) ids.add(`${draft.voieDePeupleId}-r1`);
  if (draft.slotVoieDuMage) ids.add(`${VOIE_DU_MAGE_ID}-r1`);
  if (draft.mageBonus?.type === 'profil-rang2') ids.add(`${draft.mageBonus.voieId}-r2`);
  if (draft.mageBonus?.type === 'mage-rang2') {
    ids.add(`${VOIE_DU_MAGE_ID}-r1`);
    ids.add(`${VOIE_DU_MAGE_ID}-r2`);
  }
  return [...ids];
}

/** Emplacement de voie de peuple effectif (voie du mage si choisie par un mage). */
export function voieDePeupleEffective(draft: WizardDraft): string | null {
  return draft.slotVoieDuMage ? VOIE_DU_MAGE_ID : draft.voieDePeupleId;
}

/**
 * Matérialise le brouillon en `Character` de niveau 1. `peuple` sert au calcul
 * des caractéristiques finales ; `now` est injectable pour les tests.
 */
export function materializeDraft(draft: WizardDraft, peuple: Peuple, now: string): Character {
  const capaciteIds = capaciteIdsNiveau1(draft);
  return {
    schemaVersion: SCHEMA_VERSION,
    id: draft.characterId,
    name: draft.name.trim() || 'Nouveau personnage',
    identity: draft.identity,
    peupleId: draft.peupleId,
    profilId: draft.profilId,
    niveau: 1,
    caracteristiques: caracsFinales(draft, peuple),
    voieDePeupleId: voieDePeupleEffective(draft),
    capaciteIds,
    levelUpHistory: [{ niveau: 1, choixCapaciteIds: capaciteIds }],
    equipment: draft.equipment,
    overrides: {},
    notes: '',
    createdAt: draft.createdAt,
    updatedAt: now,
  };
}
