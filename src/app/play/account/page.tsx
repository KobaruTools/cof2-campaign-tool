import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import { HeaderContentSync } from '@/components/HeaderContentSync';
import { HomeBackground } from '@/components/HomeBackground';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PlayerAccountLinking } from './PlayerAccountLinking';

/**
 * Liaison d'identité — vue JOUEUR (PER-501, suite de PER-498/499/500). Même patron
 * de shell que `/play/history` : Server Component qui valide les claims joueur puis
 * délègue l'interactif (appels client Supabase `linkIdentity`/`updateUser`, cf.
 * `PlayerAccountLinking`) à un composant client.
 *
 * Volontairement DISTINCT de `/account` (réservé au propriétaire, cf.
 * `routeAccess.ts`) : un joueur n'a pas de compte propriétaire, et son
 * scope ici est strictement la persistance d'identité — pas de nom d'affichage,
 * de handle, de tutoriels ni de suppression de compte.
 */
export const metadata: Metadata = {
  title: 'Lier mon identité — Éditeur de personnage CO2',
};

export default async function PlayAccountPage() {
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

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <HomeBackground />
      <HeaderContentSync
        breadcrumbs={[
          { label: campaign?.name ?? 'Ma campagne', href: '/play' },
          { label: 'Lier mon identité' },
        ]}
        sessionRole="player"
      />

      <Container maxWidth="sm" sx={{ py: { xs: 4, sm: 6 } }}>
        <PlayerAccountLinking />
      </Container>
    </Box>
  );
}
