'use client';

/**
 * Préférences d'affichage **par appareil** — zustand + persist (localStorage), sur le
 * modèle de [[campaignDraft]]. Volontairement **local** (pas au cloud) : ce sont des
 * réglages de confort visuel liés à la machine/à l'écran (« ce poste rame »), pas des
 * données de compte. Conséquence voulue : disponibles **sans compte** (visiteur,
 * session joueur) et lus de façon **synchrone** → aucun flash au premier rendu.
 *
 * `animateBackground` gouverne le suivi souris du fond (parallaxe partagée, cf.
 * [[useMouseParallax]]). Il s'empile PAR-DESSUS `prefers-reduced-motion` : si l'OS
 * demande déjà de réduire les animations, l'effet est coupé quoi qu'il arrive ; ce
 * réglage n'est qu'un override manuel supplémentaire.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface PreferencesState {
  /** Suivre la souris pour animer l'illustration de fond. Défaut : vrai. */
  animateBackground: boolean;
  /** Vrai une fois le store réhydraté depuis localStorage (évite un mismatch SSR). */
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  setAnimateBackground: (v: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      animateBackground: true,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      setAnimateBackground: (v) => set({ animateBackground: v }),
    }),
    {
      name: 'cof2-preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ animateBackground: state.animateBackground }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
