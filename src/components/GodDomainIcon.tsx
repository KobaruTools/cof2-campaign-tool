import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { GOD_DOMAIN_ICON_PATHS } from '@/lib/ui/godDomainIcons';

export interface GodDomainIconProps {
  /** Id du dieu (`PriestGod.id`) — absent de `GOD_DOMAIN_ICON_PATHS` : rend `null`. */
  godId: string;
  /** Taille en pixels (carré). Défaut 24. */
  size?: number;
  /** Couleur CSS de l'icône. Défaut `'currentColor'` (hérite de la couleur du texte). */
  color?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône de DOMAINE d'un dieu du panthéon d'Osgild (game-icons.net, cf. `godDomainIcons.ts`) —
 * PARTIEL par nature (`CodexGodsBrowser` retombe sur l'icône de la voie d'origine quand absente).
 * Rendue en SVG inline pour hériter de `currentColor`.
 */
export function GodDomainIcon({ godId, size = 24, color = 'currentColor', sx }: GodDomainIconProps) {
  const markup = GOD_DOMAIN_ICON_PATHS[godId];
  if (!markup) return null;
  return (
    <Box
      component="svg"
      viewBox="0 0 512 512"
      aria-hidden
      sx={{
        display: 'inline-block',
        flexShrink: 0,
        width: size,
        height: size,
        fill: color,
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
