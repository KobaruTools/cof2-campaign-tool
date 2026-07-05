import { NextResponse, type NextRequest } from 'next/server';

import { redeemJoinSecret } from '@/lib/auth/joinLink';

/**
 * Consommation du lien magique joueur (PER-191). Route **publique** (exclue du
 * gating, cf. `updateSession`) et **Route Handler** (et non page) : l'échange
 * ouvre une session — donc écrit des cookies — ce qui est interdit dans un
 * Server Component. On délègue à `redeemJoinSecret` puis on route le résultat :
 * - `ok` → redirection vers l'espace joueur `/play` (session scopée ouverte) ;
 * - `invalid` → `/join?status=invalid` (message générique, sans fuite) ;
 * - erreur d'infrastructure → `/join?status=error`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { origin } = new URL(request.url);
  const { secret } = await params;

  try {
    const result = await redeemJoinSecret(secret);
    if (result.status === 'ok') {
      return NextResponse.redirect(`${origin}/play`);
    }
    return NextResponse.redirect(`${origin}/join?status=invalid`);
  } catch {
    return NextResponse.redirect(`${origin}/join?status=error`);
  }
}
