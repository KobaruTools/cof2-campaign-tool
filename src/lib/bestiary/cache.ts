/**
 * Cache PERSISTANT du bestiaire (PER-244) — couche au-dessus du repo Supabase et du
 * wrapper IndexedDB. Rend le bestiaire performant hors-ligne / au refresh : la liste
 * légère et les blobs déjà consultés survivent entre les sessions, avec une
 * invalidation CIBLÉE par version de source.
 *
 * Principe (« stale-while-revalidate » maison, sans React Query) :
 *   1. Au montage, `hydrateBestiaryList()` sert instantanément la liste du disque.
 *   2. `reconcileBestiaryCache()` lit le MANIFESTE (seul appel toujours frais) et ne
 *      re-fetche que les sources dont la `content_version` a bougé ; il purge celles
 *      disparues du manifeste (source retirée / entitlement perdu) et invalide les
 *      blobs dont l'`updatedAt` a réellement avancé.
 *
 * La logique de DIFF est isolée en fonctions PURES (testables sans IndexedDB, dont
 * l'environnement de test node est dépourvu) ; les fonctions d'orchestration font
 * l'IO (IndexedDB + réseau).
 */
import {
  fetchCreatureList,
  fetchSourceManifest,
} from './repo';
import type { CreatureListItem, SourceManifestEntry } from './types';
import {
  BLOBS_STORE,
  SOURCES_STORE,
  idbDeleteMany,
  idbGet,
  idbGetAll,
  idbPut,
  idbPutMany,
  isIndexedDbAvailable,
} from './idb';
import type { Creature } from '@/data/schema';

/** Tranche de liste légère mise en cache pour UNE source, estampillée par version. */
export interface CachedSource {
  /** uuid de la source (`sources.id`) — clé de l'object store `sources`. */
  id: string;
  slug: string;
  contentVersion: number;
  items: CreatureListItem[];
}

/** Blob de détail mis en cache, estampillé pour l'invalidation fine. */
export interface CachedBlob {
  /** slug de la créature (`Creature.id`) — clé de l'object store `blobs`. */
  slug: string;
  sourceId: string;
  updatedAt: string;
  data: Creature;
}

// ────────────────────────────────────────────────────────────────────────────
// Fonctions PURES (diff du manifeste vs cache) — testées unitairement.
// ────────────────────────────────────────────────────────────────────────────

/** Plan de réconciliation : sources à recharger, sources à purger. */
export interface ReconciliationPlan {
  /** Sources (ids) dont la liste doit être (re)chargée : nouvelles ou version bumpée. */
  toFetch: string[];
  /** Sources (ids) à retirer du cache : disparues du manifeste (retrait / entitlement). */
  toPurge: string[];
}

/**
 * Compare le manifeste frais au cache disque. Une source est à recharger si elle est
 * absente du cache ou si sa `content_version` a changé ; elle est à purger si elle
 * n'est plus dans le manifeste (la RLS ne l'expose plus au rôle courant).
 */
export function planSourceReconciliation(
  manifest: SourceManifestEntry[],
  cached: Pick<CachedSource, 'id' | 'contentVersion'>[],
): ReconciliationPlan {
  const cachedVersionById = new Map(cached.map((c) => [c.id, c.contentVersion]));
  const manifestIds = new Set(manifest.map((m) => m.id));
  const toFetch = manifest
    .filter((m) => cachedVersionById.get(m.id) !== m.contentVersion)
    .map((m) => m.id);
  const toPurge = cached
    .filter((c) => !manifestIds.has(c.id))
    .map((c) => c.id);
  return { toFetch, toPurge };
}

/**
 * Blobs à invalider APRÈS le re-fetch des sources changées. Un blob n'est jeté que
 * si sa source vient d'être rechargée ET que sa créature a disparu ou que son
 * `updatedAt` a avancé — les blobs des sources intactes restent chauds, et sur une
 * source rechargée seuls les blobs réellement modifiés tombent.
 */
export function planBlobInvalidation(
  freshItems: CreatureListItem[],
  refetchedSourceIds: string[],
  cachedBlobs: Pick<CachedBlob, 'slug' | 'sourceId' | 'updatedAt'>[],
): string[] {
  const refetched = new Set(refetchedSourceIds);
  const freshUpdatedAtBySlug = new Map(freshItems.map((i) => [i.id, i.updatedAt]));
  const drop: string[] = [];
  for (const blob of cachedBlobs) {
    if (!refetched.has(blob.sourceId)) continue; // Source intacte → blob conservé.
    const fresh = freshUpdatedAtBySlug.get(blob.slug);
    if (fresh === undefined || fresh !== blob.updatedAt) drop.push(blob.slug);
  }
  return drop;
}

