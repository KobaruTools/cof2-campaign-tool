import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import type { ItemType } from '@/lib/character/types';
import { ITEM_TYPE_ICON_PATHS } from '@/lib/ui/itemTypeIcons';
import { WEAPON_KIND_ICON_PATHS } from '@/lib/ui/weaponKindIcons';
import type { WeaponIconKind } from '@/lib/ui/weaponKind';

export interface ItemTypeIconProps {
  /** Type d'objet d'inventaire (cf. `ItemType`) — clé dans `ITEM_TYPE_ICON_PATHS`. */
  type: ItemType;
  /**
   * SOUS-TYPE d'arme (épée, hache, arc, arbalète…), qui REMPLACE l'icône générique du type
   * `weapon` : les armes partageaient toutes une épée, illisible dans un inventaire fourni.
   * Résolu par `weaponIconKind(line)`. Absent (ou type ≠ `weapon`) → icône du type.
   */
  weaponKind?: WeaponIconKind | null;
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
 *
 * Pour une ARME, `weaponKind` affine l'icône au sous-type réel de l'arme (hache, arc,
 * arbalète… cf. `weaponKindIcons.ts`) au lieu de l'épée générique du type.
 */
export function ItemTypeIcon({
  type,
  weaponKind,
  size = 16,
  color = 'currentColor',
  title,
  sx,
}: ItemTypeIconProps) {
  const markup =
    (type === 'weapon' && weaponKind ? WEAPON_KIND_ICON_PATHS[weaponKind] : undefined) ??
    ITEM_TYPE_ICON_PATHS[type];
  if (!markup) return null;
  return (
    <Box
      component="svg"
      data-glossary-shot="ItemTypeIcon"
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
