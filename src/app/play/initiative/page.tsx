import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProjectionTrackerView } from '@/components/campaign/ProjectionTrackerView';

/**
 * Écran DISTANT de l'ordre d'initiative pour les JOUEURS (PER-293) — Server Component scopé
 * par la **session joueur** (utilisateur anonyme portant `app_metadata.player_id`/
 * `campaign_id`). Sous `/play/*`, donc autorisé aux joueurs par le proxy (`updateSession`)
 * sans élargir le gating.
 *
 * Rendu STRICTEMENT identique à la fenêtre projetée owner et au lien de projection
 * `/project` (PER-271) : les trois routes rendent le même composant partagé
 * `ProjectionTrackerView`. La seule différence est la provenance du `cid` — ici le claim de
 * la session joueur. C'est cette route que reçoit un joueur déjà connecté qui ouvre le lien
 * de projection (redeem NON destructif) : il voit le beau tracker SANS perdre l'accès à sa
 * fiche.
 */
export const metadata: Metadata = {
  title: "Ordre d'initiative — Éditeur de personnage CO2",
};

export default async function PlayInitiativePage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sans claim joueur, cette page n'a pas de sens (le proxy renvoie normalement le MJ vers `/`).
  const appMetadata = user?.app_metadata as { player_id?: string; campaign_id?: string } | undefined;
  const playerId = appMetadata?.player_id;
  const campaignId = appMetadata?.campaign_id;
  if (!playerId || !campaignId) {
    redirect('/');
  }

  return <ProjectionTrackerView cid={campaignId} />;
}
