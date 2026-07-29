import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ImmunityId, StatusEffectId } from '@/data/schema';
import { STATUS_EFFECT_ICON_PATHS } from '@/lib/ui/statusEffectIcons';

export interface StatusEffectIconProps {
  /**
   * État de combat — soit une IMMUNITÉ d'état (`ImmunityId`, puces de la carte Défense), soit un
   * ÉTAT PRÉJUDICIABLE du glossaire (`StatusEffectId`, palette du Combat Tracker, PER-279). Clé dans
   * `STATUS_EFFECT_ICON_PATHS` (indexé par l'union des deux). Rien n'est rendu si l'id n'a pas d'icône.
   */
  effect: ImmunityId | StatusEffectId;
  /** Taille en pixels (carré). Défaut 16. */
  size?: number;
  /** Couleur CSS de l'icône. Défaut `'currentColor'` (hérite de la couleur du texte). */
  color?: string;
  /** Texte alternatif accessible ; si absent, l'icône est décorative (aria-hidden). */
  title?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'un état de combat (game-icons.net, cf. `statusEffectIcons.ts`) — visage de terreur, ondes
 * psychiques, escargot, bandeau, poumons… Rendue en SVG inline pour être recolorée via `currentColor`.
 * Sert aux puces d'immunité d'état de la carte Défense (à la place du bouclier générique, le libellé
 * texte étant souvent tronqué) ET à la palette d'états du Combat Tracker (PER-279). Ne rend rien si
 * l'id n'a pas d'icône.
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
