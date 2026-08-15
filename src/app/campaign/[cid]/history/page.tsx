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
import { useResolvedCampaign } from '@/lib/routing/slug';

export default function CampaignHistoryPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid: cidParam } = use(params);
  const { campaign, cid, href: campaignPath } = useResolvedCampaign(cidParam);
  const loadCampaigns = useCampaignsStore((s) => s.load);

  useHeaderContent({
    breadcrumbs: [
      { label: 'Campagnes', href: '/campaigns' },
      { label: campaign?.name ?? '…', href: campaignPath },
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
          href={campaignPath}
          sx={{ mb: 3 }}
        >
          Retour à la campagne
        </Button>

        <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
          Historique des parties
        </Typography>

        <SessionHistoryList campaignId={cid} isGm />
      </Container>
    </>
  );
}
