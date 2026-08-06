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
  BENEFICIAL_EFFECT_IDS,
  BENEFICIAL_EFFECTS,
  ENVIRONMENTAL_EFFECTS,
  SITUATIONAL_EFFECTS,
  STATUS_EFFECTS,
  type BeneficialEffectId,
  type DerivedStatId,
  type EnvironmentalEffectId,
  type SituationalEffectId,
  type StatusEffectEntry,
  type StatusEffectId,
} from '@/data/schema';
import { hpHealthState } from './gauges';
import type { Depletion } from './types';

/**
 * Identifiant d'état, indifféremment du glossaire (`StatusEffectId`), situationnel
 * (`SituationalEffectId`), d'environnement (`EnvironmentalEffectId`) ou bénéfique
 * (`BeneficialEffectId`, buffs de groupe PER-104). Les quatre espaces d'ids sont disjoints : un id
 * suffit à retrouver son catalogue (cf. `statusEntry`).
 */
export type AnyStatusEffectId =
  | StatusEffectId
  | SituationalEffectId
  | EnvironmentalEffectId
  | BeneficialEffectId;

/**
 * Un état APPLIQUÉ à un combattant : son id + (pour les états cumulatifs) son intensité courante.
 * `intensity` est ignoré pour les états binaires (toujours résolus à 1). C'est la forme logique que
 * les tranches de stockage (PER-278) sérialiseront par combattant dans `campaign_combat.state`.
 */
export interface AppliedStatus {
  id: AnyStatusEffectId;
  /** Intensité pour un état cumulatif (≥ 1, plafonnée par le catalogue). Absent = 1. */
  intensity?: number;
  /**
   * COMPTEUR DE TOURS (PER-305) : numéro de la DERNIÈRE manche couverte par l'état
   * (`GmCombatState.roundNumber`, borne INCLUSIVE), et non un décompte. « Étourdi pendant 3 tours »
   * posé à la manche 5 s'écrit donc `untilRound: 7`.
   *
   * Absent = aucun compteur, l'état dure jusqu'à ce que le MJ le retire (cas par défaut). Stocker la
   * manche de fin plutôt que les tours restants rend le décompte PUREMENT DÉRIVÉ
   * (`statusRemainingRounds`) : rien à décrémenter quand la manche avance, et reculer d'une manche
   * ou corriger « Tour N » à la main remet les compteurs juste tout seuls.
   *
   * À l'expiration, l'état N'EST PAS retiré automatiquement : le badge se signale expiré et le MJ
   * garde la main. Le compteur ne pèse sur AUCUN calcul (seule `intensity` chiffre).
   */
  untilRound?: number;
}

/**
 * PROVENANCE d'un état porté par un combattant :
 *  - `manual` : posé par le MJ (glisser-déposer / menu à cocher), et retirable par lui ;
 *  - `auto` : DÉDUIT de l'état du combattant (ses PV), donc ni posé ni retirable à la main — il
 *    apparaît et disparaît tout seul avec la condition qui le provoque.
 */
export type StatusOrigin = 'manual' | 'auto';

/**
 * Règle qui JUSTIFIE un état déduit : son verbatim du livre + la page source, pour l'info-bulle du
 * badge automatique (convention projet : jamais de règle affichée sans son renvoi de page).
 */
export interface AutoStatusReason {
  text: string;
  sourcePage: number | string;
}

/**
 * Un état EFFECTIF sur un combattant : l'état appliqué + sa provenance. C'est cette forme que l'UI
 * consomme (badge retirable ou non, teinte), là où `AppliedStatus` reste la forme STOCKÉE (celle que
 * le MJ a posée). Un état déduit porte en plus la règle qui le justifie.
 */
export interface EffectiveStatus extends AppliedStatus {
  origin: StatusOrigin;
  /** Renseigné pour `origin: 'auto'` uniquement. */
  autoReason?: AutoStatusReason;
}

/**
 * Verbatim de la règle qui déduit l'état AFFAIBLI des PV courants (p. 220). Source unique : elle
 * alimente à la fois le badge d'état de santé de la jauge de PV (`HealthStateBadge`) et le badge
 * automatique du Combat Tracker.
 */
export const HP_WEAKENED_RULE =
  'Un personnage ou une créature à 1 PV subit l’état préjudiciable affaibli. ' +
  'L’état affaibli disparaît dès que les PV repassent au-dessus de 1.';

/** Règle + page de l'état affaibli déduit des PV, telle qu'affichée en info-bulle. */
export const HP_WEAKENED_REASON: AutoStatusReason = { text: HP_WEAKENED_RULE, sourcePage: 220 };

