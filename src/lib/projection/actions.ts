'use server';

/**
 * Server Actions « Lien de projection » privilégiées (PER-271) : régénérer et révoquer
 * le lien. Elles exigent la **clé secrète** (révocation des sessions anonymes de
 * projection = suppression d'utilisateurs `auth.users`), donc ne peuvent pas vivre dans
 * le repo navigateur. Miroir de `src/lib/player/actions.ts`.
 *
 * **Autorisation** : on vérifie la propriété via le client **SSR** (RLS). Si la policy
 * `campaigns` laisse le MJ courant lire la campagne, c'est qu'il la possède — condition
 * suffisante. Seule la mutation privilégiée passe ensuite par le client **admin**.
 *
 * **Révocation forte** : régénérer/révoquer coupe les écrans de projection vivants en
 * supprimant les utilisateurs anonymes de la campagne (invalide leurs refresh tokens).
 * La table de liaison `projection_auth_sessions` (RLS verrouillée, accès admin seul) les
 * trace ; supprimer l'`auth.users` purge sa ligne par cascade.
 */
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** Vérifie que le MJ courant possède la campagne (via RLS). Lève sinon. */
async function assertOwnsCampaign(campaignId: string): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select('id')
    .eq('id', campaignId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Campagne introuvable ou accès refusé.');
}

/**
 * Supprime les utilisateurs anonymes de projection rattachés à la campagne (révocation
 * des écrans vivants). La suppression d'un `auth.users` purge sa ligne
 * `projection_auth_sessions` par cascade.
 */
async function revokeProjectionSessions(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  campaignId: string,
): Promise<void> {
  const { data: sessions, error } = await admin
    .from('projection_auth_sessions')
    .select('auth_user_id')
    .eq('campaign_id', campaignId);
  if (error) throw error;
  for (const session of sessions ?? []) {
    const { error: delError } = await admin.auth.admin.deleteUser(session.auth_user_id);
    if (delError) throw delError;
  }
}

/**
 * Régénère le lien de projection : nouveau `secret` (l'ancien lien meurt) + coupure des
 * écrans de projection vivants. Renvoie le nouveau secret.
 */
export async function regenerateProjectionLink(
  campaignId: string,
): Promise<{ secret: string }> {
  await assertOwnsCampaign(campaignId);
  const admin = createAdminSupabaseClient();
  await revokeProjectionSessions(admin, campaignId);

  const secret = crypto.randomUUID();
  const { error } = await admin
    .from('projection_links')
    .update({ secret })
    .eq('campaign_id', campaignId);
  if (error) throw error;
  return { secret };
}

/**
 * Révoque entièrement le lien de projection : coupe les écrans vivants puis supprime la
 * ligne (plus aucun lien tant que le MJ n'en génère pas un nouveau).
 */
export async function revokeProjectionLink(campaignId: string): Promise<void> {
  await assertOwnsCampaign(campaignId);
  const admin = createAdminSupabaseClient();
  await revokeProjectionSessions(admin, campaignId);

  const { error } = await admin
    .from('projection_links')
    .delete()
    .eq('campaign_id', campaignId);
  if (error) throw error;
}
