'use client';

import { createTheme, responsiveFontSizes } from '@mui/material/styles';

/**
 * Thème MUI par défaut (PRD décision #11 : ambiance médiéval-fantasy plus tard,
 * composant par composant). Thème sombre par défaut (PER-38) : confort de lecture
 * en session de jeu, souvent jouée le soir. En français.
 */
const baseTheme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'dark',
  },
  typography: {
    fontFamily: 'var(--font-roboto), Roboto, Helvetica, Arial, sans-serif',
  },
  components: {
    // Fenêtres modales (PER-227) : sur mobile (< breakpoint « sm »), on maximise la
    // largeur utile et on garantit qu'aucune modale ne peut déborder le viewport.
    // MUI laisse par défaut 32px de marge de chaque côté (64px perdus) : sur un écran
    // de 320px il ne reste que ~256px pour le contenu, et les champs à largeur fixe
    // débordent. On réduit la marge à 16px (32px perdus) et on borne la largeur/hauteur
    // au viewport. Fix GLOBAL (toutes les modales) plutôt que du cas par cas.
    MuiDialog: {
      styleOverrides: {
        paper: ({ theme }) => ({
          [theme.breakpoints.down('sm')]: {
            margin: 16,
            width: 'calc(100% - 32px)',
            maxWidth: 'calc(100% - 32px)',
            maxHeight: 'calc(100% - 32px)',
          },
        }),
      },
    },
    // Menus déroulants (Select, Menu) et popovers : ne PAS verrouiller le scroll
    // de la page à l'ouverture. Par défaut MUI fige le body (overflow:hidden +
    // compensation de padding) tant que le menu est ouvert, ce qui donne
    // l'impression que la page « saute » et devient non défilable. Ce verrou
    // n'a de sens que pour les vraies modales (Dialog/Modal), qu'on laisse
    // intactes. MuiPopover couvre Select/Menu/Popover (Menu rend un Popover).
    MuiPopover: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
    MuiMenu: {
      defaultProps: {
        disableScrollLock: true,
      },
    },
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

/**
 * Typographie adaptative (PER-227) : `responsiveFontSizes` ajoute des points d'arrêt
 * de taille de police aux variantes de titre (h1…h6, etc.), qui rétrécissent sur les
 * petits écrans. Corrige notamment le nom de personnage (`h4`, 2.125rem) qui débordait
 * sur mobile faute d'adaptation. N'affecte pas les tailles fixes posées en `sx`.
 */
const theme = responsiveFontSizes(baseTheme);

export default theme;
