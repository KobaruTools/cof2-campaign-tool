'use client';

import type { ReactNode } from 'react';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { darken } from '@mui/material/styles';

export interface GaugeIconCapProps {
  /** Couleur (concrète) de la barre : le fond reprend la teinte assombrie (même que le cap d'expansion). */
  color: string;
  /** Libellé de la jauge, affiché en info-bulle au survol (remplace le texte de titre supprimé). */
  label: string;
  /** Hauteur (= hauteur de la barre) en pixels. Défaut 24. */
  height?: number;
  /** Icône (dessinée en blanc par l'appelant pour contraster sur le fond coloré). */
  children: ReactNode;
}

/**
 * Cap d'icône d'une barre de jauge (PER-149) : bloc de la hauteur et de la couleur
 * de la barre (teinte assombrie, identique au cap d'expansion) placé juste à gauche
 * de la barre, avec l'icône blanche au centre. Carré (les coins arrondis sont portés
 * par le cap d'expansion à l'extrême gauche et par la barre à droite) pour former une
 * zone colorée continue. L'info-bulle porte le libellé de la jauge.
 */
export function GaugeIconCap({ color, label, height = 24, children }: GaugeIconCapProps) {
  return (
    <Tooltip title={label} arrow>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          height,
          px: 0.5,
          color: '#fff',
          bgcolor: darken(color, 0.35),
        }}
      >
        {children}
      </Box>
    </Tooltip>
  );
}
