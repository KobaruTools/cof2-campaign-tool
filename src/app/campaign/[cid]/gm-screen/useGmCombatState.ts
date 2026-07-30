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
 *  - **`'reader'`** : la fenêtre de projection (PER-248), devenue cliente de session (PER-268).
 *    `load({seed:false})` (aucune écriture) au montage pour l'état initial ; elle ne mute jamais
 *    et reçoit les changements du MJ EN DIRECT via le canal de session (`combat-state` →
 *    `applyRemoteCombat`, câblé dans `useSessionChannel`). Le pont same-browser `storage` a été
 *    retiré : canal seul (plus de synchro live hors session, mais source de vérité unique).
 *
 * L'API publique (`GmCombatStateApi`) est inchangée : `useGmScreenCombat` et ses pages
 * consommateurs n'ont pas à connaître le store.
 */
import { useCallback, useEffect } from 'react';

import { useCampaignCombatStore } from '@/stores/campaignCombat';
import {
  EMPTY_COMBAT_STATE,
  applyStatusTo,
  removeStatusFrom,
  adjustStatusIntensity,
  clearStatusesOf,
  resetCombat as resetCombatState,
  setRoundNumber as setRoundNumberState,
  type AddCreatureOptions,
  type CreatureInstance,
  type GmCombatState,
} from '@/lib/session/combatState';
import type { AnyStatusEffectId } from '@/lib/character/statusEffects';
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
  /** Fixe le numéro de manche (« Tour N »), borné à ≥ 0 (incrément auto de fin de manche + réglage manuel). */
  setRoundNumber: (roundNumber: number) => void;
  /**
   * Applique un état négatif sur un combattant (`combatantKey` = id de perso joueur OU id
   * d'instance de créature). Idempotent : ré-appliquer fixe l'intensité (bornée au plafond).
   */
  applyStatus: (combatantKey: string, id: AnyStatusEffectId, intensity?: number) => void;
  /** Retire un état négatif d'un combattant. */
  removeStatus: (combatantKey: string, id: AnyStatusEffectId) => void;
  /** Ajuste de `delta` (±) l'intensité d'un état cumulatif posé sur un combattant. */
  adjustStatus: (combatantKey: string, id: AnyStatusEffectId, delta: number) => void;
  /**
   * Réinitialise le combat (PER-283) : vide tous les états, remet le tour courant à `null` et
   * restaure les PV des créatures. Conserve le roster et ne touche pas aux PV des joueurs.
   */
  resetCombat: () => void;
}

export function useGmCombatState(cid: string, role: CombatRole = 'reader'): GmCombatStateApi {
  const state = useCampaignCombatStore((s) => s.byCampaign[cid] ?? EMPTY_COMBAT_STATE);
  const load = useCampaignCombatStore((s) => s.load);
  const applyLocalCombat = useCampaignCombatStore((s) => s.applyLocalCombat);

  // Chargement au montage (table → localStorage → vide ; migration douce si rôle MJ).
  // La synchro EN DIRECT ne passe plus par l'événement `storage` (retiré en PER-268) :
  // le rôle MJ écrit lui-même le store (`applyLocalCombat`), et la projection reçoit les
  // changements via le canal de session (`combat-state` → `applyRemoteCombat`, câblé dans
  // `useSessionChannel`). Canal seul → source de vérité unique, pas de double application.
  useEffect(() => {
    void load(cid, { seed: role === 'gm' });
  }, [cid, role, load]);

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
        // Retire aussi les états posés sur l'instance (sinon ils orphelineraient la carte).
        const withoutStatuses = clearStatusesOf(prev, instanceId);
        return {
          ...withoutStatuses,
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

  const setRoundNumber = useCallback(
    (roundNumber: number) =>
      applyLocalCombat(cid, (prev) => setRoundNumberState(prev, roundNumber)),
    [applyLocalCombat, cid],
  );

  const applyStatus = useCallback(
    (combatantKey: string, id: AnyStatusEffectId, intensity?: number) =>
      applyLocalCombat(cid, (prev) => applyStatusTo(prev, combatantKey, id, intensity)),
    [applyLocalCombat, cid],
  );

  const removeStatus = useCallback(
    (combatantKey: string, id: AnyStatusEffectId) =>
      applyLocalCombat(cid, (prev) => removeStatusFrom(prev, combatantKey, id)),
    [applyLocalCombat, cid],
  );

  const adjustStatus = useCallback(
    (combatantKey: string, id: AnyStatusEffectId, delta: number) =>
      applyLocalCombat(cid, (prev) => adjustStatusIntensity(prev, combatantKey, id, delta)),
    [applyLocalCombat, cid],
  );

  const resetCombat = useCallback(
    () => applyLocalCombat(cid, (prev) => resetCombatState(prev)),
    [applyLocalCombat, cid],
  );

  return {
    ...state,
    addCreature,
    removeCreature,
    setCreatureVisibility,
    setCreatureDepletion,
    setCurrentTurnKey,
    setRoundNumber,
    applyStatus,
    removeStatus,
    adjustStatus,
    resetCombat,
  };
}
