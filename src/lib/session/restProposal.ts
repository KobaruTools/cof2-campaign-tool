/**
 * Repos de groupe (PER-312) — modèle PUR d'une proposition de récupération faite à toute la table.
 *
 * Le principe de la mécanique : **le temps est collectif, le bénéfice est individuel**. Quand le
 * groupe s'arrête, les 30 minutes (« récupération rapide », p. 221) ou la nuit (p. 221-222) passent
 * pour tout le monde — personne ne refuse que le temps s'écoule. Ce que chaque joueur décide pour
 * lui, c'est s'il DÉPENSE ses dés de récupération / son mana, ou s'il passe son tour. La récupération
 * elle-même reste donc l'affaire de `rest.ts` (`shortRest`/`longRest`, par personnage) : ce module
 * ne porte QUE la proposition et le relevé des réponses.
 *
 * **Une proposition se déroule en deux temps** : les joueurs annoncent d'abord leur INTENTION
 * (« je récupère » / « je laisse passer »), puis le proposant valide — et c'est seulement à cet
 * instant que chaque fiche applique réellement son repos. Sans ce palier, annuler une pause à
 * mi-parcours laissait la table dans un état bâtard : les premiers à répondre s'étaient soignés,
 * les autres non. D'où le `status` porté par la proposition : `'open'` (on récolte les intentions)
 * puis `'applied'` (top de départ, irréversible).
 *
 * Le proposant (le MJ ; un joueur en PER-313) est **auteur unique** de l'objet `RestProposal` : il le
 * crée, y intègre les réponses reçues et le rediffuse en instantané absolu (LWW), sur le modèle de
 * l'état de combat (`combatState.ts` / `stores/campaignCombat.ts`). Rien n'est persisté en base : une
 * proposition vit le temps d'une pause de table, et ce qu'elle produit de durable (les repos réellement
 * appliqués) est déjà persisté par la fiche de chaque joueur.
 *
 * Module pur (aucune dépendance UI, aucun accès réseau) — hormis `newRestProposalId`, isolé et signalé.
 */

/** Nature du repos proposé — les deux seuls repos réglementaires (p. 221-222). */
export type RestKind = 'short' | 'long';

/**
 * Où en est la proposition. `'open'` : on récolte les intentions, rien n'a touché aucune fiche et
 * tout est encore annulable. `'applied'` : le proposant a donné le top, chaque client applique le
 * repos qu'il avait préparé. Il n'y a pas d'état « annulée » : une proposition annulée disparaît.
 */
export type RestProposalStatus = 'open' | 'applied';

/** Ce qu'un joueur a décidé pour lui-même face à une proposition. */
export type RestOutcome = 'accepted' | 'declined';

/** Réponse d'un personnage à une proposition. */
export interface RestResponse {
  outcome: RestOutcome;
  /** Horodatage ISO de la réponse (fourni par l'appelant — module pur). */
  at: string;
}

/**
 * Un personnage attendu au relevé. La liste voyage DANS la proposition : le joueur, sur sa fiche,
 * ne connaît pas la table (il ne voit que son propre personnage) et doit pourtant afficher le même
 * relevé que le MJ pendant qu'il patiente.
 */
export interface RestParticipant {
  characterId: string;
  name: string;
  /** Nom du joueur qui l'incarne — le relevé dit qui n'a pas encore répondu. */
  playerName?: string;
}

/** Proposition de repos en cours, telle que diffusée sur le canal de session. */
export interface RestProposal {
  /** Identifiant de la proposition — distingue deux propositions successives (cf. `newRestProposalId`). */
  id: string;
  kind: RestKind;
  /** Nom affiché du proposant (« MJ », ou le nom d'un joueur en PER-313). */
  proposedBy: string;
  /** Horodatage ISO de la proposition (fourni par l'appelant). */
  createdAt: string;
  status: RestProposalStatus;
  /** Table attendue au relevé, dans l'ordre d'affichage. */
  participants: RestParticipant[];
  /** Réponses reçues, indexées par id de PERSONNAGE (un joueur répond pour son personnage). */
  responses: Record<string, RestResponse>;
}

