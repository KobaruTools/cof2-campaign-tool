'use client';

import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import CssBaseline from '@mui/material/CssBaseline';
import GlobalStyles from '@mui/material/GlobalStyles';
import { ThemeProvider } from '@mui/material/styles';
import { CharacterSyncNotifier } from '@/components/CharacterSyncNotifier';
import { PaidContentBoot } from '@/components/PaidContentBoot';
import { TextureBackground } from '@/components/TextureBackground';
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
        {/* TEST visuel (fond bleu texturé issu du livre, PER-432) — à retirer si non
            retenu. Composant dédié (pas un `body::before` CSS pur) : le parallaxe au
            scroll a besoin d'un ref DOM pour poser son `transform` à chaque frame. */}
        <TextureBackground />
        {/* Toasts globaux empilés (bas droite) : `useToast()` accessible partout. */}
        <ToastProvider>{children}</ToastProvider>
        {/* Bandeau global de conflit de synchro + filet de flush avant fermeture (PER-192). */}
        <CharacterSyncNotifier />
        {/* Chargement gaté du contenu payant « Le Compagnon » (PER-321) : sans effet
            pour un visiteur/joueur non entitlé, fusion des registres pour un propriétaire entitlé. */}
        <PaidContentBoot />
        {/* Le visualiseur PDF n'est plus monté ici : il est porté par le slot parallèle `@viewer`
            (route `/rules/...`, PER-60), overlay quand l'URL est interceptée. */}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
