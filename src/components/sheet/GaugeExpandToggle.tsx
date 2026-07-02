'use client';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { darken } from '@mui/material/styles';

export interface GaugeExpandToggleProps {
  /** Options détaillées actuellement dépliées ? */
  expanded: boolean;
  /** Bascule déplié/replié. */
  onToggle: () => void;
  /** Couleur (concrète) de la barre : le cap en reprend la teinte, assombrie. */
  color: string;
  /** Hauteur (= hauteur de la barre) en pixels. Défaut 24. */
  height?: number;
}

/**
 * Cap gauche discret d'une barre de jauge (PER-149) : bouton intégré visuellement à
 * la barre (coins gauches arrondis, couleur de la barre assombrie) qui déplie/replie
 * les options détaillées affichées en dessous. Le chevron pivote selon l'état.
 */
export function GaugeExpandToggle({ expanded, onToggle, color, height = 24 }: GaugeExpandToggleProps) {
  return (
    <Tooltip title={expanded ? 'Masquer les options' : 'Plus d’options'} arrow>
      <Box
        component="button"
        type="button"
        onClick={onToggle}
        aria-label={expanded ? 'Masquer les options' : 'Plus d’options'}
        aria-expanded={expanded}
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          width: 20,
          height,
          p: 0,
          border: 'none',
          cursor: 'pointer',
          color: 'rgba(255, 255, 255, 0.85)',
          bgcolor: darken(color, 0.35),
          borderTopLeftRadius: theme.shape.borderRadius,
          borderBottomLeftRadius: theme.shape.borderRadius,
          transition: 'background-color 0.15s',
          '&:hover': { bgcolor: darken(color, 0.2) },
        })}
      >
        <ExpandMoreIcon
          sx={{ fontSize: 16, transition: 'transform 0.2s', transform: expanded ? 'rotate(180deg)' : 'none' }}
        />
      </Box>
    </Tooltip>
  );
}
