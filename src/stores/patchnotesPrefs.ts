'use client';

/**
 * Préférence « afficher les notifications de nouveautés » (PER-494) — réglage
 * par appareil (localStorage), sur le même patron que [[usePreferencesStore]].
 * `choiceMade` distingue l'état par défaut (jamais demandé) d'un choix explicite
 * : la modale de premier close de `PatchnotesNotifier` ne se redéclenche jamais
 * une fois `choiceMade` à `true`, que ce soit via la modale ou le switch de
 * `/account`.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { storageKeys } from '@/lib/storage/keys';

interface PatchnotesPrefsState {
  /** Afficher le toast de nouveautés. Défaut : vrai. */
  enabled: boolean;
  /** Vrai dès qu'un choix explicite a été fait (modale ou switch du compte). */
  choiceMade: boolean;
  /** Vrai une fois le store réhydraté depuis localStorage (évite un mismatch SSR). */
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;
  /** Choix explicite : marque aussi `choiceMade`, quel que soit l'appelant. */
  setEnabled: (v: boolean) => void;
}

export const usePatchnotesPrefsStore = create<PatchnotesPrefsState>()(
  persist(
    (set) => ({
      enabled: true,
      choiceMade: false,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),
      setEnabled: (v) => set({ enabled: v, choiceMade: true }),
    }),
    {
      name: storageKeys.patchnotes.prefs,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ enabled: state.enabled, choiceMade: state.choiceMade }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
