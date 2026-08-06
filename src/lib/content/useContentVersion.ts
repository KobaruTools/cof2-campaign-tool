'use client';

/**
 * Hook de réactivité au contenu payant (PER-321). Renvoie la version de contenu
 * courante et re-rend le composant abonné à chaque fusion effective d'un lot payant.
 * Les vues qui lisent les registres (`ancestryById`, `paths`…) et doivent refléter
 * l'arrivée du contenu payant APRÈS leur premier rendu s'appuient dessus.
 *
 * Côté serveur (SSR), la version vaut 0 : le contenu payant n'est jamais chargé au
 * rendu serveur (il dépend d'une session navigateur + entitlement).
 */
import { useSyncExternalStore } from 'react';
import { getContentVersion, subscribeContent } from '@/data';

export function useContentVersion(): number {
  return useSyncExternalStore(subscribeContent, getContentVersion, () => 0);
}
