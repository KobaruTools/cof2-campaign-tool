'use client';

/**
 * État vu/passé des tours guidés (PER-423), **par appareil** — zustand + persist
 * (localStorage), même principe que [[preferences]]. Jamais envoyé à une base de données :
 * ce n'est pas un réglage de compte, juste ce que cet appareil a déjà vu.
 *
 * Une seule version par tour est retenue par clé (voir `src/lib/tours/registry.ts`) : si la
 * version courante du tour dépasse celle retenue, il n'est pas considéré comme vu et se
 * relance automatiquement — pas de logique de migration.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storageKeys } from '@/lib/storage/keys';
import type { TourId } from '@/lib/tours/registry';

interface ToursState {
  /** Version marquée vue/passée par tour. Absente = jamais vu. */
  completedVersions: Partial<Record<TourId, number>>;
  /** Vrai une fois le store réhydraté depuis localStorage (évite un mismatch SSR). */
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  /** Même traitement pour « Passer » et « Terminer » : les deux ferment le tour pour de bon. */
  markTourDone: (tourId: TourId, version: number) => void;
  /** Oublie l'état d'un tour — relance à la prochaine ouverture (page de reset, PER-424). */
  resetTour: (tourId: TourId) => void;
}

export const useToursStore = create<ToursState>()(
  persist(
    (set) => ({
      completedVersions: {},
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      markTourDone: (tourId, version) =>
        set((s) => ({ completedVersions: { ...s.completedVersions, [tourId]: version } })),
      resetTour: (tourId) =>
        set((s) => {
          const next = { ...s.completedVersions };
          delete next[tourId];
          return { completedVersions: next };
        }),
    }),
    {
      name: storageKeys.store.tours,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ completedVersions: state.completedVersions }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
