import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Callback d'authentification (PER-188) : point de retour commun à l'OAuth
 * (Google/Discord/Facebook) et au magic-link. Supabase renvoie ici avec un `code`
 * (flux PKCE) qu'on échange contre une session (cookies posés par le client
 * serveur), puis on redirige vers `next` (défaut `/`).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  // `next` reste interne (chemin relatif) pour éviter les redirections ouvertes.
  const nextParam = searchParams.get('next');
  const next = nextParam && nextParam.startsWith('/') ? nextParam : '/';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
