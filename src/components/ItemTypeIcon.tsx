import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ItemType } from '@/lib/character/types';
import { ITEM_TYPE_ICON_PATHS } from '@/lib/ui/itemTypeIcons';

export interface ItemTypeIconProps {
  /** Type d'objet d'inventaire (cf. `ItemType`) — clé dans `ITEM_TYPE_ICON_PATHS`. */
  type: ItemType;
  /** Taille en pixels (carré). Défaut 16. */
  size?: number;
  /** Couleur CSS de l'icône. Défaut `'currentColor'` (hérite de la couleur du texte). */
  color?: string;
  /** Texte alternatif accessible ; si absent, l'icône est décorative (aria-hidden). */
  title?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'un type d'objet (game-icons.net, cf. `itemTypeIcons.ts`) — épée, cuirasse,
 * bouclier, potion… Rendue en SVG inline pour être recolorée via `currentColor`. Sert
 * à préfixer le nom de chaque ligne d'inventaire (PER-213). Ne rend rien si le type
 * est inconnu.
 */
export function ItemTypeIcon({ type, size = 16, color = 'currentColor', title, sx }: ItemTypeIconProps) {
  const markup = ITEM_TYPE_ICON_PATHS[type];
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
