'use server';

/**
 * Bascule de campagne active pour une Identité joueur multi-campagnes (PER-500,
 * suite de PER-498/PER-499).
 *
 * Depuis la migration 0043, les claims JWT (`app_metadata.player_id`/`campaign_id`)
 * ne sont plus la frontière d'autorisation (la RLS lit `player_auth_sessions`) —
 * juste l'indicateur de la campagne actuellement affichée par `/play` (voir
 * CONTEXT.md, entrée « Identité joueur »). Ce module lit/écrit cet indicateur.
 */
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export interface MemberCampaign {
  playerId: string;
  campaignId: string;
  campaignName: string;
}

/** Ligne brute renvoyée par le select imbriqué PostgREST (admin, ci-dessous). */
interface MembershipRow {
  player_id: string;
  players: { campaign_id: string; campaigns: { name: string } | null } | null;
}

/**
 * Liste les campagnes (et le `player_id` associé dans chacune) dont l'Identité
 * courante est membre, via `player_auth_sessions` (source d'autorité, ADR 0003 —
 * table verrouillée au client admin, illisible en RLS). Vide si non authentifié.
 */
export async function listMemberCampaigns(): Promise<MemberCampaign[]> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('player_auth_sessions')
    .select('player_id, players(campaign_id, campaigns(name))')
    .eq('auth_user_id', user.id)
    .returns<MembershipRow[]>();
  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.players?.campaigns)
    .map((row) => ({
      playerId: row.player_id,
      campaignId: row.players!.campaign_id,
      campaignName: row.players!.campaigns!.name,
    }));
}

/**
 * Change la campagne active de l'Identité courante vers `targetPlayerId` : pose
 * les claims (`app_metadata`) sur ce Joueur/sa campagne et réémet le jeton.
 * Vérifie l'appartenance via `player_auth_sessions` avant d'écrire — un joueur ne
 * peut basculer que vers une campagne dont il est déjà membre (recliqué un lien
 * magique reste le seul moyen d'en rejoindre une nouvelle).
 */
export async function switchActiveCampaign(targetPlayerId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Aucune session joueur active.');

  const admin = createAdminSupabaseClient();

  const { data: membership, error: membershipError } = await admin
    .from('player_auth_sessions')
    .select('player_id')
    .eq('auth_user_id', user.id)
    .eq('player_id', targetPlayerId)
    .maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) throw new Error('Tu n’es pas membre de cette campagne.');

  const { data: player, error: playerError } = await admin
    .from('players')
    .select('campaign_id')
    .eq('id', targetPlayerId)
    .single();
  if (playerError) throw playerError;

  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    app_metadata: { player_id: targetPlayerId, campaign_id: player.campaign_id },
  });
  if (metaError) throw metaError;

  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;
}
