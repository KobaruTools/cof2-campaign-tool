/**
 * ÉTATS DE COMBAT — résolution de la part CHIFFRÉE (PER-277, tranche 1 de PER-276).
 *
 * Fonctions PURES qui agrègent les `modifiers` structurés des catalogues d'états (`STATUS_EFFECTS`,
 * glossaire p. 214-215 ; `SITUATIONAL_EFFECTS`, effets nommés de capacités) en un sac de modificateurs
 * prêt à injecter dans le calcul dérivé. La part COMPORTEMENTALE des états (« aucune action », « touché
 * automatiquement », « déplacement 5 m »…) N'EST PAS modélisée ici : elle reste dans le verbatim `effect`
 * et se gère à l'oral. Aucune UI, aucun accès au store — les tranches suivantes (PER-280/281) branchent
 * cette sortie sur les cartes du Combat Tracker et sur `sheetDisplayView`.
 */

import type { DerivedMods } from '@/lib/engine/derived';
import {
  SITUATIONAL_EFFECTS,
  STATUS_EFFECTS,
  type DerivedStatId,
  type SituationalEffectId,
  type StatusEffectEntry,
  type StatusEffectId,
} from '@/data/schema';

/** Identifiant d'état, indifféremment du glossaire (`StatusEffectId`) ou situationnel. */
export type AnyStatusEffectId = StatusEffectId | SituationalEffectId;

/**
 * Un état APPLIQUÉ à un combattant : son id + (pour les états cumulatifs) son intensité courante.
 * `intensity` est ignoré pour les états binaires (toujours résolus à 1). C'est la forme logique que
 * les tranches de stockage (PER-278) sérialiseront par combattant dans `campaign_combat.state`.
 */
export interface AppliedStatus {
  id: AnyStatusEffectId;
  /** Intensité pour un état cumulatif (≥ 1, plafonnée par le catalogue). Absent = 1. */
  intensity?: number;
}

/**
 * Part chiffrée AGRÉGÉE d'un ensemble d'états appliqués. `derived` a la forme d'un `DerivedMods`
 * (injectable tel quel dans le moteur) ; les autres champs portent les mécaniques sans clé dérivée
 * (dés malus, malus plats « à tous les tests » et aux DM infligés).
 */
export interface ResolvedStatusModifiers {
  /** Modificateurs plats aux stats dérivées (DEF, Init., attaques…). Vide si aucun. */
  derived: DerivedMods;
  /** Au moins un état impose un dé malus à TOUS les tests (Affaibli). */
  allTestsMalusDie: boolean;
  /** Au moins un état impose un dé malus aux tests d'ATTAQUE (Immobilisé). */
  attackTestsMalusDie: boolean;
  /** Malus plat cumulé à tous les tests (Attaque invalidante). ≤ 0. */
  allTestsFlat: number;
  /** Malus plat cumulé aux DM infligés (Attaque invalidante). ≤ 0. */
  damageDealt: number;
}

/** Toutes les stats dérivées susceptibles d'être modifiées — pour balayer proprement `derived`. */
const DERIVED_KEYS: DerivedStatId[] = [
  'maxHp',
  'def',
  'initiative',
  'luckPoints',
  'manaPoints',
  'recoveryDiceCount',
  'meleeAttack',
  'rangedAttack',
  'magicAttack',
];

/** Les trois stats d'ATTAQUE (contact/distance/magie) — leurs jets SONT des tests d'attaque. */
const ATTACK_KEYS: DerivedStatId[] = ['meleeAttack', 'rangedAttack', 'magicAttack'];

/**
 * Retourne l'entrée de catalogue d'un id d'état, qu'il soit du glossaire ou situationnel
 * (les deux espaces d'ids sont disjoints). `undefined` si l'id est inconnu (défensif).
 */
export function statusEntry(id: AnyStatusEffectId): StatusEffectEntry | undefined {
  return (
    (STATUS_EFFECTS as Record<string, StatusEffectEntry>)[id] ??
    (SITUATIONAL_EFFECTS as Record<string, StatusEffectEntry>)[id]
  );
}

/** Vrai si l'état est CUMULATIF (compteur d'intensité) ; faux s'il est binaire. */
export function isStackingStatus(id: AnyStatusEffectId): boolean {
  return statusEntry(id)?.stacking !== undefined;
}

/** Intensité MAXIMALE d'un état (plafond de cumul). 1 pour un état binaire ou inconnu. */
export function statusMaxIntensity(id: AnyStatusEffectId): number {
  return statusEntry(id)?.stacking?.max ?? 1;
}

/**
 * Ramène une intensité demandée dans les bornes valides de l'état : [1, plafond]. Pour un état
 * binaire, le plafond est 1 → toujours 1. Utile côté stockage (PER-278) pour clamper avant d'écrire.
 */
export function clampIntensity(id: AnyStatusEffectId, requested: number): number {
  const max = statusMaxIntensity(id);
  if (!Number.isFinite(requested)) return 1;
  return Math.max(1, Math.min(max, Math.trunc(requested)));
}

/** Intensité effective d'un état appliqué (clampée ; 1 pour un binaire). */
function effectiveIntensity(applied: AppliedStatus): number {
  return clampIntensity(applied.id, applied.intensity ?? 1);
}

/**
 * Agrège la part chiffrée d'un ensemble d'états appliqués à un même combattant. Somme les
 * modificateurs dérivés (multipliés par l'intensité pour les états cumulatifs), OU les drapeaux de
 * dé malus, et cumule les malus plats. Les états sans `modifiers` (purement comportementaux) et les
 * ids inconnus sont ignorés silencieusement. Fonction PURE : n'observe rien d'autre que son entrée.
 */
