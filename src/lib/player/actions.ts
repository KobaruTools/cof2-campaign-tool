'use server';

/**
 * Server Actions « Joueur » privilégiées (PER-191) : régénérer le lien magique et
 * supprimer un joueur. Elles exigent la **clé secrète** (révocation des sessions
 * anonymes = suppression d'utilisateurs `auth.users`), donc ne peuvent pas vivre
 * dans le repo navigateur.
 *
 * **Autorisation** : on vérifie la propriété via le client **SSR** (RLS). Si la
 * politique `players_via_owned_campaign` laisse le MJ courant lire le joueur,
 * c'est qu'il possède la campagne parente — condition suffisante. Seule la
 * mutation privilégiée passe ensuite par le client **admin**.
 *
 * **Révocation forte** (design verrouillé au grilling) : régénérer/supprimer
 * coupe les sessions vivantes en supprimant les utilisateurs anonymes du joueur
 * (invalide leurs refresh tokens). La table de liaison `player_auth_sessions`
 * (RLS verrouillée, accès admin seul) trace ces utilisateurs.
 */
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** Vérifie que le MJ courant possède la campagne du joueur (via RLS). Lève sinon. */
async function assertOwnsPlayer(playerId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('players')
    .select('id')
    .eq('id', playerId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Joueur introuvable ou accès refusé.');
}

/**
 * Supprime les utilisateurs anonymes rattachés au joueur (révocation des sessions
 * vivantes). La suppression d'un `auth.users` purge sa ligne `player_auth_sessions`
 * par cascade. À appeler AVANT de supprimer le joueur (sinon la liaison est perdue).
 */
async function revokePlayerSessions(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  playerId: string,
): Promise<void> {
  const { data: sessions, error } = await admin
    .from('player_auth_sessions')
    .select('auth_user_id')
    .eq('player_id', playerId);
  if (error) throw error;
  for (const session of sessions ?? []) {
    const { error: delError } = await admin.auth.admin.deleteUser(session.auth_user_id);
    if (delError) throw delError;
  }
}

/**
 * Régénère le lien magique du joueur : nouveau `join_secret` (l'ancien lien meurt)
 * + coupure des sessions vivantes. Renvoie le nouveau secret.
 */
export async function regeneratePlayerLink(playerId: string): Promise<{ joinSecret: string }> {
  await assertOwnsPlayer(playerId);
  const admin = createAdminSupabaseClient();
  await revokePlayerSessions(admin, playerId);

  const joinSecret = crypto.randomUUID();
  // Reset de la présence (PER-195) : le nouveau lien n'a pas encore été activé, et
  // les sessions vivantes viennent d'être coupées → « jamais connecté » jusqu'au
  // prochain redeem.
  const { error } = await admin
    .from('players')
    .update({ join_secret: joinSecret, first_joined_at: null, last_seen_at: null })
    .eq('id', playerId);
  if (error) throw error;
  return { joinSecret };
}

/**
 * Supprime un joueur : révoque d'abord ses sessions vivantes, puis supprime la
 * ligne. La base détache alors ses personnages (`characters.player_id` → `null`,
 * `ON DELETE SET NULL`) — les fiches ne sont jamais détruites.
 */
export async function deletePlayer(playerId: string): Promise<void> {
  await assertOwnsPlayer(playerId);
  const admin = createAdminSupabaseClient();
  await revokePlayerSessions(admin, playerId);

  const { error } = await admin.from('players').delete().eq('id', playerId);
  if (error) throw error;
}
