'use client';

/**
 * Brouillon de l'assistant de création de campagne (PER-198) — zustand + persist
 * (localStorage), sur le modèle du brouillon de personnage [[wizard]]. Un seul
 * brouillon à la fois : interrompre la création le conserve, et `/campaigns`
 * propose de le **reprendre** (alerte cliquable) ou de l'**abandonner**.
 *
 * Le brouillon est **purement local** : RIEN n'est écrit au cloud tant que le MJ
 * n'a pas confirmé (« Créer la campagne » au dernier écran). Pour pouvoir afficher
 * les **liens magiques** des joueurs dès le récapitulatif — avant toute écriture —
 * on pré-génère leur `joinSecret` côté client (`crypto.randomUUID()`, via `newId`)
 * à l'ajout ; l'insertion finale les persiste tels quels (`insertPlayer`).
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { newId } from '@/lib/character/factory';
import { DEFAULT_CAMPAIGN_RULES, type CampaignRules } from '@/lib/campaign';

/** Joueur en cours de saisie : nom + secret de lien pré-généré (non encore en base). */
export interface CampaignDraftPlayer {
  name: string;
  joinSecret: string;
}

export interface CampaignDraft {
  step: number;
  name: string;
  description: string;
  rules: CampaignRules;
  players: CampaignDraftPlayer[];
}

interface CampaignDraftState {
  draft: CampaignDraft | null;
  hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  /** Démarre un nouveau brouillon vierge et le retourne. */
  start: () => CampaignDraft;
  /** Applique une mise à jour partielle au brouillon courant. */
  patch: (partial: Partial<CampaignDraft>) => void;
  /** Va à une étape donnée. */
  setStep: (step: number) => void;
  /** Ajoute un joueur (secret de lien pré-généré côté client). */
  addPlayer: (name: string) => void;
  /** Retire le joueur d'indice donné. */
  removePlayer: (index: number) => void;
  /** Régénère le secret de lien d'un joueur (avant création — simple nouvel uuid). */
  regeneratePlayer: (index: number) => void;
  /** Efface le brouillon (fin de création ou abandon explicite). */
  clear: () => void;
}

const emptyDraft = (): CampaignDraft => ({
  step: 0,
  name: '',
  description: '',
  rules: DEFAULT_CAMPAIGN_RULES,
  players: [],
});

export const useCampaignDraftStore = create<CampaignDraftState>()(
  persist(
    (set, get) => ({
      draft: null,
      hasHydrated: false,
      setHasHydrated: (v) => set({ hasHydrated: v }),

      start: () => {
        const draft = emptyDraft();
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

      addPlayer: (name) => {
        const current = get().draft;
        if (!current) return;
        const trimmed = name.trim();
        if (!trimmed) return;
        set({
          draft: {
            ...current,
            players: [...current.players, { name: trimmed, joinSecret: newId() }],
          },
        });
      },

      removePlayer: (index) => {
        const current = get().draft;
        if (!current) return;
        set({
          draft: { ...current, players: current.players.filter((_, i) => i !== index) },
        });
      },

      regeneratePlayer: (index) => {
        const current = get().draft;
        if (!current) return;
        set({
          draft: {
            ...current,
            players: current.players.map((p, i) =>
              i === index ? { ...p, joinSecret: newId() } : p,
            ),
          },
        });
      },

      clear: () => set({ draft: null }),
    }),
    {
      name: 'cof2-campaign-draft',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ draft: state.draft }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);
