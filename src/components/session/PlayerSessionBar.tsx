'use client';

/**
 * Barre « session en cours » côté JOUEUR (PER-265) — pour l'espace `/play`. Réunit en
 * UN seul point la découverte de session (un seul `useActiveSession` avec battement)
 * et le canal Realtime de présence, puis affiche le badge « Session en cours » + la
 * liste des connectés. N'affiche RIEN hors session (retour `null`).
 *
 * Remplace, sur `/play`, le `SessionStatusBadge` autonome : on évite ainsi un double
 * poll (badge + présence) et un double battement — une seule découverte alimente les
 * deux. Le joueur se marque « (vous) » via sa clé de présence.
 */
import Box from '@mui/material/Box';

import { SessionActiveBadge } from '@/components/session/SessionActiveBadge';
import { SessionPresence } from '@/components/session/SessionPresence';
import { presenceKeyFor } from '@/lib/session/presence';
import { useActiveSession } from '@/lib/session/useActiveSession';
import { useSessionChannel } from '@/lib/session/useSessionChannel';

export interface PlayerSessionBarProps {
  campaignId: string;
  /** Id du joueur courant (claim de session) — son identité de présence. */
  playerId: string;
  /** Nom d'affichage du joueur (roster). Peut arriver après coup → ré-annoncé. */
  playerName: string;
}

export function PlayerSessionBar({ campaignId, playerId, playerName }: PlayerSessionBarProps) {
  const { session, isActive } = useActiveSession(campaignId, { heartbeat: true });
  const { present } = useSessionChannel(campaignId, session, {
    kind: 'player',
    playerId,
    name: playerName,
  });

  if (!isActive) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
      <SessionActiveBadge />
      <SessionPresence present={present} selfKey={presenceKeyFor('player', playerId)} />
    </Box>
  );
}