/**
 * États DÉDUITS des PV courants d'un combattant (p. 220) : exactement 1 PV ⇒ affaibli, et l'état
 * s'efface dès que les PV repassent au-dessus de 1. À 0 PV, rien ici : « à terre / mourant » et
 * « assommé » ne sont pas des états du glossaire (ils se lisent sur la jauge, cf. `hpHealthState`).
 *
 * `maxHp` ≤ 0 = PV INCONNUS (bloc de créature non chargé, personnage au profil incomplet) : on ne
 * déduit rien, plutôt que de conclure « 0 PV » d'une absence d'information.
 */
export function hpAutoStatuses(maxHp: number, depletion: Depletion): EffectiveStatus[] {
  if (maxHp <= 0) return [];
  return hpHealthState(maxHp, depletion) === 'weakened'
    ? [{ id: 'weakened', origin: 'auto', autoReason: HP_WEAKENED_REASON }]
    : [];
}

/**
 * Fusionne les états POSÉS par le MJ et les états DÉDUITS en une liste sans doublon d'id : le posé
 * l'emporte (le MJ garde la main, et son badge reste retirable) — un état déjà posé qui devient
 * aussi déductible n'apparaît donc qu'UNE fois. Fonction PURE ; l'ordre est stable (posés d'abord).
 */
export function effectiveStatuses(
  manual: readonly AppliedStatus[],
  auto: readonly EffectiveStatus[],
): EffectiveStatus[] {
  const manualIds = new Set(manual.map((s) => s.id));
  return [
    ...manual.map((s): EffectiveStatus => ({ ...s, origin: 'manual' })),
    ...auto.filter((s) => !manualIds.has(s.id)),
  ];
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
  /**
   * Modificateur plat cumulé à tous les tests, SIGNÉ (PER-104) : négatif pour un malus (Attaque
   * invalidante), positif pour un buff de groupe (Chant des héros, Bénédiction). Les deux se
   * compensent naturellement — c'est la même mécanique, au signe près.
   */
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
 * Retourne l'entrée de catalogue d'un id d'état, qu'il soit du glossaire, situationnel,
 * d'environnement ou bénéfique (les quatre espaces d'ids sont disjoints). `undefined` si l'id est
 * inconnu (défensif).
 */
export function statusEntry(id: AnyStatusEffectId): StatusEffectEntry | undefined {
  return (
    (STATUS_EFFECTS as Record<string, StatusEffectEntry>)[id] ??
    (SITUATIONAL_EFFECTS as Record<string, StatusEffectEntry>)[id] ??
    (ENVIRONMENTAL_EFFECTS as Record<string, StatusEffectEntry>)[id] ??
    (BENEFICIAL_EFFECTS as Record<string, StatusEffectEntry>)[id]
  );
}

/**
 * Vrai si l'état est un BUFF DE GROUPE (PER-104) : sa règle vise « ses alliés et lui », donc sa pose
 * s'adresse à plusieurs combattants d'un coup (`applyStatusToKeys`) au lieu d'un seul.
 */
export function isGroupScopedStatus(id: AnyStatusEffectId): boolean {
  return statusEntry(id)?.scope === 'group';
}

/** Ensemble des ids du catalogue BÉNÉFIQUE — pour distinguer un buff d'un état subi (PER-104). */
const BENEFICIAL_ID_SET: ReadonlySet<string> = new Set(BENEFICIAL_EFFECT_IDS);

