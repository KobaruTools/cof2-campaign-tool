import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import type { SxProps, Theme } from '@mui/material/styles';
import type { Die } from '@/data/schema';
import { DIE_ICON_PATHS } from '@/lib/ui/diceIcons';

export interface DieIconProps {
  /** Type de dé (`'d4'`…`'d20'`) — clé dans `DIE_ICON_PATHS`. */
  die: Die;
  /** Taille en pixels (carré). Défaut 24. */
  size?: number;
  /**
   * Couleur de l'icône (chaîne CSS). Par défaut `currentColor`, pour hériter de
   * la couleur du texte.
   */
  color?: string;
  /**
   * Dé évolutif (« d4° », p. 43) : `die` reste la **valeur courante** (le dé
   * concret atteint au niveau, calculé via `scalingDie`), et l'icône reçoit le
   * marqueur « ° » du livre pour signaler qu'il grandira avec les niveaux.
   */
  evolving?: boolean;
  /** Niveau du personnage — enrichit l'info-bulle d'un dé évolutif. */
  level?: number;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'un dé polyédrique (game-icons.net, cf. `diceIcons.ts`). Rendue en SVG
 * inline pour pouvoir être recolorée via `currentColor`, et toujours enveloppée
 * d'une info-bulle nommant le dé (ex. « d6 ») — c'est le composant d'affichage
 * commun : tout dé montré au joueur doit passer par ici pour un rendu uniforme.
 *
 * Cas du dé évolutif (`evolving`) : on n'affiche jamais « d4° » comme tel mais
 * la valeur courante du dé, surmontée du marqueur « ° » (notation CO2 p. 43)
 * dans la couleur d'accent du thème.
 */
export function DieIcon({ die, size = 24, color, evolving = false, level, sx }: DieIconProps) {
  const markup = DIE_ICON_PATHS[die];
  if (!markup) return null;

  const label = evolving
    ? `${die} — dé évolutif${level !== undefined ? ` (niveau ${level})` : ''}`
    : die;

  const svg = (
    <Box
      component="svg"
      viewBox="0 0 512 512"
      role="img"
      aria-label={label}
      sx={{
        display: 'inline-block',
        flexShrink: 0,
        width: size,
        height: size,
        fill: color ?? 'currentColor',
        ...(evolving ? {} : sx),
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );

  return (
    <Tooltip title={label}>
      {evolving ? (
        <Box
          component="span"
          sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0, ...sx }}
        >
          {svg}
          <Box
            component="span"
            aria-hidden
            sx={{
              position: 'absolute',
              top: 0,
              right: 0,
              transform: 'translate(40%, -25%)',
              fontSize: Math.max(12, size * 0.55),
              fontWeight: 700,
              lineHeight: 1,
              color: 'secondary.main',
              pointerEvents: 'none',
            }}
          >
            °
          </Box>
        </Box>
      ) : (
        svg
      )}
    </Tooltip>
  );
}
