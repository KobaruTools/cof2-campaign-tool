import 'server-only';

import { createClient } from '@supabase/supabase-js';

import type { Database } from './types';

/**
 * Fabrique du client Supabase **admin** (server-only, PER-191). Utilise la clé
 * **secrète** (`sb_secret_…`, `SUPABASE_SECRET_KEY`) qui **contourne la RLS** :
 * réservée aux opérations privilégiées côté serveur, jamais exposée au navigateur
 * (garde `server-only` en tête de module).
 *
 * Unique usage à ce jour : l'**échange du lien magique joueur** (route serveur).
 * Il faut la clé secrète pour (a) lire `players.join_secret` malgré la RLS
 * propriétaire, (b) créer/gérer l'utilisateur anonyme et poser son `app_metadata`
 * scopé (`admin.updateUserById`), (c) supprimer les utilisateurs anonymes d'un
 * joueur à la révocation.
 *
 * Ce client n'utilise **pas** de cookies ni de session persistée (il agit pour le
 * compte du serveur, pas d'un utilisateur) — l'ouverture de la session joueur dans
 * le navigateur passe par le client SSR, séparément.
 */
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      'Supabase admin non configuré : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY requis.',
    );
  }

  return createClient<Database>(url, secretKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
