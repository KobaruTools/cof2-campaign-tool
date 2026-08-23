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
  type ImmunityId,
  type SituationalEffectId,
  type StatusEffectEntry,
  type StatusEffectId,
} from '@/data/schema';
import {
  CRYSTAL_STATUS_IDS,
  CRYSTAL_STATUSES,
  type CrystalStatusId,
} from '@/data/crystalStatuses';
import {
  MOUNT_PASSENGER_STATUSES,
  type MountPassengerStatusId,
} from '@/data/mountPassengerStatuses';
import { hpHealthState } from './gauges';
import type { Depletion } from './types';

/**
 * Identifiant d'état, indifféremment du glossaire (`StatusEffectId`), situationnel
 * (`SituationalEffectId`), d'environnement (`EnvironmentalEffectId`), bénéfique
 * (`BeneficialEffectId`, buffs de groupe PER-104), cristal confié (`CrystalStatusId`, PER-360) ou
 * passager d'une monture invoquée (`MountPassengerStatusId`, PER-363). Les six espaces d'ids sont
 * disjoints : un id suffit à retrouver son catalogue (cf. `statusEntry`).
 */
export type AnyStatusEffectId =
  | StatusEffectId
  | SituationalEffectId
  | EnvironmentalEffectId
  | BeneficialEffectId
  | CrystalStatusId
  | MountPassengerStatusId;

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
  /**
   * QUI a lancé cet effet — le nom du JOUEUR (« Mirielle »), et rien d'autre : jamais son personnage,
   * jamais « Personnage (Joueur) ». La capacité source est déjà nommée par ailleurs, et à la table on
   * désigne le joueur. Renseigné à la pose d'un BUFF DE GROUPE par un personnage réclamé ; absent
   * partout ailleurs — état subi (le MJ le pose au nom du monde), créature porteuse, personnage sans
   * joueur : mieux vaut aucune mention de source qu'une mention trompeuse.
   *
   * ATTENTION, valeur FIGÉE à la pose : changer le format ici ne réécrit pas les buffs déjà posés en
   * séance, qui gardent le texte enregistré jusqu'à ce qu'ils soient levés puis reposés.
   *
   * Un libellé et non une clé de combattant : le joueur qui lit sa fiche n'a dans son magasin ni les
   * autres personnages de la table ni les instances de créatures du MJ — il ne pourrait donc résoudre
   * aucun id. Le texte est donc figé à la pose, côté écran de MJ, seul endroit qui sait tout.
   */
  castBy?: string;
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
  /**
   * Modificateur plat cumulé aux DM infligés, SIGNÉ : négatif pour un malus (Attaque invalidante),
   * positif pour un buff (Aura du chef de guerre p. 161, PER-359).
   */
  damageDealt: number;
  /**
   * Modificateurs plats cumulés PAR DOMAINE de test (PER-359), keyés par id de `test-domains.ts` :
   * Sans peur (`fear-resistance`), Argument de taille (négociation/persuasion/intimidation). Vient
   * EN PLUS d'`allTestsFlat`, qui frappe tous les tests sans distinction — les deux s'additionnent
   * sur un domaine visé par les deux canaux. Vide si aucun état ne vise de domaine.
   */
  testDomains: Record<string, number>;
  /**
   * Union DÉDUPLIQUÉE des `ImmunityId` conférés TEMPORAIREMENT par les états actifs (PER-445, canal
   * `statusImmunities`) — ex. Résistance au mal (templier). Purement informatif (badge), comme les
   * immunités permanentes de `aggregateImmunities`. Vide si aucun état ne confère d'immunité.
   */
  statusImmunities: ImmunityId[];
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
 * d'environnement, bénéfique, cristal confié ou passager de monture (les six espaces d'ids sont
 * disjoints). `undefined` si l'id est inconnu (défensif).
 */
export function statusEntry(id: AnyStatusEffectId): StatusEffectEntry | undefined {
  return (
    (STATUS_EFFECTS as Record<string, StatusEffectEntry>)[id] ??
    (SITUATIONAL_EFFECTS as Record<string, StatusEffectEntry>)[id] ??
    (ENVIRONMENTAL_EFFECTS as Record<string, StatusEffectEntry>)[id] ??
    (BENEFICIAL_EFFECTS as Record<string, StatusEffectEntry>)[id] ??
    (CRYSTAL_STATUSES as Record<string, StatusEffectEntry>)[id] ??
    (MOUNT_PASSENGER_STATUSES as Record<string, StatusEffectEntry>)[id]
  );
}

