import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ResistibleDamageType } from '@/data/schema';
import { DAMAGE_TYPE_ICON_PATHS } from '@/lib/ui/damageTypeIcons';

export interface DamageTypeIconProps {
  /** Type de dégât réductible (cf. `ResistibleDamageType`) — clé dans `DAMAGE_TYPE_ICON_PATHS`. */
  type: ResistibleDamageType;
  /** Taille en pixels (carré). Défaut 16. */
  size?: number;
  /** Couleur CSS de l'icône. Défaut `'currentColor'` (hérite de la couleur du texte). */
  color?: string;
  /** Texte alternatif accessible ; si absent, l'icône est décorative (aria-hidden). */
  title?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'un type de dégât (game-icons.net, cf. `damageTypeIcons.ts`) — flamme, flocon, éclair…
 * Rendue en SVG inline pour être recolorée via `currentColor`. Sert aux puces de réduction de dégâts
 * et d'immunité de la carte Défense (PER-137). Ne rend rien si le type est inconnu.
 */
export function DamageTypeIcon({ type, size = 16, color = 'currentColor', title, sx }: DamageTypeIconProps) {
  const markup = DAMAGE_TYPE_ICON_PATHS[type];
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
        fill: color,
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
