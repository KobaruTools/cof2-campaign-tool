import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import type { AbilityId } from '@/data/schema';
import { ABILITY_ICON_PATHS } from '@/lib/ui/abilityIcons';
import { ABILITY_COLORS, ABILITY_NAMES } from '@/lib/ui/ability';

export interface AbilityIconProps {
  /** Id de la caractéristique (ex. `'FOR'`) — clé dans `ABILITY_ICON_PATHS`. */
  ability: AbilityId;
  /** Taille en pixels (carré). Défaut 24. */
  size?: number;
  /**
   * Couleur de l'icône (chaîne CSS). Par défaut, la TEINTE PROPRE de la caractéristique
   * (`ABILITY_COLORS`, PER-224) : chaque carac est identifiable d'un coup d'œil, partout
   * où son icône apparaît (fiche, wizard, résumés, écran MJ, profils de créature…).
   * Passer une chaîne force une autre couleur (ex. `#fff` sur un fond de profil).
   */
  color?: string;
  /**
   * Texte alternatif accessible. Si `true`, utilise le libellé standard de la
   * caractéristique ; si une chaîne, l'utilise telle quelle ; si absent, l'icône
   * est décorative (aria-hidden).
   */
  title?: string | true;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'une caractéristique (game-icons.net, cf. `abilityIcons.ts`). Rendue en
 * SVG inline pour pouvoir être recolorée via `currentColor`. C'est le composant
 * d'affichage commun : toute caractéristique illustrée doit passer par ici.
 */
export function AbilityIcon({ ability, size = 24, color, title, sx }: AbilityIconProps) {
  const markup = ABILITY_ICON_PATHS[ability];
  if (!markup) return null;
  const label = title === true ? ABILITY_NAMES[ability] : title;
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
        fill: color ?? ABILITY_COLORS[ability],
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: markup }}
    />
  );
}
