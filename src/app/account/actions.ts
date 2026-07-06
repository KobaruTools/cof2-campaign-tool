'use server';

/**
 * Server Action de **suppression de compte** (PER-194). Dernière pièce de la
 * milestone « Fondations ». Supprimer l'utilisateur `auth.users` déclenche la
 * **cascade** posée en 0001/0002 (`owner_id … on delete cascade`) : campagnes
 * possédées → joueurs + `player_auth_sessions` + personnages du propriétaire.
 * Aucune cascade applicative à écrire ici — la base s'en charge.
 *
 * La suppression d'un `auth.users` exige la **clé secrète** (admin), donc vit
 * côté serveur. On identifie l'utilisateur courant via le client **SSR** (session
 * cookie revalidée par `getUser()`), puis on supprime via le client **admin**.
 *
 * Le nettoyage du **cache localStorage** (persos/brouillon) et la redirection vers
 * `/login` sont faits côté client après le retour de cette action (cf. la page
 * `/account`) : la session cloud n'est plus la vérité une fois le compte parti.
 */
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function deleteAccount(): Promise<void> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Aucune session : impossible de supprimer le compte.');
  }
  // Garde-fou : une session JOUEUR (utilisateur anonyme scopé, PER-191) n'a pas de
  // compte propriétaire à supprimer ici — sa révocation passe par le MJ.
  if ((user.app_metadata as { player_id?: string } | undefined)?.player_id) {
    throw new Error('Une session joueur ne peut pas supprimer de compte.');
  }

  const admin = createAdminSupabaseClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    throw new Error(error.message);
  }

  // La session est désormais orpheline : on efface les cookies. Peut échouer sans
  // conséquence (l'utilisateur n'existe plus) — on ignore alors l'erreur.
  try {
    await supabase.auth.signOut();
  } catch {
    // Session déjà invalide côté serveur : sans effet.
  }
}
