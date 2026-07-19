'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import type { SxProps, Theme } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import type { AbilityId } from '@/data/schema';
import { ABILITY_COLORS, ABILITY_NAMES } from '@/lib/ui/ability';

export interface AbilityBadgeProps {
  ability: AbilityId;
  /** Taille du badge — `sm` (défaut) pour l'inline, `md` pour les en-têtes. */
  size?: 'sm' | 'md';
  /**
   * Couleur d'accent (chaîne CSS, ex. `#4caf50`) appliquée à la bordure, au
   * texte et à un fond légèrement teinté. Sert à signaler un bonus/malus ou à
   * coder une catégorie. Par défaut, la TEINTE PROPRE de la caractéristique
   * (`ABILITY_COLORS`, PER-224), cohérente avec son icône partout dans l'app.
   */
  color?: string;
  /** Style additionnel fusionné par-dessus le style de base. */
  sx?: SxProps<Theme>;
}

const SIZES = {
  sm: { px: 0.75, py: 0.125, fontSize: '0.72rem', minWidth: 34 },
  md: { px: 1, py: 0.375, fontSize: '0.85rem', minWidth: 40 },
} as const;

/**
 * Badge inline d'une caractéristique : affiche le code court (ex. « FOR ») avec
 * le nom complet en infobulle. Composant réutilisable partout où une carac doit
 * apparaître de façon compacte (profils, capacités, fiche…).
 */
export function AbilityBadge({ ability, size = 'sm', color, sx }: AbilityBadgeProps) {
  const t = SIZES[size];
  // Sans couleur explicite (bonus/malus, catégorie), on retombe sur la teinte propre de
  // la caractéristique (`ABILITY_COLORS`) : chip cohérent avec son icône partout (PER-224).
  const accent = color ?? ABILITY_COLORS[ability];
  return (
    <AppTooltip title={ABILITY_NAMES[ability]}>
      <Box
        component="span"
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          px: t.px,
          py: t.py,
          minWidth: t.minWidth,
          fontSize: t.fontSize,
          fontWeight: 700,
          letterSpacing: 0.5,
          lineHeight: 1.4,
          borderRadius: 1,
          border: 1,
          borderColor: accent,
          bgcolor: `color-mix(in srgb, ${accent} 18%, transparent)`,
          color: accent,
          cursor: 'default',
          userSelect: 'none',
          ...sx,
        }}
      >
        {ability}
      </Box>
    </AppTooltip>
  );
}

export interface AbilityBadgeListProps {
  abilities: AbilityId[];
  size?: 'sm' | 'md';
  /** Couleur d'accent appliquée à tous les badges (cf. `AbilityBadge`). */
  color?: string;
  /** Affiché quand la liste est vide. */
  empty?: React.ReactNode;
}

/** Rangée de badges de caractéristiques, à retour à la ligne automatique. */
export function AbilityBadgeList({ abilities, size = 'sm', color, empty = '—' }: AbilityBadgeListProps) {
  if (abilities.length === 0) return <>{empty}</>;
  return (
    <Stack direction="row" component="span" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      {abilities.map((c, i) => (
        <AbilityBadge key={`${c}-${i}`} ability={c} size={size} color={color} />
      ))}
    </Stack>
  );
}
