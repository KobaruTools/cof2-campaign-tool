'use client';

import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';

/** Un segment REMPLI d'une jauge (portion colorée de largeur proportionnelle au max). */
export interface GaugeSegment {
  /** Clé de rendu React. */
  key: string;
  /** Valeur (unités) de ce segment ; sa largeur = `value / max`. */
  value: number;
  /** Couleur CSS de remplissage. */
  color: string;
  /** Libellé d'info-bulle du segment (ex. « PV actuels : 18 »). */
  label?: string;
}

export interface GaugeBarProps {
  /** Maximum de la jauge : la largeur totale de la barre représente `max` unités. */
  max: number;
  /**
   * Segments remplis, dans l'ordre d'affichage (gauche → droite). Leur somme peut
   * être inférieure au max (le reste apparaît en piste vide) ; un dépassement est
   * simplement écrêté par la largeur de la piste.
   */
  segments: GaugeSegment[];
  /** Hauteur de la barre en pixels. Défaut 22. */
  height?: number;
}

/**
 * Barre de jauge réutilisable (PER-148) : une piste arrondie sur laquelle
 * s'empilent horizontalement des segments colorés de largeur proportionnelle au
 * `max`. Pensée pour toutes les jauges du bloc « État du personnage » — PV
 * (bicolore létal/temp), mana, ressources de capacité. Purement présentationnelle :
 * elle ne connaît ni la sémantique des segments ni les règles, seulement des
 * largeurs et des couleurs.
 */
export function GaugeBar({ max, segments, height = 22 }: GaugeBarProps) {
  const safeMax = Math.max(0, max);
  const pct = (value: number) => (safeMax > 0 ? `${Math.max(0, Math.min(100, (value / safeMax) * 100))}%` : '0%');
  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        width: '100%',
        height,
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: alpha(theme.palette.text.primary, 0.1),
        border: `1px solid ${alpha(theme.palette.text.primary, 0.15)}`,
      })}
    >
      {segments.map((seg) =>
        seg.value <= 0 ? null : (
          <Tooltip key={seg.key} title={seg.label ?? ''} arrow disableInteractive>
            <Box
              sx={{
                width: pct(seg.value),
                height: '100%',
                bgcolor: seg.color,
                transition: 'width 0.2s',
              }}
            />
          </Tooltip>
        ),
      )}
    </Box>
  );
}
