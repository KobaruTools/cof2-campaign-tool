/**
 * Brouillon du wizard de création et sa matérialisation en `Character`.
 *
 * Le brouillon conserve les saisies « de travail » (valeurs de base avant
 * modificateurs de peuple, choix de voies, bonus de mage…). À la fin du wizard,
 * `materializeDraft` produit un personnage de niveau 1 conforme à la création
 * CO2 (p. 29-31).
 */
import type { AbilityId, Ancestry, Feature } from '@/data/schema';
import { ABILITY_IDS } from '@/data/schema';
import { classById, pathById, priestGodById, featureById } from '@/data';
import { applyModifiers, type AncestryChoice } from './ancestry';
import {
  SCHEMA_VERSION,
  type Character,
  type EquipmentLine,
  type FeatureChoiceSelection,
  type Identity,
  type PriestVocation,
} from './types';

/** Bonus de capacité supplémentaire des mages au niveau 1 (p. 29). */
export type MageBonus =
  | { type: 'class-rank2'; pathId: string } // rang 2 d'une des 2 voies de profil choisies
  | { type: 'mage-rank2' }; // rang 2 de la voie du mage

export interface WizardDraft {
  characterId: string;
  step: number;

  // Étape peuple
  ancestryId: string;
  /** Voie de peuple retenue (le demi-elfe choisit ; sinon l'unique voie). */
  ancestryPathId: string | null;

  // Étape profil
  classId: string;
  /**
   * Vocation du prêtre (p. 122) : généraliste ou spécialiste d'un dieu. Pertinent
   * seulement si `classId === 'pretre'`. Optionnel pour rester compatible avec un
   * brouillon persisté avant l'ajout du champ (absent = pas encore choisi).
   */
  priestVocation?: PriestVocation | null;

  // Étape caractéristiques
  baseAbilities: Record<AbilityId, number>;
  ancestryChoices: AncestryChoice;

  // Étape voies & capacités
  chosenPaths: string[]; // 2 voies de profil
  /**
   * Profil hybride dès la création (p. 179-180) : les 2 voies peuvent provenir
   * de n'importe quels profils et le profil principal (`classId`) est désigné
   * parmi les deux profils concernés. Faux → création standard (2 voies du
   * profil principal). Optionnel pour rester compatible avec un brouillon
   * persisté avant l'ajout du champ (absent = standard).
   */
  hybrid?: boolean;
  /** Mages : la voie du mage remplace la voie de peuple comme « emplacement ». */
  magePathSlot: boolean;
  /** Mages : capacité de rang 2 supplémentaire reçue au niveau 1. */
  mageBonus: MageBonus | null;

  /**
   * Choix portés par les capacités de niveau 1 (PER-66), résolus pendant le
   * wizard. Même structure que `Character.featureChoices`. Optionnel pour
   * rester compatible avec un brouillon persisté avant l'ajout du champ.
   */
  featureChoices?: Record<string, FeatureChoiceSelection[]>;

  // Étape équipement
  equipment: EquipmentLine[];

  // Étape identité
  name: string;
  identity: Identity;

  createdAt: string;
}

/** Identifiant de la voie du mage (remplace la voie de peuple pour les mages). */
export const MAGE_PATH_ID = 'mage';

/** Id du profil prêtre — seul concerné par la vocation généraliste/spécialiste. */
export const PRIEST_CLASS_ID = 'pretre';

/**
 * La vocation du prêtre est-elle résolue ? Pour un prêtre (profil principal), une
 * vocation doit être choisie : généraliste, ou spécialiste AVEC un dieu désigné.
 * Pour tout autre profil, toujours vrai (champ non pertinent). Wizard bloquant
 * (p. 122). Le cas d'un prêtre en voie SECONDAIRE d'un hybride est hors périmètre.
 */
export function priestVocationComplete(draft: WizardDraft): boolean {
  if (draft.classId !== PRIEST_CLASS_ID) return true;
  const v = draft.priestVocation;
  if (!v) return false;
  return v.mode === 'generalist' || (v.mode === 'specialist' && !!v.godId);
}

/** Capacité divine (feature) du dieu d'un spécialiste — null sinon. */
export function divineFeatureOfVocation(vocation: WizardDraft['priestVocation']): Feature | null {
  if (vocation?.mode !== 'specialist') return null;
  const god = priestGodById.get(vocation.godId);
  return (god && featureById.get(god.divineFeatureId)) || null;
}

/**
 * Le choix de « voie d'accueil » de la capacité divine est-il fait ? Ne concerne
 * QUE le spécialiste dont la capacité divine est de RANG 1 (acquise à la création,
 * p. 122) : il faut désigner laquelle des 2 voies choisies voit son rang 1 remplacé.
 * Pour une divine de rang 2+ (acquise plus tard) ou tout autre cas → toujours vrai.
 */
export function divineHostComplete(draft: WizardDraft): boolean {
  const divine = divineFeatureOfVocation(draft.priestVocation);
  if (!divine || divine.rank !== 1) return true;
  const host = draft.priestVocation?.mode === 'specialist' ? draft.priestVocation.hostPathId : undefined;
  return !!host && draft.chosenPaths.includes(host);
}

function abilitiesZero(): Record<AbilityId, number> {
  return ABILITY_IDS.reduce(
    (acc, id) => {
      acc[id] = 0;
      return acc;
    },
    {} as Record<AbilityId, number>,
  );
}

