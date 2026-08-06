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
import type { RestParticipant, RestProposal } from '@/lib/session/restProposal';
import { REST_PROPOSAL_EVENT, REST_RESPONSE_EVENT, useRestProposalStore } from './restProposal';

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

beforeEach(() => {
  sent = [];
  useRestProposalStore.setState({ byCampaign: {} });
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

describe('hors session (aucun canal branché)', () => {
  it('pose l’état localement sans planter faute d’émetteur', () => {
    unregister();
    const store = useRestProposalStore.getState();
    store.propose(CID, 'short', 'Le MJ', TABLE);
    store.respond(CID, 'perso-1', 'accepted');
    store.applyProposal(CID);
    store.resyncProposal(CID);
    store.closeProposal(CID);
    expect(sent).toEqual([]); // rien n’a pu partir : le canal était fermé
    expect(current()).toBeNull();
  });
});
