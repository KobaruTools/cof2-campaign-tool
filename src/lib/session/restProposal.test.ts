import { describe, expect, it } from 'vitest';

import {
  applyRestProposal,
  createRestProposal,
  isRestKind,
  mergeRestProposals,
  newRestProposalId,
  recordRestResponse,
  restProposalAnsweredCount,
  restProposalHeadline,
  restProposalTally,
  reviveRestProposal,
  type RestParticipant,
  type RestProposal,
} from './restProposal';

/** Table de référence des tests. */
const TABLE: RestParticipant[] = [
  { characterId: 'c1', name: 'Brann', playerName: 'Joueur 1' },
  { characterId: 'c2', name: 'Sylvane' },
  { characterId: 'c3', name: 'Kaelis' },
];

/** Proposition de référence des tests : une récupération rapide proposée par le MJ. */
function proposal(responses: RestProposal['responses'] = {}): RestProposal {
  return {
    id: 'p1',
    kind: 'short',
    proposedBy: 'MJ',
    createdAt: '2026-08-06T10:00:00.000Z',
    status: 'open',
    participants: TABLE,
    responses,
  };
}

describe('createRestProposal', () => {
  it('ouvre une proposition sans réponse et sans rien appliquer', () => {
    expect(createRestProposal('p1', 'long', 'MJ', '2026-08-06T10:00:00.000Z', TABLE)).toEqual({
      id: 'p1',
      kind: 'long',
      proposedBy: 'MJ',
      createdAt: '2026-08-06T10:00:00.000Z',
      status: 'open',
      participants: TABLE,
      responses: {},
    });
  });

  it('recopie la table plutôt que de garder la référence de l’appelant', () => {
    const table = [...TABLE];
    const p = createRestProposal('p1', 'short', 'MJ', 'T0', table);
    table.push({ characterId: 'c4', name: 'Intrus' });
    expect(p.participants).toHaveLength(3);
  });
});

describe('newRestProposalId', () => {
  it('produit un identifiant non vide, différent d’un appel à l’autre', () => {
    const a = newRestProposalId();
    const b = newRestProposalId();
    expect(a).not.toBe('');
    expect(a).not.toBe(b);
  });
});

describe('isRestKind', () => {
  it('n’accepte que les deux repos réglementaires', () => {
    expect(isRestKind('short')).toBe(true);
    expect(isRestKind('long')).toBe(true);
    expect(isRestKind('nap')).toBe(false);
    expect(isRestKind(undefined)).toBe(false);
  });
});

describe('applyRestProposal', () => {
  it('donne le top de l’application', () => {
    const applied = applyRestProposal(proposal({ c1: { outcome: 'accepted', at: 'T1' } }));
    expect(applied.status).toBe('applied');
    expect(applied.responses.c1).toEqual({ outcome: 'accepted', at: 'T1' }); // relevé conservé
  });

  it('renvoie la même référence si le top est déjà donné (pas de second top)', () => {
    const applied = applyRestProposal(proposal());
    expect(applyRestProposal(applied)).toBe(applied);
  });
});

describe('recordRestResponse', () => {
  it('enregistre la réponse d’un personnage sans toucher aux autres', () => {
    const before = proposal({ c1: { outcome: 'accepted', at: 'T1' } });
    const after = recordRestResponse(before, 'c2', 'declined', 'T2');
    expect(after.responses).toEqual({
      c1: { outcome: 'accepted', at: 'T1' },
      c2: { outcome: 'declined', at: 'T2' },
    });
    expect(before.responses.c2).toBeUndefined(); // l’entrée n’est pas mutée
  });

  it('laisse un joueur changer d’avis tant que la proposition est ouverte', () => {
    const after = recordRestResponse(
      proposal({ c1: { outcome: 'declined', at: 'T1' } }),
      'c1',
      'accepted',
      'T2',
    );
    expect(after.responses.c1).toEqual({ outcome: 'accepted', at: 'T2' });
  });

  it('renvoie la même référence quand la réponse est déjà celle-là', () => {
    const before = proposal({ c1: { outcome: 'accepted', at: 'T1' } });
    expect(recordRestResponse(before, 'c1', 'accepted', 'T2')).toBe(before);
  });

  it('fige le relevé une fois le top donné : plus personne ne répond après coup', () => {
    const applied = applyRestProposal(proposal());
    expect(recordRestResponse(applied, 'c1', 'accepted', 'T2')).toBe(applied);
  });
});

