/**
 * Présence approximative d'un ami (PER-402) — décision de cadrage : PAS de temps
 * réel (Realtime Presence jugé trop lourd), juste `last_seen_at` rafraîchi par
 * heartbeat. « En ligne » reste une approximation optimiste (le heartbeat ping
 * tant que l'onglet est visible, fenêtre alignée sur celle des joueurs, cf.
 * `ONLINE_WINDOW_MS` de `player/presenceStatus.ts`).
 */
import { formatRelativeTime } from '@/lib/ui/relativeTime';

const ONLINE_WINDOW_MS = 2 * 60_000;

/** Regroupement Steam-style « En ligne » / « Hors ligne » (cf. `FriendsDrawer`). */
export function isFriendOnline(lastSeenAt: string | null, now: number = Date.now()): boolean {
  if (!lastSeenAt) return false;
  return now - new Date(lastSeenAt).getTime() < ONLINE_WINDOW_MS;
}

export function friendPresenceLabel(lastSeenAt: string | null, now: number = Date.now()): string {
  if (!lastSeenAt) return 'Jamais vu en ligne';
  if (isFriendOnline(lastSeenAt, now)) return 'En ligne';
  return `Vu(e) ${formatRelativeTime(lastSeenAt, now)}`;
}
