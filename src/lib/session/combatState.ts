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
    };
  }

  return EMPTY_COMBAT_STATE;
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
