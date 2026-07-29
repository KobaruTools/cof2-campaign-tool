'use client';

/**
 * Badge « Session en cours » (PER-264) — indicateur LECTURE SEULE, affiché sur les
 * pages où un joueur/MJ est présent (fiche, `/play`) pour signaler qu'une session de
 * table synchronisée est active. C'est le socle visuel sur lequel les tickets suivants
 * (PER-265+) accrocheront la présence et la synchro temps réel.
 *
 * Bloc custom (pas de `Chip` MUI, règle projet — cf. mémoire des badges). N'affiche
 * RIEN hors session (retour `null`) : discret par nature. Le hook `useActiveSession`
 * (avec battement) découvre la session par poll léger sans socket permanent, et garde
 * la session vivante tant que la page reste ouverte.
 */
import Box from '@mui/material/Box';

import { useActiveSession } from '@/lib/session/useActiveSession';

export interface SessionStatusBadgeProps {
  /** Campagne de la page ; `null`/`undefined` (fiche non rattachée) → rien à surveiller. */
  campaignId: string | null | undefined;
}

/** Point vert « qui respire » (pulsation douce) signalant le direct. */
const pulseDotSx = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  bgcolor: 'rgb(129, 199, 132)',
  boxShadow: '0 0 0 0 rgba(129, 199, 132, 0.6)',
  animation: 'sessionPulse 2s ease-out infinite',
  '@keyframes sessionPulse': {
    '0%': { boxShadow: '0 0 0 0 rgba(129, 199, 132, 0.6)' },
    '70%': { boxShadow: '0 0 0 6px rgba(129, 199, 132, 0)' },
    '100%': { boxShadow: '0 0 0 0 rgba(129, 199, 132, 0)' },
  },
  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
} as const;

export function SessionStatusBadge({ campaignId }: SessionStatusBadgeProps) {
  const { isActive } = useActiveSession(campaignId, { heartbeat: true });

  // Discret : hors session (ou tant que non résolu), on n'affiche rien.
  if (!isActive) return null;

  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: 1,
        py: 0.25,
        borderRadius: 1,
        fontSize: '0.8125rem',
        lineHeight: 1.4,
        fontWeight: 600,
        border: '1px solid rgba(129, 199, 132, 0.35)',
        bgcolor: 'rgba(129, 199, 132, 0.10)',
        color: 'text.primary',
      }}
    >
      <Box component="span" sx={pulseDotSx} />
      Session en cours
    </Box>
  );
}
