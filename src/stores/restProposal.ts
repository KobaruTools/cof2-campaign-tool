'use client';

/**
 * Store de la « proposition de repos de groupe » en cours par campagne (PER-312) — le pendant
 * ÉPHÉMÈRE de `stores/campaignCombat` : même modèle d'auteur unique et d'instantané absolu diffusé
 * en LWW, mais **rien n'est persisté**. Une proposition vit le temps d'une pause à la table ; ce
 * qu'elle produit de durable (les repos réellement appliqués) est déjà persisté fiche par fiche par
 * la synchro d'état de jeu (PER-266). Un rechargement de page du proposant perd donc le relevé des
 * réponses, jamais les récupérations déjà appliquées.
 *
 * Deux chemins, selon le rôle du client :
 *  - **MJ (auteur unique)** : `propose` / `applyProposal` / `closeProposal` posent l'état et
 *    diffusent l'instantané absolu ; `mergeRemoteResponse` intègre la réponse d'un joueur et
 *    **rediffuse** (c'est ainsi que toute la table converge, y compris un joueur arrivé en cours).
 *  - **Joueur** : `applyRemoteProposal` ← reçu du canal ; `respond` pose sa réponse localement
 *    (affichage immédiat) et l'envoie au MJ. Il ne diffuse jamais d'instantané.
 *
 * PER-313 ajoute un troisième échange, en amont : un joueur peut DEMANDER une pause (`requestRest`).
 * Sa demande monte au MJ (`mergeRemoteRequest`, file d'attente par campagne), qui l'adopte
 * (`adoptRequest` → une vraie proposition au nom du demandeur) ou la refuse (`declineRequest` →
 * notification au seul demandeur, `applyRemoteDecline`). Le MJ reste ainsi auteur unique du relevé et
 * garde le dernier mot sur la scène sans qu'aucun veto n'ait à exister — voir `restProposal.ts`.
 *
 * Ce store ne SAIT PAS appliquer une récupération : `applyProposal` ne fait que passer la proposition
 * en `'applied'` et diffuser ce top. Chaque fiche, en le recevant, applique le repos qu'elle avait
 * préparé (cf. `RestProposalDialog`) — c'est ce qui rend l'annulation propre : tant que le top n'est
 * pas donné, aucune fiche n'a bougé.
 *
 * Sens des imports (identique à PER-266/267, aucun cycle) : ce store importe `sessionBridge`
 * (émission) ; `useSessionChannel` importe CE store (réception).
 */
import { create } from 'zustand';

import { sessionSendFor } from '@/lib/session/sessionBridge';
import {
  adoptRestRequest,
  applyRestProposal,
  createRestProposal,
  mergeRestProposals,
  newRestProposalId,
  newRestRequestId,
  recordRestResponse,
  removeRestRequest,
  reviveRestProposal,
  reviveRestRequest,
  upsertRestRequest,
  type RestKind,
  type RestOutcome,
  type RestParticipant,
  type RestProposal,
  type RestRequest,
} from '@/lib/session/restProposal';

/** Événement de broadcast portant la proposition absolue (instantané, LWW ; `null` = clôturée). */
export const REST_PROPOSAL_EVENT = 'rest-proposal';

/** Événement de broadcast portant la réponse d'UN joueur, adressée au MJ. */
export const REST_RESPONSE_EVENT = 'rest-response';

/** Événement de broadcast portant la demande de pause d'UN joueur, adressée au MJ (PER-313). */
export const REST_REQUEST_EVENT = 'rest-request';

/**
 * Événement de broadcast portant le refus d'une demande (PER-313). Diffusé à toute la table faute de
 * message adressé sur le canal, mais **un seul client s'y reconnaît** : celui dont la demande porte
 * cet identifiant (cf. `applyRemoteDecline`). Un refus reste donc une affaire entre le MJ et le
 * demandeur — les autres joueurs n'ont jamais rien vu s'ouvrir.
 */
export const REST_REQUEST_DECLINED_EVENT = 'rest-request-declined';

