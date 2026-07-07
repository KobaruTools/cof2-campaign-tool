'use client';

/**
 * Store des campagnes (PER-190) — **cache mémoire d'une source cloud**. Contrairement
 * au store `characters` (encore localStorage, phase transitoire), les campagnes
 * vivent dans Supabase : ce store ne persiste RIEN, il charge la liste possédée
 * (RLS `owner_id`) via `src/lib/campaign/repo.ts` et applique les mutations en
 * optimiste local après confirmation serveur.
 *
 * Garde-fou : sans variables d'env Supabase (mode 100 % local historique), le
 * store reste `unconfigured` et la liste vide — les pages campagnes affichent un
 * état dédié plutôt que de tenter un appel réseau voué à l'échec.
 *
 * Suppression d'une campagne : la base répercute les FK (joueurs en cascade,
 * personnages cloud détachés). Les personnages encore **locaux** qui la
 * référençaient sont détachés ici via `useCharactersStore.detachFromCampaign`
 * (miroir du `ON DELETE SET NULL`), pour qu'ils repassent « Non attribué ».
 */
import { create } from 'zustand';
import {
  deleteCampaign,
  fetchCampaigns,
  insertCampaign,
  updateCampaign,
  type Campaign,
  type CampaignRules,
} from '@/lib/campaign';
import { useCharactersStore } from './characters';

/** Cycle de vie du chargement cloud. `unconfigured` = env Supabase absente. */
export type CampaignsStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';

interface CampaignsState {
  campaigns: Campaign[];
  status: CampaignsStatus;
  error: string | null;

  /** Charge (ou recharge) les campagnes possédées. Idempotent, à appeler au montage. */
  load: () => Promise<void>;
  /**
   * Crée une campagne côté cloud et l'ajoute au cache. Lève en cas d'échec. Les
   * `rules` sont optionnelles : l'assistant de création (PER-198) les fournit
   * dès la création ; sinon la base retombe sur le défaut (armes à feu OK).
   */
  create: (name: string, description?: string | null, rules?: CampaignRules) => Promise<Campaign>;
  /** Met à jour nom/notes/règles de table d'une campagne. Lève en cas d'échec. */
  update: (
    id: string,
    patch: { name?: string; description?: string | null; rules?: CampaignRules },
  ) => Promise<void>;
  /**
   * Supprime une campagne (cloud) puis détache les personnages LOCAUX qui la
   * référençaient (→ « Non attribué »). Lève en cas d'échec côté cloud.
   */
  remove: (id: string) => Promise<void>;
  /** Récupère une campagne du cache par id. */
  getById: (id: string) => Campaign | undefined;
}

/** L'app est-elle branchée sur Supabase (variables d'env publiques présentes) ? */
function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

export const useCampaignsStore = create<CampaignsState>()((set, get) => ({
  campaigns: [],
  status: 'idle',
  error: null,

  load: async () => {
    if (!isSupabaseConfigured()) {
      set({ status: 'unconfigured', campaigns: [], error: null });
      return;
    }
    set({ status: 'loading', error: null });
    try {
      const campaigns = await fetchCampaigns();
      set({ campaigns, status: 'ready', error: null });
    } catch (e) {
      set({ status: 'error', error: messageOf(e) });
    }
  },

  create: async (name, description, rules) => {
    const campaign = await insertCampaign({
      name: name.trim() || 'Nouvelle campagne',
      description: description?.trim() || null,
      rules,
    });
    set((state) => ({ campaigns: [...state.campaigns, campaign] }));
    return campaign;
  },

  update: async (id, patch) => {
    const normalized: { name?: string; description?: string | null; rules?: CampaignRules } = {};
    if (patch.name !== undefined) normalized.name = patch.name.trim() || 'Nouvelle campagne';
    if (patch.description !== undefined) normalized.description = patch.description?.trim() || null;
    if (patch.rules !== undefined) normalized.rules = patch.rules;
    const updated = await updateCampaign(id, normalized);
    set((state) => ({ campaigns: state.campaigns.map((c) => (c.id === id ? updated : c)) }));
  },

  remove: async (id) => {
    await deleteCampaign(id);
    set((state) => ({ campaigns: state.campaigns.filter((c) => c.id !== id) }));
    // Miroir local du ON DELETE SET NULL : les persos locaux repassent « Non attribué ».
    useCharactersStore.getState().detachFromCampaign(id);
  },

  getById: (id) => get().campaigns.find((c) => c.id === id),
}));
