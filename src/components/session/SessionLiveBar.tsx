'use client';

/**
 * Barre « session en cours » + présence live (PER-264/PER-265) — composant GÉNÉRIQUE
 * réunissant en UN point la découverte de session (un seul `useActiveSession` avec
 * battement) et le canal Realtime de présence, pour n'importe quel spectateur (MJ ou
 * joueur). Affiche le badge « Session en cours » + la liste des connectés, ou RIEN
 * hors session.
 *
 * Un seul `useActiveSession` par page qui monte cette barre → pas de double poll ni de
 * double battement. Le spectateur se marque « (vous) » via sa clé de présence.
 * Utilisé par `/play` (`PlayerSessionBar`) et par la fiche `/character/[id]`.
 */
import Box from '@mui/material/Box';

import { sessionConnectionState } from '@/lib/session/connectionState';
import { presenceKeyFor } from '@/lib/session/presence';
import { useActiveSession } from '@/lib/session/useActiveSession';
import { useOnlineStatus } from '@/lib/session/useOnlineStatus';
import { useSessionChannel, type SessionIdentity } from '@/lib/session/useSessionChannel';
import { SessionConnectionBadge } from './SessionConnectionBadge';
import { SessionPresence } from './SessionPresence';

export interface SessionLiveBarProps {
  /** Campagne de la page ; `null`/`undefined` (fiche non rattachée) → rien à surveiller. */
  campaignId: string | null | undefined;
  /** Identité de CE spectateur sur le canal ; `null` tant que non résolue → pas de canal. */
  identity: SessionIdentity | null;
}

export function SessionLiveBar({ campaignId, identity }: SessionLiveBarProps) {
  const { session, isActive } = useActiveSession(campaignId, { heartbeat: true });
  const { present, status } = useSessionChannel(campaignId, session, identity);
  const online = useOnlineStatus();

  if (!isActive) return null;

  return (
    <Box
      data-glossary-shot="SessionLiveBar"
      sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', rowGap: 1 }}
    >
      <SessionConnectionBadge state={sessionConnectionState(status, online)} showLabel />
      <SessionPresence
        present={present}
        selfKey={identity ? presenceKeyFor(identity.kind, identity.playerId) : undefined}
      />
    </Box>
  );
}
