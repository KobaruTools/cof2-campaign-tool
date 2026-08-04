import { NextResponse, type NextRequest } from 'next/server';

import { redeemProjectionSecret, resolveProjectionCampaign } from '@/lib/auth/projectionLink';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * Consommation d'un lien de PROJECTION (PER-271). Route **publique** (préfixe `/project`
 * exclu du gating, cf. `updateSession`) et **Route Handler** (et non page) : l'échange
 * ouvre une session — donc écrit des cookies — ce qui est interdit dans un Server Component.
 *
 * **Redeem NON DESTRUCTIF** (décision proprio) : le même lien est sûr à partager à TOUT le
 * monde, y compris aux joueurs. Ouvrir une session anonyme d'observateur ÉCRASERAIT une
 * session existante (un joueur perdrait l'accès en écriture à sa fiche jusqu'à rouvrir son
 * lien magique). On ne mint donc l'observateur anonyme QUE si l'appareil n'a PAS déjà de
 * session ; sinon on aiguille le visiteur vers SA propre vue sans toucher à sa session :
 *   - joueur (claim `player_id`)       → `/play/initiative` (même tracker, dans sa session) ;
 *   - projection déjà ouverte          → `/project` (rien à re-minter) ;
 *   - MJ / compte authentifié           → sa fenêtre projetée owner `/campaign/<cid>/gm-screen/tracker` ;
 *   - AUCUNE session (TV, 2e ordi)      → session d'observateur anonyme, puis `/project`.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> },
) {
  const { origin } = new URL(request.url);
  const { secret } = await params;

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Session déjà ouverte → on ne l'écrase JAMAIS : on redirige vers la vue adaptée.
    if (user) {
      const meta = user.app_metadata as
        | { player_id?: string; projection?: boolean }
        | undefined;
      if (meta?.player_id) {
        return NextResponse.redirect(`${origin}/play/initiative`);
      }
      if (meta?.projection) {
        return NextResponse.redirect(`${origin}/project`);
      }
      // MJ (ou compte authentifié sans claim joueur/projection) : sa fenêtre projetée owner,
      // à partir de la campagne du lien — sans convertir sa session en observateur anonyme.
      const cid = await resolveProjectionCampaign(secret);
      if (cid) {
        return NextResponse.redirect(`${origin}/campaign/${cid}/gm-screen/tracker`);
      }
      return NextResponse.redirect(`${origin}/project?status=invalid`);
    }

    // Aucune session (TV / second ordinateur) → ouverture d'une session d'observateur anonyme.
    const result = await redeemProjectionSecret(secret);
    if (result.status === 'ok') {
      return NextResponse.redirect(`${origin}/project`);
    }
    return NextResponse.redirect(`${origin}/project?status=invalid`);
  } catch {
    return NextResponse.redirect(`${origin}/project?status=error`);
  }
}
