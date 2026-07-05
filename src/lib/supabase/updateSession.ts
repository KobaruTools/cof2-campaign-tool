import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Database } from './types';

/**
 * Rafraîchit la session Supabase à chaque requête (PER-188), appelé depuis
 * `src/proxy.ts` (ex-middleware, renommé « proxy » en Next 16). Réécrit les
 * cookies de session sur la réponse pour que Server Components et Route Handlers
 * lisent une session à jour.
 *
 * **Garde-fou** : tant que Supabase n'est pas provisionné (variables d'env
 * absentes), on ne fait RIEN — l'application locale (100 % localStorage)
 * continue de fonctionner sans dépendre du cloud.
 *
 * Cette fonction NE fait QUE rafraîchir la session ; la redirection des routes
 * non authentifiées (gating) est livrée en PER-189.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Déclenche le rafraîchissement du jeton si nécessaire. Ne rien intercaler
  // entre la création du client et cet appel (recommandation Supabase SSR).
  await supabase.auth.getUser();

  return response;
}
