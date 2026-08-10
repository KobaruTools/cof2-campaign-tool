/**
 * PASSAGER d'une monture invoquée (PER-363), tel qu'il voyage sur le canal de session. Voie de
 * l'invocation majeure, Monture fantôme (r4, p. 158) : « peut le transporter (plus éventuellement
 * un autre cavalier) ».
 *
 * MÊME MOTIF QUE L'ATTRIBUTION D'UN CRISTAL (`crystalAssignment.ts`, PER-360), en plus simple : il
 * n'existe qu'UN SEUL état « passager » (`MOUNT_PASSENGER_STATUS_IDS[0]`, pas 14 variantes comme les
 * cristaux), et aucun champ ne quitte la fiche du mage propriétaire (le cristal, lui, doit être
 * ÉTEINT chez son fabricant — la monture n'a rien d'équivalent à éteindre). La RLS `campaign_combat`
 * fait du MJ l'auteur UNIQUE de l'état de combat : le joueur NOTIFIE son choix de passager, et le
 * client du MJ pose (ou lève) l'état sur le personnage désigné. Aucune validation humaine.
 *
 * Le passager n'est qu'à UN endroit à la fois : le récepteur commence toujours par retirer l'état de
 * TOUS les combattants avant de le poser sur le nouveau passager. Réattribuer et faire descendre le
 * passager sont donc le MÊME message, à `targetKey` près (`null` = « personne ne monte plus ») —
 * rejouer deux fois le même message ne change rien (idempotent).
 *
 * Sans MJ connecté, rien ne remonte : même dégradation acceptée que pour les cristaux — un état de
 * combat n'existe qu'en séance.
 */
import { MOUNT_PASSENGER_STATUS_IDS } from '@/data/mountPassengerStatuses';
import { applyStatusToKeys, removeStatusesFromAll, type GmCombatState } from './combatState';

/** L'unique état « passager » posé par cette fonctionnalité (pas de variantes, à la différence des cristaux). */
const PASSENGER_STATUS_ID = MOUNT_PASSENGER_STATUS_IDS[0];

/** Ce qu'un joueur annonce : « ce personnage monte avec moi » (ou « personne ne monte plus »). */
export interface MountPassengerAssignment {
  /** Personnage qui invoque la monture (le mage de la voie) — clé de combattant. */
  sourceCharacterId: string;
  /** Passager désigné — clé de combattant. `null` = plus aucun passager. */
  targetKey: string | null;
}

/**
 * Relit une assignation reçue du canal. `null` si la charge utile est illisible : le MJ ne touche à
 * sa table que sur un ordre qu'il comprend entièrement.
 */
export function reviveMountPassengerAssignment(payload: unknown): MountPassengerAssignment | null {
  const raw = payload as { sourceCharacterId?: unknown; targetKey?: unknown } | null | undefined;
  if (!raw || typeof raw.sourceCharacterId !== 'string' || raw.sourceCharacterId === '') return null;
  const targetKey = typeof raw.targetKey === 'string' && raw.targetKey !== '' ? raw.targetKey : null;
  return { sourceCharacterId: raw.sourceCharacterId, targetKey };
}

/**
 * Applique une assignation à l'état de combat — CE QUE FAIT LE CLIENT DU MJ en recevant le message.
 * Retire d'abord le passager de TOUS les combattants (il n'existe qu'en un exemplaire), ce qui couvre
 * d'un même geste la réassignation et le retrait (`targetKey` `null`). Aucune durée n'est posée.
 *
 * `castBy` = nom du JOUEUR qui assigne, résolu par le RÉCEPTEUR (comme pour les cristaux et les buffs
 * de groupe) — jamais transmis par l'émetteur.
 *
 * Renvoie la MÊME référence quand rien ne change (message rejoué à l'identique).
 */
export function applyMountPassengerAssignment(
  state: GmCombatState,
  assignment: MountPassengerAssignment,
  castBy?: string,
): GmCombatState {
  const holders = Object.entries(state.statuses).filter(([, applied]) =>
    applied.some((s) => s.id === PASSENGER_STATUS_ID),
  );
  const settled =
    assignment.targetKey === null
      ? holders.length === 0
      : holders.length === 1 &&
        holders[0][0] === assignment.targetKey &&
        holders[0][1].find((s) => s.id === PASSENGER_STATUS_ID)?.castBy === castBy;
  if (settled) return state;

  const cleared = removeStatusesFromAll(state, [PASSENGER_STATUS_ID]);
  if (assignment.targetKey === null) return cleared;
  return applyStatusToKeys(cleared, [assignment.targetKey], PASSENGER_STATUS_ID, {
    ...(castBy ? { castBy } : {}),
  });
}

/**
 * Ce qu'un PASSAGER annonce : « je descends » (retour de recette, symétrique du renoncement à un
 * buff/de l'abandon d'un cristal). Le passager ignore qui invoque la monture — la charge utile ne
 * porte que sa propre clé, à charge du client du MJ de retirer l'état où qu'il soit posé.
 */
export interface MountPassengerRelease {
  /** Passager qui descend — clé de combattant. */
  holderKey: string;
}

/** Relit un « je descends » reçu du canal. `null` si la charge utile est illisible. */
export function reviveMountPassengerRelease(payload: unknown): MountPassengerRelease | null {
  const raw = payload as { holderKey?: unknown } | null | undefined;
  if (!raw || typeof raw.holderKey !== 'string' || raw.holderKey === '') return null;
  return { holderKey: raw.holderKey };
}

/** Retire l'état « passager » de tous les combattants. Même référence si personne n'était monté. */
export function applyMountPassengerRelease(state: GmCombatState): GmCombatState {
  return removeStatusesFromAll(state, [PASSENGER_STATUS_ID]);
}

/**
 * Assignation LOCALE tenue par le client du mage (jamais persistée, jamais diffusée telle quelle) —
 * `sourceCharacterId -> targetKey`. Une seule entrée possible à la fois (un mage n'a qu'une Monture
 * fantôme, donc qu'un passager).
 */
export type MountPassengerAssignmentMap = Readonly<Record<string, string>>;

/**
 * Range (ou retire) une assignation dans la carte locale. `targetKey` `null` retire l'entrée. Renvoie
 * la MÊME référence quand rien ne change (ni écriture de store ni rendu inutiles).
 */
export function setMountPassengerAssignment(
  map: MountPassengerAssignmentMap,
  sourceCharacterId: string,
  targetKey: string | null,
): MountPassengerAssignmentMap {
  const current = map[sourceCharacterId];
  if (targetKey === null) {
    if (current === undefined) return map;
    const next = { ...map };
    delete next[sourceCharacterId];
    return next;
  }
  if (current === targetKey) return map;
  return { ...map, [sourceCharacterId]: targetKey };
}