/** Charge utile d'une réponse de joueur telle qu'elle circule sur le canal. */
interface RestResponseMessage {
  proposalId?: unknown;
  characterId?: unknown;
  outcome?: unknown;
  at?: unknown;
}

/** Demande émise par CE client (joueur) et son sort, telle qu'affichée sur sa fiche (PER-313). */
export interface OwnRestRequest {
  request: RestRequest;
  /** `'sent'` : partie, le MJ ne s'est pas prononcé. `'declined'` : le MJ a dit non. */
  status: 'sent' | 'declined';
}

interface RestProposalStoreState {
  /** Proposition en cours par campagne (`null` / absente = aucune). */
  byCampaign: Record<string, RestProposal | null>;
  /**
   * Demandes de joueurs en attente d'arbitrage, **chez le MJ** (PER-313), dans l'ordre d'arrivée.
   * Une seule demande en attente par personnage. Vide chez un joueur : il ne voit pas les demandes
   * de ses camarades, seulement la proposition que le MJ finit par ouvrir.
   */
  requestsByCampaign: Record<string, RestRequest[]>;
  /**
   * Demande émise par CE client (PER-313), `null` = aucune. Le canal est en `self: false` : le
   * demandeur ne reçoit pas son propre message, il pose donc son état lui-même — comme `respond`.
   */
  myRequestByCampaign: Record<string, OwnRestRequest | null>;

  /**
   * Ouvre une proposition et la diffuse (MJ). Remplace une proposition déjà ouverte, et vide la file
   * des demandes en attente : la pause qui s'ouvre leur répond à toutes.
   */
  propose: (
    cid: string,
    kind: RestKind,
    proposedBy: string,
    participants: readonly RestParticipant[],
  ) => void;
  /**
   * Donne le top de l'application et le diffuse (proposant) : chaque fiche applique alors le repos
   * qu'elle avait préparé. No-op si le top est déjà donné — une rediffusion n'est pas un second top.
   */
  applyProposal: (cid: string) => void;
  /**
   * Clôt la proposition en cours et diffuse la clôture (proposant). Sert aussi bien à ranger une
   * proposition appliquée qu'à l'ANNULER avant le top : dans ce dernier cas personne n'a rien
   * appliqué, c'est tout l'intérêt du palier. Décision de conception : une proposition n'expire
   * JAMAIS toute seule — le MJ garde la main, comme sur les durées d'effets.
   */
  closeProposal: (cid: string) => void;
  /**
   * Réponse de CE client pour son personnage (joueur) : posée localement pour un retour immédiat,
   * puis envoyée au proposant qui l'intègre et rediffuse l'instantané faisant foi. Ignorée une fois
   * le top donné — le relevé est figé.
   */
  respond: (cid: string, characterId: string, outcome: RestOutcome) => void;
  /**
   * Réception d'un instantané de proposition (`null` = clôturée) : remplace la vue locale SANS
   * rediffuser. Les réponses locales pas encore intégrées en face sont préservées
   * (`mergeRestProposals`) pour ne pas clignoter le temps d'un aller-retour.
   */
  applyRemoteProposal: (cid: string, payload: unknown) => void;
  /**
   * Réception de la réponse d'un joueur, CHEZ LE PROPOSANT : intègre et rediffuse l'instantané.
   * Ignorée si aucune proposition n'est ouverte ou si la réponse porte sur une proposition périmée.
   */
  mergeRemoteResponse: (cid: string, payload: unknown) => void;
  /**
   * Rediffuse la proposition en cours (MJ) : appelée quand quelqu'un rejoint le canal ou à
   * la reconnexion. No-op sans proposition ouverte — un canal silencieux reste silencieux.
   */
  resyncProposal: (cid: string) => void;

  // ── PER-313 : la demande d'un joueur, adoptée ou refusée par le MJ ────────────────────────

