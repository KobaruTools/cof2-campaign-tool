import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { AppHeader } from '@/components/AppHeader';
import { HomeBackground } from '@/components/HomeBackground';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PlayHistoryClient } from './PlayHistoryClient';

/**
 * Historique des parties — vue JOUEUR (PER-407, suite de PER-270). Même lecture
 * (`fetchSessionHistory`, RLS membre déjà ouverte au joueur) et même rendu
 * (`SessionHistoryList`) que la vue MJ `/campaign/[cid]/history` ; seul le chrome
 * diffère, sur le patron de `/play` (shell serveur qui valide les claims joueur
 * puis délègue l'affichage).
 */
export const metadata: Metadata = {
  title: 'Historique des parties — Éditeur de personnage CO2',
};

export default async function PlayHistoryPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const appMetadata = user?.app_metadata as
    | { player_id?: string; campaign_id?: string }
    | undefined;
  const playerId = appMetadata?.player_id;
  const claimCampaignId = appMetadata?.campaign_id;
  if (!playerId || !claimCampaignId) {
    redirect('/');
  }

  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name')
    .limit(1);
  const campaign = campaigns?.[0];
  const campaignId = campaign?.id ?? claimCampaignId;

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <HomeBackground />
      <AppHeader
        breadcrumbs={[
          { label: campaign?.name ?? 'Ma campagne', href: '/play' },
          { label: 'Historique des parties' },
        ]}
        sessionRole="player"
      />

      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
        <PlayHistoryClient campaignId={campaignId} />
      </Container>
    </Box>
  );
}
