import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ImmunityId } from '@/data/schema';
import { STATUS_EFFECT_ICON_PATHS } from '@/lib/ui/statusEffectIcons';

export interface StatusEffectIconProps {
  /** Immunité d'état (cf. `ImmunityId`) — clé dans `STATUS_EFFECT_ICON_PATHS`. */
  effect: ImmunityId;
  /** Taille en pixels (carré). Défaut 16. */
  size?: number;
  /** Couleur CSS de l'icône. Défaut `'currentColor'` (hérite de la couleur du texte). */
  color?: string;
  /** Texte alternatif accessible ; si absent, l'icône est décorative (aria-hidden). */
  title?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'une immunité d'état (game-icons.net, cf. `statusEffectIcons.ts`) — visage de terreur,
 * ondes psychiques, escargot… Rendue en SVG inline pour être recolorée via `currentColor`. Sert
 * aux puces d'immunité d'état de la carte Défense, à la place du bouclier générique (le libellé
 * texte étant souvent tronqué dans les cellules à largeur fixe). Ne rend rien si l'id est inconnu.
 */
export function StatusEffectIcon({ effect, size = 16, color = 'currentColor', title, sx }: StatusEffectIconProps) {
  const markup = STATUS_EFFECT_ICON_PATHS[effect];
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
