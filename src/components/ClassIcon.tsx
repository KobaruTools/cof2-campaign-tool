import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { CLASS_ICON_PATHS } from '@/lib/ui/classIcons';
import { classColor } from '@/lib/ui/classColors';

export interface ClassIconProps {
  /** Id du profil (ex. `'guerrier'`) — clé dans `CLASS_ICON_PATHS`. */
  classId: string;
  /** Taille en pixels (carré). Défaut 24. */
  size?: number;
  /**
   * Couleur de l'icône (chaîne CSS). Par défaut, la teinte du profil issue de
   * `CLASS_COLORS`. Passer `'currentColor'` pour hériter de la couleur du texte.
   */
  color?: string;
  /** Texte alternatif accessible ; si absent, l'icône est décorative (aria-hidden). */
  title?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'illustration d'un profil (game-icons.net, cf. classIcons.ts). Rendue
 * en SVG inline pour pouvoir être recolorée via `currentColor`. Ne rend rien si
 * l'id est inconnu.
 */
export function ClassIcon({ classId, size = 24, color, title, sx }: ClassIconProps) {
  const markup = CLASS_ICON_PATHS[classId];
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
        fill: color ?? classColor(classId),
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