/** Aplatit les tranches de sources en une liste légère unique, triée par ordre du livre. */
export function flattenSources(sources: CachedSource[]): CreatureListItem[] {
  return sources
    .flatMap((s) => s.items)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Groupe des items par `sourceId` (helper d'orchestration). */
function groupBySource(items: CreatureListItem[]): Map<string, CreatureListItem[]> {
  const by = new Map<string, CreatureListItem[]>();
  for (const item of items) {
    const bucket = by.get(item.sourceId);
    if (bucket) bucket.push(item);
    else by.set(item.sourceId, [item]);
  }
  return by;
}

// ────────────────────────────────────────────────────────────────────────────
// Orchestration IO (IndexedDB + réseau).
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hydrate la liste légère depuis le disque, pour un affichage INSTANTANÉ au montage
 * (avant toute requête réseau). `null` si aucun cache (ou IndexedDB indisponible) —
 * le store affichera alors un squelette le temps du premier chargement réseau.
 */
export async function hydrateBestiaryList(): Promise<CreatureListItem[] | null> {
  if (!isIndexedDbAvailable()) return null;
  try {
    const sources = await idbGetAll<CachedSource>(SOURCES_STORE);
    if (sources.length === 0) return null;
    return flattenSources(sources);
  } catch {
    return null; // Cache illisible : on repartira du réseau.
  }
}

/**
 * Hydrate les BLOBS déjà consultés depuis le disque, pour un affichage INSTANTANÉ
 * de la fiche au clic (sans passer par l'état de chargement → pas de flicker). Le
 * cache ne contient que les créatures réellement ouvertes, donc le coût mémoire
 * suit l'usage, pas la taille du catalogue. `[]` si aucun cache / IndexedDB indispo.
 */
export async function hydrateBestiaryBlobs(): Promise<CachedBlob[]> {
  if (!isIndexedDbAvailable()) return [];
  try {
    return await idbGetAll<CachedBlob>(BLOBS_STORE);
  } catch {
    return [];
  }
}

/** Résultat de la réconciliation, à appliquer au cache mémoire du store. */
export interface ReconcileResult {
  /** Liste légère à jour (union des sources accessibles), triée. */
  list: CreatureListItem[];
  /** Slugs des blobs à évincer du cache MÉMOIRE (déjà supprimés du disque). */
  droppedBlobSlugs: string[];
}

/**
 * Réconcilie le cache disque avec le serveur via le manifeste, et renvoie la liste à
 * jour + les blobs à évincer de la mémoire. **Lève** en cas d'erreur réseau (le store
 * décide alors de continuer à servir le cache — cas hors-ligne — ou d'exposer une
 * erreur s'il n'a rien à montrer).
 *
 * Sans IndexedDB (SSR/tests, ou navigateur sans support), retombe sur un simple
 * chargement de toute la liste (comportement PER-241, cache mémoire de session).
 */
export async function reconcileBestiaryCache(): Promise<ReconcileResult> {
  if (!isIndexedDbAvailable()) {
    return { list: await fetchCreatureList(), droppedBlobSlugs: [] };
  }

  const manifest = await fetchSourceManifest(); // Toujours frais — lève hors-ligne.
  const cachedSources = await idbGetAll<CachedSource>(SOURCES_STORE);
  const plan = planSourceReconciliation(manifest, cachedSources);

  const droppedBlobSlugs: string[] = [];

  // 1. Purge des sources disparues du manifeste (+ leurs blobs).
  if (plan.toPurge.length > 0) {
    const purgedBlobSlugs = cachedSources
      .filter((s) => plan.toPurge.includes(s.id))
      .flatMap((s) => s.items.map((i) => i.id));
    await idbDeleteMany(SOURCES_STORE, plan.toPurge);
    await idbDeleteMany(BLOBS_STORE, purgedBlobSlugs);
    droppedBlobSlugs.push(...purgedBlobSlugs);
  }

  // 2. Re-fetch CIBLÉ des sources nouvelles / bumpées, puis invalidation fine des blobs.
  if (plan.toFetch.length > 0) {
    const freshItems = await fetchCreatureList({ sourceIds: plan.toFetch });
    const bySource = groupBySource(freshItems);
    const manifestById = new Map(manifest.map((m) => [m.id, m]));
    const freshCached: CachedSource[] = plan.toFetch.map((id) => {
      const entry = manifestById.get(id);
      return {
        id,
        slug: entry?.slug ?? id,
        contentVersion: entry?.contentVersion ?? 0,
        items: bySource.get(id) ?? [],
      };
    });
    await idbPutMany(SOURCES_STORE, freshCached);

    const cachedBlobs = await idbGetAll<CachedBlob>(BLOBS_STORE);
    const staleBlobSlugs = planBlobInvalidation(freshItems, plan.toFetch, cachedBlobs);
    if (staleBlobSlugs.length > 0) {
      await idbDeleteMany(BLOBS_STORE, staleBlobSlugs);
      droppedBlobSlugs.push(...staleBlobSlugs);
    }
  }

  // 3. Liste à jour = union de toutes les sources désormais en cache.
  const finalSources = await idbGetAll<CachedSource>(SOURCES_STORE);
  return { list: flattenSources(finalSources), droppedBlobSlugs };
}

/**
 * Lit un blob depuis le cache disque (`undefined` si absent / IndexedDB indispo).
 * Utilisé AVANT tout appel réseau : offline, une créature déjà consultée s'affiche
 * depuis le disque. Les blobs périmés ont déjà été supprimés par la réconciliation.
 */
export async function readCachedBlob(slug: string): Promise<Creature | undefined> {
  if (!isIndexedDbAvailable()) return undefined;
  try {
    const cached = await idbGet<CachedBlob>(BLOBS_STORE, slug);
    return cached?.data;
  } catch {
    return undefined;
  }
}

/** Persiste un blob fraîchement chargé, estampillé pour l'invalidation fine. */
export async function writeCachedBlob(blob: CachedBlob): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    await idbPut(BLOBS_STORE, blob);
  } catch {
    // Échec d'écriture disque non bloquant : le blob reste servi depuis la mémoire.
  }
}
