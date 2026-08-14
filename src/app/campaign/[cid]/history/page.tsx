'use client';

/**
 * Historique des parties d'une campagne (PER-270) — consommation en lecture des
 * sessions closes + du journal de présence posés par la milestone PER-259
 * (`game_sessions` / `game_session_participants`, migrations 0012/0014).
 *
 * Route owner-only pour l'instant (gating proxy `/campaign/*`, cf. `routeAccess.ts`) :
 * le ticket vise aussi le joueur en lecture, mais son espace vit sous `/play` — la
 * même vue devra y être branchée séparément (hors périmètre de cette ébauche).
 *
 * Pas de pagination ni de notes de séance (`metadata`) dans cette première version :
 * `fetchSessionHistory` borne aux 20 parties les plus récentes — à affiner selon
 * l'usage réel, comme le prévoit le ticket (« ne pas sur-concevoir »).
 */
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { AppHeader } from '@/components/AppHeader';
import { HomeBackground } from '@/components/HomeBackground';
import { fetchSessionHistory, type SessionHistoryEntry } from '@/lib/session/history';
import type { SessionEndReason } from '@/lib/session/types';
import { useCampaignsStore } from '@/stores/campaigns';

/** Verre dépoli commun aux cartes (aligné sur les réglages de campagne). */
const glassPaper = {
  p: { xs: 2.5, sm: 3 },
  bgcolor: 'rgba(30, 30, 34, 0.62)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  borderColor: 'rgba(255, 255, 255, 0.10)',
} as const;

/** Formate une durée en millisecondes en « Xh Ym » (ou « <1 min » si nulle). */
function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60_000);
  if (totalMinutes < 1) return '< 1 min';
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} h`;
  return `${h} h ${m} min`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function formatTimeRange(startedAt: string, endedAt: string): string {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  return `${fmt(startedAt)} – ${fmt(endedAt)}`;
}

/** Badge « raison de fin », cohérent avec la palette de badges custom du projet. */
function EndReasonBadge({ reason }: { reason: SessionEndReason }) {
  const label =
    reason === 'gm'
      ? 'Terminée par le MJ'
      : reason === 'empty'
        ? 'Fermée (table vide)'
        : 'Fermée (durée max. 12 h)';
  const color = reason === 'gm' ? '#66bb6a' : 'rgba(255, 255, 255, 0.55)';
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        px: 1,
        py: 0.25,
        borderRadius: 1,
        fontSize: '0.7rem',
        fontWeight: 700,
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        lineHeight: 1.4,
        color,
        border: '1px solid',
        borderColor: color,
        opacity: 0.85,
      }}
    >
      {label}
    </Box>
  );
}

function SessionCard({ entry }: { entry: SessionHistoryEntry }) {
  return (
    <Paper variant="outlined" sx={glassPaper}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{
          mb: 1.5,
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, textTransform: 'capitalize' }}>
            {formatDate(entry.startedAt)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formatTimeRange(entry.startedAt, entry.endedAt)} · {formatDuration(entry.durationMs)}
          </Typography>
        </Box>
        <EndReasonBadge reason={entry.endedReason} />
      </Stack>

      <Divider sx={{ mb: 1.5, borderColor: 'rgba(255, 255, 255, 0.10)' }} />

      <Stack spacing={0.75}>
        {entry.participants.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ fontStyle: 'italic' }}>
            Aucune présence journalisée.
          </Typography>
        ) : (
          entry.participants.map((p) => (
            <Stack
              key={p.playerId ?? 'gm'}
              direction="row"
              sx={{ justifyContent: 'space-between', alignItems: 'center' }}
            >
              <Typography variant="body2" sx={{ fontWeight: p.playerId === null ? 600 : 400 }}>
                {p.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDuration(p.presenceMs)}
                {p.entries > 1 ? ` (${p.entries} connexions)` : ''}
              </Typography>
            </Stack>
          ))
        )}
      </Stack>
    </Paper>
  );
}

export default function CampaignHistoryPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = use(params);
  const campaign = useCampaignsStore((s) => s.campaigns.find((c) => c.id === cid));
  const loadCampaigns = useCampaignsStore((s) => s.load);

  const [entries, setEntries] = useState<SessionHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    let cancelled = false;
    fetchSessionHistory(cid)
      .then((rows) => {
        if (!cancelled) setEntries(rows);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erreur inconnue.');
        }
      });
    return () => {
      cancelled = true;
    };
  }, [cid]);

  return (
    <>
      <title>{`Historique — ${campaign?.name ?? 'Campagne'} — Éditeur de personnage CO2`}</title>
      <HomeBackground />
      <AppHeader
        breadcrumbs={[
          { label: 'Campagnes', href: '/campaigns' },
          { label: campaign?.name ?? '…', href: `/campaign/${cid}` },
          { label: 'Historique des parties' },
        ]}
      />

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

        {error && (
          <AppAlert severity="error" sx={{ mb: 3 }}>
            Impossible de charger l&apos;historique : {error}
          </AppAlert>
        )}

        {entries === null && !error ? (
          <Stack spacing={2}>
            <Skeleton variant="rounded" height={120} />
            <Skeleton variant="rounded" height={120} />
          </Stack>
        ) : entries && entries.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{ ...glassPaper, textAlign: 'center', py: 6 }}
          >
            <EventBusyIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>
              Aucune partie terminée
            </Typography>
            <Typography color="text.secondary">
              L&apos;historique se remplit dès qu&apos;une session de table est démarrée
              puis terminée dans cette campagne.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={2}>
            {entries?.map((entry) => (
              <SessionCard key={entry.id} entry={entry} />
            ))}
          </Stack>
        )}
      </Container>
    </>
  );
}
