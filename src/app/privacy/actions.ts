'use server';

/**
 * Server Action d'**export des données personnelles** (droit d'accès + portabilité,
 * RGPD art. 15 & 20), déclenchée par le bouton « Télécharger toutes mes données »
 * de la page `/privacy`.
 *
 * Rassemble, pour l'utilisateur **connecté**, tout ce que le service détient sur
 * lui : ses métadonnées de compte (`auth.users` via `getUser()`) et le contenu
 * cloud qu'il possède (campagnes, joueurs, personnages).
 *
 * On utilise le client **SSR** (session cookie de l'appelant, revalidée par
 * `getUser()`), PAS le client admin : la RLS propriétaire (migration 0001) garantit
 * intrinsèquement que chaque requête ne renvoie que les données de l'appelant. Pas
 * de clé secrète, pas de risque de fuite entre comptes.
 *
 * Les données **locales** (localStorage : brouillon, cache, préférences) ne sont pas
 * incluses ici : elles vivent dans le navigateur et l'utilisateur y a déjà un accès
 * direct (export JSON par personnage sur l'accueil).
 */
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Tables } from '@/lib/supabase/types';
import { EXPORT_ERRORS, type DataExport } from './exportTypes';

export async function exportMyData(): Promise<DataExport> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error(EXPORT_ERRORS.NOT_AUTHENTICATED);
  }
  // Une session JOUEUR (utilisateur anonyme scopé, PER-191) n'a pas de compte
  // propriétaire ni de contenu à exporter ici.
  if ((user.app_metadata as { player_id?: string } | undefined)?.player_id) {
    throw new Error(EXPORT_ERRORS.PLAYER_SESSION);
  }

  // Campagnes + personnages possédés (RLS `owner_id`). En parallèle.
  const [campaignsRes, charactersRes] = await Promise.all([
    supabase.from('campaigns').select('*').eq('owner_id', user.id),
    supabase.from('characters').select('*').eq('owner_id', user.id),
  ]);
  if (campaignsRes.error) throw new Error(campaignsRes.error.message);
  if (charactersRes.error) throw new Error(charactersRes.error.message);

  const campaigns = campaignsRes.data ?? [];
  const characters = charactersRes.data ?? [];

  // Joueurs, accessibles via les campagnes possédées (RLS `players_via_owned_campaign`).
  const campaignIds = campaigns.map((c) => c.id);
  let players: Tables<'players'>[] = [];
  if (campaignIds.length > 0) {
    const playersRes = await supabase.from('players').select('*').in('campaign_id', campaignIds);
    if (playersRes.error) throw new Error(playersRes.error.message);
    players = playersRes.data ?? [];
  }

  const meta = user.user_metadata as { display_name?: unknown } | undefined;

  return {
    exportedAt: new Date().toISOString(),
    account: {
      id: user.id,
      email: user.email ?? null,
      displayName: typeof meta?.display_name === 'string' ? meta.display_name : null,
      identities: (user.identities ?? []).map((identity) => {
        const email = (identity.identity_data as { email?: unknown } | undefined)?.email;
        return {
          provider: identity.provider,
          email: typeof email === 'string' ? email : null,
          createdAt: identity.created_at ?? null,
          lastSignInAt: identity.last_sign_in_at ?? null,
        };
      }),
      createdAt: user.created_at ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
    },
    campaigns,
    players,
    characters,
  };
}