/** Brouillon vierge pour un nouveau personnage. */
export function createDraft(characterId: string, now: string): WizardDraft {
  return {
    characterId,
    step: 0,
    ancestryId: '',
    ancestryPathId: null,
    classId: '',
    priestVocation: null,
    baseAbilities: abilitiesZero(),
    ancestryChoices: [],
    chosenPaths: [],
    hybrid: false,
    magePathSlot: false,
    mageBonus: null,
    featureChoices: {},
    equipment: [],
    name: '',
    identity: {},
    createdAt: now,
  };
}

/** Caractéristiques finales = base + modificateurs de peuple résolus. */
export function finalAbilities(draft: WizardDraft, ancestry: Ancestry): Record<AbilityId, number> {
  return applyModifiers(draft.baseAbilities, ancestry, draft.ancestryChoices);
}

/**
 * Capacités acquises au niveau 1 :
 *  - rang 1 des 2 voies de profil choisies (gratuit) ;
 *  - rang 1 de la voie de peuple (gratuit) ;
 *  - mages : rang 1 de la voie du mage si elle occupe l'emplacement de peuple,
 *    et la capacité bonus de rang 2 (voie de profil ou voie du mage).
 * Retourne une liste dédupliquée, ordonnée.
 */
export function level1FeatureIds(draft: WizardDraft): string[] {
  const ids = new Set<string>();
  for (const pathId of draft.chosenPaths) ids.add(`${pathId}-r1`);
  if (draft.ancestryPathId) ids.add(`${draft.ancestryPathId}-r1`);
  if (draft.magePathSlot) ids.add(`${MAGE_PATH_ID}-r1`);
  if (draft.mageBonus?.type === 'class-rank2') ids.add(`${draft.mageBonus.pathId}-r2`);
  if (draft.mageBonus?.type === 'mage-rank2') {
    ids.add(`${MAGE_PATH_ID}-r1`);
    ids.add(`${MAGE_PATH_ID}-r2`);
  }
  // Prêtre spécialiste, capacité divine de RANG 1 (p. 122) : elle remplace le rang 1
  // de la voie d'accueil choisie — on retire la native, on acquiert la divine.
  const divine = divineFeatureOfVocation(draft.priestVocation);
  const host = draft.priestVocation?.mode === 'specialist' ? draft.priestVocation.hostPathId : undefined;
  if (divine && divine.rank === 1 && host && ids.has(`${host}-r1`)) {
    ids.delete(`${host}-r1`);
    ids.add(divine.id);
  }
  return [...ids];
}

/** Emplacement de voie de peuple effectif (voie du mage si choisie par un mage). */
export function effectiveAncestryPath(draft: WizardDraft): string | null {
  return draft.magePathSlot ? MAGE_PATH_ID : draft.ancestryPathId;
}

/**
 * Profils (ids de profil) dont sont issues les voies de profil choisies. Sert,
 * pour un profil hybride, à proposer la désignation du profil principal et à
 * vérifier que celui-ci est bien l'un des deux profils concernés (p. 180). Une
 * voie partagée par plusieurs profils contribue chacun de ces profils.
 */
export function involvedClassIds(chosenPaths: string[]): string[] {
  const ids = new Set<string>();
  for (const pathId of chosenPaths) {
    const path = pathById.get(pathId);
    if (path?.type === 'class') for (const classId of path.classIds) ids.add(classId);
  }
  return [...ids];
}

/**
 * L'étape « Voies & capacités » est-elle complète et conforme ? Deux voies
 * doivent être choisies ; en création standard elles appartiennent au profil
 * principal, en création hybride elles peuvent venir de n'importe quels profils
 * mais le profil principal doit être l'un des deux profils concernés (p. 180).
 * Un mage doit en outre avoir désigné sa capacité de rang 2 supplémentaire.
 */
export function pathsStepComplete(draft: WizardDraft): boolean {
  if (draft.chosenPaths.length !== 2) return false;
  const characterClass = classById.get(draft.classId);
  if (!characterClass) return false;
  if (draft.hybrid) {
    if (!involvedClassIds(draft.chosenPaths).includes(draft.classId)) return false;
  } else if (!draft.chosenPaths.every((pathId) => characterClass.pathIds.includes(pathId))) {
    return false;
  }
  if (characterClass.familyId === 'mages') return draft.mageBonus !== null;
  return true;
}

/**
 * Matérialise le brouillon en `Character` de niveau 1. `ancestry` sert au calcul
 * des caractéristiques finales ; `now` est injectable pour les tests.
 */
export function materializeDraft(draft: WizardDraft, ancestry: Ancestry, now: string): Character {
  const featureIds = level1FeatureIds(draft);
  return {
    schemaVersion: SCHEMA_VERSION,
    id: draft.characterId,
    name: draft.name.trim() || 'Nouveau personnage',
    identity: draft.identity,
    ancestryId: draft.ancestryId,
    classId: draft.classId,
    level: 1,
    // Vocation pertinente seulement pour un prêtre ; null sinon (cf. priestVocationComplete).
    priestVocation: draft.classId === PRIEST_CLASS_ID ? (draft.priestVocation ?? null) : null,
    portraitVariant: 'default',
    abilities: finalAbilities(draft, ancestry),
    baseAbilities: draft.baseAbilities,
    ancestryChoices: draft.ancestryChoices,
    ancestryPathId: effectiveAncestryPath(draft),
    featureIds,
    featureChoices: draft.featureChoices ?? {},
    effectToggles: {},
    effectInputs: {},
    usageCounters: {},
    levelUpHistory: [{ level: 1, chosenFeatureIds: featureIds }],
    equipment: draft.equipment,
    overrides: {},
    notes: '',
    createdAt: draft.createdAt,
    updatedAt: now,
  };
}
