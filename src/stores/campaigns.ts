'use client';

/**
 * Store des campagnes (PER-179) — zustand + middleware `persist` (localStorage).
 * Deuxième store à côté de `characters` (on conserve le store personnages
 * éprouvé) ; la hiérarchie Campagne ⊃ Joueurs ⊃ Personnages est plate, reliée
 * par les FK `Character.campaignId` / `Character.playerId`.
 *
 * Ce module importe `useCharactersStore` pour la **cascade** de suppression
 * (`remove` retire aussi les personnages de la campagne via `removeByCampaign`).
 * Depuis PER-180 la campagne est un regroupement OPTIONNEL : plus de « campagne
 * active » implicite ni de campagne par défaut (celle-ci est purgée au rechargement).
 *
 * Toute la logique métier (purge, cascade, gardes FK) vit dans des fonctions
 * pures testées (`src/lib/campaign/guards.ts`) ; ce store n'en est que le câblage.
 */
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  cascadeDeleteCampaign,
  createPlayer,
  pruneDefaultCampaign,
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
   * Purge la « Campagne par défaut » héritée (auto-créée par l'ancien bootstrap
   * PER-179). Depuis PER-180 la campagne est optionnelle ; les personnages migrés
   * repassent « Non attribué » et cette campagne technique disparaît. Idempotent.
   */
  pruneLegacyDefault: () => void;

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

      pruneLegacyDefault: () =>
        set((state) => ({ campaigns: pruneDefaultCampaign(state.campaigns) })),

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
        // Retire la « Campagne par défaut » héritée (PER-180) si elle traîne
        // encore d'un ancien bootstrap.
        state?.pruneLegacyDefault();
      },
    },
  ),
);
