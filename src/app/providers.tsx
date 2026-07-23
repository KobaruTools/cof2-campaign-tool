'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { ThemeProvider } from '@mui/material/styles';
import { CharacterSyncNotifier } from '@/components/CharacterSyncNotifier';
import { PdfViewerHost } from '@/components/pdf/PdfViewerHost';
import { ToastProvider } from '@/components/toast/ToastProvider';
import theme from '@/theme';

/**
 * Providers client de l'application : intégration Emotion/MUI pour l'App Router
 * (évite le flash de styles au rendu serveur) + thème + reset CSS.
 */
export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AppRouterCacheProvider options={{ key: 'mui' }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/* Garde-fou responsive « passif » (PER-51) : les illustrations en
            filigrane de la fiche débordent volontairement de leur cadre pour
            l'effet de parallaxe. Sur grand écran ce débordement tombe dans les
            marges ; sur écran étroit il provoquerait un défilement horizontal.
            On le neutralise globalement (les zones à défilement horizontal
            voulu — tableau d'accueil, voies en colonnes — ont leur propre
            conteneur de défilement, non affecté). */}
        <GlobalStyles styles={{ body: { overflowX: 'hidden' } }} />
        {/* Toasts globaux empilés (bas droite) : `useToast()` accessible partout. */}
        <ToastProvider>{children}</ToastProvider>
        {/* Bandeau global de conflit de synchro + filet de flush avant fermeture (PER-192). */}
        <CharacterSyncNotifier />
        {/* Visualiseur PDF global : ouvert par tout renvoi de page (`SourceRef`), PER-240. */}
        <PdfViewerHost />
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
