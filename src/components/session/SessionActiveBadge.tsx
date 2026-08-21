'use client';

/**
 * Pastille PURE « Session en cours » (PER-264/PER-265) — le voyant vert « qui respire »
 * signalant qu'une session de table synchronisée est active. Sans aucune logique de
 * découverte : c'est un composant d'affichage réutilisé par `SessionStatusBadge`
 * (badge autonome) et par la barre de présence joueur/MJ.
 *
 * Bloc custom (pas de `Chip` MUI, règle projet — cf. mémoire des badges).
 */
import Box from '@mui/material/Box';

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

export function SessionActiveBadge() {
  return (
    <Box
      component="span"
      data-glossary-shot="SessionActiveBadge"
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
