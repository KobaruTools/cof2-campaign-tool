'use client';

/**
 * Brouillon du wizard de création — zustand + persist (localStorage).
 *
 * Un seul brouillon à la fois (PRD §5.2 : « un brouillon abandonné est conservé
 * et proposé à la reprise »). `start` crée un nouveau brouillon ; `clear`
 * l'efface (à la fin du wizard ou sur abandon explicite).
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { newId } from '@/lib/character/factory';
import { createDraft, type WizardDraft } from '@/lib/character/wizard';

interface WizardState {
  draft: WizardDraft | null;
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  /** Démarre un nouveau brouillon et le retourne. */
  start: () => WizardDraft;
  /** Applique une mise à jour partielle au brouillon courant. */
  patch: (partial: Partial<WizardDraft>) => void;
  /** Va à une étape donnée. */
  setStep: (step: number) => void;
  /** Efface le brouillon. */
  clear: () => void;
}

export const useWizardStore = create<WizardState>()(
  persist(
    (set, get) => ({
      draft: null,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      start: () => {
        const draft = createDraft(newId(), new Date().toISOString());
        set({ draft });
        return draft;
      },

      patch: (partial) => {
        const current = get().draft;
        if (!current) return;
        set({ draft: { ...current, ...partial } });
      },

      setStep: (step) => {
        const current = get().draft;
        if (!current) return;
        set({ draft: { ...current, step } });
      },

      clear: () => set({ draft: null }),
    }),
    {
      name: 'cof2-wizard-draft',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ draft: state.draft }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
