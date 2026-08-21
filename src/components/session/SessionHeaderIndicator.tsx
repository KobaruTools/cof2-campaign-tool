'use client';

/**
 * Voyant COMPACT de session dans l'en-tête global, pour la fiche de personnage (PER-269).
 * Remplace, sur la fiche, la barre inline `SessionLiveBar` : réduit au minimum (un simple
 * point 3 états entre le livre des règles et le menu compte de l'en-tête), il déploie le
 * détail — état de connexion + joueurs connectés — au SURVOL seulement (demande proprio).
 *
 * C'est ce composant (et non plus `SessionLiveBar`) qui, sur la fiche, ouvre l'unique
 * `useActiveSession` (avec battement — un humain consulte sa fiche) et le canal Realtime :
 * un seul point de montage par page, pas de double poll ni de double canal. N'affiche
 * RIEN hors session active.
 *
 * Suite PER-271 : le point porte désormais son libellé (`showLabel`), et le détail au
 * survol offre un accès direct à l'ordre d'initiative — routé selon le rôle du spectateur
 * (joueur → `/play/initiative`, MJ → sa fenêtre de présentation), car `/play/initiative`
 * renverrait un MJ sans claim joueur vers l'accueil.
 */
import Link from 'next/link';
import FormatListNumberedIcon from '@mui/icons-material/FormatListNumbered';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';

import { AppTooltip } from '@/components/AppTooltip';
import { sessionConnectionLabel, sessionConnectionState } from '@/lib/session/connectionState';
import { presenceKeyFor } from '@/lib/session/presence';
import { useActiveSession } from '@/lib/session/useActiveSession';
import { useOnlineStatus } from '@/lib/session/useOnlineStatus';
import { useSessionChannel, type SessionIdentity } from '@/lib/session/useSessionChannel';
import { SessionConnectionBadge } from './SessionConnectionBadge';
import { SessionPresence } from './SessionPresence';

export interface SessionHeaderIndicatorProps {
  /** Campagne de la fiche ; `null`/`undefined` (fiche non rattachée) → rien à surveiller. */
  campaignId: string | null | undefined;
  /** Identité de CE spectateur sur le canal ; `null` tant que non résolue → pas de canal. */
  identity: SessionIdentity | null;
}

export function SessionHeaderIndicator({ campaignId, identity }: SessionHeaderIndicatorProps) {
  const { session, isActive } = useActiveSession(campaignId, { heartbeat: true });
  const { present, status } = useSessionChannel(campaignId, session, identity);
  const online = useOnlineStatus();

  // Hors session : rien dans l'en-tête (le voyant est spécifique à la table synchronisée).
  if (!isActive) return null;

  const state = sessionConnectionState(status, online);
  const selfKey = identity ? presenceKeyFor(identity.kind, identity.playerId) : undefined;

  // Cible de l'écran d'initiative selon le rôle : un joueur va sur la route distante
  // scopée par sa session ; le MJ sur sa fenêtre de présentation (cid connu). Sans identité
  // résolue on n'affiche pas le lien (on ignore la bonne cible).
  const trackerHref =
    identity?.kind === 'player'
      ? '/play/initiative'
      : identity?.kind === 'gm' && campaignId
        ? `/campaign/${campaignId}/gm-screen/tracker`
        : null;

  // Détail au survol : état de connexion en clair + liste des connectés (si synchronisée)
  // + accès direct à l'ordre d'initiative. Le tooltip MUI est interactif par défaut : le
  // lien y est cliquable.
  const detail = (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, py: 0.25 }}>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {sessionConnectionLabel(state)}
      </Typography>
      <SessionPresence present={present} selfKey={selfKey} />
      {trackerHref && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<FormatListNumberedIcon />}
          component={Link}
          href={trackerHref}
          sx={{ alignSelf: 'flex-start', mt: 0.25 }}
        >
          Voir l&apos;ordre d&apos;initiative
        </Button>
      )}
    </Box>
  );

  return (
    <AppTooltip title={detail}>
      {/* Box porteur de ref/handlers pour le Tooltip (le badge est un composant simple). */}
      <Box
        component="span"
        data-glossary-shot="SessionHeaderIndicator"
        sx={{ display: 'inline-flex', alignItems: 'center' }}
      >
        <SessionConnectionBadge state={state} showLabel />
      </Box>
    </AppTooltip>
  );
}
