import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';
import Providers from './providers';

const roboto = Roboto({
  variable: '--font-roboto',
  weight: ['300', '400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Éditeur de personnage CO2',
  description:
    'Création et simulation de personnages pour Chroniques Oubliées Fantasy 2e édition.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={roboto.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
