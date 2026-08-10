/**
 * ATTRIBUTION D'UN CRISTAL à un autre personnage (PER-360), telle qu'elle voyage sur le canal de
 * session. Voie des cristaux, prestige mage, p. 156 : « Il peut le porter ou le confier à la
 * personne de son choix », et « peut activer ou désactiver un cristal qu'il a fabriqué à n'importe
 * quelle distance par une action limitée ».
 *
 * MÊME MOTIF QUE LE RENONCEMENT À UN BUFF (`buffWaiver.ts`, PER-358), et pour la même raison : il
 * n'y a RIEN à arbitrer — la règle ne conditionne l'attribution ni à une portée ni à une scène, et
 * le cristal a été confié physiquement bien avant — mais la RLS `campaign_combat` fait du MJ
 * l'auteur UNIQUE de l'état de combat. Le joueur NOTIFIE donc son attribution, et le client du MJ
 * pose (ou lève) l'état sur le porteur désigné. Ce n'est pas une demande : aucune validation
 * humaine, aucun refus possible.
 *
 * Un cristal n'est qu'à UN endroit à la fois : le récepteur commence toujours par retirer le
 * cristal de TOUS les combattants avant de le poser sur le nouveau porteur. Réattribuer et
 * reprendre son cristal sont donc le MÊME message, à `targetKey` près (`null` = « je le reprends »)
 * — et rejouer deux fois le même message ne change rien (idempotent).
 *
 * Sans MJ connecté, rien ne remonte : la fiche du mage est juste (il ne compte plus le bonus du
 * cristal confié), mais le porteur ne le voit pas arriver. Même dégradation acceptée que pour le
 * renoncement — un état de combat n'existe qu'en séance.
 */
import { isCrystalStatusId, type CrystalStatusId } from '@/data/crystalStatuses';
import { applyStatusToKeys, removeStatusesFromAll, type GmCombatState } from './combatState';

/** Ce qu'un joueur annonce : « ce cristal, je le confie à ce personnage » (ou « je le reprends »). */
export interface CrystalAssignment {
  /** Personnage qui possède le cristal (le mage de la voie) — clé de combattant. */
  sourceCharacterId: string;
  /** Cristal confié (id du catalogue `CRYSTALS`, qui est aussi l'id de l'état posé). */
  crystalId: CrystalStatusId;
  /** Porteur désigné — clé de combattant. `null` = le mage reprend son cristal. */
  targetKey: string | null;
}

/**
 * Relit une attribution reçue du canal. `null` si la charge utile est illisible ou porte un cristal
 * inconnu (version plus récente, message forgé) : le MJ ne touche à sa table que sur un ordre qu'il
 * comprend entièrement.
 */
export function reviveCrystalAssignment(payload: unknown): CrystalAssignment | null {
  const raw = payload as {
    sourceCharacterId?: unknown;
    crystalId?: unknown;
    targetKey?: unknown;
  } | null | undefined;
  if (!raw || typeof raw.sourceCharacterId !== 'string' || raw.sourceCharacterId === '') return null;
  if (!isCrystalStatusId(raw.crystalId)) return null;
  const targetKey =
    typeof raw.targetKey === 'string' && raw.targetKey !== '' ? raw.targetKey : null;
  return { sourceCharacterId: raw.sourceCharacterId, crystalId: raw.crystalId, targetKey };
}

/**
 * Applique une attribution à l'état de combat — CE QUE FAIT LE CLIENT DU MJ en recevant le message.
 *
 * Le cristal est d'abord retiré de TOUS les combattants : il n'existe qu'en un exemplaire et ne
 * tourne qu'autour d'une seule tête (p. 156). Cela couvre d'un même geste la réattribution (le
 * précédent porteur le perd) et la reprise (`targetKey` `null`, on s'arrête là). Aucune durée n'est
 * posée : un cristal reste actif jusqu'à ce que son propriétaire le désactive, pas un nombre de
 * tours donné.
 *
 * `castBy` = nom du JOUEUR qui attribue (`AppliedStatus.castBy`), résolu par le RÉCEPTEUR et non
 * transmis par l'émetteur : seul le client du MJ connaît la table (personnages réclamés, joueurs),
 * exactement comme pour la pose d'un buff de groupe. La fiche du porteur, elle, ne saurait résoudre
 * ni une clé de combattant ni un id de joueur — d'où un libellé figé à la pose. Absent quand le
 * personnage source n'est réclamé par personne : aucune mention vaut mieux qu'une mention trompeuse.
 *
 * Renvoie la MÊME référence quand rien ne change (message rejoué à l'identique).
 */
