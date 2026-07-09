import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { SECTION_ICON_PATHS, type SectionIconName } from '@/lib/ui/sectionIcons';

export interface SectionIconProps {
  /** Clé de l'icône de section (cf. `SectionIconName`). */
  name: SectionIconName;
  /** Côté du carré en pixels. Défaut 22. */
  size?: number;
  /**
   * Couleur de l'icône (chaîne CSS). Par défaut `currentColor`, pour hériter de
   * la couleur du titre de section.
   */
  color?: string;
  /**
   * Texte alternatif accessible. Absent → l'icône est décorative (aria-hidden),
   * ce qui convient à côté d'un titre qui la libelle déjà.
   */
  title?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône ornant le titre d'une section de la fiche de personnage. SVG inline
 * (game-icons.net, cf. `sectionIcons.ts`) recolorable via `currentColor`.
 * Composant d'affichage commun : toute icône de titre passe par ici.
 */
export function SectionIcon({ name, size = 22, color, title, sx }: SectionIconProps) {
  const markup = SECTION_ICON_PATHS[name];
  if (!markup) return null;
  return (
    <Box
      component="svg"
      viewBox="0 0 512 512"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      sx={{
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
