/**
 * Cache PERSISTANT (IndexedDB) des lots de contenu payant (PER-321), au-dessus du
 * wrapper `idb.ts` (store `content`, PER-244 étendu). Un lot déjà téléchargé survit
 * au refresh : au boot suivant, le contenu payant est fusionné INSTANTANÉMENT depuis
 * le disque, sans attendre le réseau, puis réconcilié en tâche de fond par version.
 *
 * Sans IndexedDB (SSR, tests node), toutes les fonctions dégradent proprement
 * (lecture vide, écriture ignorée) : le chargeur retombe sur le réseau à chaque boot.
 */
import {
  CONTENT_STORE,
  idbDeleteMany,
  idbGet,
  idbGetAll,
  idbPut,
  isIndexedDbAvailable,
} from '@/lib/bestiary/idb';
import type { ContentBundle } from './bundle';

/** Lot de contenu payant mis en cache, estampillé par version pour l'invalidation. */
export interface CachedContentBundle {
  /** slug de la source (`sources.slug`) — clé de l'object store `content`. */
  slug: string;
  /** `content_version` de la source au moment de la mise en cache. */
  contentVersion: number;
  /** Le lot normalisé, prêt à fusionner dans les registres. */
  bundle: ContentBundle;
}

/** Tous les lots en cache disque (`[]` si aucun / IndexedDB indisponible). */
export async function readAllCachedBundles(): Promise<CachedContentBundle[]> {
  if (!isIndexedDbAvailable()) return [];
  try {
    return await idbGetAll<CachedContentBundle>(CONTENT_STORE);
  } catch {
    return [];
  }
}

/** Un lot en cache par slug (`undefined` si absent / IndexedDB indisponible). */
export async function readCachedBundle(slug: string): Promise<CachedContentBundle | undefined> {
  if (!isIndexedDbAvailable()) return undefined;
  try {
    return await idbGet<CachedContentBundle>(CONTENT_STORE, slug);
  } catch {
    return undefined;
  }
}

/** Persiste (ou remplace) un lot fraîchement téléchargé. Échec disque non bloquant. */
export async function writeCachedBundle(entry: CachedContentBundle): Promise<void> {
  if (!isIndexedDbAvailable()) return;
  try {
    await idbPut(CONTENT_STORE, entry);
  } catch {
    // Le lot reste fusionné en mémoire ; il sera simplement re-téléchargé au prochain boot.
  }
}

/** Retire du cache disque les lots dont l'entitlement a été perdu. Best-effort. */
export async function purgeCachedBundles(slugs: string[]): Promise<void> {
  if (!isIndexedDbAvailable() || slugs.length === 0) return;
  try {
    await idbDeleteMany(CONTENT_STORE, slugs);
  } catch {
    /* purge best-effort : réessayée au prochain boot */
  }
}
