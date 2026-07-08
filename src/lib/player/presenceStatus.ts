/**
 * État de présence d'un joueur (PER-195), dérivé de ses horodatages `firstJoinedAt`
 * / `lastSeenAt` (rafraîchis par le heartbeat). Logique pure et injectable (`now`)
 * pour être testée et rendue côté MJ (`PlayerPresence`).
 *
 *   - `never`  : lien jamais activé (`firstJoinedAt` null).
 *   - `online` : activité très récente (dans la fenêtre `ONLINE_WINDOW_MS`).
 *   - `seen`   : a déjà rejoint, mais inactif depuis un moment.
 */
import type { Player } from './types';

export type PresenceState = 'never' | 'online' | 'seen';

/**
 * Fenêtre « en ligne » : le heartbeat ping toutes les 60 s tant que l'onglet est
 * visible ; 2 min laissent une marge pour un ping manqué sans faire clignoter le
 * statut.
 */
export const ONLINE_WINDOW_MS = 2 * 60_000;

export function presenceState(
  player: Pick<Player, 'firstJoinedAt' | 'lastSeenAt'>,
  now: number = Date.now(),
): PresenceState {
  if (!player.firstJoinedAt) return 'never';
  if (player.lastSeenAt && now - new Date(player.lastSeenAt).getTime() < ONLINE_WINDOW_MS) {
    return 'online';
  }
  return 'seen';
}