/** Libellé français de chaque repos, au singulier et sans article. */
export const REST_KIND_LABEL: Record<RestKind, string> = {
  short: 'récupération rapide',
  long: 'repos long',
};

/**
 * Même libellé, précédé de son article indéfini — les deux repos n'ont pas le même genre
 * (« UNE récupération rapide », « UN repos long »), une seule chaîne à trous ne suffit donc pas.
 */
export const REST_KIND_WITH_ARTICLE: Record<RestKind, string> = {
  short: 'une récupération rapide',
  long: 'un repos long',
};

/** Durée annoncée par le livre pour chaque repos (p. 221-222) — sert à cadrer la pause à la table. */
export const REST_KIND_DURATION: Record<RestKind, string> = {
  short: '30 minutes',
  long: '8 heures',
};

/** Garde de type : la valeur brute est-elle une nature de repos connue ? */
export function isRestKind(value: unknown): value is RestKind {
  return value === 'short' || value === 'long';
}

/**
 * Identifiant d'une nouvelle proposition. **Impur** (horloge + aléa), isolé ici comme
 * `randomTieBreakSeed` l'est dans `initiativeOrder` : les réducteurs, eux, restent purs.
 */
export function newRestProposalId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Ouvre une proposition : aucune réponse, rien d'appliqué. */
export function createRestProposal(
  id: string,
  kind: RestKind,
  proposedBy: string,
  createdAt: string,
  participants: readonly RestParticipant[] = [],
): RestProposal {
  return {
    id,
    kind,
    proposedBy,
    createdAt,
    status: 'open',
    participants: [...participants],
    responses: {},
  };
}

/**
 * Donne le top de l'application : le relevé est figé et chaque client applique le repos qu'il avait
 * préparé. Renvoie la MÊME référence si le top a déjà été donné — la rediffusion de l'instantané à
 * un nouveau venu ne doit pas ressembler à un second top.
 */
export function applyRestProposal(proposal: RestProposal): RestProposal {
  if (proposal.status === 'applied') return proposal;
  return { ...proposal, status: 'applied' };
}

/**
 * Enregistre (ou remplace) la réponse d'un personnage. Un joueur peut changer d'avis tant que la
 * proposition est ouverte — la dernière réponse gagne. Renvoie la MÊME référence quand la réponse
 * est déjà celle-là (une re-réception ne redéclenche alors ni rendu ni rediffusion) ou quand le top
 * de l'application est déjà donné : après coup, le relevé ne bouge plus.
 */
export function recordRestResponse(
  proposal: RestProposal,
  characterId: string,
  outcome: RestOutcome,
  at: string,
): RestProposal {
  if (proposal.status !== 'open') return proposal;
  if (proposal.responses[characterId]?.outcome === outcome) return proposal;
  return {
    ...proposal,
    responses: { ...proposal.responses, [characterId]: { outcome, at } },
  };
}

/**
 * Fusionne deux vues d'une MÊME proposition, `remote` faisant foi en cas de conflit. Sert au joueur
 * qui reçoit l'instantané du proposant alors qu'il vient tout juste de répondre : sa réponse locale,
 * pas encore intégrée en face, ne doit pas disparaître de son écran le temps d'un aller-retour.
 * Renvoie `remote` tel quel si les propositions diffèrent (proposition remplacée) ou s'il n'y a rien
 * à récupérer localement.
 */
export function mergeRestProposals(local: RestProposal | null, remote: RestProposal): RestProposal {
  if (!local || local.id !== remote.id) return remote;
  const missing = Object.entries(local.responses).filter(([cid]) => !(cid in remote.responses));
  if (missing.length === 0) return remote;
  return { ...remote, responses: { ...Object.fromEntries(missing), ...remote.responses } };
}

