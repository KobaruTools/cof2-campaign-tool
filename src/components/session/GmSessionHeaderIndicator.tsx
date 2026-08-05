'use client';

/**
 * Voyant COMPACT de session dans l'en-tête global, pour l'écran de MJ — miroir de
 * `SessionHeaderIndicator` (fiche de personnage) mais avec la commande de CYCLE DE VIE
 * en plus (démarrer/terminer), puisque c'est ICI que la session naît. Remplace le cadre
 * `GmSessionControl` (Paper pleine largeur) posé dans le corps de la page.
 *
 * Hors session : un simple bouton « Démarrer la session » dans l'en-tête (rien à
 * surveiller encore, pas de point). En session : même point 3 états + libellé que la
 * fiche, détail au survol (état de connexion + connectés) et bouton « Terminer la
 * session » au fond du tooltip — l'interactivité du `Tooltip` MUI le permet déjà pour
 * le lien « Voir l'ordre d'initiative » de `SessionHeaderIndicator`.
 *
 * Le roster des joueurs (chargement mis en cache par campagne, cf. `usePlayersStore`)
 * alimente `SessionPresence` en `playerById` : chaque nom de joueur connecté devient
 * survolable (dernière connexion + copie du lien magique), même infobulle que
 * `PlayerBadgeTooltip` sur les cartes de l'écran de MJ.
 */
import { useEffect, useMemo, useState } from 'react';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

import { AppTooltip } from '@/components/AppTooltip';
import { useToast } from '@/components/toast/ToastProvider';
import { sessionConnectionLabel, sessionConnectionState } from '@/lib/session/connectionState';
import { endSession, startSession } from '@/lib/session/repo';
import { useActiveSession } from '@/lib/session/useActiveSession';
import { useOnlineStatus } from '@/lib/session/useOnlineStatus';
import { useSessionChannel } from '@/lib/session/useSessionChannel';
import { usePlayersStore } from '@/stores/players';
import { SessionConnectionBadge } from './SessionConnectionBadge';
import { SessionPresence } from './SessionPresence';

export interface GmSessionHeaderIndicatorProps {
  campaignId: string;
}

/** Identité MJ sur le canal : propriétaire de la campagne, sans joueur de roster. */
const GM_IDENTITY = { kind: 'gm', playerId: null, name: 'MJ' } as const;

export function GmSessionHeaderIndicator({ campaignId }: GmSessionHeaderIndicatorProps) {
  const { session, isActive, loading, refresh } = useActiveSession(campaignId, {
    heartbeat: true,
  });
  const { present, status } = useSessionChannel(campaignId, session, GM_IDENTITY);
  const online = useOnlineStatus();
  const { showToast } = useToast();
  const [busy, setBusy] = useState(false);

  // Roster des joueurs : `load` est mis en cache par campagne (no-op si déjà chargé
  // par `useGmScreenCombat` sur la même page), donc ce composant reste self-contained
  // sans dupliquer d'appel réseau.
  const players = usePlayersStore((s) => s.players);
  const loadPlayers = usePlayersStore((s) => s.load);
  useEffect(() => {
    void loadPlayers(campaignId);
  }, [loadPlayers, campaignId]);
  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

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

  // Hors session : bouton d'action direct dans l'en-tête, rien à surveiller encore.
  if (!isActive) {
    return (
      <Button
        variant="outlined"
        size="small"
        onClick={() => void handleStart()}
        disabled={busy || loading}
        startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <PlayArrowIcon />}
        sx={{ flexShrink: 0, whiteSpace: 'nowrap' }}
      >
        Démarrer la session
      </Button>
    );
  }

  const state = sessionConnectionState(status, online);

  const detail = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, py: 0.25 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {sessionConnectionLabel(state)}
      </Typography>
      <SessionPresence present={present} selfKey="gm" playerById={playerById} />
      <Button
        variant="outlined"
        color="inherit"
        size="small"
        onClick={() => void handleEnd()}
        disabled={busy || loading}
        startIcon={busy ? <CircularProgress size={14} color="inherit" /> : <StopIcon />}
        sx={{ alignSelf: 'flex-start', mt: 0.25 }}
      >
        Terminer la session
      </Button>
    </Box>
  );

  return (
    <AppTooltip title={detail}>
      {/* Box porteur de ref/handlers pour le Tooltip (le badge est un composant simple). */}
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center' }}>
        <SessionConnectionBadge state={state} showLabel />
      </Box>
    </AppTooltip>
  );
}
