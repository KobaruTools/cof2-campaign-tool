'use client';

/**
 * Heartbeat de présence joueur (PER-195). Rafraîchit `last_seen_at` du joueur pour
 * que le MJ voie qui est actif : ping au montage, puis toutes les 60 s **tant que
 * l'onglet est visible** (aucun ping pour un onglet en arrière-plan), et un ping de
 * plus au retour au premier plan. Best-effort : les erreurs sont avalées.
 *
 * Monté sur les surfaces où le joueur passe son temps (espace `/play`, sa fiche) ;
 * `enabled=false` (ou une session non-joueur) le neutralise — l'écriture serveur
 * est de toute façon un no-op hors session joueur.
 */
import { useEffect } from 'react';
import { touchPlayerPresence } from './presence';

const HEARTBEAT_MS = 60_000;

export function usePresenceHeartbeat(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;

    const ping = () => {
      if (document.visibilityState !== 'visible') return;
      void touchPlayerPresence().catch(() => {});
    };

    ping();
    const intervalId = window.setInterval(ping, HEARTBEAT_MS);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') ping();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);
}
