'use client';

/**
 * Chrome client de `/play/history` (bouton retour + titre + liste) — extrait du
 * shell serveur car un Server Component ne peut pas passer `component={Link}`
 * (une référence de fonction) à un composant client MUI (`Button`) : la frontière
 * client doit commencer avant ce passage de prop.
 */
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { SessionHistoryList } from '@/components/session/SessionHistoryList';

export function PlayHistoryClient({ campaignId }: { campaignId: string }) {
  return (
    <>
      <Button startIcon={<ArrowBackIcon />} component={Link} href="/play" sx={{ mb: 3 }}>
        Retour à ma campagne
      </Button>

      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Historique des parties
      </Typography>

      <SessionHistoryList campaignId={campaignId} />
    </>
  );
}
