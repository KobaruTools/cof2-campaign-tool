import type { Metadata } from 'next';
import Box from '@mui/material/Box';
import { AppAlert } from '@/components/AppAlert';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { ProjectionTrackerView } from '@/components/campaign/ProjectionTrackerView';

/**
 * Vue de PROJECTION dédiée (PER-271) — Server Component scopé par une **session
 * d'observateur** (utilisateur anonyme portant `app_metadata.projection === true` +
 * `campaign_id`, SANS `player_id` ; posé par `redeemProjectionSecret`). Sert à afficher
 * l'ordre d'initiative sur une TV / un second ordinateur SANS connexion MJ ni joueur.
 *
 * Rendu STRICTEMENT identique à la fenêtre projetée owner (`window.open` →
 * `/campaign/[cid]/gm-screen/tracker`) : les deux routes rendent le même composant partagé
 * `ProjectionTrackerView` — dépouillé, fond sombre, tracker en lecture seule. La seule
 * différence est la provenance du `cid` : ici le claim de la session, là-bas l'URL owner.
 *
 * Le préfixe `/project` est PUBLIC côté proxy (le redeem `/project/[secret]` doit être
 * atteignable sans session), et une session de projection y est CONFINÉE (`updateSession`).
 * La garde ci-dessous fait le reste : sans le claim `projection`, on n'affiche PAS le
 * tracker (une TV ne peut pas se connecter → on ne redirige pas vers `/login`, on montre un
 * message générique invitant à demander un nouveau lien au MJ). Le footer global se masque
 * sur `/project` (comme sur la fenêtre projetée) via `AppFooter`.
 */
export const metadata: Metadata = {
  title: "Projection — Ordre d'initiative — Éditeur de personnage CO2",
};

export default async function ProjectionPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appMetadata = user?.app_metadata as
    | { projection?: boolean; campaign_id?: string }
    | undefined;
  const isProjection = appMetadata?.projection === true;
  const campaignId = appMetadata?.campaign_id;

  if (isProjection && campaignId) {
    return <ProjectionTrackerView cid={campaignId} />;
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <AppAlert severity="warning">
        Lien de projection invalide ou expiré. Demande un nouveau lien à ton MJ pour afficher
        l&apos;ordre d&apos;initiative sur cet écran.
      </AppAlert>
    </Box>
  );
}
