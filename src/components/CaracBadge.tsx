'use client';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import type { SxProps, Theme } from '@mui/material/styles';
import type { CaracId } from '@/data/schema';
import { CARAC_NOMS } from '@/lib/ui/carac';

export interface CaracBadgeProps {
  carac: CaracId;
  /** Taille du badge — `sm` (défaut) pour l'inline, `md` pour les en-têtes. */
  size?: 'sm' | 'md';
  /**
   * Couleur d'accent (chaîne CSS, ex. `#4caf50`) appliquée à la bordure, au
   * texte et à un fond légèrement teinté. Sert à signaler un bonus/malus ou à
   * coder une catégorie. Rendu neutre si absent.
   */
  color?: string;
  /** Style additionnel fusionné par-dessus le style de base. */
  sx?: SxProps<Theme>;
}

const TAILLES = {
  sm: { px: 0.75, py: 0.125, fontSize: '0.72rem', minWidth: 34 },
  md: { px: 1, py: 0.375, fontSize: '0.85rem', minWidth: 40 },
} as const;

/**
 * Badge inline d'une caractéristique : affiche le code court (ex. « FOR ») avec
 * le nom complet en infobulle. Composant réutilisable partout où une carac doit
 * apparaître de façon compacte (profils, capacités, fiche…).
 */
export function CaracBadge({ carac, size = 'sm', color, sx }: CaracBadgeProps) {
  const t = TAILLES[size];
  return (
    <Tooltip title={CARAC_NOMS[carac]} arrow>
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
          borderColor: color ?? 'divider',
          bgcolor: color ? `color-mix(in srgb, ${color} 18%, transparent)` : 'action.hover',
          color: color ?? 'text.primary',
          cursor: 'default',
          userSelect: 'none',
          ...sx,
        }}
      >
        {carac}
      </Box>
    </Tooltip>
  );
}

export interface CaracBadgeListProps {
  caracs: CaracId[];
  size?: 'sm' | 'md';
  /** Couleur d'accent appliquée à tous les badges (cf. `CaracBadge`). */
  color?: string;
  /** Affiché quand la liste est vide. */
  vide?: React.ReactNode;
}

/** Rangée de badges de caractéristiques, à retour à la ligne automatique. */
export function CaracBadgeList({ caracs, size = 'sm', color, vide = '—' }: CaracBadgeListProps) {
  if (caracs.length === 0) return <>{vide}</>;
  return (
    <Stack direction="row" component="span" sx={{ flexWrap: 'wrap', gap: 0.5 }}>
      {caracs.map((c, i) => (
        <CaracBadge key={`${c}-${i}`} carac={c} size={size} color={color} />
      ))}
    </Stack>
  );
}
