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
 *  - **Proposant (MJ, auteur unique)** : `propose` / `applyProposal` / `closeProposal` posent l'état
 *    et diffusent l'instantané absolu ; `mergeRemoteResponse` intègre la réponse d'un joueur et
 *    **rediffuse** (c'est ainsi que toute la table converge, y compris un joueur arrivé en cours).
 *  - **Joueur** : `applyRemoteProposal` ← reçu du canal ; `respond` pose sa réponse localement
 *    (affichage immédiat) et l'envoie au proposant. Il ne diffuse jamais d'instantané.
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
  applyRestProposal,
  createRestProposal,
  mergeRestProposals,
  newRestProposalId,
  recordRestResponse,
  reviveRestProposal,
  type RestKind,
  type RestOutcome,
  type RestParticipant,
  type RestProposal,
} from '@/lib/session/restProposal';

/** Événement de broadcast portant la proposition absolue (instantané, LWW ; `null` = clôturée). */
export const REST_PROPOSAL_EVENT = 'rest-proposal';

/** Événement de broadcast portant la réponse d'UN joueur, adressée au proposant. */
export const REST_RESPONSE_EVENT = 'rest-response';

/** Charge utile d'une réponse de joueur telle qu'elle circule sur le canal. */
interface RestResponseMessage {
  proposalId?: unknown;
  characterId?: unknown;
  outcome?: unknown;
  at?: unknown;
}

interface RestProposalStoreState {
  /** Proposition en cours par campagne (`null` / absente = aucune). */
  byCampaign: Record<string, RestProposal | null>;

  /** Ouvre une proposition et la diffuse (proposant). Remplace une proposition déjà ouverte. */
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
   * Rediffuse la proposition en cours (proposant) : appelée quand quelqu'un rejoint le canal ou à
   * la reconnexion. No-op sans proposition ouverte — un canal silencieux reste silencieux.
   */
  resyncProposal: (cid: string) => void;
}

export const useRestProposalStore = create<RestProposalStoreState>()((set, get) => ({
  byCampaign: {},

  propose: (cid, kind, proposedBy, participants) => {
    const proposal = createRestProposal(
      newRestProposalId(),
      kind,
      proposedBy,
      new Date().toISOString(),
      participants,
    );
    set((s) => ({ byCampaign: { ...s.byCampaign, [cid]: proposal } }));
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
    set((s) => ({ byCampaign: { ...s.byCampaign, [cid]: merged } }));
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
}));
