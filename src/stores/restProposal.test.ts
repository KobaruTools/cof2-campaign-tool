/**
 * Protocole d'échange du repos de groupe (PER-312). Premier test de store du projet — assumé : la
 * logique testée ici n'est PAS celle du store zustand mais celle du **va-et-vient** entre proposant
 * et joueurs (qui diffuse quoi, qui rediffuse, qui se tait). Elle n'a aucune autre couverture
 * possible : la vérifier à la main demanderait deux navigateurs et une session Supabase vivante.
 *
 * Le seul point de contact avec le réseau est le pont d'émission (`sessionBridge`), un registre
 * ordinaire : on y branche un espion plutôt que de simuler un canal Realtime.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { registerSessionChannel } from '@/lib/session/sessionBridge';
import type { RestParticipant, RestProposal, RestRequest } from '@/lib/session/restProposal';
import {
  REST_PROPOSAL_EVENT,
  REST_REQUEST_DECLINED_EVENT,
  REST_REQUEST_EVENT,
  REST_RESPONSE_EVENT,
  useRestProposalStore,
} from './restProposal';

const CID = 'campagne-1';

/** Table convoquée par le proposant dans les tests. */
const TABLE: RestParticipant[] = [
  { characterId: 'perso-1', name: 'Brann', playerName: 'Joueur 1' },
  { characterId: 'perso-2', name: 'Sylvane' },
];

/** Émissions capturées sur le canal de la campagne, dans l'ordre. */
let sent: { event: string; payload: unknown }[];
let unregister: () => void;

/** Dernier instantané de proposition diffusé (le `null` de clôture compte). */
function lastProposalSent(): RestProposal | null | undefined {
  const snapshots = sent.filter((s) => s.event === REST_PROPOSAL_EVENT);
  const last = snapshots.at(-1);
  return last ? (last.payload as { proposal: RestProposal | null }).proposal : undefined;
}

/** Proposition en cours vue par CE client. */
function current(): RestProposal | null {
  return useRestProposalStore.getState().byCampaign[CID] ?? null;
}

/** Instantané tel qu'un joueur le reçoit du proposant. */
function incoming(overrides: Partial<RestProposal> = {}): RestProposal {
  return {
    id: 'p1',
    kind: 'short',
    proposedBy: 'Le MJ',
    createdAt: 'T0',
    status: 'open',
    participants: TABLE,
    responses: {},
    ...overrides,
  };
}

/** File d'attente des demandes de joueurs, telle que la voit le MJ (PER-313). */
function queue(): RestRequest[] {
  return useRestProposalStore.getState().requestsByCampaign[CID] ?? [];
}

/** Demande émise par CE client, et son sort (PER-313). */
function myRequest() {
  return useRestProposalStore.getState().myRequestByCampaign[CID] ?? null;
}

/** Demande telle qu'un MJ la reçoit d'un joueur. */
function incomingRequest(overrides: Partial<RestRequest> = {}): RestRequest {
  return {
    id: 'd1',
    kind: 'short',
    byName: 'Brann',
    characterId: 'perso-1',
    at: 'T0',
    ...overrides,
  };
}

beforeEach(() => {
  sent = [];
  useRestProposalStore.setState({ byCampaign: {}, requestsByCampaign: {}, myRequestByCampaign: {} });
  unregister?.();
  unregister = registerSessionChannel(CID, (event, payload) => sent.push({ event, payload }));
});

describe('propose (proposant)', () => {
  it('ouvre la proposition avec sa table et la diffuse', () => {
    useRestProposalStore.getState().propose(CID, 'short', 'Le MJ', TABLE);
    expect(current()).toMatchObject({
      kind: 'short',
      proposedBy: 'Le MJ',
      status: 'open',
      participants: TABLE,
      responses: {},
    });
    expect(lastProposalSent()).toEqual(current());
  });

  it('remplace une proposition déjà ouverte par une proposition NEUVE (identité distincte)', () => {
    const store = useRestProposalStore.getState();
    store.propose(CID, 'short', 'Le MJ', TABLE);
    const first = current();
    store.propose(CID, 'long', 'Le MJ', TABLE);
    expect(current()?.kind).toBe('long');
    expect(current()?.id).not.toBe(first?.id);
    expect(current()?.responses).toEqual({});
  });
});

