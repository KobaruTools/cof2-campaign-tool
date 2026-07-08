/**
 * Temps relatif court en français (« à l'instant », « il y a 5 min », « il y a
 * 2 j »…), pour l'affichage de la dernière activité d'un joueur (PER-195). Au-delà
 * d'un mois, bascule sur une date courte. `now` est injectable pour les tests.
 */
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  const diff = Math.max(0, now - then);

  if (diff < MINUTE_MS) return "à l'instant";
  if (diff < HOUR_MS) return `il y a ${Math.floor(diff / MINUTE_MS)} min`;
  if (diff < DAY_MS) return `il y a ${Math.floor(diff / HOUR_MS)} h`;

  const days = Math.floor(diff / DAY_MS);
  if (days < 30) return `il y a ${days} j`;

  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
