'use client';

/**
 * Contenu DYNAMIQUE de l'en-tête global (`AppHeaderShell`), poussé par la page courante.
 *
 * `AppHeaderShell` est désormais monté UNE SEULE FOIS par `layout.tsx` (jamais démonté en
 * navigant). Or `layout.tsx` ne reçoit aucune prop des pages enfants (limite Next App Router) :
 * ce store est le canal par lequel chaque page fait connaître son fil d'Ariane, son action
 * propre, etc. **Éphémère et non persisté**, comme `stores/sessionPresence` — un contenu de
 * header n'a de sens que pour la page actuellement montée, et `useHeaderContent` l'efface au
 * démontage de celle-ci.
 */
import { useLayoutEffect, type ReactNode } from 'react';
import { create } from 'zustand';
import type { Crumb } from '@/components/AppBreadcrumbs';
import type { SessionRole } from '@/lib/auth/sessionRole';

export interface HeaderContent {
  breadcrumbs?: Crumb[];
  action?: ReactNode;
  restingLabel?: ReactNode;
  subtitle?: ReactNode;
  subtitleVisible?: boolean;
  accentColor?: string;
  gmScreenCampaignId?: string;
  sessionIndicator?: ReactNode;
  sessionRole?: SessionRole;
}

const EMPTY_CONTENT: HeaderContent = {};

interface HeaderContentStoreState {
  content: HeaderContent;
  set: (content: HeaderContent) => void;
  reset: () => void;
}

export const useHeaderContentStore = create<HeaderContentStoreState>()((set) => ({
  content: EMPTY_CONTENT,
  set: (content) => set({ content }),
  reset: () => set({ content: EMPTY_CONTENT }),
}));

/**
 * Publie le contenu de header de la page courante. `useLayoutEffect` (pas `useEffect`) : le
 * contenu est poussé/nettoyé AVANT la peinture du navigateur, pour qu'un changement de route ne
 * fasse pas apparaître un sous-header vide le temps d'un frame avant que la nouvelle page ne le
 * remplisse.
 */
export function useHeaderContent(content: HeaderContent): void {
  useLayoutEffect(() => {
    useHeaderContentStore.getState().set(content);
  });

  useLayoutEffect(() => {
    return () => useHeaderContentStore.getState().reset();
  }, []);
}
