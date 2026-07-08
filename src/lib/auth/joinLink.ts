import 'server-only';

import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Résultat de l'échange d'un secret de lien magique joueur (PER-189/PER-191).
 * - `ok` : secret valide → session joueur scopée ouverte (cookies posés) ;
 * - `invalid` : secret inconnu, mal formé ou révoqué (message générique, aucune fuite).
 *
 * Une erreur d'infrastructure (Supabase indisponible, sign-in anonyme refusé…)
 * n'est pas un statut : la fonction **lève**, l'appelant (route handler) la mappe
 * vers un message d'erreur générique.
 */
export type JoinRedemption = { status: 'ok' } | { status: 'invalid' };

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Échange « secret de lien magique → session joueur scopée » (PER-191).
 *
 * Mécanique (design verrouillé au grilling 2026-07-05) : le joueur n'a pas de
 * compte, sa session est un **utilisateur anonyme** Supabase auquel on attache
 * `player_id` + `campaign_id` dans `app_metadata` (posé par la clé secrète → non
 * falsifiable). `getUser()` valide alors un vrai utilisateur (le gating PER-189
 * reste inchangé) et la RLS joueur (migration 0002) scope l'accès via ces claims.
 *
 * Étapes :
 *   1. Valider le `join_secret` via le client **admin** (contourne la RLS
 *      propriétaire pour lire `players`). Secret mal formé/inconnu → `invalid`.
 *   2. `signInAnonymously()` via le client **SSR** (pose les cookies de session).
 *   3. `admin.updateUserById` pose `app_metadata` = { player_id, campaign_id }.
 *   4. `refreshSession()` réémet le jeton AVEC les claims (le jeton de l'étape 2
 *      était minté avant le stamp) et réécrit les cookies.
 *   5. Enregistrer la liaison anon↔joueur (`player_auth_sessions`) pour la
 *      révocation forte (régénération du lien → suppression de ces utilisateurs).
 *
 * **À appeler depuis un Route Handler** (l'écriture des cookies de session est
 * interdite dans un Server Component).
 */
export async function redeemJoinSecret(secret: string): Promise<JoinRedemption> {
  // 1. Secret mal formé → invalide, sans même toucher la base.
  if (!UUID_RE.test(secret)) {
    return { status: 'invalid' };
  }

  const admin = createAdminSupabaseClient();
  const { data: player, error: lookupError } = await admin
    .from('players')
    .select('id, campaign_id, first_joined_at')
    .eq('join_secret', secret)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!player) {
    return { status: 'invalid' };
  }

  // 2. Ouvre une session anonyme fraîche (cookies posés par le client SSR).
  const supabase = await createServerSupabaseClient();
  const { data: anon, error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) throw signInError;
  if (!anon.user) throw new Error('Échec de la création de la session anonyme.');

  // 3. Attache les claims scopés (admin : app_metadata non modifiable par le joueur).
  const { error: metaError } = await admin.auth.admin.updateUserById(anon.user.id, {
    app_metadata: { player_id: player.id, campaign_id: player.campaign_id },
  });
  if (metaError) throw metaError;

  // 4. Réémet le jeton pour y intégrer les claims fraîchement posés.
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;

  // 5. Trace la liaison pour la révocation forte (régénération du lien).
  const { error: mapError } = await admin
    .from('player_auth_sessions')
    .insert({ auth_user_id: anon.user.id, player_id: player.id });
  if (mapError) throw mapError;

  // 6. Présence (PER-195) : marque la première activation du lien + l'activité.
  //     Best-effort — un échec ici ne doit jamais casser l'entrée en campagne (le
  //     heartbeat de `/play` re-posera `last_seen_at`/`first_joined_at` par coalesce).
  const now = new Date().toISOString();
  await admin
    .from('players')
    .update({ last_seen_at: now, first_joined_at: player.first_joined_at ?? now })
    .eq('id', player.id);

  return { status: 'ok' };
}
