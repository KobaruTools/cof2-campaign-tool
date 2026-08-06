import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import { decideRouteAccess } from '@/lib/auth/routeAccess';
import { roleOfUser } from '@/lib/auth/sessionRole';
import type { Database } from './types';

/**
 * Rafraîchit la session Supabase à chaque requête (PER-188) **et** gate les
 * routes (PER-189), appelé depuis `src/proxy.ts` (ex-middleware, renommé
 * « proxy » en Next 16). Réécrit les cookies de session sur la réponse pour que
 * Server Components et Route Handlers lisent une session à jour.
 *
 * **Garde-fou** : tant que Supabase n'est pas provisionné (variables d'env
 * absentes), on ne fait RIEN — l'application locale (100 % localStorage)
 * continue de fonctionner sans dépendre du cloud, et sans gating (sinon toute
 * l'app deviendrait inaccessible faute de moyen de se connecter).
 *
 * Le **périmètre** de chaque rôle ne vit pas ici : il est décrit et testé dans
 * `@/lib/auth/routeAccess` (module pur). Cette fonction se borne à résoudre la
 * session, en dériver le rôle (`roleOfUser`) et appliquer la décision.
 */
export async function updateSession(request: NextRequest): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, publishableKey, {
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const decision = decideRouteAccess(pathname, roleOfUser(user));
  if (decision.allow) {
    return response;
  }

  // Redirection en reportant les cookies de session éventuellement rafraîchis
  // (sinon la session « clignote » à la requête suivante).
  const target = pathname + request.nextUrl.search;
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = decision.redirectTo;
  // Retour post-connexion vers la page visée (chemin interne, pas d'open redirect).
  redirectUrl.search =
    decision.withNext && target !== '/' ? `?next=${encodeURIComponent(target)}` : '';

  const redirectResponse = NextResponse.redirect(redirectUrl);
  for (const cookie of response.cookies.getAll()) {
    redirectResponse.cookies.set(cookie);
  }
  return redirectResponse;
}
