import 'server-only';

import { roleOfUser, type SessionRole } from '@/lib/auth/sessionRole';
import { createServerSupabaseClient } from './server';

/**
 * Rôle de la session courante résolu **côté serveur**, pour les pages qui doivent
 * rendre leurs appels à l'action sans clignotement (la vitrine `/`, seule page où
 * un visiteur sans session atterrit vraiment).
 *
 * Ailleurs, on préfère le hook client `useAppSession` (lecture locale, sans réseau).
 * Ici on lit `getUser()` : la page n'est pas prérendable de toute façon (elle dépend
 * des cookies), et un utilisateur validé évite d'afficher « Mes personnages » à qui
 * ne pourrait pas y entrer.
 *
 * Sans Supabase provisionné (mode 100 % local, aucun gating), on répond `owner` :
 * l'app locale doit offrir toute sa navigation.
 */
export async function resolveServerSessionRole(): Promise<SessionRole> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    return 'owner';
  }
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return roleOfUser(user);
}
