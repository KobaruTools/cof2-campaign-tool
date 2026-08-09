/**
 * DEMANDE DE BUFF d'un joueur (PER-358) — modèle PUR du « je lance mon chant, tu poses ? ».
 *
 * Le besoin : à la table, c'est le barde qui décide de chanter, pas le MJ. Mais la sécurité de la
 * base fait du MJ l'**auteur unique** de l'état de combat (RLS `campaign_combat`) : un joueur ne peut
 * pas écrire un buff sur un camarade, et l'arbitrage du propriétaire (2026-08-06) est de NE PAS
 * élargir ces droits. On reprend donc le motif déjà éprouvé par le repos de groupe (PER-313) :
 * **le joueur demande, le MJ adopte**.
 *
 * Ce que le joueur émet n'est donc pas une pose, mais une DEMANDE : elle ne vise personne, ne
 * choisit pas le palier et n'écrit rien. Elle monte au MJ, qui l'adopte — la fenêtre de pose
 * habituelle (`GroupBuffDialog`) s'ouvre alors chez lui, pré-remplie comme si la puce avait été
 * déposée sur le lanceur — ou la refuse, auquel cas le seul demandeur en est averti.
 *
 * Pourquoi le joueur ne peut pas décider des cibles, même en proposition : **son client ne connaît
 * pas la table**. Sa fiche ne charge que son propre personnage (RLS `owner_id`) ; il ignore qui est
 * en jeu, dans quel camp et à portée de voix. Le MJ, lui, l'a sous les yeux sur son tracker.
 *
 * Rien n'est persisté : une demande vit le temps d'un tour de table, et ce qu'elle produit de
 * durable (l'état posé) l'est déjà par `campaign_combat`. Module pur — aucune UI, aucun réseau,
 * hormis `newBuffRequestId`, isolé et signalé comme dans `restProposal.ts`.
 */
import { BENEFICIAL_EFFECTS, type BeneficialEffectId } from '@/data/schema';

/**
 * Demande émise par un JOUEUR : « je lance Chant des héros ». Le buff est le seul paramètre — ni
 * cibles ni palier, qui appartiennent au MJ (les cibles) et au catalogue (le palier).
 */
export interface BuffRequest {
  /** Identifiant de la demande — c'est à lui que se rapportent l'adoption et le refus. */
  id: string;
  /** Buff demandé (entrée de `BENEFICIAL_EFFECTS`) — conféré par une capacité du demandeur. */
  buffId: BeneficialEffectId;
  /** Nom affiché du demandeur (le personnage : « Aria »), pour la ligne d'arbitrage du MJ. */
  byName: string;
  /**
   * Personnage au nom duquel la demande est faite : une seule demande en attente par personnage, et
   * c'est cette clé que le MJ passe à sa fenêtre de pose comme LANCEUR présumé.
   */
  characterId: string;
  /** Horodatage ISO de la demande (fourni par l'appelant — module pur). */
  at: string;
}

/** L'identifiant reçu désigne-t-il un buff connu du catalogue ? (donnée non fiable, cf. `revive`) */
export function isBeneficialEffectId(value: unknown): value is BeneficialEffectId {
  return typeof value === 'string' && value in BENEFICIAL_EFFECTS;
}

/**
 * Identifiant d'une nouvelle demande. **Impur** (horloge + aléa), isolé ici comme
 * `newRestProposalId` : tout le reste du module est réducteur pur.
 */
export function newBuffRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Phrase d'arbitrage affichée au MJ (« Aria lance Chant des héros »). */
export function buffRequestHeadline(request: BuffRequest): string {
  return `${request.byName} lance ${BENEFICIAL_EFFECTS[request.buffId]?.label ?? request.buffId}`;
}

/**
 * Range une demande dans la file d'attente du MJ. Un joueur n'a qu'une demande en attente à la fois :
 * s'il se ravise (autre buff), la nouvelle remplace l'ancienne **sur place** — se raviser ne fait pas
 * resquiller dans l'ordre d'arrivée. Renvoie la MÊME référence quand la demande reçue est déjà
 * exactement celle qu'on a (ré-émission, doublon réseau) : ni rendu ni traitement inutiles.
 */
export function upsertBuffRequest(
  queue: readonly BuffRequest[],
  request: BuffRequest,
): BuffRequest[] {
  const at = queue.findIndex((r) => r.characterId === request.characterId);
  if (at === -1) return [...queue, request];
  const previous = queue[at];
  if (
    previous.id === request.id &&
    previous.buffId === request.buffId &&
    previous.byName === request.byName
  ) {
    return queue as BuffRequest[];
  }
  const next = [...queue];
  next[at] = request;
  return next;
}

/**
 * Retire une demande traitée (adoptée ou refusée). Renvoie la MÊME référence si elle n'y est plus —
 * deux clics sur « Refuser » ne doivent pas rediffuser un second refus.
 */
export function removeBuffRequest(queue: readonly BuffRequest[], requestId: string): BuffRequest[] {
  if (!queue.some((r) => r.id === requestId)) return queue as BuffRequest[];
  return queue.filter((r) => r.id !== requestId);
}

/**
 * Valide une demande reçue du canal (donnée non fiable venue du réseau), sur le modèle de
 * `reviveRestRequest`. Renvoie `null` dès qu'un champ structurant manque ou que le buff est inconnu :
 * mieux vaut ignorer une demande illisible que d'afficher au MJ une ligne qu'il ne saurait pas poser.
 */
export function reviveBuffRequest(raw: unknown): BuffRequest | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string' || o.id === '') return null;
  if (!isBeneficialEffectId(o.buffId)) return null;
  if (typeof o.byName !== 'string' || o.byName === '') return null;
  if (typeof o.characterId !== 'string' || o.characterId === '') return null;
  return {
    id: o.id,
    buffId: o.buffId,
    byName: o.byName,
    characterId: o.characterId,
    at: typeof o.at === 'string' ? o.at : '',
  };
}
