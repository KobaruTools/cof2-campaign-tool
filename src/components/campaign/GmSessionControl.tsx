'use client';

/**
 * Contrôle de CYCLE DE VIE de la session de table (PER-264) — barre de l'écran de MJ.
 * Réservé au MJ propriétaire (la page `/campaign/*` est déjà owner-only ; la RLS 0012
 * garantit l'écriture directe). Deux gestes :
 *  - **Démarrer la session** → insère une ligne `game_sessions` active (`ended_at=null`) ;
 *  - **Terminer la session** → pose `ended_at` + `ended_reason='gm'` (filet explicite).
 *
 * L'état « session en cours » est découvert et rafraîchi par `useActiveSession` (poll
 * léger + battement, sans socket permanent) : le bouton bascule sans rechargement, et
 * la barre reflète aussi une fermeture paresseuse (vide/plafond) survenue côté serveur.
 *
 * Ici commence et s'arrête tout le temps réel : les tickets suivants (PER-265+) liront
 * ce gate pour ouvrir/fermer le canal. Ce ticket ne synchronise AUCUNE donnée.
 */
import { useState } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useToast } from '@/components/toast/ToastProvider';
import { SessionPresence } from '@/components/session/SessionPresence';
import { endSession, startSession } from '@/lib/session/repo';
import { useActiveSession } from '@/lib/session/useActiveSession';
import { useSessionChannel } from '@/lib/session/useSessionChannel';

export interface GmSessionControlProps {
  campaignId: string;
}

/** Identité MJ sur le canal : propriétaire de la campagne, sans joueur de roster. */
const GM_IDENTITY = { kind: 'gm', playerId: null, name: 'MJ' } as const;

export function GmSessionControl({ campaignId }: GmSessionControlProps) {
  const { session, isActive, loading, refresh } = useActiveSession(campaignId, {
    heartbeat: true,
  });
  // Rejoint le canal de session (présence) tant qu'une session est active. Le MJ est
  // toujours « lui-même » (`selfKey = 'gm'`).
  const { present } = useSessionChannel(campaignId, session, GM_IDENTITY);
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleStart = async () => {
    setBusy(true);
    try {
      await startSession(campaignId);
      refresh();
      showToast('Session démarrée — la table est synchronisée.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Le démarrage de la session a échoué.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleEnd = async () => {
    setBusy(true);
    try {
      await endSession(campaignId);
      refresh();
      showToast('Session terminée.', 'success');
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'La fin de session a échoué.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 1.5, sm: 2 },
        mb: 2,
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        flexWrap: 'wrap',
        rowGap: 1,
        bgcolor: 'rgba(20, 20, 23, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        borderColor: isActive ? 'rgba(129, 199, 132, 0.35)' : 'rgba(255, 255, 255, 0.10)',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexGrow: 1, minWidth: 0 }}>
        <Box
          component="span"
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            flexShrink: 0,
            bgcolor: isActive ? 'rgb(129, 199, 132)' : 'rgba(255, 255, 255, 0.25)',
          }}
        />
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {isActive ? 'Session en cours' : 'Aucune session'}
        </Typography>
        <Typography variant="body2" color="text.secondary" noWrap sx={{ minWidth: 0 }}>
          {isActive
            ? 'La table est synchronisée en temps réel.'
            : 'Démarrez une session pour synchroniser la table.'}
        </Typography>
      </Stack>
      {isActive ? (
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          onClick={() => void handleEnd()}
          disabled={busy || loading}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <StopIcon />}
        >
          Terminer la session
        </Button>
      ) : (
        <Button
          variant="contained"
          size="small"
          onClick={() => void handleStart()}
          disabled={busy || loading}
          startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />}
        >
          Démarrer la session
        </Button>
      )}
      {/* Présence live : qui est connecté à la session (nouvelle ligne pleine largeur). */}
      {isActive && present.length > 0 && (
        <Box sx={{ width: '100%' }}>
          <SessionPresence present={present} selfKey="gm" />
        </Box>
      )}
    </Paper>
  );
}
