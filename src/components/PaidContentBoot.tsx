'use client';

/**
 * Chargement au boot du contenu payant gaté « Le Compagnon » (PER-321). Composant
 * SANS rendu, monté une fois à la racine (cf. `CharacterSyncNotifier`) : au montage,
 * il déclenche `loadPaidContent()`, qui ne fait rien pour un visiteur non connecté ou
 * une session joueur anonyme (aucun fetch, aucune fuite), et fusionne le contenu
 * accessible pour une session propriétaire entitlée (cache disque d'abord, réseau
 * ensuite). La fusion étant idempotente et dédoublonnée au niveau module, le double
 * montage de StrictMode en dev est sans effet.
 */
import { useEffect } from 'react';
import { loadPaidContent } from '@/lib/content/loadPaidContent';

export function PaidContentBoot(): null {
  useEffect(() => {
    void loadPaidContent();
  }, []);
  return null;
}
