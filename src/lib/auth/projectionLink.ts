import 'server-only';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Résultat de l'échange d'un secret de lien de PROJECTION (PER-271).
 * - `ok` : secret valide → session d'observateur scopée campagne ouverte (cookies
 *          posés), en LECTURE SEULE ;
 * - `invalid` : secret inconnu, mal formé ou révoqué (message générique, aucune fuite).
 *
 * Une erreur d'infrastructure (Supabase indisponible, sign-in anonyme refusé…) n'est
 * pas un statut : la fonction **lève**, l'appelant (route handler) la mappe vers un
 * message d'erreur générique.
 */
export type ProjectionRedemption = { status: 'ok' } | { status: 'invalid' };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Échange « secret de lien de projection → session d'observateur scopée » (PER-271).
 *
 * Cousin exact du lien magique joueur (`redeemJoinSecret`, PER-191) MAIS amputé du
 * `player_id` : l'observateur reçoit un utilisateur **anonyme** Supabase dont le seul
 * claim scopé est `campaign_id` (posé par la clé secrète → non falsifiable), plus un
 * marqueur `projection: true`. Conséquences :
 *   - il satisfait `is_campaign_member(cid)` → rejoint le canal Realtime privé et lit
 *     `game_sessions` / `campaign_combat` / le roster (LECTURE seule) ;
 *   - il ne satisfait PAS `is_campaign_actor(cid)` (pas de `player_id`, pas owner) →
 *     ses écritures sur le canal sont refusées par la RLS (0016) ;
 *   - il n'a aucun droit d'écriture de fiche (les policies joueur exigent
 *     `current_player_id()`) ;
 *   - le marqueur `projection` sert au confinement du gating (`updateSession`) : cette
 *     session ne peut visiter que `/project`.
 *
 * Étapes (miroir de `redeemJoinSecret`) :
 *   1. Valider le secret via le client **admin** (contourne la RLS owner pour lire
 *      `projection_links`). Secret mal formé/inconnu → `invalid`.
 *   2. `signInAnonymously()` via le client **SSR** (pose les cookies de session).
 *   3. `admin.updateUserById` pose `app_metadata` = { campaign_id, projection: true }.
 *   4. `refreshSession()` réémet le jeton AVEC les claims (le jeton de l'étape 2 était
 *      minté avant le stamp) et réécrit les cookies.
 *   5. Enregistrer la liaison anon↔campagne (`projection_auth_sessions`) pour la
 *      révocation forte (régénération/révocation du lien → suppression de ces users).
 *
 * **À appeler depuis un Route Handler** (l'écriture des cookies de session est
 * interdite dans un Server Component).
 */
/**
 * Résout la campagne d'un secret de lien de projection SANS ouvrir de session — lecture
 * seule via le client admin (contourne la RLS owner). Sert au redeem NON destructif
 * (PER-271) : un visiteur DÉJÀ authentifié (MJ ou joueur) ne doit pas voir sa session
 * écrasée par un `signInAnonymously`. On l'aiguille alors vers sa propre vue à partir de
 * cette campagne, plutôt que de le convertir en observateur anonyme. Renvoie `null` si le
 * secret est mal formé ou inconnu.
 */
export async function resolveProjectionCampaign(secret: string): Promise<string | null> {
  if (!UUID_RE.test(secret)) return null;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin
    .from('projection_links')
    .select('campaign_id')
    .eq('secret', secret)
    .maybeSingle();
  if (error) throw error;
  return data?.campaign_id ?? null;
}

export async function redeemProjectionSecret(secret: string): Promise<ProjectionRedemption> {
  // 1. Secret mal formé → invalide, sans même toucher la base.
  if (!UUID_RE.test(secret)) {
    return { status: 'invalid' };
  }

  const admin = createAdminSupabaseClient();
  const { data: link, error: lookupError } = await admin
    .from('projection_links')
    .select('campaign_id')
    .eq('secret', secret)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!link) {
    return { status: 'invalid' };
  }

  // 2. Ouvre une session anonyme fraîche (cookies posés par le client SSR).
  const supabase = await createServerSupabaseClient();
  const { data: anon, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) throw signInError;
  if (!anon.user) throw new Error('Échec de la création de la session anonyme.');

  // 3. Attache le claim scopé campagne + le marqueur projection (admin : `app_metadata`
  //    non modifiable par le client). PAS de `player_id` → observateur lecture seule.
  const { error: metaError } = await admin.auth.admin.updateUserById(anon.user.id, {
    app_metadata: { campaign_id: link.campaign_id, projection: true },
  });
  if (metaError) throw metaError;

  // 4. Réémet le jeton pour y intégrer les claims fraîchement posés.
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;

  // 5. Trace la liaison pour la révocation forte (régénération/révocation du lien).
  const { error: mapError } = await admin
    .from('projection_auth_sessions')
    .insert({ auth_user_id: anon.user.id, campaign_id: link.campaign_id });
  if (mapError) throw mapError;

  return { status: 'ok' };
}
