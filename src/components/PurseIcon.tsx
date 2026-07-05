import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { PURSE_ICON_PATH } from '@/lib/ui/purseIcon';

export interface PurseIconProps {
  /** Taille en pixels (carré). Défaut 18. */
  size?: number;
  /** Couleur CSS de l'icône. Défaut `'currentColor'` (hérite de la couleur du texte). */
  color?: string;
  /** Texte alternatif accessible ; si absent, l'icône est décorative (aria-hidden). */
  title?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône « bourse » (sac à monnaie, game-icons.net — cf. `purseIcon.ts`). Rendue en SVG
 * inline pour être recolorée via `currentColor`. Sert en tête du bloc « Inventaire »
 * (cf. `PurseField`), à la place du portefeuille MUI (plus fidèle à l'univers CO2).
 */
export function PurseIcon({ size = 18, color = 'currentColor', title, sx }: PurseIconProps) {
  return (
    <Box
      component="svg"
      viewBox="0 0 512 512"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      sx={{
        display: 'inline-block',
        flexShrink: 0,
        width: size,
        height: size,
        fill: color,
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: PURSE_ICON_PATH }}
    />
  );
}
