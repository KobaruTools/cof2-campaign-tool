import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

import type { Database } from './types';

/**
 * Préfixes de routes **publiques** : accessibles sans session propriétaire, donc
 * exclues du gating (PER-189). Tout le reste (`/`, `/create`, `/character/[id]`,
 * `/campaigns`, `/campaign/[cid]`) exige une session Supabase.
 * - `/login` : écran de connexion (PER-188) ;
 * - `/auth` : callback PKCE + déconnexion (`/auth/callback`, `/auth/signout`) ;
 * - `/join` : landing du lien magique joueur (PER-189, échange délégué à PER-191).
 */
const PUBLIC_PATH_PREFIXES = ['/login', '/auth', '/join'] as const;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Rafraîchit la session Supabase à chaque requête (PER-188) **et** gate les
 * routes propriétaire (PER-189), appelé depuis `src/proxy.ts` (ex-middleware,
 * renommé « proxy » en Next 16). Réécrit les cookies de session sur la réponse
 * pour que Server Components et Route Handlers lisent une session à jour.
 *
 * **Garde-fou** : tant que Supabase n'est pas provisionné (variables d'env
 * absentes), on ne fait RIEN — l'application locale (100 % localStorage)
 * continue de fonctionner sans dépendre du cloud, et sans gating (sinon toute
 * l'app deviendrait inaccessible faute de moyen de se connecter).
 *
 * Gating = contrôle **optimiste** (lecture de session côté cookie), conforme à
 * la doc Next 16 (`app/guides/authentication`) : un visiteur non authentifié qui
 * vise une route propriétaire est redirigé vers `/login` (avec `next` pour
 * revenir à la page visée après connexion). La sécurité porteuse reste la RLS
 * Supabase côté données.
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

  // Gating : visiteur non authentifié sur une route propriétaire → connexion.
  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    // Retour post-connexion vers la page visée (chemin interne, pas d'open redirect).
    const target = request.nextUrl.pathname + request.nextUrl.search;
    if (target !== '/') {
      loginUrl.searchParams.set('next', target);
    }
    const redirectResponse = NextResponse.redirect(loginUrl);
    // Reporter les cookies de session éventuellement rafraîchis sur la redirection.
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  }

  return response;
}
