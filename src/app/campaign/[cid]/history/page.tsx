'use client';

/**
 * Historique des parties d'une campagne (PER-270) — vue MJ, sous `/campaign/[cid]/*`
 * (owner-only, gating proxy `routeAccess.ts`). Le rendu (cartes, squelette, vide,
 * erreur) vit dans `SessionHistoryList`, partagé avec la vue joueur `/play/history`
 * (PER-407) ; cette page ne porte que le chrome propre au MJ (fil d'Ariane, retour
 * à la campagne).
 */
import { use, useEffect } from 'react';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import { HomeBackground } from '@/components/HomeBackground';
import { SessionHistoryList } from '@/components/session/SessionHistoryList';
import { useCampaignsStore } from '@/stores/campaigns';
import { useHeaderContent } from '@/stores/headerContent';

export default function CampaignHistoryPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = use(params);
  const campaign = useCampaignsStore((s) => s.campaigns.find((c) => c.id === cid));
  const loadCampaigns = useCampaignsStore((s) => s.load);

  useHeaderContent({
    breadcrumbs: [
      { label: 'Campagnes', href: '/campaigns' },
      { label: campaign?.name ?? '…', href: `/campaign/${cid}` },
      { label: 'Historique des parties' },
    ],
  });

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  return (
    <>
      <title>{`Historique — ${campaign?.name ?? 'Campagne'} — Éditeur de personnage CO2`}</title>
      <HomeBackground />

      <Container maxWidth="sm" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          component={Link}
          href={`/campaign/${cid}`}
          sx={{ mb: 3 }}
        >
          Retour à la campagne
        </Button>

        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Historique des parties
        </Typography>

        <SessionHistoryList campaignId={cid} />
      </Container>
    </>
  );
}