export function applyCrystalAssignment(
  state: GmCombatState,
  assignment: CrystalAssignment,
  castBy?: string,
): GmCombatState {
  // Court-circuit AVANT toute reconstruction : un message rejoué (reconnexion, double clic) ne doit
  // pas produire un nouvel état de combat, qui coûterait une écriture `campaign_combat` et une
  // diffusion à toute la table pour rien.
  const holders = Object.entries(state.statuses).filter(([, applied]) =>
    applied.some((s) => s.id === assignment.crystalId),
  );
  const settled =
    assignment.targetKey === null
      ? holders.length === 0
      : holders.length === 1 &&
        holders[0][0] === assignment.targetKey &&
        holders[0][1].find((s) => s.id === assignment.crystalId)?.castBy === castBy;
  if (settled) return state;

  const cleared = removeStatusesFromAll(state, [assignment.crystalId]);
  if (assignment.targetKey === null) return cleared;
  return applyStatusToKeys(cleared, [assignment.targetKey], assignment.crystalId, {
    ...(castBy ? { castBy } : {}),
  });
}

/**
 * Ce qu'un PORTEUR annonce : « je rends ce cristal » (PER-360, retour de recette). Le porteur n'a
 * pas fabriqué le cristal et ne le connaît que par l'état posé sur lui — il ignore donc à QUI il
 * appartient : la charge utile ne porte que le cristal et lui-même, à charge du client du MJ de
 * retrouver le mage (`crystalOwner`).
 *
 * Rendre un cristal ne le remet PAS en service chez son propriétaire : le mage le récupère éteint,
 * puisque « activer ou désactiver un cristal correspond à une action limitée » (p. 156) — action
 * qu'il n'a pas dépensée. C'est le client du MJ qui l'éteint sur sa fiche.
 */
export interface CrystalRelease {
  /** Cristal rendu (id du catalogue `CRYSTALS`). */
  crystalId: CrystalStatusId;
  /** Personnage qui le rend — clé de combattant. */
  holderKey: string;
}

/** Relit un abandon de cristal reçu du canal. `null` si la charge utile est illisible. */
export function reviveCrystalRelease(payload: unknown): CrystalRelease | null {
  const raw = payload as { crystalId?: unknown; holderKey?: unknown } | null | undefined;
  if (!raw || typeof raw.holderKey !== 'string' || raw.holderKey === '') return null;
  if (!isCrystalStatusId(raw.crystalId)) return null;
  return { crystalId: raw.crystalId, holderKey: raw.holderKey };
}

/**
 * Retire de l'état de combat un cristal rendu par son porteur — part COMBAT de l'abandon (l'extinction
 * chez le mage, elle, touche son personnage et appartient au store). Retrait de TOUS les combattants,
 * comme pour une attribution : un cristal n'est qu'à un endroit à la fois. Même référence si le
 * cristal n'était posé nulle part.
 */
export function applyCrystalRelease(state: GmCombatState, release: CrystalRelease): GmCombatState {
  return removeStatusesFromAll(state, [release.crystalId]);
}

/**
 * Attributions d'un personnage, keyées par cristal — forme LOCALE tenue par le client du mage
 * (jamais persistée, jamais diffusée telle quelle). Une entrée = un cristal actuellement confié.
 */
export type CrystalAssignmentMap = Readonly<Record<string, string>>;

/**
 * Range (ou retire) une attribution dans la carte locale. `targetKey` `null` retire l'entrée —
 * reprendre son cristal, c'est l'absence d'attribution, pas une attribution vide. Renvoie la MÊME
 * référence quand rien ne change : ni écriture de store ni rendu inutiles.
 */
export function setCrystalAssignment(
  map: CrystalAssignmentMap,
  crystalId: string,
  targetKey: string | null,
): CrystalAssignmentMap {
  const current = map[crystalId];
  if (targetKey === null) {
    if (current === undefined) return map;
    const next = { ...map };
    delete next[crystalId];
    return next;
  }
  if (current === targetKey) return map;
  return { ...map, [crystalId]: targetKey };
}
