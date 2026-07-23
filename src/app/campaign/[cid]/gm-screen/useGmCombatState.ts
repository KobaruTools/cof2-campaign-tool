'use client';

/**
 * État du « combat en cours » de l'écran de MJ, persisté dans un `localStorage`
 * DÉDIÉ (une entrée par campagne, clé `gm-combat:<cid>`). On ne persiste QUE ce qui
 * n'est pas déjà stocké ailleurs :
 *  - le roster des bandits ajoutés (`banditIds` + `nextBanditId` monotone) ;
 *  - les PV des bandits (`banditDepletions`) — les PV joueurs vivent sur la fiche
 *    (store des personnages / cloud), on n'y touche pas ;
 *  - la position dans l'ordre d'initiative (`currentTurnKey`).
 *
 * Les personnages combattants (vivants + reliés à un joueur) ne sont PAS persistés
 * ici : ils sont re-dérivés du store des personnages à chaque affichage.
 *
 * Lecture APRÈS montage (évite la désync SSR/CSR), écriture DANS l'updater — même
 * approche que `usePersistentBoolean`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Depletion } from '@/lib/character/types';

export interface GmCombatState {
  /** Ids stables des bandits ajoutés (ordre d'ajout). */
  banditIds: number[];
  /** Prochain id de bandit à attribuer (monotone, robuste aux retraits). */
  nextBanditId: number;
  /** Manque de PV par bandit (indexé par id de bandit). */
  banditDepletions: Record<number, Depletion>;
  /** Clé du combattant dont c'est le tour (`null` = combat pas encore démarré). */
  currentTurnKey: string | null;
}

const EMPTY: GmCombatState = {
  banditIds: [],
  nextBanditId: 1,
  banditDepletions: {},
  currentTurnKey: null,
};

const storageKey = (cid: string) => `gm-combat:${cid}`;

export interface GmCombatStateApi extends GmCombatState {
  /** Ajoute un bandit de base (id = `nextBanditId`). */
  addBandit: () => void;
  /** Retire le bandit `id` (et son manque de PV). */
  removeBandit: (id: number) => void;
  /** Fixe le manque de PV du bandit `id`. */
  setBanditDepletion: (id: number, depletion: Depletion) => void;
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
    let next: GmCombatState = EMPTY;
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<GmCombatState>;
        next = { ...EMPTY, ...parsed };
      } catch {
        next = EMPTY;
      }
    }
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

  const addBandit = useCallback(
    () =>
      update((prev) => ({
        ...prev,
        banditIds: [...prev.banditIds, prev.nextBanditId],
        nextBanditId: prev.nextBanditId + 1,
      })),
    [update],
  );

  const removeBandit = useCallback(
    (id: number) =>
      update((prev) => {
        const banditDepletions = { ...prev.banditDepletions };
        delete banditDepletions[id];
        return { ...prev, banditIds: prev.banditIds.filter((x) => x !== id), banditDepletions };
      }),
    [update],
  );

  const setBanditDepletion = useCallback(
    (id: number, depletion: Depletion) =>
      update((prev) => ({
        ...prev,
        banditDepletions: { ...prev.banditDepletions, [id]: depletion },
      })),
    [update],
  );

  const setCurrentTurnKey = useCallback(
    (key: string | null) => update((prev) => ({ ...prev, currentTurnKey: key })),
    [update],
  );

  return {
    ...state,
    addBandit,
    removeBandit,
    setBanditDepletion,
    setCurrentTurnKey,
  };
}
