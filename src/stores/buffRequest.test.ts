/**
 * Protocole d'échange des annonces d'effet de groupe (PER-358), sur le modèle du test de
 * `restProposal` : ce qui est vérifié n'est pas le store zustand mais le **va-et-vient** entre le
 * joueur qui annonce et le MJ qui pose — qui émet quoi, qui se tait, ce que voit le demandeur.
 *
 * Le seul point de contact avec le réseau est le pont d'émission (`sessionBridge`), un registre
 * ordinaire : on y branche un espion plutôt que de simuler un canal Realtime.
 */
import { beforeEach, describe, expect, it } from 'vitest';

import { registerSessionChannel } from '@/lib/session/sessionBridge';
import type { BuffRequest } from '@/lib/session/buffRequest';
import { BUFF_REQUEST_DECLINED_EVENT, BUFF_REQUEST_EVENT, useBuffRequestStore } from './buffRequest';

const CID = 'campagne-1';

/** Émissions capturées sur le canal de la campagne, dans l'ordre. */
let sent: { event: string; payload: unknown }[];
let unregister: () => void;

/** File d'attente des annonces, telle que la voit le MJ. */
function queue(): BuffRequest[] {
  return useBuffRequestStore.getState().requestsByCampaign[CID] ?? [];
}

/** Annonce émise par CE client, et son sort. */
function mine() {
  return useBuffRequestStore.getState().myRequestByCampaign[CID] ?? null;
}

/** Annonce telle qu'un MJ la reçoit d'un joueur. */
function incoming(overrides: Partial<BuffRequest> = {}): BuffRequest {
  return {
    id: 'a1',
    buffId: 'heroes-song',
    byName: 'Mirielle',
    characterId: 'perso-1',
    at: 'T0',
    ...overrides,
  };
}

beforeEach(() => {
  sent = [];
  useBuffRequestStore.setState({ requestsByCampaign: {}, myRequestByCampaign: {} });
  unregister?.();
  unregister = registerSessionChannel(CID, (event, payload) => sent.push({ event, payload }));
});

describe('annonce (joueur)', () => {
  it('pose l’annonce localement et l’envoie au MJ, sans rien poser d’autre', () => {
    useBuffRequestStore.getState().requestBuff(CID, 'heroes-song', 'Mirielle', 'perso-1');
    expect(mine()).toMatchObject({
      status: 'sent',
      request: { buffId: 'heroes-song', byName: 'Mirielle', characterId: 'perso-1' },
    });
    expect(sent).toHaveLength(1);
    expect(sent[0].event).toBe(BUFF_REQUEST_EVENT);
    // Le joueur n'est pas auteur de l'état de combat : rien n'est écrit dans sa propre file.
    expect(queue()).toEqual([]);
  });

  it('se raviser remplace l’annonce en attente', () => {
    const store = useBuffRequestStore.getState();
    store.requestBuff(CID, 'heroes-song', 'Mirielle', 'perso-1');
    store.requestBuff(CID, 'blessing', 'Mirielle', 'perso-1');
    expect(mine()?.request.buffId).toBe('blessing');
  });
});

describe('file d’arbitrage (MJ)', () => {
  it('range l’annonce reçue, sans rien rediffuser', () => {
    useBuffRequestStore.getState().mergeRemoteRequest(CID, { request: incoming() });
    expect(queue()).toEqual([incoming()]);
    expect(sent).toEqual([]);
  });

  it('ignore une annonce illisible ou portant un buff inconnu', () => {
    const store = useBuffRequestStore.getState();
    store.mergeRemoteRequest(CID, { request: { id: 'a1', byName: 'Mirielle' } });
    store.mergeRemoteRequest(CID, { request: incoming({ buffId: 'pas-un-buff' as never }) });
    expect(queue()).toEqual([]);
  });

  it('une seule annonce en attente par personnage, sans resquiller dans l’ordre', () => {
    const store = useBuffRequestStore.getState();
    store.mergeRemoteRequest(CID, { request: incoming() });
    store.mergeRemoteRequest(CID, {
      request: incoming({ id: 'a2', byName: 'Brann', characterId: 'perso-2' }),
    });
    store.mergeRemoteRequest(CID, { request: incoming({ id: 'a3', buffId: 'blessing' }) });
    expect(queue().map((r) => [r.characterId, r.buffId])).toEqual([
      ['perso-1', 'blessing'],
      ['perso-2', 'heroes-song'],
    ]);
  });

  it('adopter retire l’annonce et la RENVOIE — rien n’est diffusé au demandeur', () => {
    const store = useBuffRequestStore.getState();
    store.mergeRemoteRequest(CID, { request: incoming() });
    expect(store.adoptRequest(CID, 'a1')).toEqual(incoming());
    expect(queue()).toEqual([]);
    // C'est le buff posé qui répondra au joueur, pas un accusé de réception (le MJ peut renoncer).
    expect(sent).toEqual([]);
    // Double clic : plus rien à adopter.
    expect(store.adoptRequest(CID, 'a1')).toBeNull();
  });

  it('refuser retire l’annonce et n’avertit que le demandeur, une seule fois', () => {
    const store = useBuffRequestStore.getState();
    store.mergeRemoteRequest(CID, { request: incoming() });
    store.declineRequest(CID, 'a1');
    store.declineRequest(CID, 'a1');
    expect(queue()).toEqual([]);
    expect(sent).toEqual([{ event: BUFF_REQUEST_DECLINED_EVENT, payload: { requestId: 'a1' } }]);
  });
});

describe('refus reçu (joueur)', () => {
  it('ne s’applique qu’à SA propre annonce', () => {
    const store = useBuffRequestStore.getState();
    store.requestBuff(CID, 'heroes-song', 'Mirielle', 'perso-1');
    const id = mine()?.request.id;
    store.applyRemoteDecline(CID, { requestId: 'annonce-d-un-camarade' });
    expect(mine()?.status).toBe('sent');
    store.applyRemoteDecline(CID, { requestId: id });
    expect(mine()?.status).toBe('declined');
  });

  it('ranger le refus efface l’annonce', () => {
    const store = useBuffRequestStore.getState();
    store.requestBuff(CID, 'heroes-song', 'Mirielle', 'perso-1');
    store.applyRemoteDecline(CID, { requestId: mine()?.request.id });
    store.dismissMyRequest(CID);
    expect(mine()).toBeNull();
  });
});
