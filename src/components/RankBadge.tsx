'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

/**
 * Badge custom (≠ Chip MUI) : rang de voie, teinté de la couleur du profil. Source UNIQUE, réutilisée
 * par l'historique de niveau (`LevelHistory`), le Codex des voies (`CodexPathBrowser`) et la modale de
 * détail d'une capacité (`FeaturesByPath`) — auparavant trois rendus divergents (dont un simple `Chip`
 * au verbatim « Rang N » non teinté).
 */
export function RankBadge({ rank, color }: { rank: number; color?: string }) {
  return (
    <Box
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 22,
        px: 0.9,
        borderRadius: 1,
        flexShrink: 0,
        lineHeight: 1,
        fontSize: '0.72rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
        color: color ?? theme.palette.text.secondary,
        bgcolor: alpha(color ?? theme.palette.text.secondary, 0.12),
        border: `1px solid ${alpha(color ?? theme.palette.text.secondary, 0.45)}`,
      })}
    >
      Rang {rank}
    </Box>
  );
}
