import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { DERIVED_STAT_ICON_PATHS } from '@/lib/ui/derivedStatIcons';
import { DERIVED_STAT_NAMES, type DerivedStatId } from '@/lib/ui/derivedStats';

export interface DerivedStatIconProps {
  /** Id de la statistique dérivée (cf. `DerivedStatId`). */
  statId: DerivedStatId;
  /** Diamètre du cercle en pixels. Défaut 40. */
  size?: number;
  /**
   * Couleur de l'icône et du cercle (chaîne CSS). Par défaut `currentColor`,
   * pour hériter de la couleur du texte (cercle « blanc » sur fond sombre).
   */
  color?: string;
  /**
   * Texte alternatif accessible. Si `true`, utilise le libellé standard de la
   * stat ; si une chaîne, l'utilise telle quelle ; si absent, l'icône est
   * décorative (aria-hidden).
   */
  title?: string | true;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'une statistique dérivée, cerclée à la manière des fiches Chroniques
 * Oubliées. SVG inline (game-icons.net, cf. `derivedStatIcons.ts`) recolorable
 * via `currentColor`. Composant d'affichage commun : toute stat dérivée doit
 * passer par ici pour garder un rendu uniforme dans l'app.
 */
export function DerivedStatIcon({ statId, size = 40, color, title, sx }: DerivedStatIconProps) {
  const markup = DERIVED_STAT_ICON_PATHS[statId];
  if (!markup) return null;
  const label = title === true ? DERIVED_STAT_NAMES[statId] : title;
  return (
    <Box
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        width: size,
        height: size,
        borderRadius: '50%',
        border: '2px solid',
        borderColor: color ?? 'currentColor',
        color: color ?? 'currentColor',
        ...sx,
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 512 512"
        sx={{ width: '58%', height: '58%', fill: 'currentColor' }}
        dangerouslySetInnerHTML={{ __html: markup }}
      />
    </Box>
  );
}
