import 'server-only';

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from './types';

/**
 * Fabrique du client Supabase **serveur** (Server Components, Route Handlers,
 * Server Actions). PER-187.
 *
 * Next 16 : `cookies()` est **asynchrone** (`await cookies()`) — cette fabrique
 * est donc `async`. La session vit dans les cookies, lus/écrits via l'API
 * `getAll`/`setAll` de `@supabase/ssr` (0.12).
 *
 * `setAll` peut échouer quand on est rendu depuis un Server Component (les cookies
 * y sont en lecture seule) : on l'ignore alors, le rafraîchissement de session
 * étant assuré par le `proxy.ts` (branché en PER-188/189). N'utilise que la clé
 * **publishable** publique (`sb_publishable_…`) — la clé **secrète** (`sb_secret_…`,
 * bypass RLS) sera une fabrique dédiée server-only le jour où on en aura besoin
 * (échange de lien magique, PER-191).
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Appelé depuis un Server Component (cookies en lecture seule) :
            // sans effet ici, le proxy rafraîchira la session à la requête suivante.
          }
        },
      },
    },
  );
}
