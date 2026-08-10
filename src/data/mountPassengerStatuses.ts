/**
 * PASSAGER d'une monture invoquée (PER-363) — 6e catalogue d'états de combat, sur le même patron
 * que les cristaux confiés (PER-360).
 *
 * Voie de l'invocation majeure, Monture fantôme (r4, p. 158) : « Le personnage conjure un cheval
 * fantomatique qui peut le transporter (plus éventuellement un autre cavalier) ». Le mage désigne
 * qui monte avec lui (n'importe quel autre personnage de la campagne) ; ce choix voyage comme un
 * ÉTAT DE COMBAT posé sur le PASSAGER (pas sur le mage) — sa fiche l'affiche en puce avec le
 * verbatim et le nom du joueur qui l'a désigné (`AppliedStatus.castBy`), et le MJ ou le passager
 * lui-même peuvent le lever.
 *
 * CETTE ENTRÉE NE PORTE AUCUN `modifiers`, ET C'EST VOLONTAIRE : le livre ne donne AUCUN effet
 * chiffré au second cavalier (seule la vitesse de la monture change, déjà dans le texte du sort).
 * L'état ne sert donc qu'à DIRE qui chevauche avec qui.
 *
 * UN SEUL passager global à la fois (comme un cristal n'est qu'à un endroit à la fois) : simplicité
 * assumée, cohérente avec le reste de l'app (table privée à un seul MJ, PER-363) — si deux mages
 * distincts avaient un jour chacun leur Monture fantôme active avec un passager différent, seul le
 * dernier assigné apparaîtrait. Non rencontré en pratique (voie de prestige rare) ; à revoir si le
 * cas se présente réellement à la table.
 *
 * Source : CBHS_06_Chroniques_Oubliees_2_web_v2.pdf, p. 158.
 */
import type { StatusEffectEntry } from './schema';

const MOUNT_PASSENGER_SOURCE_PAGE = 158;

export const MOUNT_PASSENGER_STATUS_IDS = ['monture-fantome-passager'] as const;
export type MountPassengerStatusId = (typeof MOUNT_PASSENGER_STATUS_IDS)[number];

/** Catalogue des états « passager d'une monture invoquée » — une seule entrée à ce jour. */
export const MOUNT_PASSENGER_STATUSES: Record<MountPassengerStatusId, StatusEffectEntry> = {
  'monture-fantome-passager': {
    label: 'Passager — Monture fantôme',
    effect:
      "Ce personnage chevauche en second cavalier la Monture fantôme invoquée par un autre personnage. La vitesse de la monture retombe à 5 km/h à deux cavaliers (au lieu de 10 km/h).",
    sourcePage: MOUNT_PASSENGER_SOURCE_PAGE,
  },
};

const MOUNT_PASSENGER_STATUS_ID_SET: ReadonlySet<string> = new Set(MOUNT_PASSENGER_STATUS_IDS);

/** L'id désigne-t-il un état « passager de monture » ? (donnée réseau non fiable comprise) */
export function isMountPassengerStatusId(value: unknown): value is MountPassengerStatusId {
  return typeof value === 'string' && MOUNT_PASSENGER_STATUS_ID_SET.has(value);
}
