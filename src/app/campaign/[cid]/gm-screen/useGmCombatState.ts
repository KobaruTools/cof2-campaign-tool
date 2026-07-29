'use client';

/**
 * Façade React de l'« état de combat en cours » de l'écran de MJ, au-dessus du store
 * GLOBAL `campaignCombat` (PER-267). L'état, historiquement `useState` local à ce hook et
 * persisté dans `localStorage` (`gm-combat:<cid>`, synchro cross-fenêtre par l'événement
 * `storage`), vit désormais dans la table partagée `campaign_combat` (portée campagne, MJ
 * seul auteur), reflétée par le store et diffusée en direct sur le canal de session.
 *
 * Deux rôles :
 *  - **`'gm'`** : l'écran de MJ complet, AUTEUR unique. `load({seed:true})` migre au besoin
 *    le combat encore en `localStorage` vers la table ; les mutations passent par
 *    `applyLocalCombat` (store + localStorage + upsert table + broadcast).
 *  - **`'reader'`** : la fenêtre de projection (PER-248). `load({seed:false})` (aucune
 *    écriture) ; elle ne mute jamais et reçoit les changements du MJ soit par le canal
 *    (quand elle sera cliente de session, PER-268), soit — même navigateur, aujourd'hui —
 *    par l'événement `storage` (relayé vers `applyRemoteCombat`).
 *
 * L'API publique (`GmCombatStateApi`) est inchangée : `useGmScreenCombat` et ses pages
 * consommateurs n'ont pas à connaître le store.
 */
import { useCallback, useEffect } from 'react';

import { useCampaignCombatStore } from '@/stores/campaignCombat';
import {
  EMPTY_COMBAT_STATE,
  storageKey,
  type AddCreatureOptions,
  type CreatureInstance,
  type GmCombatState,
} from '@/lib/session/combatState';
import type { Depletion } from '@/lib/character/types';

export type { AddCreatureOptions, CreatureInstance, GmCombatState };

/** Rôle du client dans l'UI de combat : MJ auteur, ou lecteur (projection). */
export type CombatRole = 'gm' | 'reader';

export interface GmCombatStateApi extends GmCombatState {
  /** Ajoute une instance de la créature `slug` (id = `c-<nextInstanceId>`) ; visible + adversaire par défaut. */
  addCreature: (slug: string, options?: AddCreatureOptions) => void;
  /** Retire l'instance `instanceId` (et son manque de PV). */
  removeCreature: (instanceId: string) => void;
  /** Bascule la visibilité joueurs de l'instance `instanceId` (fenêtre projetée). */
  setCreatureVisibility: (instanceId: string, visible: boolean) => void;
  /** Fixe le manque de PV de l'instance `instanceId`. */
  setCreatureDepletion: (instanceId: string, depletion: Depletion) => void;
  /** Fixe le combattant dont c'est le tour. */
  setCurrentTurnKey: (key: string | null) => void;
}

export function useGmCombatState(cid: string, role: CombatRole = 'reader'): GmCombatStateApi {
  const state = useCampaignCombatStore((s) => s.byCampaign[cid] ?? EMPTY_COMBAT_STATE);
  const load = useCampaignCombatStore((s) => s.load);
  const applyLocalCombat = useCampaignCombatStore((s) => s.applyLocalCombat);
  const applyRemoteCombat = useCampaignCombatStore((s) => s.applyRemoteCombat);

  // Chargement au montage (table → localStorage → vide ; migration douce si rôle MJ) +
  // synchro cross-fenêtre same-browser (projection PER-248) : l'événement `storage` se
  // déclenche dans les AUTRES fenêtres de même origine à chaque écriture de la clé du
  // combat. On relaie la valeur reçue vers `applyRemoteCombat` (remplacement, pas de
  // réécriture). La fenêtre qui écrit ne reçoit pas son propre événement — elle a déjà
  // l'état à jour dans le store.
  useEffect(() => {
    void load(cid, { seed: role === 'gm' });
    if (typeof window === 'undefined') return;
    const key = storageKey(cid);
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key) return;
      let parsed: unknown = null;
      if (e.newValue) {
        try {
          parsed = JSON.parse(e.newValue);
        } catch {
          parsed = null;
        }
      }
      applyRemoteCombat(cid, parsed);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [cid, role, load, applyRemoteCombat]);

  const addCreature = useCallback(
    (slug: string, options?: AddCreatureOptions) =>
      applyLocalCombat(cid, (prev) => ({
        ...prev,
        creatures: [
          ...prev.creatures,
          {
            id: `c-${prev.nextInstanceId}`,
            slug,
            visible: options?.visible ?? true,
            side: options?.side ?? 'enemy',
          },
        ],
        nextInstanceId: prev.nextInstanceId + 1,
      })),
    [applyLocalCombat, cid],
  );

  const removeCreature = useCallback(
    (instanceId: string) =>
      applyLocalCombat(cid, (prev) => {
        const depletions = { ...prev.depletions };
        delete depletions[instanceId];
        return {
          ...prev,
          creatures: prev.creatures.filter((c) => c.id !== instanceId),
          depletions,
        };
      }),
    [applyLocalCombat, cid],
  );

  const setCreatureVisibility = useCallback(
    (instanceId: string, visible: boolean) =>
      applyLocalCombat(cid, (prev) => ({
        ...prev,
        creatures: prev.creatures.map((c) => (c.id === instanceId ? { ...c, visible } : c)),
      })),
    [applyLocalCombat, cid],
  );

  const setCreatureDepletion = useCallback(
    (instanceId: string, depletion: Depletion) =>
      applyLocalCombat(cid, (prev) => ({
        ...prev,
        depletions: { ...prev.depletions, [instanceId]: depletion },
      })),
    [applyLocalCombat, cid],
  );

  const setCurrentTurnKey = useCallback(
    (key: string | null) => applyLocalCombat(cid, (prev) => ({ ...prev, currentTurnKey: key })),
    [applyLocalCombat, cid],
  );

  return {
    ...state,
    addCreature,
    removeCreature,
    setCreatureVisibility,
    setCreatureDepletion,
    setCurrentTurnKey,
  };
}