  /**
   * Demande de pause de CE client (joueur) : posée localement puis envoyée au MJ, qui l'adoptera ou
   * la refusera. N'ouvre RIEN — le joueur n'est pas auteur de proposition. Ignorée quand une pause
   * est déjà sur la table : elle est déjà exaucée.
   */
  requestRest: (cid: string, kind: RestKind, byName: string, characterId: string) => void;
  /** Range l'accusé de réception ou le refus affiché au demandeur (joueur). */
  dismissMyRequest: (cid: string) => void;
  /**
   * Réception d'une demande de joueur, CHEZ LE MJ : rangée dans sa file d'attente. Ne diffuse rien —
   * les autres joueurs n'ont pas à savoir qui a demandé quoi tant que le MJ n'a pas tranché.
   */
  mergeRemoteRequest: (cid: string, payload: unknown) => void;
  /**
   * Adoption (MJ) : la demande devient une vraie proposition, ouverte AU NOM du demandeur et
   * diffusée à toute la table. Le MJ garde le top de validation, comme pour ses propres propositions.
   */
  adoptRequest: (cid: string, requestId: string, participants: readonly RestParticipant[]) => void;
  /**
   * Refus (MJ) : la demande quitte la file et le seul demandeur en est notifié. Rien ne s'ouvre chez
   * les autres joueurs — la scène appartient au MJ (« pas de repos en pleine embuscade »).
   */
  declineRequest: (cid: string, requestId: string) => void;
  /**
   * Réception d'un refus, chez le JOUEUR : ne s'applique qu'à sa propre demande (le canal parle à
   * tout le monde, l'identifiant fait le tri).
   */
  applyRemoteDecline: (cid: string, payload: unknown) => void;
}