describe('applyProposal (proposant)', () => {
  beforeEach(() => {
    useRestProposalStore.getState().propose(CID, 'short', 'Le MJ', TABLE);
    sent = [];
  });

  it('diffuse le top de l’application en conservant le relevé', () => {
    const id = current()?.id;
    const store = useRestProposalStore.getState();
    store.mergeRemoteResponse(CID, {
      proposalId: id,
      characterId: 'perso-1',
      outcome: 'accepted',
      at: 'T1',
    });
    sent = [];
    store.applyProposal(CID);
    expect(current()?.status).toBe('applied');
    expect(current()?.responses['perso-1']).toEqual({ outcome: 'accepted', at: 'T1' });
    expect(lastProposalSent()).toEqual(current());
  });

  it('ne rediffuse pas un second top', () => {
    const store = useRestProposalStore.getState();
    store.applyProposal(CID);
    sent = [];
    store.applyProposal(CID);
    expect(sent).toEqual([]);
  });

  it('ne diffuse rien sans proposition ouverte', () => {
    const store = useRestProposalStore.getState();
    store.closeProposal(CID);
    sent = [];
    store.applyProposal(CID);
    expect(sent).toEqual([]);
  });
});

describe('closeProposal (proposant)', () => {
  it('diffuse la clôture', () => {
    const store = useRestProposalStore.getState();
    store.propose(CID, 'long', 'Le MJ', TABLE);
    store.closeProposal(CID);
    expect(current()).toBeNull();
    expect(lastProposalSent()).toBeNull();
  });

  it('annule une proposition non validée sans rien avoir appliqué', () => {
    const store = useRestProposalStore.getState();
    store.propose(CID, 'short', 'Le MJ', TABLE);
    const id = current()?.id;
    store.mergeRemoteResponse(CID, { proposalId: id, characterId: 'perso-1', outcome: 'accepted' });
    store.closeProposal(CID);
    // Aucun `status: 'applied'` n'a jamais circulé : aucune fiche n'a reçu de top.
    const tops = sent.filter(
      (s) =>
        s.event === REST_PROPOSAL_EVENT &&
        (s.payload as { proposal: RestProposal | null }).proposal?.status === 'applied',
    );
    expect(tops).toEqual([]);
    expect(lastProposalSent()).toBeNull();
  });

  it('ne diffuse rien sans proposition ouverte', () => {
    useRestProposalStore.getState().closeProposal(CID);
    expect(sent).toEqual([]);
  });
});

describe('respond (joueur)', () => {
  beforeEach(() => {
    // Le joueur ne crée pas la proposition : il la reçoit du proposant.
    useRestProposalStore.getState().applyRemoteProposal(CID, { proposal: incoming() });
    sent = [];
  });

  it('pose la réponse localement et l’envoie au proposant', () => {
    useRestProposalStore.getState().respond(CID, 'perso-1', 'accepted');
    expect(current()?.responses['perso-1']?.outcome).toBe('accepted');
    expect(sent).toHaveLength(1);
    expect(sent[0].event).toBe(REST_RESPONSE_EVENT);
    expect(sent[0].payload).toMatchObject({
      proposalId: 'p1',
      characterId: 'perso-1',
      outcome: 'accepted',
    });
  });

  it('ne diffuse JAMAIS d’instantané : le joueur n’est pas l’auteur du relevé', () => {
    useRestProposalStore.getState().respond(CID, 'perso-1', 'declined');
    expect(sent.some((s) => s.event === REST_PROPOSAL_EVENT)).toBe(false);
  });

  it('renvoie sa réponse même inchangée (l’instantané d’en face peut ne pas la porter)', () => {
    const store = useRestProposalStore.getState();
    store.respond(CID, 'perso-1', 'accepted');
    store.respond(CID, 'perso-1', 'accepted');
    expect(sent.filter((s) => s.event === REST_RESPONSE_EVENT)).toHaveLength(2);
  });

  it('ne répond plus une fois le top donné : le relevé est figé', () => {
    const store = useRestProposalStore.getState();
    store.applyRemoteProposal(CID, { proposal: incoming({ status: 'applied' }) });
    sent = [];
    store.respond(CID, 'perso-1', 'accepted');
    expect(current()?.responses).toEqual({});
    expect(sent).toEqual([]);
  });

  it('ne répond pas dans le vide (aucune proposition ouverte)', () => {
    useRestProposalStore.getState().applyRemoteProposal(CID, { proposal: null });
    sent = [];
    useRestProposalStore.getState().respond(CID, 'perso-1', 'accepted');
    expect(sent).toEqual([]);
  });
});

