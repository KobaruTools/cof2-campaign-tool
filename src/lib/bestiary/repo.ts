/**
 * Accès en LECTURE au bestiaire cloud (PER-241) via le client Supabase navigateur.
 * La RLS (migration 0006) ne laisse remonter que le contenu des sources GRATUITES
 * (`is_paid = false`) — aucun filtre de source n'est donc requis côté client pour
 * le contenu public. Ce module est le seul point de contact entre l'UI et les
 * tables `public.creatures` / `public.sources`.
 *
 * Lecture en DEUX ÉTAGES :
 *   - `fetchCreatureList()`  → liste LÉGÈRE (colonnes projetées, PAS le blob).
 *   - `fetchCreatureBlob()`  → blob complet (`Creature`) d'une seule créature.
 *
 * Toutes les fonctions LÈVENT en cas d'erreur Supabase (le store capte et expose
 * un état d'erreur). Les mappings ligne → entité sont des fonctions pures.
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import type { Creature } from '@/data/schema';
import type { CreatureListItem, SourceManifestEntry } from './types';

type CreatureRow = Database['public']['Tables']['creatures']['Row'];

/**
 * Colonnes projetées de la liste légère (le blob `data` est exclu). Inclut
 * `source_id` et `updated_at` : le cache persistant (PER-244) regroupe la liste par
 * source et estampille chaque créature par son `updated_at` (invalidation fine).
 */
const LIST_COLUMNS =
  'slug, name, category, nc, nc_note, size, nature, base_creature_id, sort_order, source_id, updated_at';

/** Mappe une ligne projetée `creatures` vers une entrée de liste légère. */
export function rowToListItem(
  row: Pick<
    CreatureRow,
    | 'slug'
    | 'name'
    | 'category'
    | 'nc'
    | 'nc_note'
    | 'size'
    | 'nature'
    | 'base_creature_id'
    | 'sort_order'
    | 'source_id'
    | 'updated_at'
  >,
): CreatureListItem {
  return {
    id: row.slug,
    name: row.name,
    category: row.category as CreatureListItem['category'],
    // `nc` est une colonne `numeric` : coercition défensive (PostgREST peut la
    // sérialiser en chaîne pour préserver la précision).
    nc: row.nc == null ? undefined : Number(row.nc),
    ncNote: row.nc_note ?? undefined,
    size: (row.size as CreatureListItem['size']) ?? undefined,
    nature: (row.nature ?? []) as CreatureListItem['nature'],
    baseCreatureId: row.base_creature_id ?? undefined,
    sortOrder: row.sort_order,
    sourceId: row.source_id,
    updatedAt: row.updated_at,
  };
}

/**
 * Liste légère des créatures LISIBLES (RLS = contenu gratuit + sources entitlées),
 * triée par ordre d'impression du livre (`sort_order`) — le tri par catégorie et
 * l'imbrication base→variantes en dépendent.
 *
 * `sourceIds` (optionnel) restreint la requête à ces sources : c'est le **re-fetch
 * ciblé** du cache (PER-244), qui ne recharge que les sources dont la version a
 * changé plutôt que tout le bestiaire.
 */
export async function fetchCreatureList(opts?: {
  sourceIds?: string[];
}): Promise<CreatureListItem[]> {
  const supabase = createBrowserSupabaseClient();
  let query = supabase.from('creatures').select(LIST_COLUMNS);
  if (opts?.sourceIds) {
    // Aucune source à recharger : évite un `in.()` vide (requête inutile / invalide).
    if (opts.sourceIds.length === 0) return [];
    query = query.in('source_id', opts.sourceIds);
  }
  const { data, error } = await query.order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToListItem);
}

/**
 * Manifeste des sources ACCESSIBLES au rôle courant : `id → content_version`
 * (PER-244). Seul appel toujours frais, jamais mis en cache. La RLS filtre à
 * l'identique de `creatures` (gratuit + entitlé), donc une source qui disparaît
 * du manifeste doit être purgée du cache local.
 */
export async function fetchSourceManifest(): Promise<SourceManifestEntry[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('sources')
    .select('id, slug, content_version');
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    contentVersion: row.content_version,
  }));
}

/**
 * Blob complet d'une créature par son slug (`Creature.id`). `null` si aucune ligne
 * lisible ne correspond (créature inexistante ou gatée par la RLS). Le blob est
 * rendu tel quel par `BestiaryStatBlock`.
 */
export async function fetchCreatureBlob(slug: string): Promise<Creature | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('creatures')
    .select('data')
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw error;
  return (data?.data as Creature | undefined) ?? null;
}