export const useRestProposalStore = create<RestProposalStoreState>()((set, get) => ({
  byCampaign: {},
  requestsByCampaign: {},
  myRequestByCampaign: {},

  propose: (cid, kind, proposedBy, participants) => {
    const proposal = createRestProposal(
      newRestProposalId(),
      kind,
      proposedBy,
      new Date().toISOString(),
      participants,
    );
    set((s) => ({
      byCampaign: { ...s.byCampaign, [cid]: proposal },
      // La pause qui s'ouvre répond à toutes les demandes en attente (PER-313).
      requestsByCampaign: { ...s.requestsByCampaign, [cid]: [] },
    }));
    const send = sessionSendFor(cid);
    if (send) send(REST_PROPOSAL_EVENT, { proposal });
  },

  applyProposal: (cid) => {
    const current = get().byCampaign[cid];
    if (!current) return;
    const next = applyRestProposal(current);
    if (next === current) return; // top déjà donné
    set((s) => ({ byCampaign: { ...s.byCampaign, [cid]: next } }));
    const send = sessionSendFor(cid);
    if (send) send(REST_PROPOSAL_EVENT, { proposal: next });
  },

  closeProposal: (cid) => {
    if (!get().byCampaign[cid]) return;
    set((s) => ({ byCampaign: { ...s.byCampaign, [cid]: null } }));
    const send = sessionSendFor(cid);
    if (send) send(REST_PROPOSAL_EVENT, { proposal: null });
  },

  respond: (cid, characterId, outcome) => {
    const current = get().byCampaign[cid];
    if (!current || current.status !== 'open') return;
    const next = recordRestResponse(current, characterId, outcome, new Date().toISOString());
    if (next !== current) set((s) => ({ byCampaign: { ...s.byCampaign, [cid]: next } }));
    // Envoyée même si la réponse n'a pas changé localement : c'est le proposant qui tient le
    // relevé, et son instantané peut très bien ne pas encore porter notre réponse.
    const send = sessionSendFor(cid);
    if (send) {
      send(REST_RESPONSE_EVENT, {
        proposalId: current.id,
        characterId,
        outcome,
        at: new Date().toISOString(),
      });
    }
  },

  applyRemoteProposal: (cid, payload) => {
    const p = payload as { proposal?: unknown };
    if (p?.proposal === null) {
      set((s) => ({ byCampaign: { ...s.byCampaign, [cid]: null } }));
      return;
    }
    const revived = reviveRestProposal(p?.proposal);
    // Instantané illisible : on garde la vue locale plutôt que d'ouvrir une fenêtre vide.
    if (!revived) return;
    const merged = mergeRestProposals(get().byCampaign[cid] ?? null, revived);
    set((s) => ({
      byCampaign: { ...s.byCampaign, [cid]: merged },
      // Une pause est sur la table : la demande que ce client avait éventuellement en attente est
      // exaucée (le MJ l'a adoptée) ou dépassée (il a ouvert la sienne). Dans les deux cas elle se
      // range, et la fenêtre de proposition prend le relais (PER-313).
      myRequestByCampaign: { ...s.myRequestByCampaign, [cid]: null },
    }));
  },

  mergeRemoteResponse: (cid, payload) => {
    const current = get().byCampaign[cid];
    if (!current) return;
    const m = (payload ?? {}) as RestResponseMessage;
    if (m.proposalId !== current.id) return;
    if (typeof m.characterId !== 'string' || m.characterId === '') return;
    if (m.outcome !== 'accepted' && m.outcome !== 'declined') return;
    const at = typeof m.at === 'string' ? m.at : new Date().toISOString();
    const next = recordRestResponse(current, m.characterId, m.outcome, at);
    if (next === current) return; // réponse déjà connue : ni rendu ni rediffusion
    set((s) => ({ byCampaign: { ...s.byCampaign, [cid]: next } }));
    const send = sessionSendFor(cid);
    if (send) send(REST_PROPOSAL_EVENT, { proposal: next });
  },

  resyncProposal: (cid) => {
    const proposal = get().byCampaign[cid];
    if (!proposal) return;
    const send = sessionSendFor(cid);
    if (send) send(REST_PROPOSAL_EVENT, { proposal });
  },

  // ── PER-313 : la demande d'un joueur, adoptée ou refusée par le MJ ────────────────────────

  requestRest: (cid, kind, byName, characterId) => {
    // Une pause est déjà sur la table : la demande n'aurait rien à demander.
    if (get().byCampaign[cid]) return;
    const request: RestRequest = {
      id: newRestRequestId(),
      kind,
      byName,
      characterId,
      at: new Date().toISOString(),
    };
    set((s) => ({
      myRequestByCampaign: { ...s.myRequestByCampaign, [cid]: { request, status: 'sent' } },
    }));
    const send = sessionSendFor(cid);
    if (send) send(REST_REQUEST_EVENT, { request });
  },

  dismissMyRequest: (cid) => {
    if (!get().myRequestByCampaign[cid]) return;
    set((s) => ({ myRequestByCampaign: { ...s.myRequestByCampaign, [cid]: null } }));
  },

  mergeRemoteRequest: (cid, payload) => {
    const request = reviveRestRequest((payload as { request?: unknown } | null)?.request);
    if (!request) return;
    const queue = get().requestsByCampaign[cid] ?? [];
    const next = upsertRestRequest(queue, request);
    if (next === queue) return; // demande déjà connue : ni rendu ni traitement
    set((s) => ({ requestsByCampaign: { ...s.requestsByCampaign, [cid]: next } }));
  },

  adoptRequest: (cid, requestId, participants) => {
    const request = (get().requestsByCampaign[cid] ?? []).find((r) => r.id === requestId);
    if (!request) return; // demande déjà traitée (double clic, refus concurrent)
    const proposal = adoptRestRequest(
      request,
      newRestProposalId(),
      new Date().toISOString(),
      participants,
    );
    set((s) => ({
      byCampaign: { ...s.byCampaign, [cid]: proposal },
      requestsByCampaign: { ...s.requestsByCampaign, [cid]: [] },
    }));
    const send = sessionSendFor(cid);
    if (send) send(REST_PROPOSAL_EVENT, { proposal });
  },

  declineRequest: (cid, requestId) => {
    const queue = get().requestsByCampaign[cid] ?? [];
    const next = removeRestRequest(queue, requestId);
    if (next === queue) return; // déjà traitée : pas de second refus
    set((s) => ({ requestsByCampaign: { ...s.requestsByCampaign, [cid]: next } }));
    const send = sessionSendFor(cid);
    if (send) send(REST_REQUEST_DECLINED_EVENT, { requestId });
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
