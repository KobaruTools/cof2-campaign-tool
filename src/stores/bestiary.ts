'use client';

/**
 * Store du bestiaire cloud (PER-241) — **cache mémoire d'une source cloud**, sur
 * le modèle du store `campaigns`. Ne persiste RIEN (la persistance IndexedDB +
 * l'invalidation par version arrivent en PER-244) : il ne fait que mémoriser, pour
 * la durée de la session, la **liste légère** (chargée une fois) et les **blobs**
 * déjà consultés (chargés à la demande, étage 2).
 *
 * Garde-fou : sans variables d'env Supabase (mode 100 % local historique), le
 * store reste `unconfigured` et la liste vide — la page bestiaire affiche un état
 * dédié plutôt que de tenter un appel réseau voué à l'échec.
 */
import { create } from 'zustand';
import {
  fetchCreatureBlob,
  fetchCreatureList,
  type CreatureListItem,
} from '@/lib/bestiary';
import type { Creature } from '@/data/schema';

/** Cycle de vie du chargement cloud. `unconfigured` = env Supabase absente. */
export type BestiaryStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';

/** État de chargement d'un blob de détail (étage 2). */
export type BlobStatus = 'loading' | 'ready' | 'error';

interface BestiaryState {
  /** Liste légère (étage 1). `null` tant qu'elle n'est pas chargée. */
  list: CreatureListItem[] | null;
  status: BestiaryStatus;
  error: string | null;

  /** Blobs de détail déjà chargés, indexés par slug (`Creature.id`). */
  blobs: Record<string, Creature>;
  /** État de chargement par slug (étage 2). */
  blobStatus: Record<string, BlobStatus>;

  /**
   * Charge la liste légère, à appeler au montage. **Idempotent et mis en cache** :
   * si déjà chargée (`ready`) ou en cours (`loading`), ne refait AUCUN appel.
   * `{ force: true }` pour un rechargement explicite (bouton « Réessayer »).
   */
  loadList: (opts?: { force?: boolean }) => Promise<void>;
  /**
   * Charge le blob d'une créature (étage 2). Idempotent : ne refait pas l'appel si
   * le blob est déjà présent ou en cours de chargement.
   */
  loadBlob: (slug: string) => Promise<void>;
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

export const useBestiaryStore = create<BestiaryState>()((set, get) => ({
  list: null,
  status: 'idle',
  error: null,
  blobs: {},
  blobStatus: {},

  loadList: async (opts) => {
    if (!isSupabaseConfigured()) {
      set({ status: 'unconfigured', list: [], error: null });
      return;
    }
    const { status } = get();
    if (!opts?.force && (status === 'ready' || status === 'loading')) return;
    set({ status: 'loading', error: null });
    try {
      const list = await fetchCreatureList();
      set({ list, status: 'ready', error: null });
    } catch (e) {
      set({ status: 'error', error: messageOf(e) });
    }
  },

  loadBlob: async (slug) => {
    if (!slug || !isSupabaseConfigured()) return;
    const { blobs, blobStatus } = get();
    if (blobs[slug] || blobStatus[slug] === 'loading') return;
    set((s) => ({ blobStatus: { ...s.blobStatus, [slug]: 'loading' } }));
    try {
      const blob = await fetchCreatureBlob(slug);
      if (!blob) {
        set((s) => ({ blobStatus: { ...s.blobStatus, [slug]: 'error' } }));
        return;
      }
      set((s) => ({
        blobs: { ...s.blobs, [slug]: blob },
        blobStatus: { ...s.blobStatus, [slug]: 'ready' },
      }));
    } catch {
      set((s) => ({ blobStatus: { ...s.blobStatus, [slug]: 'error' } }));
    }
  },
}));