describe('mergeRemoteResponse (proposant)', () => {
  beforeEach(() => {
    useRestProposalStore.getState().propose(CID, 'short', 'Le MJ', TABLE);
    sent = [];
  });

  it('intègre la réponse d’un joueur ET rediffuse l’instantané faisant foi', () => {
    const id = current()?.id;
    useRestProposalStore.getState().mergeRemoteResponse(CID, {
      proposalId: id,
      characterId: 'perso-1',
      outcome: 'accepted',
      at: 'T1',
    });
    expect(current()?.responses['perso-1']).toEqual({ outcome: 'accepted', at: 'T1' });
    expect(lastProposalSent()).toEqual(current());
  });

  it('ignore une réponse portant sur une proposition périmée', () => {
    useRestProposalStore
      .getState()
      .mergeRemoteResponse(CID, { proposalId: 'périmée', characterId: 'perso-1', outcome: 'accepted' });
    expect(current()?.responses).toEqual({});
    expect(sent).toEqual([]);
  });

  it('ignore une charge utile inexploitable', () => {
    const id = current()?.id;
    const store = useRestProposalStore.getState();
    store.mergeRemoteResponse(CID, { proposalId: id, characterId: '', outcome: 'accepted' });
    store.mergeRemoteResponse(CID, { proposalId: id, characterId: 'perso-1', outcome: 'sieste' });
    store.mergeRemoteResponse(CID, null);
    expect(current()?.responses).toEqual({});
    expect(sent).toEqual([]);
  });

  it('ignore une réponse arrivée après le top (traînarde)', () => {
    const store = useRestProposalStore.getState();
    const id = current()?.id;
    store.applyProposal(CID);
    sent = [];
    store.mergeRemoteResponse(CID, { proposalId: id, characterId: 'perso-1', outcome: 'accepted' });
    expect(current()?.responses).toEqual({});
    expect(sent).toEqual([]);
  });

  it('ne rediffuse pas une réponse déjà connue (pas de va-et-vient inutile)', () => {
    const id = current()?.id;
    const store = useRestProposalStore.getState();
    const message = { proposalId: id, characterId: 'perso-1', outcome: 'accepted', at: 'T1' };
    store.mergeRemoteResponse(CID, message);
    sent = [];
    store.mergeRemoteResponse(CID, message);
    expect(sent).toEqual([]);
  });
});

describe('applyRemoteProposal (réception)', () => {
  it('adopte l’instantané reçu sans rien rediffuser', () => {
    useRestProposalStore
      .getState()
      .applyRemoteProposal(CID, { proposal: incoming({ kind: 'long' }) });
    expect(current()?.kind).toBe('long');
    expect(current()?.participants).toEqual(TABLE);
    expect(sent).toEqual([]);
  });

  it('transmet le top de l’application au client', () => {
    const store = useRestProposalStore.getState();
    store.applyRemoteProposal(CID, { proposal: incoming() });
    store.applyRemoteProposal(CID, { proposal: incoming({ status: 'applied' }) });
    expect(current()?.status).toBe('applied');
  });

  it('préserve une réponse locale que l’instantané reçu n’a pas encore intégrée', () => {
    const store = useRestProposalStore.getState();
    store.applyRemoteProposal(CID, { proposal: incoming() });
    store.respond(CID, 'perso-1', 'accepted');
    // Instantané parti AVANT que le proposant ne reçoive notre réponse.
    store.applyRemoteProposal(CID, {
      proposal: incoming({ responses: { 'perso-2': { outcome: 'declined', at: 'T1' } } }),
    });
    expect(Object.keys(current()?.responses ?? {}).sort()).toEqual(['perso-1', 'perso-2']);
  });

  it('clôt la proposition sur réception d’un instantané nul', () => {
    const store = useRestProposalStore.getState();
    store.propose(CID, 'short', 'Le MJ', TABLE);
    store.applyRemoteProposal(CID, { proposal: null });
    expect(current()).toBeNull();
  });

  it('garde la vue locale devant un instantané illisible', () => {
    const store = useRestProposalStore.getState();
    store.propose(CID, 'short', 'Le MJ', TABLE);
    const before = current();
    store.applyRemoteProposal(CID, { proposal: { id: 'p1', kind: 'sieste' } });
    expect(current()).toBe(before);
  });
});