/** Vrai si l'id appartient au catalogue BÉNÉFIQUE (`BENEFICIAL_EFFECTS`), et non à un état subi. */
export function isBeneficialStatus(id: AnyStatusEffectId): boolean {
  return BENEFICIAL_ID_SET.has(id);
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

/* ------------------------------------------------------------------------- *
 * COMPTEUR DE TOURS (PER-305) — arithmétique PURE de `AppliedStatus.untilRound`.
 * Aucun état de combat, aucun store : manche courante + état appliqué → tours restants.
 * ------------------------------------------------------------------------- */

/**
 * Durée maximale posable sur un état, en tours (garde-fou de saisie : un compteur à trois chiffres
 * ne rend plus service et ne tient pas dans la pastille du badge).
 */
export const STATUS_DURATION_MAX = 99;

/** Borne une durée demandée à [1, `STATUS_DURATION_MAX`] tours. 0 / invalide → 1. */
export function clampStatusRounds(requested: number): number {
  if (!Number.isFinite(requested)) return 1;
  return Math.max(1, Math.min(STATUS_DURATION_MAX, Math.trunc(requested)));
}

/**
 * Tours RESTANTS d'un état à la manche `roundNumber`, jamais négatif : `undefined` s'il ne porte pas
 * de compteur (durée indéterminée, cas par défaut), 0 s'il est EXPIRÉ mais toujours posé. Un état
 * couvrant la manche courante compte donc 1 tour restant (« ça se termine à la fin de ce tour-ci »).
 *
 * Fonction PURE et défensive : un `untilRound` non fini (blob relu de travers) vaut « pas de compteur ».
 */
export function statusRemainingRounds(
  applied: AppliedStatus,
  roundNumber: number,
): number | undefined {
  const until = applied.untilRound;
  if (typeof until !== 'number' || !Number.isFinite(until)) return undefined;
  return Math.max(0, Math.trunc(until) - Math.trunc(roundNumber) + 1);
}

/** Vrai si l'état porte un compteur ARRIVÉ À TERME (0 tour restant) sans avoir été retiré. */
export function isStatusExpired(applied: AppliedStatus, roundNumber: number): boolean {
  return statusRemainingRounds(applied, roundNumber) === 0;
}

/**
 * Manche de fin à stocker pour qu'il reste `remaining` tours à partir de la manche `roundNumber`
 * (réciproque de `statusRemainingRounds`). `remaining` est supposé ≥ 1 — les appelants retirent le
 * compteur sous 1 plutôt que de poser une durée nulle.
 */
export function untilRoundFor(roundNumber: number, remaining: number): number {
  return Math.trunc(roundNumber) + clampStatusRounds(remaining) - 1;
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
 * modificateur plat « à tous les tests » sur ses DEUX destinations : les trois attaques (leurs jets
 * SONT des tests d'attaque) ET les tests de CARACTÉRISTIQUE (`abilityTestSources`, PER-104 — la
 * seconde manquait, un « -1 à tous les tests » ne frappait que les attaques).
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
  /**
   * Ventilation du modificateur plat « à tous les tests » vers les tests de CARACTÉRISTIQUE (PER-104),
   * une ligne par état — même forme que les termes de `modSources`, pour le détail « i » de
   * `TestDomainsPanel`. À FONDRE dans `display.abilityTestBonus` par l'appelant (les valeurs ne sont
   * comptées nulle part ailleurs : `mods` ne porte que les stats DÉRIVÉES, dont les caracs ne sont pas).
   * Vide = aucun état ne modifie les tests de carac.
   */
  abilityTestSources: { id: AnyStatusEffectId; label: string; value: number }[];
  /**
   * Modificateur plat cumulé à tous les tests, SIGNÉ (PER-104) : négatif pour un malus (Attaque
   * invalidante), positif pour un buff de groupe (Chant des héros, Bénédiction).
   */
  allTestsFlat: number;
  /** Malus plat cumulé aux DM infligés (Attaque invalidante). ≤ 0. */
  damageDealt: number;
}

export function statusSheetImpact(applied: AppliedStatus[]): StatusSheetImpact {
  const statuses: AppliedStatus[] = [];
  const modSources: Partial<Record<DerivedStatId, { label: string; value: number }[]>> = {};
  const allTestsMalusDie: string[] = [];
  const attackTestsMalusDie: string[] = [];
  const abilityTestSources: { id: AnyStatusEffectId; label: string; value: number }[] = [];
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
    // Un buff de groupe n'est pas un « État » subi : il se ventile sous son propre nom (« Chant des
    // héros +1 »), là où un état préjudiciable garde le préfixe qui le désigne comme tel.
    const label = isBeneficialStatus(entry.id) ? cat.label : `État : ${cat.label}`;

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
      // « À tous les tests » = les jets d'ATTAQUE (contact/distance/magie), qui sont des stats
      // dérivées, ET les tests de CARACTÉRISTIQUE, qui n'en sont pas : ces derniers ont leur propre
      // canal d'affichage (`display.abilityTestBonus`), d'où une ventilation séparée.
      for (const key of ATTACK_KEYS) pushSource(key, label, flat);
      if (flat !== 0) abilityTestSources.push({ id: entry.id, label, value: flat });
    }
    if (mods.damageDealt !== undefined) damageDealt += mods.damageDealt * intensity;
  }

  // Totaux par stat (somme des sources) → modificateurs injectables dans le calcul dérivé.
  const mods: DerivedMods = {};
  for (const key of DERIVED_KEYS) {
    const total = (modSources[key] ?? []).reduce((s, t) => s + t.value, 0);
    if (total !== 0) mods[key] = total;
  }

  return {
    statuses,
    mods,
    modSources,
    allTestsMalusDie,
    attackTestsMalusDie,
    abilityTestSources,
    allTestsFlat,
    damageDealt,
  };
}