/**
 * Vrai si l'état est un BUFF DE GROUPE (PER-104) : sa règle vise « ses alliés et lui », donc sa pose
 * s'adresse à plusieurs combattants d'un coup (`applyStatusToKeys`) au lieu d'un seul.
 */
export function isGroupScopedStatus(id: AnyStatusEffectId): boolean {
  return statusEntry(id)?.scope === 'group';
}

/**
 * Vrai si l'état ne vise qu'UN allié DÉSIGNÉ (PER-359 : Protéger un allié p. 87). Comme un buff de
 * groupe, sa pose passe par la fenêtre de choix — mais le choix y est EXCLUSIF, et rien n'est coché
 * d'avance : le livre dit « un allié », pas « ses alliés ».
 */
export function isSingleAllyScopedStatus(id: AnyStatusEffectId): boolean {
  return statusEntry(id)?.scope === 'single-ally';
}

/**
 * Vrai si la pose de cet état passe par la FENÊTRE DE CHOIX des combattants du camp, quelle que
 * soit la portée exacte (tout le camp ou un seul allié) — par opposition aux états qui frappent la
 * seule carte survolée. C'est le prédicat que l'écran de MJ interroge pour ouvrir la fenêtre.
 */
export function isCampScopedStatus(id: AnyStatusEffectId): boolean {
  const scope = statusEntry(id)?.scope;
  return scope === 'group' || scope === 'single-ally';
}

/**
 * Vrai si le LANCEUR est EXCLU du bénéfice de cet état (PER-359) : « tous vos alliés » et « un
 * allié » l'écartent, « ses alliés et lui » l'inclut. Pilote le pré-cochage de la fenêtre de pose.
 */
export function statusExcludesCarrier(id: AnyStatusEffectId): boolean {
  return statusEntry(id)?.excludesCarrier === true;
}

/**
 * Ensemble des ids d'états BÉNÉFIQUES — pour distinguer un bienfait d'un état subi (PER-104). Deux
 * catalogues y concourent : les buffs de groupe posés par le MJ, et les cristaux confiés par un
 * joueur (PER-360). Ils partagent tout ce qui découle du fait d'être un bienfait : la teinte de la
 * puce, la croix de levée du MJ, et le droit du porteur de s'en écarter.
 */
const BENEFICIAL_ID_SET: ReadonlySet<string> = new Set<string>([
  ...BENEFICIAL_EFFECT_IDS,
  ...CRYSTAL_STATUS_IDS,
]);

/** Vrai si l'id désigne un état BÉNÉFIQUE (buff de groupe ou cristal confié), et non un état subi. */
export function isBeneficialStatus(id: AnyStatusEffectId): boolean {
  return BENEFICIAL_ID_SET.has(id);
}

/** Vrai si l'état est un CRISTAL CONFIÉ par un autre personnage (PER-360, voie des cristaux p. 156). */
export function isCrystalStatus(id: AnyStatusEffectId): id is CrystalStatusId {
  return (CRYSTAL_STATUSES as Record<string, StatusEffectEntry>)[id] !== undefined;
}

