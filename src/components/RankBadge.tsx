'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import { prestigeGemStops } from '@/lib/ui/prestigeStyle';

/**
 * Badge custom (≠ Chip MUI) : rang de voie, teinté de la couleur du profil. Source UNIQUE, réutilisée
 * par l'historique de niveau (`LevelHistory`), le Codex des voies (`CodexPathBrowser`) et la modale de
 * détail d'une capacité (`FeaturesByPath`) — auparavant trois rendus divergents (dont un simple `Chip`
 * au verbatim « Rang N » non teinté).
 *
 * `prestige` (retour propriétaire 2026-08-17) : pour une voie de PRESTIGE, le fond PLAT devient un
 * dégradé — mais reste la MÊME règle que partout ailleurs (fond semi-transparent, écriture en
 * couleur) : les arrêts du dégradé « métal précieux » (`prestigeGemStops`) sont repassés à travers
 * `alpha()` avant de servir de fond, au lieu d'un remplissage opaque + texte blanc.
 */
export function RankBadge({ rank, color, prestige = false }: { rank: number; color?: string; prestige?: boolean }) {
  const [gemLight, gemDark] = prestige ? prestigeGemStops(color) : [undefined, undefined];
  const gradient = gemLight && gemDark ? `linear-gradient(135deg, ${alpha(gemLight, 0.16)}, ${alpha(gemDark, 0.16)})` : undefined;
  return (
    <Box
      data-glossary-shot="RankBadge"
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
        ...(gradient
          ? { background: gradient }
          : { bgcolor: alpha(color ?? theme.palette.text.secondary, 0.12) }),
        border: `1px solid ${alpha(color ?? theme.palette.text.secondary, 0.45)}`,
      })}
    >
      Rang {rank}
    </Box>
  );
}
