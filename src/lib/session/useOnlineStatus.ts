'use client';

/**
 * Connectivité de l'appareil (PER-269) — fine enveloppe de `navigator.onLine` + des
 * événements `online`/`offline` du navigateur. Alimente la branche « hors ligne » du
 * signal 3 états de session (cf. `sessionConnectionState`).
 *
 * SSR-safe : renvoie `true` tant qu'on est côté serveur (pas de `navigator`), puis se
 * synchronise sur la vraie valeur au montage. `navigator.onLine` n'est qu'une heuristique
 * du navigateur (réseau physique présent, pas « Internet joignable ») — d'où la
 * complémentarité avec le `status` du canal pour distinguer « hors ligne » de « reconnexion… ».
 */
import { useEffect, useState } from 'react';

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  return online;
}