describe('mergeRestProposals', () => {
  it('préserve une réponse locale que l’instantané reçu n’a pas encore intégrée', () => {
    const local = proposal({ c1: { outcome: 'accepted', at: 'T1' } });
    const remote = proposal({ c2: { outcome: 'declined', at: 'T2' } });
    expect(mergeRestProposals(local, remote).responses).toEqual({
      c1: { outcome: 'accepted', at: 'T1' },
      c2: { outcome: 'declined', at: 'T2' },
    });
  });

  it('fait foi sur l’instantané reçu en cas de conflit', () => {
    const local = proposal({ c1: { outcome: 'declined', at: 'T1' } });
    const remote = proposal({ c1: { outcome: 'accepted', at: 'T2' } });
    expect(mergeRestProposals(local, remote).responses.c1).toEqual({
      outcome: 'accepted',
      at: 'T2',
    });
  });

  it('adopte le statut de l’instantané reçu (c’est lui qui donne le top)', () => {
    const local = proposal({ c1: { outcome: 'accepted', at: 'T1' } });
    const remote = applyRestProposal(proposal());
    const merged = mergeRestProposals(local, remote);
    expect(merged.status).toBe('applied');
    expect(merged.responses.c1).toEqual({ outcome: 'accepted', at: 'T1' });
  });

  it('adopte tel quel un instantané qui remplace une AUTRE proposition', () => {
    const local = proposal({ c1: { outcome: 'accepted', at: 'T1' } });
    const remote: RestProposal = { ...proposal(), id: 'p2' };
    expect(mergeRestProposals(local, remote)).toBe(remote);
  });

  it('adopte tel quel un instantané reçu sans vue locale', () => {
    const remote = proposal();
    expect(mergeRestProposals(null, remote)).toBe(remote);
  });
});

describe('restProposalTally', () => {
  it('répartit la table entre intentions, refus et sans réponse', () => {
    const p = proposal({
      c1: { outcome: 'accepted', at: 'T1' },
      c2: { outcome: 'declined', at: 'T2' },
    });
    expect(restProposalTally(p)).toEqual({
      accepted: ['c1'],
      declined: ['c2'],
      pending: ['c3'],
    });
  });

  it('ignore la réponse d’un personnage qui n’était pas convoqué', () => {
    const p: RestProposal = {
      ...proposal({ parti: { outcome: 'accepted', at: 'T1' } }),
      participants: [{ characterId: 'c1', name: 'Brann' }],
    };
    expect(restProposalTally(p)).toEqual({ accepted: [], declined: [], pending: ['c1'] });
  });

  it('ne compte personne quand la table est vide', () => {
    expect(restProposalTally({ ...proposal(), participants: [] })).toEqual({
      accepted: [],
      declined: [],
      pending: [],
    });
  });
});

describe('restProposalAnsweredCount', () => {
  it('compte les deux sens de réponse, jamais les silencieux', () => {
    const p = proposal({
      c1: { outcome: 'accepted', at: 'T1' },
      c2: { outcome: 'declined', at: 'T2' },
    });
    expect(restProposalAnsweredCount(p)).toBe(2);
    expect(restProposalAnsweredCount(proposal())).toBe(0);
  });
});

describe('restProposalHeadline', () => {
  it('nomme le proposant et la nature du repos, avec le bon article', () => {
    expect(restProposalHeadline(proposal())).toBe('MJ propose une récupération rapide');
    expect(restProposalHeadline({ ...proposal(), kind: 'long', proposedBy: 'Aldric' })).toBe(
      'Aldric propose un repos long',
    );
  });
});

describe('reviveRestProposal', () => {
  it('accepte un instantané bien formé', () => {
    expect(reviveRestProposal(proposal({ c1: { outcome: 'accepted', at: 'T1' } }))).toEqual(
      proposal({ c1: { outcome: 'accepted', at: 'T1' } }),
    );
  });

  it('rejette ce qui n’est pas une proposition lisible', () => {
    expect(reviveRestProposal(null)).toBeNull();
    expect(reviveRestProposal('nope')).toBeNull();
    expect(reviveRestProposal({ ...proposal(), id: '' })).toBeNull();
    expect(reviveRestProposal({ ...proposal(), kind: 'nap' })).toBeNull();
    expect(reviveRestProposal({ ...proposal(), proposedBy: 42 })).toBeNull();
    expect(reviveRestProposal({ ...proposal(), createdAt: undefined })).toBeNull();
  });

  it('écarte les réponses inexploitables sans jeter la proposition', () => {
    const revived = reviveRestProposal({
      ...proposal(),
      responses: {
        c1: { outcome: 'accepted', at: 'T1' },
        c2: { outcome: 'peut-être' },
        c3: null,
        c4: { outcome: 'declined' },
      },
    });
    expect(revived?.responses).toEqual({
      c1: { outcome: 'accepted', at: 'T1' },
      c4: { outcome: 'declined', at: '' },
    });
  });

  it('écarte les participants inexploitables sans jeter la proposition', () => {
    const revived = reviveRestProposal({
      ...proposal(),
      participants: [
        { characterId: 'c1', name: 'Brann', playerName: 'Joueur 1' },
        { characterId: '', name: 'Sans id' },
        { name: 'Sans id du tout' },
        null,
        { characterId: 'c2', name: 'Sylvane', playerName: 7 },
      ],
    });
    expect(revived?.participants).toEqual([
      { characterId: 'c1', name: 'Brann', playerName: 'Joueur 1' },
      { characterId: 'c2', name: 'Sylvane' },
    ]);
  });

  it('retombe sur « ouverte » devant un statut inconnu (rien ne s’applique par accident)', () => {
    expect(reviveRestProposal({ ...proposal(), status: 'zzz' })?.status).toBe('open');
    expect(reviveRestProposal({ ...proposal(), status: 'applied' })?.status).toBe('applied');
  });

  it('tolère une proposition sans carte de réponses ni table', () => {
    const bare: Record<string, unknown> = { ...proposal() };
    delete bare.responses;
    delete bare.participants;
    expect(reviveRestProposal(bare)).toMatchObject({ responses: {}, participants: [] });
  });
});
