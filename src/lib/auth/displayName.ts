import type { User } from '@supabase/supabase-js';

/**
 * Nom d'affichage du propriétaire (PER-194). Stocké dans `user_metadata.display_name`
 * (Supabase Auth, pas de table dédiée — périmètre minimal validé au grilling).
 * Repli sur l'email, puis un libellé générique si l'un et l'autre manquent.
 *
 * Pur et testable : `AccountMenu` et la page `/account` en dépendent.
 */
export function displayNameOf(user: Pick<User, 'email' | 'user_metadata'>): string {
  const raw = (user.user_metadata as { display_name?: unknown } | undefined)?.display_name;
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw.trim();
  }
  return user.email ?? 'Compte';
}