/** Relevé des réponses, réparti en trois listes d'ids de personnage (l'ordre d'entrée est conservé). */
export interface RestProposalTally {
  /** Comptent récupérer (intention annoncée ; le repos s'applique au top du proposant). */
  accepted: string[];
  /** Ont décliné (ils laissent passer le temps sans rien dépenser). */
  declined: string[];
  /** N'ont pas répondu — absents, déconnectés, ou simplement pas encore décidés. */
  pending: string[];
}

/**
 * Répartit les personnages attendus à la table selon leur réponse. La table attendue est celle que
 * porte la proposition (`participants`) : les personnages réclamés par un joueur au moment où elle a
 * été ouverte. Une réponse d'un personnage hors liste (retiré de la campagne entre-temps) est
 * ignorée — le relevé reflète la table telle qu'elle a été convoquée.
 */
export function restProposalTally(proposal: RestProposal): RestProposalTally {
  const tally: RestProposalTally = { accepted: [], declined: [], pending: [] };
  for (const { characterId } of proposal.participants) {
    const outcome = proposal.responses[characterId]?.outcome;
    if (outcome === 'accepted') tally.accepted.push(characterId);
    else if (outcome === 'declined') tally.declined.push(characterId);
    else tally.pending.push(characterId);
  }
  return tally;
}

/** Nombre de personnages ayant tranché (dans un sens ou dans l'autre). */
export function restProposalAnsweredCount(proposal: RestProposal): number {
  const tally = restProposalTally(proposal);
  return tally.accepted.length + tally.declined.length;
}

/** Phrase d'annonce affichée au joueur (« MJ propose une récupération rapide »). */
export function restProposalHeadline(proposal: RestProposal): string {
  return `${proposal.proposedBy} propose ${REST_KIND_WITH_ARTICLE[proposal.kind]}`;
}

/** Un participant venu du canal est-il exploitable ? (donnée non fiable, cf. `reviveRestProposal`) */
function reviveParticipant(raw: unknown): RestParticipant | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.characterId !== 'string' || o.characterId === '') return null;
  if (typeof o.name !== 'string') return null;
  return {
    characterId: o.characterId,
    name: o.name,
    ...(typeof o.playerName === 'string' ? { playerName: o.playerName } : {}),
  };
}

/**
 * Valide un instantané reçu du canal (donnée non fiable venue du réseau), sur le modèle de
 * `reviveStateObject` pour l'état de combat. Renvoie `null` dès qu'un champ structurant manque —
 * mieux vaut ignorer une proposition illisible que d'ouvrir une fenêtre vide chez le joueur.
 * Les réponses et participants inexploitables sont écartés un à un, sans invalider la proposition
 * entière ; un `status` inconnu retombe sur `'open'`, l'état le moins engageant (rien n'est appliqué).
 */
export function reviveRestProposal(raw: unknown): RestProposal | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id === '') return null;
  if (!isRestKind(o.kind)) return null;
  if (typeof o.proposedBy !== 'string') return null;
  if (typeof o.createdAt !== 'string') return null;
  const responses: Record<string, RestResponse> = {};
  if (o.responses && typeof o.responses === 'object') {
    for (const [cid, value] of Object.entries(o.responses as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const r = value as Record<string, unknown>;
      if (r.outcome !== 'accepted' && r.outcome !== 'declined') continue;
      responses[cid] = { outcome: r.outcome, at: typeof r.at === 'string' ? r.at : '' };
    }
  }
  const participants = Array.isArray(o.participants)
    ? o.participants.map(reviveParticipant).filter((p): p is RestParticipant => p !== null)
    : [];
  return {
    id: o.id,
    kind: o.kind,
    proposedBy: o.proposedBy,
    createdAt: o.createdAt,
    status: o.status === 'applied' ? 'applied' : 'open',
    participants,
    responses,
  };
}
