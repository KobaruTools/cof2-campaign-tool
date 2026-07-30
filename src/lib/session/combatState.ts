/**
 * Modèle PUR de l'« état de combat en cours » de l'écran de MJ (PER-267, milestone
 * PER-259) — types + reconstruction défensive, SANS React ni accès réseau. Extrait de
 * l'ancien hook `useGmCombatState` pour être partagé entre :
 *  - le store `campaignCombat` (source de vérité en mémoire, alimentée par la table
 *    `campaign_combat` et par le canal Realtime de session) ;
 *  - la façade `useGmCombatState` (lecture du store + mutations) ;
 *  - la migration douce `localStorage` → table.
 *
 * L'état est **relogé** de `localStorage` (`gm-combat:<cid>`, clé conservée comme pont
 * same-browser pour la projection PER-248 jusqu'à PER-268) vers la table partagée
 * `campaign_combat` (portée CAMPAGNE, MJ seul auteur). `reviveState`/`reviveStateObject`
 * reconnaissent le format courant ET migrent l'ancien format « bandits ».
 */
import type { Depletion } from '@/lib/character/types';
import type { CreatureSide } from '@/lib/ui/creature';
import {
  clampIntensity,
  type AnyStatusEffectId,
  type AppliedStatus,
} from '@/lib/character/statusEffects';

/** Instance d'une créature dans le combat en cours. */
export interface CreatureInstance {
  /** Id d'instance stable, unique dans le combat (clé du tracker + des PV). */
  id: string;
  /** Slug de la créature du bestiaire (`Creature.id` / `CreatureListItem.id`). */
  slug: string;
  /**
   * Visible par les joueurs sur la fenêtre projetée (PER-248). Absent ou `true` = visible ;
   * `false` = masquée (le MJ la voit sur son écran, avec un œil fermé, mais elle n'apparaît
   * PAS dans la projection). Permet de préparer un combat sans le révéler d'emblée.
   */
  visible?: boolean;
  /**
   * Camp de la créature (PER-249) : `'ally'` = alliée des joueurs, `'enemy'` = adversaire.
   * **Absent = adversaire** (migration douce : les instances déjà enregistrées et les
   * bandits legacy, dépourvus de ce champ, sont traités comme adverses partout).
   */
  side?: CreatureSide;
}

/** Options d'ajout d'une créature au combat (PER-247, PER-248, PER-249). */
export interface AddCreatureOptions {
  /** Visible par les joueurs sur la fenêtre projetée. Défaut `true`. */
  visible?: boolean;
  /** Camp de la créature. Défaut `'enemy'` (adversaire). */
  side?: CreatureSide;
}

export interface GmCombatState {
  /** Instances de créatures ajoutées au combat (ordre d'ajout). */
  creatures: CreatureInstance[];
  /** Prochain id d'instance à attribuer (monotone, robuste aux retraits). */
  nextInstanceId: number;
  /** Manque de PV par instance (indexé par id d'instance). */
  depletions: Record<string, Depletion>;
  /** Clé du combattant dont c'est le tour (`null` = combat pas encore démarré). */
  currentTurnKey: string | null;
  /**
   * États négatifs appliqués par combattant (PER-278, milestone PER-276). La clé est la
   * MÊME que `currentTurnKey` et les lignes du tracker : id de personnage joueur OU id
   * d'instance de créature. Chaque valeur liste les états posés (forme `AppliedStatus`,
   * consommée telle quelle par `resolveStatusModifiers`), avec l'intensité pour les états
   * cumulatifs. **MJ seul auteur** ; vide par défaut (migration douce des combats antérieurs).
   */
  statuses: Record<string, AppliedStatus[]>;
}

/**
 * Ancien format persisté (avant PER-247) : roster limité au bandit de base, indexé
 * par des ids numériques. Conservé pour la migration douce.
 */
interface LegacyGmCombatState {
  banditIds?: number[];
  nextBanditId?: number;
  banditDepletions?: Record<number, Depletion>;
  currentTurnKey?: string | null;
}

/** Slug de la créature du bestiaire vers laquelle migrer les anciens bandits. */
const LEGACY_BANDIT_SLUG = 'bandit-de-base';