/** Vrai si l'état est un PASSAGER d'une monture invoquée (PER-363, Monture fantôme p. 158). */
export function isMountPassengerStatus(id: AnyStatusEffectId): id is MountPassengerStatusId {
  return (MOUNT_PASSENGER_STATUSES as Record<string, StatusEffectEntry>)[id] !== undefined;
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
 * Vrai si le compteur de tours de cet état doit rester SECRET en projection (PER-440, ex. Frappe
 * concentrée p. 171 : « le MJ garde cette durée secrète »). Le compteur reste visible/ajustable côté
 * écran de MJ dans tous les cas — seule la vue projetée doit l'interroger.
 */
export function statusHidesDurationInProjection(id: AnyStatusEffectId): boolean {
  return statusEntry(id)?.hideDurationInProjection === true;
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
  const testDomains: Record<string, number> = {};
  const statusImmunities = new Set<ImmunityId>();

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
    if (mods.testDomains) {
      const value = mods.testDomains.value * intensity;
      for (const domain of mods.testDomains.domains)
        testDomains[domain] = (testDomains[domain] ?? 0) + value;
    }
    if (mods.statusImmunities) for (const imm of mods.statusImmunities) statusImmunities.add(imm);
  }

  // On n'expose que les stats dérivées effectivement modifiées (on écarte les totaux nuls).
  const derived: DerivedMods = {};
  for (const key of DERIVED_KEYS) {
    const total = derivedTotals[key];
    if (total !== undefined && total !== 0) derived[key] = total;
  }

  return {
    derived,
    allTestsMalusDie,
    attackTestsMalusDie,
    allTestsFlat,
    damageDealt,
    testDomains,
    statusImmunities: [...statusImmunities],
  };
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
  abilityTestSources: { id: AnyStatusEffectId; label: string; value: number; castBy?: string }[];
  /**
   * Modificateur plat cumulé à tous les tests, SIGNÉ (PER-104) : négatif pour un malus (Attaque
   * invalidante), positif pour un buff de groupe (Chant des héros, Bénédiction).
   */
  allTestsFlat: number;
  /**
   * Modificateur plat cumulé aux DM infligés, SIGNÉ : négatif pour un malus (Attaque invalidante),
   * positif pour un buff (Aura du chef de guerre, PER-359).
   */
  damageDealt: number;
  /**
   * Ventilation des bonus/malus PAR DOMAINE de test (PER-359), keyée par id de `test-domains.ts` —
   * une ligne par état, même forme que `abilityTestSources` pour que le détail « i » de
   * `TestDomainsPanel` les rende à l'identique (nom du buff, valeur, et qui l'a lancé).
   *
   * Ces valeurs ne sont comptées NULLE PART ailleurs : ni `mods` (qui ne porte que des stats
   * dérivées) ni `abilityTestSources` (qui ne porte que le canal « tous les tests ») ne les
   * connaissent. C'est à l'appelant de les fondre dans le bonus du domaine concerné.
   */
  testDomainSources: Record<
    string,
    { id: AnyStatusEffectId; label: string; value: number; castBy?: string }[]
  >;
  /**
   * Attribution PAR IMMUNITÉ (PER-445, canal `statusImmunities`) — même forme que `testDomainSources`,
   * keyée par `ImmunityId` au lieu d'un domaine de test : une ligne par état source, avec qui l'a posée
   * le cas échéant. Comptée NULLE PART ailleurs (ni `mods`, ni les autres ventilations). Vide = aucun
   * état actif ne confère d'immunité.
   */
  statusImmunitySources: Partial<Record<ImmunityId, { id: AnyStatusEffectId; label: string; castBy?: string }[]>>;
}

export function statusSheetImpact(applied: AppliedStatus[]): StatusSheetImpact {
  const statuses: AppliedStatus[] = [];
  const modSources: Partial<Record<DerivedStatId, { label: string; value: number }[]>> = {};
  const allTestsMalusDie: string[] = [];
  const attackTestsMalusDie: string[] = [];
  const abilityTestSources: StatusSheetImpact['abilityTestSources'] = [];
  const testDomainSources: StatusSheetImpact['testDomainSources'] = {};
  const statusImmunitySources: StatusSheetImpact['statusImmunitySources'] = {};
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
      // `castBy` suit l'état jusqu'au détail « i » du joueur : « [Chant des héros] (Source Mirielle)
      // +1 ». Sans lui, la ligne ne disait pas d'où venait le bonus (PER-104).
      if (flat !== 0)
        abilityTestSources.push({
          id: entry.id,
          label,
          value: flat,
          ...(entry.castBy ? { castBy: entry.castBy } : {}),
        });
    }
    if (mods.damageDealt !== undefined) damageDealt += mods.damageDealt * intensity;
    // Bonus limité à des DOMAINES (Sans peur, Argument de taille) : aucune stat dérivée à toucher,
    // seulement la ventilation par domaine que `TestDomainsPanel` saura rendre.
    if (mods.testDomains) {
      const value = mods.testDomains.value * intensity;
      if (value !== 0)
        for (const domain of mods.testDomains.domains)
          (testDomainSources[domain] ??= []).push({
            id: entry.id,
            label,
            value,
            ...(entry.castBy ? { castBy: entry.castBy } : {}),
          });
    }
    if (mods.statusImmunities)
      for (const imm of mods.statusImmunities)
        (statusImmunitySources[imm] ??= []).push({
          id: entry.id,
          label,
          ...(entry.castBy ? { castBy: entry.castBy } : {}),
        });
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
    testDomainSources,
    statusImmunitySources,
  };
}
