import type { NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/updateSession';

/**
 * Proxy Next 16 (ex-middleware) : rafraîchit la session Supabase à chaque requête
 * (PER-188) et gate les routes propriétaire (PER-189, redirection vers `/login`
 * des visiteurs non authentifiés). Inactif tant que Supabase n'est pas configuré
 * (cf. `updateSession`).
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // Toutes les routes SAUF les assets statiques et images. Pour l'auth, il est
  // recommandé que le proxy tourne sur (quasiment) toutes les routes.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
