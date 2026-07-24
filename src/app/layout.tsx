import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import Providers from './providers';
import { AppFooter } from '@/components/AppFooter';

const roboto = Roboto({
  variable: '--font-roboto',
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

// Pas de `title` ici : le layout est partagé par toutes les routes, donc un
// titre statique créerait un <title> contrôlé par Next présent partout. Comme
// le navigateur retient le PREMIER <title> du <head>, ce nœud global gagnerait
// toujours contre le titre dynamique de la fiche. Chaque page rend donc son
// propre <title> (React 19 le hisse dans le <head>), seul nœud de sa route.
export const metadata: Metadata = {
  description:
    'Création et simulation de personnages pour Chroniques Oubliées Fantasy 2e édition.',
  // App privée (table de jeu) : publique mais jamais référencée par les moteurs.
  robots: { index: false, follow: false },
};

// `viewer` : slot parallèle du visualiseur PDF (PER-60), rendu par-dessus la page courante quand
// une URL `/rules/{book}/{page}` est interceptée (navigation douce), `null` sinon. C'est ce qui
// fait de l'ouverture du visualiseur une URL partageable tout en préservant la page en dessous.
// On s'appuie sur le type `LayoutProps<'/'>` généré par Next (inclut `children` + le slot `viewer`).
export default function RootLayout({ children, viewer }: LayoutProps<'/'>) {
  return (
    <html lang="fr" className={roboto.variable} style={{ colorScheme: 'dark' }}>
      <body>
        <Providers>
          {/* Sticky footer : colonne pleine hauteur, le contenu prend l'espace
              disponible (`flex: 1 0 auto`) et pousse le footer tout en bas même
              quand la page est trop courte pour remplir l'écran.
              `position: relative` : sert d'ancre aux fonds calés au BAS DE LA PAGE
              (illustration de couverture en variante footer, `position: absolute`),
              qui se placent ainsi derrière le pied de page plutôt qu'au bas du
              seul contenu. */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              minHeight: '100dvh',
            }}
          >
            <div style={{ flex: '1 0 auto' }}>{children}</div>
            <AppFooter />
          </div>
          {/* Visualiseur PDF (slot parallèle `@viewer`, PER-60) : overlay superposé quand une URL
              `/rules/...` est interceptée, `null` autrement. Sous `Providers` pour hériter du thème. */}
          {viewer}
        </Providers>
      </body>
    </html>
  );
}
