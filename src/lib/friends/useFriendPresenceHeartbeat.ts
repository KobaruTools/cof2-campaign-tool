'use client';

/**
 * Heartbeat de présence « compte » (PER-402) — même patron que
 * `player/usePresenceHeartbeat` : ping au montage puis toutes les 60 s tant que
 * l'onglet est visible, plus un ping au retour au premier plan. Best-effort, RPC
 * déjà no-op silencieux pour une session anonyme/joueur (migration 0024).
 *
 * Monté une seule fois, globalement (racine authentifiée) : la présence d'ami
 * n'est pas propre à une page.
 */
import { useEffect } from 'react';
import { touchMyPresence } from './repo';

const HEARTBEAT_MS = 60_000;

export function useFriendPresenceHeartbeat(enabled: boolean = true): void {
  useEffect(() => {
    if (!enabled) return;

    const ping = () => {
      if (document.visibilityState !== 'visible') return;
      void touchMyPresence().catch(() => {});
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
