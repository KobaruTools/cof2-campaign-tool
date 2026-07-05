'use client';

/**
 * Store des joueurs d'UNE campagne (PER-191) — **cache mémoire d'une source
 * cloud**, sur le modèle de [[campaigns]]. Ne persiste rien : charge le roster
 * de la campagne courante (RLS propriétaire) via `src/lib/player/repo.ts` et
 * applique les mutations en optimiste local après confirmation serveur.
 *
 * Les mutations privilégiées (régénérer le lien, supprimer un joueur) délèguent
 * aux Server Actions `src/lib/player/actions.ts` (clé secrète + révocation des
 * sessions anonymes) ; création/renommage passent par le repo navigateur.
 *
 * Le chargement vit ici (et non dans un effet de composant) : c'est le pattern
 * du projet (la page appelle une action de store), qui évite le setState
 * synchrone en effet.
 */
import { create } from 'zustand';
import { deletePlayer, regeneratePlayerLink } from '@/lib/player/actions';
import { fetchPlayers, insertPlayer, renamePlayer } from '@/lib/player/repo';
import type { Player } from '@/lib/player/types';

export type PlayersStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';

interface PlayersState {
  /** Campagne dont le roster est en cache (null tant que rien n'est chargé). */
  campaignId: string | null;
  players: Player[];
  status: PlayersStatus;
  error: string | null;

  /** Charge (ou recharge) le roster d'une campagne. À appeler au montage. */
  load: (campaignId: string) => Promise<void>;
  /** Crée un joueur dans la campagne courante et l'ajoute au cache. Lève en cas d'échec. */
  create: (name: string) => Promise<Player>;
  /** Renomme un joueur. Lève en cas d'échec. */
  rename: (id: string, name: string) => Promise<void>;
  /** Régénère le lien magique (nouveau secret + coupure des sessions). Lève en cas d'échec. */
  regenerate: (id: string) => Promise<void>;
  /** Supprime un joueur (révocation + détachement de ses persos côté base). Lève en cas d'échec. */
  remove: (id: string) => Promise<void>;
}

function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const byName = (a: Player, b: Player) => a.name.localeCompare(b.name);

export const usePlayersStore = create<PlayersState>()((set, get) => ({
  campaignId: null,
  players: [],
  status: 'idle',
  error: null,

  load: async (campaignId) => {
    if (!isSupabaseConfigured()) {
      set({ status: 'unconfigured', players: [], campaignId, error: null });
      return;
    }
    set({ status: 'loading', campaignId, error: null });
    try {
      const players = await fetchPlayers(campaignId);
      set({ players: players.sort(byName), status: 'ready', error: null });
    } catch (e) {
      set({ status: 'error', error: messageOf(e) });
    }
  },

  create: async (name) => {
    const campaignId = get().campaignId;
    if (!campaignId) throw new Error('Aucune campagne chargée.');
    const player = await insertPlayer(campaignId, name.trim());
    set((state) => ({ players: [...state.players, player].sort(byName) }));
    return player;
  },

  rename: async (id, name) => {
    const updated = await renamePlayer(id, name.trim());
    set((state) => ({
      players: state.players.map((p) => (p.id === id ? updated : p)).sort(byName),
    }));
  },

  regenerate: async (id) => {
    const { joinSecret } = await regeneratePlayerLink(id);
    set((state) => ({
      players: state.players.map((p) => (p.id === id ? { ...p, joinSecret } : p)),
    }));
  },

  remove: async (id) => {
    await deletePlayer(id);
    set((state) => ({ players: state.players.filter((p) => p.id !== id) }));
  },
}));
