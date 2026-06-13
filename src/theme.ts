'use client';

import { createTheme } from '@mui/material/styles';

/**
 * Thème MUI par défaut (PRD décision #11 : ambiance médiéval-fantasy plus tard,
 * composant par composant). On reste sur le thème standard, en français.
 */
const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
  },
  typography: {
    fontFamily: 'var(--font-roboto), Roboto, Helvetica, Arial, sans-serif',
  },
});

export default theme;
