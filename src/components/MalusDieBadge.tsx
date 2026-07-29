import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { DieIcon } from '@/components/DieIcon';

export interface MalusDieBadgeProps {
  /**
   * Complément de libellé pour l'info-bulle (ex. « aux attaques à distance qui vous ciblent »).
   * Le préfixe « Dé malus » et le rappel « 2d20, garde le pire » sont toujours ajoutés.
   */
  label?: string;
  /** Taille en pixels d'un dé (les deux dés sont légèrement décalés). Défaut 16. */
  size?: number;
  /**
   * Supprime l'info-bulle propre du badge (le libellé reste en `aria-label`/`title`
   * natif). À utiliser quand le badge est posé À L'INTÉRIEUR d'un autre déclencheur
   * d'info-bulle (ex. un badge de carte), pour ne pas empiler deux bulles MUI.
   */
  noTooltip?: boolean;
  sx?: SxProps<Theme>;
}

/**
 * Icône « double d20 BARRÉ » signalant un DÉ MALUS (« lance 2d20, garde le PIRE ») — l'inverse
 * exact du DÉ BONUS (`BonusDieBadge`, double d20 non barré). Deux d20 légèrement superposés, le dé
 * de devant traversé d'une barre diagonale, TOUJOURS en ROUGE (`error.main`) pour marquer l'aspect
 * négatif, quelle que soit la couleur du contexte. Réutilisable partout où un dé malus doit être
 * signalé (aujourd'hui : Cape d'ombre, dé malus imposé aux tirs adverses ciblant le personnage).
 */
export function MalusDieBadge({ label, size = 16, noTooltip, sx }: MalusDieBadgeProps) {
  const title = label ? `Dé malus ${label} — 2d20, garde le pire` : 'Dé malus — 2d20, garde le pire';
  const badge = (
    <Box
      component="span"
      aria-label={title}
      title={noTooltip ? title : undefined}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: size * 1.4,
        height: size,
        // ROUGE en dur : le dé malus reste rouge même dans un badge d'une autre couleur.
        color: 'error.main',
        cursor: noTooltip ? 'inherit' : 'help',
        flexShrink: 0,
        ...sx,
      }}
    >
      <DieIcon die="d20" size={size} noTooltip sx={{ position: 'absolute', left: 0, opacity: 0.5 }} />
      <DieIcon die="d20" size={size} noTooltip sx={{ position: 'absolute', left: size * 0.4 }} />
      {/* Barre diagonale sur le dé de devant : ce dé est écarté (on garde le moins bon). */}
      <Box
        aria-hidden
        sx={{
          position: 'absolute',
          left: size * 0.4,
          top: '50%',
          width: size,
          height: Math.max(2, size * 0.14),
          bgcolor: 'currentColor',
          borderRadius: 1,
          transform: 'translateY(-50%) rotate(-45deg)',
          transformOrigin: 'center',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.55)',
        }}
      />
    </Box>
  );
  return noTooltip ? badge : <AppTooltip title={title}>{badge}</AppTooltip>;
}
