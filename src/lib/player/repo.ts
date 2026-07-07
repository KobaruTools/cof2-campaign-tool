/**
 * Accès « Joueur » côté cloud (PER-191) — opérations NON privilégiées via le
 * client Supabase **navigateur**, scopées par la RLS propriétaire (`players`
 * accessibles au MJ de la campagne parente, migration 0001).
 *
 * Les opérations **privilégiées** (régénérer le lien, supprimer un joueur — qui
 * exigent la révocation des sessions anonymes via la clé secrète) vivent dans
 * `actions.ts` (Server Actions). Ce module ne fait que lister/créer/renommer.
 *
 * Toutes les fonctions **lèvent** en cas d'erreur Supabase (l'UI mappe vers un
 * toast d'erreur). Mapping ligne → `Player` isolé dans `rowToPlayer`.
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database } from '@/lib/supabase/types';
import type { Player } from './types';

type PlayerRow = Database['public']['Tables']['players']['Row'];

/** Mappe une ligne SQL `players` vers l'entité `Player`. */
export function rowToPlayer(row: PlayerRow): Player {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    joinSecret: row.join_secret,
    createdAt: row.created_at,
  };
}

/** Joueurs d'une campagne (RLS propriétaire), triés par nom. */
export async function fetchPlayers(campaignId: string): Promise<Player[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToPlayer);
}

/**
 * Crée un joueur dans la campagne. Le `join_secret` naît par défaut en base
 * (`gen_random_uuid()`) ; on peut cependant le **fournir** — c'est le cas de
 * l'assistant de création (PER-198), qui pré-génère les secrets côté client
 * (`crypto.randomUUID()`) pour afficher les liens sur le récapitulatif AVANT toute
 * écriture, puis les persiste tels quels au clic final. La RLS `players` ne porte
 * que sur la possession de la campagne, pas sur les colonnes — fixer le secret est
 * autorisé et son entropie (uuid v4) équivaut au défaut serveur.
 */
export async function insertPlayer(
  campaignId: string,
  name: string,
  joinSecret?: string,
): Promise<Player> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('players')
    .insert({ campaign_id: campaignId, name, ...(joinSecret ? { join_secret: joinSecret } : {}) })
    .select('*')
    .single();
  if (error) throw error;
  return rowToPlayer(data);
}

/** Renomme un joueur (RLS propriétaire). */
export async function renamePlayer(id: string, name: string): Promise<Player> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('players')
    .update({ name })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToPlayer(data);
}
