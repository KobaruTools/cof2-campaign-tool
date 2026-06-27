import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { ANCESTRY_ICON_PATHS } from '@/lib/ui/ancestryIcons';

export interface AncestryIconProps {
  /** Id de la voie de peuple (ex. `'nain'`) — clé dans `ANCESTRY_ICON_PATHS`. */
  ancestryId: string;
  /** Taille en pixels (carré). Défaut 24. */
  size?: number;
  /**
   * Couleur de l'icône (chaîne CSS). Les voies de peuple n'ont pas de teinte de
   * profil : par défaut l'icône hérite de la couleur du texte (`currentColor`).
   */
  color?: string;
  /** Texte alternatif accessible ; si absent, l'icône est décorative (aria-hidden). */
  title?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'illustration d'un peuple (game-icons.net, cf. ancestryIcons.ts). Rendue
 * en SVG inline pour pouvoir être recolorée via `currentColor`. Ne rend rien si
 * l'id est inconnu (ex. voie du mage, voies de prestige).
 */
export function AncestryIcon({ ancestryId, size = 24, color, title, sx }: AncestryIconProps) {
  const markup = ANCESTRY_ICON_PATHS[ancestryId];
  if (!markup) return null;
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
        fill: color ?? 'currentColor',
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
