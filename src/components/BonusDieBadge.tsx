import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { DieIcon } from '@/components/DieIcon';

export interface BonusDieBadgeProps {
  /**
   * Caractéristique concernée (pour le libellé de l'info-bulle, ex. « CON »).
   * Une créature passe directement la carac ; le personnage la passe aussi.
   */
  ability: string;
  /**
   * Capacité(s) source(s) du dé bonus (français) — listées dans l'info-bulle. Vide
   * pour une créature dont la source est l'option choisie (libellé générique alors).
   */
  sources?: string[];
  /** Taille en pixels d'un dé (les deux dés sont légèrement décalés). Défaut 16. */
  size?: number;
  sx?: SxProps<Theme>;
}

/**
 * Icône « double d20 » signalant un DÉ BONUS permanent aux tests d'une caractéristique
 * (mécanique core CO2 : « lance 2d20, garde le meilleur »). Deux d20 légèrement
 * superposés, en teinte d'accent, avec une info-bulle nommant la carac et la/les
 * capacité(s) source(s). Posée à droite du chiffre de la carac (fiche + mini-fiches
 * de créatures).
 */
export function BonusDieBadge({ ability, sources = [], size = 16, sx }: BonusDieBadgeProps) {
  const title =
    sources.length > 0
      ? `Dé bonus aux tests de ${ability} — ${sources.join(', ')}`
      : `Dé bonus aux tests de ${ability}`;
  return (
    <AppTooltip title={title}>
      <Box
        component="span"
        aria-label={title}
        sx={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          width: size * 1.4,
          height: size,
          color: 'secondary.main',
          cursor: 'help',
          flexShrink: 0,
          ...sx,
        }}
      >
        <DieIcon die="d20" size={size} noTooltip sx={{ position: 'absolute', left: 0, opacity: 0.55 }} />
        <DieIcon die="d20" size={size} noTooltip sx={{ position: 'absolute', left: size * 0.4 }} />
      </Box>
    </AppTooltip>
  );
}
