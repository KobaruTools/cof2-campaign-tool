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
 * Échange « secret de lien magique → session joueur scopée » (PER-191, étendu
 * PER-499).
 *
 * Mécanique (design verrouillé au grilling 2026-07-05, étendu au grilling
 * 2026-09-05 pour le multi-campagnes) : le joueur n'a pas de compte, sa session
 * est un **utilisateur anonyme** Supabase (ou un compte réel, si l'identité en a
 * un) auquel on attache `player_id` + `campaign_id` dans `app_metadata` (posé par
 * la clé secrète → non falsifiable). `getUser()` valide alors un vrai utilisateur
 * (le gating PER-189 reste inchangé) et la RLS joueur (migrations 0002/0043)
 * scope l'accès — la lecture roster via la table `player_auth_sessions`
 * (source d'autorité, ADR 0003), les autres écritures via ces claims JWT.
 *
 * PER-499 : une identité qui a DÉJÀ une session ouverte (anonyme ou compte réel)
 * ne s'en voit plus attribuer une nouvelle en clic sur un 2e lien magique — la
 * nouvelle campagne est ATTACHÉE à cette identité (nouvelle ligne
 * `player_auth_sessions`, clé composite depuis la migration 0043) au lieu de la
 * remplacer, ce qui préserve l'accès à la 1re campagne. Recliquer un lien déjà
 * joint par la même identité est idempotent (upsert sans doublon).
 *
 * Étapes :
 *   1. Valider le `join_secret` via le client **admin** (contourne la RLS
 *      propriétaire pour lire `players`). Secret mal formé/inconnu → `invalid`.
 *   2. Détecter une session déjà ouverte (`getUser()`) ; sinon `signInAnonymously()`
 *      via le client **SSR** (pose les cookies de session).
 *   3. Rattacher le Joueur à l'identité (`player_auth_sessions`, upsert idempotent).
 *   4. `admin.updateUserById` pose `app_metadata` = { player_id, campaign_id } :
 *      la campagne qu'on vient de (re)rejoindre devient la campagne ACTIVE
 *      affichée par `/play` — les autres memberships restent lisibles via la RLS
 *      table (migration 0043), indépendamment de ces claims.
 *   5. `refreshSession()` réémet le jeton AVEC les claims à jour et réécrit les
 *      cookies.
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

  const supabase = await createServerSupabaseClient();

  // 2. Une identité déjà ouverte (anonyme ou compte réel) est ÉTENDUE, jamais
  //    remplacée : sinon rejoindre une 2e campagne ferait perdre l'accès à la 1re.
  const {
    data: { user: existingUser },
  } = await supabase.auth.getUser();

  let authUserId: string;
  if (existingUser) {
    authUserId = existingUser.id;
  } else {
    const { data: anon, error: signInError } = await supabase.auth.signInAnonymously();
    if (signInError) throw signInError;
    if (!anon.user) throw new Error('Échec de la création de la session anonyme.');
    authUserId = anon.user.id;
  }

  // 3. Rattache le Joueur à l'identité (clé composite `auth_user_id`/`player_id`,
  //    migration 0043) — upsert plutôt qu'insert : recliquer un lien déjà joint par
  //    la même identité ne doit ni lever, ni créer de doublon (idempotence PER-499).
  const { error: mapError } = await admin.from('player_auth_sessions').upsert(
    { auth_user_id: authUserId, player_id: player.id },
    { onConflict: 'auth_user_id,player_id', ignoreDuplicates: true },
  );
  if (mapError) throw mapError;

  // 4. Attache les claims scopés (admin : app_metadata non modifiable par le joueur)
  //    — désigne la campagne qu'on vient de (re)rejoindre comme campagne active.
  const { error: metaError } = await admin.auth.admin.updateUserById(authUserId, {
    app_metadata: { player_id: player.id, campaign_id: player.campaign_id },
  });
  if (metaError) throw metaError;

  // 5. Réémet le jeton pour y intégrer les claims fraîchement posés.
  const { error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) throw refreshError;

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
