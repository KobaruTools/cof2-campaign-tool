'use client';

/**
 * Store des campagnes (PER-179) — zustand + middleware `persist` (localStorage).
 * Deuxième store à côté de `characters` (on conserve le store personnages
 * éprouvé) ; la hiérarchie Campagne ⊃ Joueurs ⊃ Personnages est plate, reliée
 * par les FK `Character.campaignId` / `Character.playerId`.
 *
 * Ordre d'hydratation : ce module importe `useCharactersStore` en tête, ce qui
 * force le module `characters` à s'évaluer (et donc à s'hydrater depuis
 * localStorage, synchrone) AVANT que ce store ne soit créé. Le `bootstrap` peut
 * donc lire des personnages déjà hydratés dans `onRehydrateStorage`.
 *
 * Toute la logique métier (bootstrap, cascade, gardes FK) vit dans des fonctions
 * pures testées (`src/lib/campaign/guards.ts`) ; ce store n'en est que le câblage.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  bootstrapCampaigns,
  cascadeDeleteCampaign,
  createPlayer,
  type Campaign,
  type CampaignRules,
  type Player,
} from '@/lib/campaign';
import { useCharactersStore } from './characters';

interface CampaignsState {
  campaigns: Campaign[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;

  /**
   * Garantit l'existence de la « Campagne par défaut » si des personnages la
   * référencent sans qu'elle existe (post-migration). Idempotent.
   */
  bootstrap: () => void;

  /** Ajoute ou remplace une campagne (par id). */
  upsert: (campaign: Campaign) => void;
  /**
   * Supprime une campagne EN CASCADE : la campagne (et ses joueurs embarqués)
   * ainsi que tous ses personnages (via le store `characters`).
   */
  remove: (id: string) => void;
  /** Met à jour (partiellement) les règles de table d'une campagne. */
  updateRules: (id: string, rules: Partial<CampaignRules>) => void;
  /** Ajoute un joueur à une campagne et le retourne (undefined si campagne absente). */
  addPlayer: (campaignId: string, name: string) => Player | undefined;
  /** Renomme un joueur d'une campagne. */
  renamePlayer: (campaignId: string, playerId: string, name: string) => void;
  /** Récupère une campagne par id. */
  getById: (id: string) => Campaign | undefined;
}

/** Applique une transformation à la campagne d'id donné, laisse les autres intactes. */
function mapCampaign(
  campaigns: Campaign[],
  id: string,
  fn: (c: Campaign) => Campaign,
): Campaign[] {
  return campaigns.map((c) => (c.id === id ? fn(c) : c));
}

export const useCampaignsStore = create<CampaignsState>()(
  persist(
    (set, get) => ({
      campaigns: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),

      bootstrap: () =>
        set((state) => ({
          campaigns: bootstrapCampaigns(state.campaigns, useCharactersStore.getState().characters),
        })),

      upsert: (campaign) =>
        set((state) => {
          const i = state.campaigns.findIndex((c) => c.id === campaign.id);
          if (i === -1) return { campaigns: [...state.campaigns, campaign] };
          const next = state.campaigns.slice();
          next[i] = campaign;
          return { campaigns: next };
        }),

      remove: (id) => {
        // Cascade : on calcule les deux tableaux résultants, puis on met à jour
        // chaque store dans son domaine (campagnes ici, personnages là-bas).
        const result = cascadeDeleteCampaign(
          get().campaigns,
          useCharactersStore.getState().characters,
          id,
        );
        set({ campaigns: result.campaigns });
        useCharactersStore.getState().removeByCampaign(id);
      },

      updateRules: (id, rules) =>
        set((state) => ({
          campaigns: mapCampaign(state.campaigns, id, (c) => ({
            ...c,
            rules: { ...c.rules, ...rules },
          })),
        })),

      addPlayer: (campaignId, name) => {
        const campaign = get().campaigns.find((c) => c.id === campaignId);
        if (!campaign) return undefined;
        const player = createPlayer(name);
        set((state) => ({
          campaigns: mapCampaign(state.campaigns, campaignId, (c) => ({
            ...c,
            players: [...c.players, player],
          })),
        }));
        return player;
      },

      renamePlayer: (campaignId, playerId, name) =>
        set((state) => ({
          campaigns: mapCampaign(state.campaigns, campaignId, (c) => ({
            ...c,
            players: c.players.map((p) => (p.id === playerId ? { ...p, name } : p)),
          })),
        })),

      getById: (id) => get().campaigns.find((c) => c.id === id),
    }),
    {
      name: 'cof2-campaigns',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ campaigns: state.campaigns }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
        // Garantit la campagne par défaut pour les persos migrés (cf. ordre
        // d'hydratation documenté en tête de fichier).
        state?.bootstrap();
      },
    },
  ),
);
