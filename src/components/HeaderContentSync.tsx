'use client';

import { useHeaderContent, type HeaderContent } from '@/stores/headerContent';

/**
 * Pont pour les Server Components (`/play`, `/play/history`) : `useHeaderContent` est un hook,
 * injouable depuis un composant serveur. Ce composant CLIENT ne fait que le relayer — rendu
 * directement dans l'arbre serveur avec le contenu déjà résolu (ex. rôle joueur validé côté
 * serveur), sans traverser la frontière serveur → client autrement qu'en JSX.
 */
export function HeaderContentSync(content: HeaderContent) {
  useHeaderContent(content);
  return null;
}
