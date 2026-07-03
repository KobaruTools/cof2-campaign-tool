'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Thème MUI par défaut (PRD décision #11 : ambiance médiéval-fantasy plus tard,
 * composant par composant). Thème sombre par défaut (PER-38) : confort de lecture
 * en session de jeu, souvent jouée le soir. En français.
 */
const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'dark',
  },
  typography: {
    fontFamily: 'var(--font-roboto), Roboto, Helvetica, Arial, sans-serif',
  },
  components: {
    // Infobulles : fond quasi-noir translucide avec flou d'arrière-plan, fine
    // bordure gris clair semi-transparente et ombre portée légère. Meilleur
    // contraste que le gris MUI par défaut. Source de vérité unique du look
    // des infobulles — tous les Tooltip (via AppTooltip) en héritent. La flèche
    // est activée par défaut ici pour éviter de la répéter à chaque appel.
    MuiTooltip: {
      defaultProps: {
        arrow: true,
      },
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(15, 15, 17, 0.82)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.14)',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
          color: 'rgba(255, 255, 255, 0.92)',
          fontSize: '0.75rem',
          lineHeight: 1.5,
          padding: '6px 10px',
          borderRadius: 8,
        },
        arrow: {
          // La flèche reprend la teinte du corps ; sa bordure n'est visible que
          // sur les deux arêtes extérieures (les deux autres sont masquées par la
          // bulle) — motif documenté par MUI pour les flèches bordées.
          color: 'rgba(15, 15, 17, 0.82)',
          '&::before': {
            border: '1px solid rgba(255, 255, 255, 0.14)',
          },
        },
      },
    },
  },
});

export default theme;
