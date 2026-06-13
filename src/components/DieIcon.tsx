import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import type { SxProps, Theme } from '@mui/material/styles';
import type { Die } from '@/data/schema';
import { DIE_ICON_PATHS } from '@/lib/ui/diceIcons';

export interface DieIconProps {
  /** Type de dé (`'d4'`…`'d20'`) — clé dans `DIE_ICON_PATHS`. */
  die: Die;
  /** Taille en pixels (carré). Défaut 24. */
  size?: number;
  /**
   * Couleur de l'icône (chaîne CSS). Par défaut `currentColor`, pour hériter de
   * la couleur du texte.
   */
  color?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'un dé polyédrique (game-icons.net, cf. `diceIcons.ts`). Rendue en SVG
 * inline pour pouvoir être recolorée via `currentColor`, et toujours enveloppée
 * d'une info-bulle nommant le dé (ex. « d6 ») — c'est le composant d'affichage
 * commun : tout dé montré au joueur doit passer par ici pour un rendu uniforme.
 */
export function DieIcon({ die, size = 24, color, sx }: DieIconProps) {
  const markup = DIE_ICON_PATHS[die];
  if (!markup) return null;
  return (
    <Tooltip title={die}>
      <Box
        component="svg"
        viewBox="0 0 512 512"
        role="img"
        aria-label={die}
        sx={{
          display: 'inline-block',
          flexShrink: 0,
          width: size,
          height: size,
          fill: color ?? 'currentColor',
          ...sx,
        }}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </Tooltip>
  );
}
