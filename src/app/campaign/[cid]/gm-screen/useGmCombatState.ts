'use client';

/**
 * État du « combat en cours » de l'écran de MJ, persisté dans un `localStorage`
 * DÉDIÉ (une entrée par campagne, clé `gm-combat:<cid>`). On ne persiste QUE ce qui
 * n'est pas déjà stocké ailleurs :
 *  - le roster des créatures ajoutées (`creatures` : instances { id stable + slug de
 *    la créature du bestiaire } + `nextInstanceId` monotone) ;
 *  - les PV des créatures (`depletions`, indexés par id d'instance) — les PV joueurs
 *    vivent sur la fiche (store des personnages / cloud), on n'y touche pas ;
 *  - la position dans l'ordre d'initiative (`currentTurnKey`).
 *
 * Les personnages combattants (vivants + reliés à un joueur) ne sont PAS persistés
 * ici : ils sont re-dérivés du store des personnages à chaque affichage.
 *
 * Depuis PER-247, le roster n'est plus limité au bandit codé en dur : on stocke des
 * instances de N'IMPORTE QUELLE créature du bestiaire (par son slug), dont l'Init./PV
 * sont lus depuis le blob (`fetchCreatureBlob`). Une **migration douce** convertit
 * l'ancien format (`banditIds` de nombres) en instances de la créature
 * `bandit-de-base`, pour ne pas casser les combats déjà enregistrés.
 *
 * Lecture APRÈS montage (évite la désync SSR/CSR), écriture DANS l'updater — même
 * approche que `usePersistentBoolean`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Depletion } from '@/lib/character/types';

/** Instance d'une créature dans le combat en cours. */
export interface CreatureInstance {
  /** Id d'instance stable, unique dans le combat (clé du tracker + des PV). */
  id: string;
  /** Slug de la créature du bestiaire (`Creature.id` / `CreatureListItem.id`). */
  slug: string;
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

const EMPTY: GmCombatState = {
  creatures: [],
  nextInstanceId: 1,
  depletions: {},
  currentTurnKey: null,
};

const storageKey = (cid: string) => `gm-combat:${cid}`;

/**
 * Reconstruit un `GmCombatState` depuis la valeur brute relue de `localStorage`.
 * Reconnaît le format courant (`creatures`) et migre l'ancien format bandit :
 * chaque `banditIds[n]` devient une instance `{ id: 'bandit-<n>', slug: bandit-de-base }`,
 * l'id d'instance conservant le préfixe `bandit-<n>` pour préserver le tour courant
 * (`currentTurnKey`) et l'état déplié des jauges (persistKey) des combats en cours.
 */
function reviveState(raw: string): GmCombatState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return EMPTY;
  }
  if (!parsed || typeof parsed !== 'object') return EMPTY;

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
      depletions,
      currentTurnKey: legacy.currentTurnKey ?? null,
    };
  }

  return EMPTY;
}

export interface GmCombatStateApi extends GmCombatState {
  /** Ajoute une instance de la créature `slug` (id = `c-<nextInstanceId>`). */
  addCreature: (slug: string) => void;
  /** Retire l'instance `instanceId` (et son manque de PV). */
  removeCreature: (instanceId: string) => void;
  /** Fixe le manque de PV de l'instance `instanceId`. */
  setCreatureDepletion: (instanceId: string, depletion: Depletion) => void;
  /** Fixe le combattant dont c'est le tour. */
  setCurrentTurnKey: (key: string | null) => void;
}

export function useGmCombatState(cid: string): GmCombatStateApi {
  const [state, setState] = useState<GmCombatState>(EMPTY);
  // cid dont l'état a été hydraté depuis `localStorage` : garde l'écriture de ne pas
  // écraser une campagne avec l'état d'une autre (ou avec EMPTY avant hydratation).
  const hydratedCidRef = useRef<string | null>(null);

  useEffect(() => {
    hydratedCidRef.current = null;
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(storageKey(cid));
    const next = raw ? reviveState(raw) : EMPTY;
    // Synchronisation ponctuelle depuis localStorage après montage (pas une boucle).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(next);
    hydratedCidRef.current = cid;
  }, [cid]);

  const update = useCallback(
    (updater: (prev: GmCombatState) => GmCombatState) => {
      setState((prev) => {
        const next = updater(prev);
        // On n'écrit qu'une fois l'état de CE cid hydraté (sinon on écraserait le
        // localStorage avec EMPTY au premier rendu, avant lecture).
        if (typeof window !== 'undefined' && hydratedCidRef.current === cid) {
          window.localStorage.setItem(storageKey(cid), JSON.stringify(next));
        }
        return next;
      });
    },
    [cid],
  );

  const addCreature = useCallback(
    (slug: string) =>
      update((prev) => ({
        ...prev,
        creatures: [...prev.creatures, { id: `c-${prev.nextInstanceId}`, slug }],
        nextInstanceId: prev.nextInstanceId + 1,
      })),
    [update],
  );

  const removeCreature = useCallback(
    (instanceId: string) =>
      update((prev) => {
        const depletions = { ...prev.depletions };
        delete depletions[instanceId];
        return {
          ...prev,
          creatures: prev.creatures.filter((c) => c.id !== instanceId),
          depletions,
        };
      }),
    [update],
  );

  const setCreatureDepletion = useCallback(
    (instanceId: string, depletion: Depletion) =>
      update((prev) => ({
        ...prev,
        depletions: { ...prev.depletions, [instanceId]: depletion },
      })),
    [update],
  );

  const setCurrentTurnKey = useCallback(
    (key: string | null) => update((prev) => ({ ...prev, currentTurnKey: key })),
    [update],
  );

  return {
    ...state,
    addCreature,
    removeCreature,
    setCreatureDepletion,
    setCurrentTurnKey,
  };
}