/** État de combat vide (constante partagée, référence STABLE pour les sélecteurs de store). */
export const EMPTY_COMBAT_STATE: GmCombatState = {
  creatures: [],
  nextInstanceId: 1,
  depletions: {},
  currentTurnKey: null,
  statuses: {},
};

/** Clé `localStorage` dédiée au combat en cours d'une campagne. */
export const storageKey = (cid: string) => `gm-combat:${cid}`;

/**
 * Reconstruit un `GmCombatState` depuis une valeur DÉJÀ PARSÉE (objet du blob
 * `campaign_combat.state`, payload de broadcast, ou objet relu de `localStorage`).
 * Reconnaît le format courant (`creatures`) et migre l'ancien format bandit :
 * chaque `banditIds[n]` devient une instance `{ id: 'bandit-<n>', slug: bandit-de-base }`,
 * l'id d'instance conservant le préfixe `bandit-<n>` pour préserver le tour courant
 * (`currentTurnKey`) et l'état déplié des jauges (persistKey) des combats en cours.
 */
export function reviveStateObject(parsed: unknown): GmCombatState {
  if (!parsed || typeof parsed !== 'object') return EMPTY_COMBAT_STATE;

  // Format courant.
  const current = parsed as Partial<GmCombatState>;
  if (Array.isArray(current.creatures)) {
    return {
      creatures: current.creatures,
      nextInstanceId:
        typeof current.nextInstanceId === 'number'
          ? current.nextInstanceId
          : current.creatures.length + 1,
      depletions: current.depletions ?? {},
      currentTurnKey: current.currentTurnKey ?? null,
      statuses: reviveStatuses(current.statuses),
    };
  }

  // Ancien format « bandits » → instances de la créature `bandit-de-base`.
  const legacy = parsed as LegacyGmCombatState;
  if (Array.isArray(legacy.banditIds)) {
    const creatures = legacy.banditIds.map<CreatureInstance>((n) => ({
      id: `bandit-${n}`,
      slug: LEGACY_BANDIT_SLUG,
    }));
    const depletions: Record<string, Depletion> = {};
    for (const n of legacy.banditIds) {
      const dep = legacy.banditDepletions?.[n];
      if (dep) depletions[`bandit-${n}`] = dep;
    }
    return {
      creatures,
      nextInstanceId:
        typeof legacy.nextBanditId === 'number'
          ? legacy.nextBanditId
          : legacy.banditIds.length + 1,
      currentTurnKey: legacy.currentTurnKey ?? null,
      depletions,
      statuses: {},
    };
  }

  return EMPTY_COMBAT_STATE;
}

/**
 * Reconstruit défensivement la carte des états appliqués (`state.statuses`) : tolère
 * l'absence (défaut `{}`, migration douce des combats d'avant PER-278) et écarte les entrées
 * mal formées. Purement STRUCTUREL — l'intensité n'est PAS re-clampée ici (le résolveur et les
 * mutations s'en chargent) ; on normalise juste la forme (`{ id }` / `{ id, intensity }`) et on
 * omet les intensités ≤ 1 (convention « absent = 1 »). Les combattants sans état sont écartés.
 */
function reviveStatuses(raw: unknown): Record<string, AppliedStatus[]> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, AppliedStatus[]> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (!Array.isArray(value)) continue;
    const applied: AppliedStatus[] = [];
    for (const item of value) {
      if (!item || typeof item !== 'object') continue;
      const id = (item as { id?: unknown }).id;
      if (typeof id !== 'string') continue;
      const intensity = (item as { intensity?: unknown }).intensity;
      applied.push(
        typeof intensity === 'number' && Number.isFinite(intensity) && intensity > 1
          ? { id: id as AnyStatusEffectId, intensity: Math.trunc(intensity) }
          : { id: id as AnyStatusEffectId },
      );
    }
    if (applied.length > 0) out[key] = applied;
  }
  return out;
}

/**
 * Variante depuis une chaîne JSON brute (valeur de `localStorage`) : parse défensif
 * (chaîne invalide → état vide) puis `reviveStateObject`.
 */
export function reviveState(raw: string): GmCombatState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY_COMBAT_STATE;
  }
  return reviveStateObject(parsed);
}

