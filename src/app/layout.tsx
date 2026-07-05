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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={roboto.variable} style={{ colorScheme: 'dark' }}>
      <body>
        <Providers>
          {children}
          <AppFooter />
        </Providers>
      </body>
    </html>
  );
}
