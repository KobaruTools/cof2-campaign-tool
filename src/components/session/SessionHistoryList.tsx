'use client';

/**
 * Corps de l'historique des parties (PER-270, ouvert au joueur par PER-407) —
 * factorisé pour être monté à la fois depuis la vue MJ (`/campaign/[cid]/history`)
 * et depuis l'espace joueur (`/play/history`) : même lecture (`fetchSessionHistory`),
 * même rendu, seul le chrome autour (breadcrumb, bouton retour) diffère par rôle.
 */
import { useEffect, useState } from 'react';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { fetchSessionHistory, type SessionHistoryEntry } from '@/lib/session/history';
import type { SessionEndReason } from '@/lib/session/types';

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

export function SessionHistoryList({ campaignId }: { campaignId: string }) {
  const [entries, setEntries] = useState<SessionHistoryEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSessionHistory(campaignId)
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
  }, [campaignId]);

  if (error) {
    return (
      <AppAlert severity="error" sx={{ mb: 3 }}>
        Impossible de charger l&apos;historique : {error}
      </AppAlert>
    );
  }

  if (entries === null) {
    return (
      <Stack spacing={2}>
        <Skeleton variant="rounded" height={120} />
        <Skeleton variant="rounded" height={120} />
      </Stack>
    );
  }

  if (entries.length === 0) {
    return (
      <Paper variant="outlined" sx={{ ...glassPaper, textAlign: 'center', py: 6 }}>
        <EventBusyIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" sx={{ mb: 1 }}>
          Aucune partie terminée
        </Typography>
        <Typography color="text.secondary">
          L&apos;historique se remplit dès qu&apos;une session de table est démarrée puis
          terminée dans cette campagne.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {entries.map((entry) => (
        <SessionCard key={entry.id} entry={entry} />
      ))}
    </Stack>
  );
}
