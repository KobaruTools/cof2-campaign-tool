'use client';

/**
 * Store des DEMANDES DE BUFF des joueurs (PER-358) — pendant strict de `stores/restProposal` côté
 * demandes (PER-313), en plus simple : il n'y a pas de relevé à tenir, donc pas d'instantané absolu
 * à rediffuser. Une demande monte au MJ, qui l'adopte ou la refuse. Rien n'est persisté.
 *
 * Deux chemins, selon le rôle du client :
 *  - **Joueur** : `requestBuff` pose sa demande localement (retour immédiat, le canal est en
 *    `self: false`) et l'envoie au MJ ; `applyRemoteDecline` recueille un éventuel refus.
 *  - **MJ (auteur unique de l'état de combat)** : `mergeRemoteRequest` range la demande dans sa file,
 *    `adoptRequest` la retire et la RENVOIE — c'est l'appelant qui ouvre alors sa fenêtre de pose
 *    habituelle (`GroupBuffDialog`), seule à savoir viser un camp — et `declineRequest` la retire en
 *    avertissant le seul demandeur.
 *
 * L'ADOPTION ne renvoie rien au demandeur, volontairement : ce qui lui répond, c'est le buff qui
 * apparaît sur sa fiche par le canal d'état de combat. Un accusé de réception envoyé à l'ouverture de
 * la fenêtre de pose mentirait si le MJ y renonçait.
 *
 * Sens des imports (identique à PER-266/312/313, aucun cycle) : ce store importe `sessionBridge`
 * (émission) ; `useSessionChannel` importe CE store (réception).
 */
import { create } from 'zustand';

import { sessionSendFor } from '@/lib/session/sessionBridge';
import {
  newBuffRequestId,
  removeBuffRequest,
  reviveBuffRequest,
  upsertBuffRequest,
  type BuffRequest,
} from '@/lib/session/buffRequest';
import type { BeneficialEffectId } from '@/data/schema';

/** Événement de broadcast portant la demande de buff d'UN joueur, adressée au MJ. */
export const BUFF_REQUEST_EVENT = 'buff-request';

/**
 * Événement de broadcast portant le refus d'une demande. Diffusé à toute la table faute de message
 * adressé sur le canal, mais **un seul client s'y reconnaît** : celui dont la demande porte cet
 * identifiant (cf. `applyRemoteDecline`).
 */
export const BUFF_REQUEST_DECLINED_EVENT = 'buff-request-declined';

/** Demande émise par CE client (joueur) et son sort, telle qu'affichée sur sa fiche. */
export interface OwnBuffRequest {
  request: BuffRequest;
  /** `'sent'` : partie, le MJ ne s'est pas prononcé. `'declined'` : le MJ a dit non. */
  status: 'sent' | 'declined';
}

interface BuffRequestStoreState {
  /**
   * Demandes en attente d'arbitrage, **chez le MJ**, dans l'ordre d'arrivée. Une seule par
   * personnage. Vide chez un joueur : il ne voit pas les demandes de ses camarades.
   */
  requestsByCampaign: Record<string, BuffRequest[]>;
  /** Demande émise par CE client, `null` = aucune. */
  myRequestByCampaign: Record<string, OwnBuffRequest | null>;

  /**
   * Demande de CE client (joueur) : posée localement puis envoyée au MJ. N'écrit RIEN dans l'état de
   * combat — le joueur n'en est pas auteur. Se raviser remplace la demande en attente.
   */
  requestBuff: (
    cid: string,
    buffId: BeneficialEffectId,
    byName: string,
    characterId: string,
  ) => void;
  /** Range l'accusé de réception ou le refus affiché au demandeur (joueur). */
  dismissMyRequest: (cid: string) => void;
  /**
   * Réception d'une demande, CHEZ LE MJ : rangée dans sa file. Ne diffuse rien — les autres joueurs
   * n'ont pas à savoir qui a demandé quoi tant que le MJ n'a pas tranché.
   */
  mergeRemoteRequest: (cid: string, payload: unknown) => void;
  /**
   * Adoption (MJ) : la demande quitte la file et est RENVOYÉE à l'appelant, qui ouvre sa fenêtre de
   * pose. `null` si elle a déjà été traitée (double clic, refus concurrent).
   */
  adoptRequest: (cid: string, requestId: string) => BuffRequest | null;
  /** Refus (MJ) : la demande quitte la file et le seul demandeur en est notifié. */
  declineRequest: (cid: string, requestId: string) => void;
  /**
   * Réception d'un refus, chez le JOUEUR : ne s'applique qu'à sa propre demande (le canal parle à
   * tout le monde, l'identifiant fait le tri).
   */
  applyRemoteDecline: (cid: string, payload: unknown) => void;
}

export const useBuffRequestStore = create<BuffRequestStoreState>()((set, get) => ({
  requestsByCampaign: {},
  myRequestByCampaign: {},

  requestBuff: (cid, buffId, byName, characterId) => {
    const request: BuffRequest = {
      id: newBuffRequestId(),
      buffId,
      byName,
      characterId,
      at: new Date().toISOString(),
    };
    set((s) => ({
      myRequestByCampaign: { ...s.myRequestByCampaign, [cid]: { request, status: 'sent' } },
    }));
    const send = sessionSendFor(cid);
    if (send) send(BUFF_REQUEST_EVENT, { request });
  },

  dismissMyRequest: (cid) => {
    if (!get().myRequestByCampaign[cid]) return;
    set((s) => ({ myRequestByCampaign: { ...s.myRequestByCampaign, [cid]: null } }));
  },

  mergeRemoteRequest: (cid, payload) => {
    const request = reviveBuffRequest((payload as { request?: unknown } | null)?.request);
    if (!request) return;
    const queue = get().requestsByCampaign[cid] ?? [];
    const next = upsertBuffRequest(queue, request);
    if (next === queue) return; // demande déjà connue : ni rendu ni traitement
    set((s) => ({ requestsByCampaign: { ...s.requestsByCampaign, [cid]: next } }));
  },

  adoptRequest: (cid, requestId) => {
    const queue = get().requestsByCampaign[cid] ?? [];
    const request = queue.find((r) => r.id === requestId);
    if (!request) return null; // déjà traitée
    set((s) => ({
      requestsByCampaign: { ...s.requestsByCampaign, [cid]: removeBuffRequest(queue, requestId) },
    }));
    return request;
  },

  declineRequest: (cid, requestId) => {
    const queue = get().requestsByCampaign[cid] ?? [];
    const next = removeBuffRequest(queue, requestId);
    if (next === queue) return; // déjà traitée : pas de second refus
    set((s) => ({ requestsByCampaign: { ...s.requestsByCampaign, [cid]: next } }));
    const send = sessionSendFor(cid);
    if (send) send(BUFF_REQUEST_DECLINED_EVENT, { requestId });
  },

  applyRemoteDecline: (cid, payload) => {
    const mine = get().myRequestByCampaign[cid];
    if (!mine || mine.status === 'declined') return;
    const requestId = (payload as { requestId?: unknown } | null)?.requestId;
    if (requestId !== mine.request.id) return; // refus adressé à un camarade
    set((s) => ({
      myRequestByCampaign: { ...s.myRequestByCampaign, [cid]: { ...mine, status: 'declined' } },
    }));
  },
}));
