/**
 * Accès « Lien de projection » côté cloud (PER-271) — opérations NON privilégiées via
 * le client Supabase **navigateur**, scopées par la RLS propriétaire (`projection_links`
 * accessible au MJ de la campagne parente, migration 0016).
 *
 * Les opérations **privilégiées** (régénérer / révoquer le lien — qui exigent la
 * révocation des sessions anonymes via la clé secrète) vivent dans `actions.ts`
 * (Server Actions). Ce module ne fait que lire et créer.
 *
 * Toutes les fonctions **lèvent** en cas d'erreur Supabase (l'UI mappe vers un toast).
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import type { ProjectionLink } from './types';

type ProjectionLinkRow = Database['public']['Tables']['projection_links']['Row'];

/** Mappe une ligne SQL `projection_links` vers l'entité `ProjectionLink`. */
function rowToProjectionLink(row: ProjectionLinkRow): ProjectionLink {
  return {
    campaignId: row.campaign_id,
    secret: row.secret,
    createdAt: row.created_at,
  };
}

/** Lien de projection de la campagne (RLS propriétaire), ou `null` s'il n'existe pas encore. */
export async function fetchProjectionLink(campaignId: string): Promise<ProjectionLink | null> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('projection_links')
    .select('*')
    .eq('campaign_id', campaignId)
    .maybeSingle();
  if (error) throw error;
  return data ? rowToProjectionLink(data) : null;
}

/**
 * Crée le lien de projection de la campagne. Le `secret` naît par défaut en base
 * (`gen_random_uuid()`). Un seul lien par campagne (PK = `campaign_id`) : un second
 * appel lèverait sur conflit de clé — l'UI n'expose « Générer » que si aucun lien
 * n'existe. La RLS `projection_links` autorise l'insert au MJ propriétaire.
 */
export async function createProjectionLink(campaignId: string): Promise<ProjectionLink> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('projection_links')
    .insert({ campaign_id: campaignId })
    .select('*')
    .single();
  if (error) throw error;
  return rowToProjectionLink(data);
}
