import { NextResponse, type NextRequest } from 'next/server';

import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Déconnexion (PER-188) : termine la session Supabase (efface les cookies) puis
 * renvoie vers l'écran de connexion. En POST pour éviter une déconnexion par
 * simple préchargement de lien (GET).
 */
export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  // 303 : force un GET sur la cible après le POST.
  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
