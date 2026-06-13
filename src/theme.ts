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
});

export default theme;