/* ------------------------------------------------------------------------- *
 * RÉDUCTEURS D'ÉTATS DE COMBAT (PER-278, milestone PER-276) — purs, testés.
 * Le MJ (auteur unique) les applique via le store `campaignCombat`
 * (`applyLocalCombat` → localStorage + upsert `campaign_combat` + broadcast
 * `combat-state`). Aucun accès store/réseau ici : entrée → nouvel état.
 * ------------------------------------------------------------------------- */

/** Entrée canonique : on omet `intensity` quand elle vaut 1 (convention « absent = 1 »). */
function makeApplied(id: AnyStatusEffectId, intensity: number): AppliedStatus {
  return intensity > 1 ? { id, intensity } : { id };
}

/**
 * Applique un état sur un combattant (clé = id de perso joueur OU id d'instance de créature).
 * Idempotent par (combattant, état) : ajoute l'état s'il est absent, sinon fixe son intensité.
 * L'intensité est bornée à [1, plafond du catalogue] via `clampIntensity` (toujours 1 pour un
 * état binaire). Défaut `intensity = 1`.
 */
export function applyStatusTo(
  state: GmCombatState,
  key: string,
  id: AnyStatusEffectId,
  intensity = 1,
): GmCombatState {
  const clamped = clampIntensity(id, intensity);
  const current = state.statuses[key] ?? [];
  const next = current.some((s) => s.id === id)
    ? current.map((s) => (s.id === id ? makeApplied(id, clamped) : s))
    : [...current, makeApplied(id, clamped)];
  return { ...state, statuses: { ...state.statuses, [key]: next } };
}

/**
 * Retire un état d'un combattant. No-op si l'état n'est pas posé. Nettoie la clé du combattant
 * quand il ne lui reste aucun état (carte `statuses` sans entrée vide).
 */
export function removeStatusFrom(
  state: GmCombatState,
  key: string,
  id: AnyStatusEffectId,
): GmCombatState {
  const current = state.statuses[key];
  if (!current || !current.some((s) => s.id === id)) return state;
  const next = current.filter((s) => s.id !== id);
  const statuses = { ...state.statuses };
  if (next.length === 0) delete statuses[key];
  else statuses[key] = next;
  return { ...state, statuses };
}

/**
 * Ajuste de `delta` (±) l'intensité d'un état cumulatif DÉJÀ posé sur un combattant, bornée à
 * [1, plafond]. No-op si l'état n'est pas posé (le retrait passe par `removeStatusFrom`, pas par
 * un décrément) ; reste 1 pour un état binaire (plafond 1).
 */
export function adjustStatusIntensity(
  state: GmCombatState,
  key: string,
  id: AnyStatusEffectId,
  delta: number,
): GmCombatState {
  const current = state.statuses[key];
  const entry = current?.find((s) => s.id === id);
  if (!current || !entry) return state;
  const clamped = clampIntensity(id, (entry.intensity ?? 1) + delta);
  const next = current.map((s) => (s.id === id ? makeApplied(id, clamped) : s));
  return { ...state, statuses: { ...state.statuses, [key]: next } };
}

/**
 * Retire TOUS les états d'un combattant (au retrait de sa carte, ou à la réinitialisation du
 * combat côté PER-283). No-op si le combattant n'a aucun état.
 */
export function clearStatusesOf(state: GmCombatState, key: string): GmCombatState {
  if (!state.statuses[key]) return state;
  const statuses = { ...state.statuses };
  delete statuses[key];
  return { ...state, statuses };
}

/**
 * Réinitialise le combat en cours (PER-283, clôt la milestone PER-276). Vide TOUS les états
 * de tous les combattants, remet le tour courant à `null` et restaure les PV des créatures
 * (`depletions`). Conserve délibérément le roster de créatures (`creatures` / `nextInstanceId`)
 * et NE TOUCHE PAS aux PV des personnages joueurs (portés par leur fiche, hors de ce blob) :
 * une réinitialisation « peu surprenante » ne recompose pas la scène et n'écrit pas les fiches.
 * Action destructive à confirmer côté UI ; MJ seul auteur (broadcast automatique).
 */
export function resetCombat(state: GmCombatState): GmCombatState {
  return { ...state, statuses: {}, currentTurnKey: null, depletions: {} };
}
