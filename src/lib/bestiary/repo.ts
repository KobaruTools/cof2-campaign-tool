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
import type { CreatureListItem } from './types';

type CreatureRow = Database['public']['Tables']['creatures']['Row'];

/** Colonnes projetées de la liste légère (le blob `data` est exclu). */
const LIST_COLUMNS =
  'slug, name, category, nc, nc_note, size, nature, base_creature_id, sort_order';

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
  };
}

/**
 * Liste légère de toutes les créatures LISIBLES (RLS = contenu gratuit), triée par
 * ordre d'impression du livre (`sort_order`) — le tri par catégorie et
 * l'imbrication base→variantes en dépendent.
 */
export async function fetchCreatureList(): Promise<CreatureListItem[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('creatures')
    .select(LIST_COLUMNS)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToListItem);
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
