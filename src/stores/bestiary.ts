'use client';

/**
 * Store du bestiaire cloud (PER-241, cache persistant PER-244) — cache mémoire
 * d'une source cloud, sur le modèle du store `campaigns`, adossé à un cache
 * PERSISTANT IndexedDB (`src/lib/bestiary/cache.ts`).
 *
 * Cycle « stale-while-revalidate » maison (pas de React Query, cohérence codebase) :
 *   1. `loadList()` HYDRATE d'abord la liste depuis IndexedDB → affichage instantané
 *      au refresh, sans re-cligoter le squelette (le F5 ne refait plus la requête).
 *   2. Il RÉCONCILIE ensuite en fond via le MANIFESTE des sources (seul appel
 *      toujours frais) : re-fetch ciblé des seules sources dont la version a bougé,
 *      purge de celles disparues du manifeste, invalidation fine des blobs.
 *   3. Hors-ligne (manifeste injoignable) : on continue de servir le cache disque ;
 *      on n'expose une erreur que si l'on n'a rien à montrer.
 *
 * `loadBlob()` sert le blob depuis le disque avant tout appel réseau : une créature
 * déjà consultée s'ouvre hors-ligne.
 *
 * Garde-fou : sans variables d'env Supabase (mode 100 % local historique), le store
 * reste `unconfigured`. Sans IndexedDB (SSR/tests), le cache retombe transparemment
 * sur un cache mémoire de session (comportement PER-241).
 */
import { create } from 'zustand';
import {
  fetchCreatureBlob,
  hydrateBestiaryBlobs,
  hydrateBestiaryList,
  readCachedBlob,
  reconcileBestiaryCache,
  writeCachedBlob,
  type CachedBlob,
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
  /** Vrai pendant la réconciliation réseau en arrière-plan (cache déjà affiché). */
  revalidating: boolean;
  error: string | null;

  /** Blobs de détail déjà chargés, indexés par slug (`Creature.id`). */
  blobs: Record<string, Creature>;
  /** État de chargement par slug (étage 2). */
  blobStatus: Record<string, BlobStatus>;

  /** Cache disque déjà hydraté cette session (une seule fois). */
  _hydrated: boolean;
  /** Réconciliation réseau déjà réussie cette session (rend `loadList` idempotent). */
  _reconciled: boolean;

  /**
   * Charge la liste légère, à appeler au montage. **Idempotent** : après une
   * réconciliation réussie, ne refait rien tant que `{ force: true }` n'est pas
   * passé (bouton « Réessayer »).
   */
  loadList: (opts?: { force?: boolean }) => Promise<void>;
  /**
   * Charge le blob d'une créature (étage 2), disque d'abord puis réseau. Idempotent :
   * ne refait pas l'appel si le blob est déjà présent ou en cours de chargement.
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
  revalidating: false,
  error: null,
  blobs: {},
  blobStatus: {},
  _hydrated: false,
  _reconciled: false,

  loadList: async (opts) => {
    if (!isSupabaseConfigured()) {
      set({ status: 'unconfigured', list: [], error: null });
      return;
    }
    const force = opts?.force ?? false;
    // Idempotence : une fois réconcilié, ne rien refaire sans `force`.
    if (!force && get()._reconciled) return;
    // Verrou de concurrence posé SYNCHRONEMENT (avant tout `await`) : sous
    // React StrictMode l'effet de montage s'exécute deux fois — sans ce verrou,
    // le 2ᵉ appel franchirait les gardes et lancerait une réconciliation en double.
    if (get().revalidating) return;
    set({ revalidating: true });

    try {
      // 1. Hydratation disque (une seule fois) → affichage instantané si cache présent.
      //    On hydrate la liste ET les blobs déjà consultés en mémoire : une fiche
      //    déjà vue s'ouvre alors SANS repasser par l'état de chargement (pas de
      //    flicker), le blob étant présent dès le premier rendu.
      if (!get()._hydrated) {
        set({ _hydrated: true });
        const [cached, cachedBlobs] = await Promise.all([
          hydrateBestiaryList(),
          hydrateBestiaryBlobs(),
        ]);
        const blobPatch = blobHydrationPatch(cachedBlobs);
        if (cached && cached.length > 0) {
          set({ list: cached, status: 'ready', error: null, ...blobPatch });
        } else {
          set({
            ...blobPatch,
            ...(get().status !== 'ready' ? { status: 'loading' as const, error: null } : {}),
          });
        }
      } else if (get().status !== 'ready') {
        set({ status: 'loading', error: null });
      }

      // 2. Réconciliation réseau (manifeste + re-fetch ciblé).
      const { list, droppedBlobSlugs } = await reconcileBestiaryCache();
      set((s) => ({
        list,
        status: 'ready',
        error: null,
        revalidating: false,
        _reconciled: true,
        ...evictBlobs(s, droppedBlobSlugs),
      }));
    } catch (e) {
      // Hors-ligne / erreur réseau : si l'on a du cache à montrer, on le garde.
      const hasContent = (get().list?.length ?? 0) > 0;
      if (hasContent) {
        set({ revalidating: false, status: 'ready' });
      } else {
        set({ status: 'error', error: messageOf(e), revalidating: false });
      }
    }
  },

  loadBlob: async (slug) => {
    if (!slug || !isSupabaseConfigured()) return;
    const { blobs, blobStatus } = get();
    if (blobs[slug] || blobStatus[slug] === 'loading') return;
    set((s) => ({ blobStatus: { ...s.blobStatus, [slug]: 'loading' } }));

    // 1. Cache disque d'abord (sert hors-ligne les créatures déjà consultées).
    const cached = await readCachedBlob(slug);
    if (cached) {
      set((s) => ({
        blobs: { ...s.blobs, [slug]: cached },
        blobStatus: { ...s.blobStatus, [slug]: 'ready' },
      }));
      return;
    }

    // 2. Réseau, puis persistance disque (estampillée par l'item de liste).
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
      const item = get().list?.find((i) => i.id === slug);
      if (item) {
        void writeCachedBlob({
          slug,
          sourceId: item.sourceId,
          updatedAt: item.updatedAt,
          data: blob,
        });
      }
    } catch {
      set((s) => ({ blobStatus: { ...s.blobStatus, [slug]: 'error' } }));
    }
  },
}));

/**
 * Construit le patch d'état qui charge les blobs pré-hydratés en mémoire (statut
 * `ready`) — ainsi une fiche déjà consultée s'affiche instantanément au clic. Patch
 * vide si aucun blob en cache.
 */
function blobHydrationPatch(
  cachedBlobs: CachedBlob[],
): Pick<BestiaryState, 'blobs' | 'blobStatus'> | Record<string, never> {
  if (cachedBlobs.length === 0) return {};
  const blobs: Record<string, Creature> = {};
  const blobStatus: Record<string, BlobStatus> = {};
  for (const b of cachedBlobs) {
    blobs[b.slug] = b.data;
    blobStatus[b.slug] = 'ready';
  }
  return { blobs, blobStatus };
}

/**
 * Évince des blobs du cache MÉMOIRE (invalidés par la réconciliation) pour forcer
 * leur rechargement au prochain accès. Renvoie un patch partiel de l'état.
 */
function evictBlobs(
  state: BestiaryState,
  slugs: string[],
): Pick<BestiaryState, 'blobs' | 'blobStatus'> | Record<string, never> {
  if (slugs.length === 0) return {};
  const blobs = { ...state.blobs };
  const blobStatus = { ...state.blobStatus };
  for (const slug of slugs) {
    delete blobs[slug];
    delete blobStatus[slug];
  }
  return { blobs, blobStatus };
}
