import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { GlossaryRichText } from '@/components/sheet/FeatureRichText';
import { HeaderContentSync } from '@/components/HeaderContentSync';
import { HomeBackground } from '@/components/HomeBackground';
import { CampaignSwitcherMenu } from '@/components/session/CampaignSwitcherMenu';
import { listMemberCampaigns } from '@/lib/auth/campaignSwitch';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { PlayClient } from './PlayClient';

/**
 * Espace JOUEUR (PER-191, refondu PER-196). Server Component scopé par la
 * **session joueur** (utilisateur anonyme portant `app_metadata.player_id`/
 * `campaign_id`) : toutes les requêtes ci-dessous sont filtrées par la RLS joueur
 * (migrations 0002/0004), on n'ajoute donc pas de `where` de tenancy côté code.
 *
 * On y arrive après consommation du lien magique (`/join/[secret]`). Le proxy
 * confine la session joueur à cet espace (+ `/character/*` et `/create`). Ce shell
 * lit les claims + l'en-tête de campagne, puis délègue à `PlayClient` (composant
 * client) la gestion des fiches : voir/éditer les siennes, en créer, en réclamer.
 */
export const metadata: Metadata = {
  title: 'Ma campagne — Éditeur de personnage CO2',
};

export default async function PlayPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Sécurité de surface : sans claim joueur, cette page n'a pas de sens (le proxy
  // renvoie normalement le MJ vers `/`). On garde le garde-fou local.
  const appMetadata = user?.app_metadata as
    | { player_id?: string; campaign_id?: string }
    | undefined;
  const playerId = appMetadata?.player_id;
  const claimCampaignId = appMetadata?.campaign_id;
  if (!playerId || !claimCampaignId) {
    redirect('/');
  }

  // RLS joueur (PER-498) : `campaigns` ne renvoie plus « LA » campagne mais un
  // ceiling de TOUTES les campagnes dont l'Identité est membre. Le claim JWT
  // (posé au redeem, réécrit par `switchActiveCampaign` — PER-500) désigne la
  // campagne effectivement affichée ici — filtre applicatif obligatoire, la RLS
  // seule ne garantit plus « une ligne ».
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select('id, name, description')
    .eq('id', claimCampaignId)
    .limit(1);
  const campaign = campaigns?.[0];

  // PER-500 : campagnes dont l'Identité est membre (`player_auth_sessions`, pas
  // seulement la campagne active du claim). 1 seule → pas de sélecteur, comportement
  // inchangé (simple libellé texte).
  const memberCampaigns = await listMemberCampaigns();
  const breadcrumbLabel =
    memberCampaigns.length > 1 ? (
      <CampaignSwitcherMenu campaigns={memberCampaigns} activeCampaignId={claimCampaignId} />
    ) : (
      campaign?.name ?? 'Ma campagne'
    );

  return (
    <Box sx={{ position: 'relative', minHeight: '100%' }}>
      <HomeBackground />
      {/* Barre de navigation globale, jusqu'ici absente de l'espace joueur : le joueur
          invité n'avait ni logo, ni accès au bestiaire / à l'aide-mémoire / au livre des
          règles, ni menu de session — alors que ces routes lui sont ouvertes.
          Fil d'Ariane à un seul maillon, rendu en `<h1>` : simple libellé texte pour une
          Identité mono-campagne, ou `CampaignSwitcherMenu` (PER-500) si l'Identité porte
          2+ campagnes — même patron que la vue MJ `/campaign/[cid]`, d'où la disparition
          du titre dupliqué dans le corps.
          `sessionRole` est passé en dur : les claims viennent d'être validés ci-dessus,
          la session EST joueur — la nav est donc juste dès le premier rendu, sans
          attendre la résolution côté client. */}
      <HeaderContentSync breadcrumbs={[{ label: breadcrumbLabel }]} sessionRole="player" />

      <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
        <Stack spacing={1} sx={{ mb: 3 }}>
          <Typography variant="overline" color="text.secondary">
            Espace joueur
          </Typography>
          {campaign?.description ? (
            <Typography variant="body2" component="div" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
              <GlossaryRichText>{campaign.description}</GlossaryRichText>
            </Typography>
          ) : null}
        </Stack>

        <PlayClient playerId={playerId} campaignId={campaign?.id ?? claimCampaignId} />
      </Container>
    </Box>
  );
}
