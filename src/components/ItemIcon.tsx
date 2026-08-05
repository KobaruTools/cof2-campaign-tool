import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ItemIconId } from '@/data/item-icons';
import { itemIconLabel, itemIconMarkup } from '@/lib/ui/itemIcon';

export interface ItemIconProps {
  /** Id d'icône, tous étages confondus (type d'objet, sous-type d'arme, sous-catégorie). */
  id: ItemIconId;
  /** Taille en pixels (carré). Défaut 16. */
  size?: number;
  /** Couleur CSS de l'icône. Défaut `'currentColor'` (hérite de la couleur du texte). */
  color?: string;
  /**
   * Rendre l'icône accessible avec son libellé FR (`ITEM_ICON_LABELS`) au lieu de la laisser
   * décorative. À utiliser quand l'icône porte une information seule (grille du sélecteur).
   */
  labelled?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'un objet d'inventaire (game-icons.net) : type, sous-type d'arme ou sous-catégorie —
 * le composant ne se soucie pas de l'étage, il rend l'id qu'on lui donne. La résolution
 * « ligne d'inventaire → id » vit dans `itemIconId` (`src/lib/ui/itemIcon.ts`).
 *
 * Rendue en SVG inline pour être recolorée via `currentColor`. Ne rend rien si l'id est inconnu.
 */
export function ItemIcon({ id, size = 16, color = 'currentColor', labelled, sx }: ItemIconProps) {
  const markup = itemIconMarkup(id);
  if (!markup) return null;
  const label = labelled ? itemIconLabel(id) : undefined;
  return (
    <Box
      component="svg"
      viewBox="0 0 512 512"
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
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
