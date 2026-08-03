import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { HomeBackground } from '@/components/HomeBackground';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PlayerInitiativeClient } from './PlayerInitiativeClient';

/**
 * Écran DISTANT de l'ordre d'initiative pour les JOUEURS (PER-293) — Server Component scopé
 * par la **session joueur** (utilisateur anonyme portant `app_metadata.player_id`/
 * `campaign_id`). Sous `/play/*`, donc autorisé aux joueurs par le proxy (`updateSession`)
 * sans élargir le gating. Le MJ partage le lien `<origine>/play/initiative` à sa table.
 *
 * Ce shell lit les claims puis délègue au client (canal Realtime + vue de projection en
 * lecture seule). La campagne vient du claim de la session ; aucun `where` de tenancy côté
 * code (la RLS joueur — migrations 0002/0012 — filtre déjà tout).
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

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <HomeBackground />
      <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 5 } }}>
        <Stack spacing={0.5} sx={{ mb: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Espace joueur
          </Typography>
        </Stack>
        <PlayerInitiativeClient cid={campaignId} />
      </Container>
    </Box>
  );
}
