'use client';

/**
 * Hook de réactivité au CHARGEMENT du contenu payant (PER-321, cf. `useContentVersion`).
 * Renvoie `true` tant que `loadPaidContent()` n'a pas résolu — utilisé pour afficher un
 * loader neutre plutôt qu'un faux écart aux règles (« Capacité inconnue ») le temps que
 * le contenu gaté arrive (cache disque puis réseau).
 *
 * Côté serveur (SSR) et à l'hydratation, la valeur vaut `false` : le chargement ne
 * démarre qu'au montage client de `PaidContentBoot`.
 */
import { useSyncExternalStore } from 'react';
import { isContentLoading, subscribeContent } from '@/data';

export function usePaidContentLoading(): boolean {
  return useSyncExternalStore(subscribeContent, isContentLoading, () => false);
}