describe('resyncProposal (proposant)', () => {
  it('rediffuse la proposition en cours (nouveau venu, reconnexion)', () => {
    const store = useRestProposalStore.getState();
    store.propose(CID, 'short', 'Le MJ', TABLE);
    sent = [];
    store.resyncProposal(CID);
    expect(lastProposalSent()).toEqual(current());
  });

  it('reste silencieux sans proposition ouverte', () => {
    useRestProposalStore.getState().resyncProposal(CID);
    expect(sent).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// La demande d'un joueur, adoptée ou refusée par le MJ (PER-313)
// ─────────────────────────────────────────────────────────────────────────────

describe('requestRest (joueur)', () => {
  it('pose la demande localement et l’envoie au MJ', () => {
    useRestProposalStore.getState().requestRest(CID, 'long', 'Brann', 'perso-1');
    expect(myRequest()).toMatchObject({
      status: 'sent',
      request: { kind: 'long', byName: 'Brann', characterId: 'perso-1' },
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].event).toBe(REST_REQUEST_EVENT);
    expect((sent[0].payload as { request: RestRequest }).request).toEqual(myRequest()?.request);
  });

  it('ne diffuse JAMAIS d’instantané : le joueur n’ouvre pas de proposition', () => {
    useRestProposalStore.getState().requestRest(CID, 'short', 'Brann', 'perso-1');
    expect(sent.some((s) => s.event === REST_PROPOSAL_EVENT)).toBe(false);
  });

  it('se tait quand une pause est déjà sur la table', () => {
    const store = useRestProposalStore.getState();
    store.applyRemoteProposal(CID, { proposal: incoming() });
    sent = [];
    store.requestRest(CID, 'short', 'Brann', 'perso-1');
    expect(myRequest()).toBeNull();
    expect(sent).toEqual([]);
  });

  it('remplace sa propre demande quand le joueur se ravise', () => {
    const store = useRestProposalStore.getState();
    store.requestRest(CID, 'short', 'Brann', 'perso-1');
    const first = myRequest()?.request.id;
    store.requestRest(CID, 'long', 'Brann', 'perso-1');
    expect(myRequest()?.request.kind).toBe('long');
    expect(myRequest()?.request.id).not.toBe(first);
  });
});

describe('mergeRemoteRequest (MJ)', () => {
  it('empile la demande reçue dans sa file, sans rien diffuser', () => {
    useRestProposalStore.getState().mergeRemoteRequest(CID, { request: incomingRequest() });
    expect(queue()).toEqual([incomingRequest()]);
    expect(sent).toEqual([]);
  });

  it('remplace la demande d’un joueur qui se ravise, sans la faire resquiller', () => {
    const store = useRestProposalStore.getState();
    store.mergeRemoteRequest(CID, { request: incomingRequest() });
    store.mergeRemoteRequest(CID, {
      request: incomingRequest({ id: 'd2', characterId: 'perso-2', byName: 'Sylvane' }),
    });
    store.mergeRemoteRequest(CID, { request: incomingRequest({ id: 'd3', kind: 'long' }) });
    expect(queue().map((r) => r.id)).toEqual(['d3', 'd2']);
  });

  it('ignore une demande inexploitable', () => {
    const store = useRestProposalStore.getState();
    store.mergeRemoteRequest(CID, { request: { id: 'd1', kind: 'sieste' } });
    store.mergeRemoteRequest(CID, null);
    expect(queue()).toEqual([]);
  });
});

describe('adoptRequest (MJ)', () => {
  beforeEach(() => {
    const store = useRestProposalStore.getState();
    store.mergeRemoteRequest(CID, { request: incomingRequest() });
    store.mergeRemoteRequest(CID, {
      request: incomingRequest({ id: 'd2', characterId: 'perso-2', byName: 'Sylvane', kind: 'long' }),
    });
    sent = [];
  });

  it('ouvre une vraie proposition AU NOM du demandeur et la diffuse à la table', () => {
    useRestProposalStore.getState().adoptRequest(CID, 'd1', TABLE);
    expect(current()).toMatchObject({
      kind: 'short',
      proposedBy: 'Brann',
      status: 'open',
      participants: TABLE,
      responses: {},
    });
    expect(lastProposalSent()).toEqual(current());
  });

  it('vide la file : la pause qui s’ouvre répond à toutes les demandes en attente', () => {
    useRestProposalStore.getState().adoptRequest(CID, 'd1', TABLE);
    expect(queue()).toEqual([]);
  });

  it('ne diffuse rien sur une demande déjà traitée', () => {
    const store = useRestProposalStore.getState();
    store.adoptRequest(CID, 'd1', TABLE);
    sent = [];
    store.adoptRequest(CID, 'd1', TABLE);
    expect(sent).toEqual([]);
  });
});

describe('declineRequest (MJ)', () => {
  beforeEach(() => {
    useRestProposalStore.getState().mergeRemoteRequest(CID, { request: incomingRequest() });
    sent = [];
  });

  it('retire la demande et notifie le demandeur', () => {
    useRestProposalStore.getState().declineRequest(CID, 'd1');
    expect(queue()).toEqual([]);
    expect(sent).toEqual([{ event: REST_REQUEST_DECLINED_EVENT, payload: { requestId: 'd1' } }]);
  });

  it('n’ouvre aucune proposition : refuser, c’est ne pas adopter', () => {
    useRestProposalStore.getState().declineRequest(CID, 'd1');
    expect(current()).toBeNull();
    expect(sent.some((s) => s.event === REST_PROPOSAL_EVENT)).toBe(false);
  });

  it('ne notifie pas deux fois la même demande', () => {
    const store = useRestProposalStore.getState();
    store.declineRequest(CID, 'd1');
    sent = [];
    store.declineRequest(CID, 'd1');
    expect(sent).toEqual([]);
  });
});

describe('applyRemoteDecline (joueur)', () => {
  beforeEach(() => {
    useRestProposalStore.getState().requestRest(CID, 'short', 'Brann', 'perso-1');
    sent = [];
  });

  it('marque SA demande refusée, sans rien renvoyer', () => {
    const id = myRequest()?.request.id;
    useRestProposalStore.getState().applyRemoteDecline(CID, { requestId: id });
    expect(myRequest()?.status).toBe('declined');
    expect(sent).toEqual([]);
  });

  it('ignore le refus adressé à un camarade (le canal parle à tout le monde)', () => {
    useRestProposalStore.getState().applyRemoteDecline(CID, { requestId: 'demande-du-voisin' });
    expect(myRequest()?.status).toBe('sent');
  });

  it('ne s’applique pas sans demande en cours (le MJ n’a pas de demande à lui)', () => {
    const store = useRestProposalStore.getState();
    store.dismissMyRequest(CID);
    store.applyRemoteDecline(CID, { requestId: 'd1' });
    expect(myRequest()).toBeNull();
  });
});

describe('dismissMyRequest (joueur)', () => {
  it('range l’accusé de réception ou le refus', () => {
    const store = useRestProposalStore.getState();
    store.requestRest(CID, 'short', 'Brann', 'perso-1');
    store.dismissMyRequest(CID);
    expect(myRequest()).toBeNull();
  });
});

describe('adoption vue du DEMANDEUR', () => {
  it('range sa demande dès que la proposition adoptée lui revient', () => {
    const store = useRestProposalStore.getState();
    store.requestRest(CID, 'short', 'Brann', 'perso-1');
    store.applyRemoteProposal(CID, { proposal: incoming({ proposedBy: 'Brann' }) });
    expect(myRequest()).toBeNull();
    // Et il est convoqué au relevé comme les autres : il répond aussi pour lui-même.
    expect(current()?.participants.map((p) => p.characterId)).toContain('perso-1');
  });
});

describe('propose (MJ) face aux demandes en attente', () => {
  it('vide la file : sa propre pause répond aux demandes des joueurs', () => {
    const store = useRestProposalStore.getState();
    store.mergeRemoteRequest(CID, { request: incomingRequest() });
    store.propose(CID, 'long', 'Le MJ', TABLE);
    expect(queue()).toEqual([]);
  });
});

describe('hors session (aucun canal branché)', () => {
  it('pose l’état localement sans planter faute d’émetteur', () => {
    unregister();
    const store = useRestProposalStore.getState();
    store.propose(CID, 'short', 'Le MJ', TABLE);
    store.respond(CID, 'perso-1', 'accepted');
    store.applyProposal(CID);
    store.resyncProposal(CID);
    store.closeProposal(CID);
    store.requestRest(CID, 'short', 'Brann', 'perso-1');
    store.mergeRemoteRequest(CID, { request: incomingRequest() });
    store.declineRequest(CID, 'd1');
    expect(sent).toEqual([]); // rien n’a pu partir : le canal était fermé
    expect(current()).toBeNull();
  });
});
