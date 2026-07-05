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

/**
 * Routes ouvertes à une session **joueur** (utilisateur anonyme du lien magique,
 * PER-191) : son espace `/play` et, à terme, l'édition de sa fiche `/character/*`.
 * Tout le reste (UI propriétaire) lui est interdit → renvoyé vers `/play`.
 */
const PLAYER_PATH_PREFIXES = ['/play', '/character'] as const;

function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPublicPath(pathname: string): boolean {
  return matchesPrefix(pathname, PUBLIC_PATH_PREFIXES);
}

function isPlayerPath(pathname: string): boolean {
  return matchesPrefix(pathname, PLAYER_PATH_PREFIXES);
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

  const pathname = request.nextUrl.pathname;

  // Construit une redirection en reportant les cookies de session éventuellement
  // rafraîchis (sinon la session « clignote » à la requête suivante).
  const redirectTo = (to: string, search = ''): NextResponse => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    url.search = search;
    const redirectResponse = NextResponse.redirect(url);
    for (const cookie of response.cookies.getAll()) {
      redirectResponse.cookies.set(cookie);
    }
    return redirectResponse;
  };

  // Gating : visiteur non authentifié sur une route propriétaire → connexion.
  if (!user) {
    if (isPublicPath(pathname)) {
      return response;
    }
    // Retour post-connexion vers la page visée (chemin interne, pas d'open redirect).
    const target = pathname + request.nextUrl.search;
    return redirectTo('/login', target !== '/' ? `?next=${encodeURIComponent(target)}` : '');
  }

  // Confinement des rôles (PER-191). Une session JOUEUR (claim `player_id`) est
  // cantonnée à son espace ; une session MJ n'a rien à faire dans `/play`.
  const isPlayer = Boolean(
    (user.app_metadata as { player_id?: string } | undefined)?.player_id,
  );
  if (isPlayer) {
    if (!isPublicPath(pathname) && !isPlayerPath(pathname)) {
      return redirectTo('/play');
    }
  } else if (isPlayerPath(pathname) && !pathname.startsWith('/character')) {
    // MJ visant l'espace joueur `/play` → ramené à son accueil. (`/character/*`
    // reste commun aux deux rôles.)
    return redirectTo('/');
  }

  return response;
}
