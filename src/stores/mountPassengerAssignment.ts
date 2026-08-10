'use client';

/**
 * Passager qu'un mage a désigné pour sa Monture fantôme (PER-363, voie de l'invocation majeure r4,
 * p. 158). MÊME MOTIF que l'attribution d'un cristal (`stores/crystalAssignment.ts`, PER-360), en
 * plus simple : un seul état possible (`monture-fantome-passager`, pas 14 variantes), et rien ne
 * quitte la fiche du mage (contrairement au cristal, dont le bonus doit être retiré côté fabricant) —
 * seul l'état de combat partagé change, la présence du passager n'affecte AUCUN calcul chez le mage.
 *
 * QUAND C'EST LE MJ QUI AGIT, il n'y a personne à qui annoncer (un client ne reçoit pas ses propres
 * broadcasts) : on exécute donc directement.
 *
 * Volontairement NON persisté (comme les cristaux) : couche OPTIMISTE, l'état de combat partagé
 * faisant foi et survivant au reload.
 */
import { create } from 'zustand';

import { sessionSendFor } from '@/lib/session/sessionBridge';
import {
  applyMountPassengerAssignment,
  applyMountPassengerRelease,
  setMountPassengerAssignment,
  type MountPassengerAssignment,
  type MountPassengerAssignmentMap,
  type MountPassengerRelease,
} from '@/lib/session/mountPassengerAssignment';
import { useCampaignCombatStore } from './campaignCombat';
import { useCharactersStore } from './characters';
import { usePlayersStore } from './players';

/** Événement de broadcast : « ce personnage monte avec moi ». Traité par le seul client du MJ. */
export const MOUNT_PASSENGER_ASSIGNMENT_EVENT = 'mount-passenger-assignment';
/** Événement de broadcast : « je descends ». Traité par le seul client du MJ. */
export const MOUNT_PASSENGER_RELEASE_EVENT = 'mount-passenger-release';

/** Carte vide partagée — référence STABLE, pour que les sélecteurs ne re-rendent pas dans le vide. */
const EMPTY_MAP: MountPassengerAssignmentMap = {};

/**
 * Nom du JOUEUR qui désigne un passager (`AppliedStatus.castBy`), résolu depuis la table — jamais le
 * nom du PERSONNAGE (même vocabulaire que la pose d'un buff de groupe ou l'attribution d'un cristal).
 * `undefined` si le mage n'est réclamé par personne.
 */
function playerNameOf(sourceCharacterId: string): string | undefined {
  const source = useCharactersStore.getState().characters.find((c) => c.id === sourceCharacterId);
  if (!source?.playerId) return undefined;
  return usePlayersStore.getState().players.find((p) => p.id === source.playerId)?.name;
}

/** CE QUE FAIT LE CLIENT DU MJ en recevant une assignation (ou en l'émettant lui-même). */
export function executeMountPassengerAssignment(campaignId: string, assignment: MountPassengerAssignment): void {
  const castBy = playerNameOf(assignment.sourceCharacterId);
  useCampaignCombatStore
    .getState()
    .applyLocalCombat(campaignId, (prev) => applyMountPassengerAssignment(prev, assignment, castBy));
}

/** CE QUE FAIT LE CLIENT DU MJ quand un passager annonce « je descends ». */
export function executeMountPassengerRelease(campaignId: string, _release: MountPassengerRelease): void {
  useCampaignCombatStore.getState().applyLocalCombat(campaignId, (prev) => applyMountPassengerRelease(prev));
}

interface MountPassengerAssignmentState {
  /** Passager par personnage SOURCE (mage). Absent/vide = personne ne monte. */
  byMage: MountPassengerAssignmentMap;

  /** Passager désigné par ce mage, ou `null` (référence stable quand il n'en a aucun). */
  targetOf: (sourceCharacterId: string) => string | null;

  /**
   * Désigne `targetKey` comme passager (ou l'écarte si `null`) ET le fait exécuter : directement
   * quand ce client est celui du MJ, par annonce sinon. Idempotent. `campaignId` `null` = personnage
   * hors campagne : rien n'est écrit ni annoncé.
   */
  assign: (campaignId: string | null, sourceCharacterId: string, targetKey: string | null, isGm: boolean) => void;

  /** Un PASSAGER descend de lui-même (retour de recette). */
  release: (campaignId: string | null, holderKey: string, isGm: boolean) => void;
}

/** Diffuse au MJ. Sans canal ouvert (hors séance), le geste reste purement local. */
function broadcast(campaignId: string, event: string, payload: unknown): void {
  const send = sessionSendFor(campaignId);
  if (send) send(event, payload);
}

export const useMountPassengerAssignmentStore = create<MountPassengerAssignmentState>()((set, get) => ({
  byMage: {},

  targetOf: (sourceCharacterId) => get().byMage[sourceCharacterId] ?? null,

  assign: (campaignId, sourceCharacterId, targetKey, isGm) => {
    if (!campaignId) return;
    const current = get().byMage;
    const next = setMountPassengerAssignment(current, sourceCharacterId, targetKey);
    if (next !== current) set({ byMage: next });
    const assignment: MountPassengerAssignment = { sourceCharacterId, targetKey };
    if (isGm) executeMountPassengerAssignment(campaignId, assignment);
    else broadcast(campaignId, MOUNT_PASSENGER_ASSIGNMENT_EVENT, assignment);
  },

  release: (campaignId, holderKey, isGm) => {
    if (!campaignId) return;
    const release: MountPassengerRelease = { holderKey };
    if (isGm) executeMountPassengerRelease(campaignId, release);
    else broadcast(campaignId, MOUNT_PASSENGER_RELEASE_EVENT, release);
  },
}));