export function resolveStatusModifiers(applied: AppliedStatus[]): ResolvedStatusModifiers {
  const derivedTotals: Partial<Record<DerivedStatId, number>> = {};
  let allTestsMalusDie = false;
  let attackTestsMalusDie = false;
  let allTestsFlat = 0;
  let damageDealt = 0;

  for (const entry of applied) {
    const mods = statusEntry(entry.id)?.modifiers;
    if (!mods) continue;
    const intensity = effectiveIntensity(entry);

    if (mods.derived) {
      for (const key of DERIVED_KEYS) {
        const v = mods.derived[key];
        if (v !== undefined) derivedTotals[key] = (derivedTotals[key] ?? 0) + v * intensity;
      }
    }
    if (mods.allTestsMalusDie) allTestsMalusDie = true;
    if (mods.attackTestsMalusDie) attackTestsMalusDie = true;
    if (mods.allTestsFlat !== undefined) allTestsFlat += mods.allTestsFlat * intensity;
    if (mods.damageDealt !== undefined) damageDealt += mods.damageDealt * intensity;
  }

  // On n'expose que les stats dérivées effectivement modifiées (on écarte les totaux nuls).
  const derived: DerivedMods = {};
  for (const key of DERIVED_KEYS) {
    const total = derivedTotals[key];
    if (total !== undefined && total !== 0) derived[key] = total;
  }

  return { derived, allTestsMalusDie, attackTestsMalusDie, allTestsFlat, damageDealt };
}

/**
 * IMPACT sur la FICHE du joueur (PER-281) — même catalogue que `resolveStatusModifiers`, mais
 * façonné pour l'injection dans la fiche et son détail « i ». Contrairement à la sortie « écran de
 * MJ » (agrégat plat), ici on conserve l'ATTRIBUTION par état pour le breakdown, et on reporte le
 * malus plat « à tous les tests » sur les trois attaques (leurs jets SONT des tests d'attaque).
 * Fonction PURE : n'observe que son entrée. Les états purement comportementaux (sans `modifiers`)
 * restent dans `statuses` (badge + verbatim) sans rien ajouter aux chiffres.
 */
export interface StatusSheetImpact {
  /** États appliqués CONNUS du catalogue (rappel visuel en badges, verbatim en info-bulle). */
  statuses: AppliedStatus[];
  /**
   * Modificateurs à FONDRE dans `derivedInput.mods` (forme d'un `DerivedMods`) : deltas de DEF/Init./
   * attaques + le malus plat « à tous les tests » reporté sur les trois attaques. Vide si aucun.
   */
  mods: DerivedMods;
  /**
   * Attribution par stat dérivée pour le détail « i » (« État : Aveuglé -5 »), keyée comme un
   * `DerivedMods`. Le TOTAL par clé est déjà fondu dans `mods` ; ceci n'en porte que la ventilation.
   */
  modSources: Partial<Record<DerivedStatId, { label: string; value: number }[]>>;
  /** Libellés des états imposant un dé malus à TOUS les tests (Affaibli). Vide = aucun. */
  allTestsMalusDie: string[];
  /** Libellés des états imposant un dé malus aux seuls tests d'ATTAQUE (Immobilisé). Vide = aucun. */
  attackTestsMalusDie: string[];
  /** Malus plat cumulé à tous les tests (Attaque invalidante). ≤ 0. */
  allTestsFlat: number;
  /** Malus plat cumulé aux DM infligés (Attaque invalidante). ≤ 0. */
  damageDealt: number;
}

export function statusSheetImpact(applied: AppliedStatus[]): StatusSheetImpact {
  const statuses: AppliedStatus[] = [];
  const modSources: Partial<Record<DerivedStatId, { label: string; value: number }[]>> = {};
  const allTestsMalusDie: string[] = [];
  const attackTestsMalusDie: string[] = [];
  let allTestsFlat = 0;
  let damageDealt = 0;

  const pushSource = (key: DerivedStatId, label: string, value: number) => {
    if (value === 0) return;
    (modSources[key] ??= []).push({ label, value });
  };

  for (const entry of applied) {
    const cat = statusEntry(entry.id);
    if (!cat) continue; // id inconnu : ignoré (défensif)
    statuses.push(entry);
    const mods = cat.modifiers;
    if (!mods) continue; // état purement comportemental : badge + verbatim seulement
    const intensity = effectiveIntensity(entry);
    const label = `État : ${cat.label}`;

    if (mods.derived) {
      for (const key of DERIVED_KEYS) {
        const v = mods.derived[key];
        if (v !== undefined) pushSource(key, label, v * intensity);
      }
    }
    if (mods.allTestsMalusDie) allTestsMalusDie.push(cat.label);
    if (mods.attackTestsMalusDie) attackTestsMalusDie.push(cat.label);
    if (mods.allTestsFlat !== undefined) {
      const flat = mods.allTestsFlat * intensity;
      allTestsFlat += flat;
      // Un malus « à tous les tests » vaut aussi pour les jets d'ATTAQUE (contact/distance/magie).
      for (const key of ATTACK_KEYS) pushSource(key, label, flat);
    }
    if (mods.damageDealt !== undefined) damageDealt += mods.damageDealt * intensity;
  }

  // Totaux par stat (somme des sources) → modificateurs injectables dans le calcul dérivé.
  const mods: DerivedMods = {};
  for (const key of DERIVED_KEYS) {
    const total = (modSources[key] ?? []).reduce((s, t) => s + t.value, 0);
    if (total !== 0) mods[key] = total;
  }

  return { statuses, mods, modSources, allTestsMalusDie, attackTestsMalusDie, allTestsFlat, damageDealt };
}
