'use client';

/**
 * Habillage PLEIN ÉCRAN du visualiseur PDF (PER-60), rendu par la route réelle
 * `/rules/[book]/[page]`. Servi au rechargement / lien partagé / ouverture dans un nouvel onglet
 * (aucune interception : navigation dure). Fermer revient à la page précédente si l'historique en
 * contient une (cas du rechargement depuis l'app), sinon renvoie à l'accueil (onglet neuf).
 *
 * Le terme ciblé (`?q=`) est lu CÔTÉ CLIENT (`useSearchParams`) pour rester cohérent avec la
 * variante interceptée [[RulesViewerModal]] (où `searchParams` serveur n'est pas fiable dans un
 * slot parallèle).
 *
 * Le composant lourd ([[PdfBookViewer]] + react-pdf/pdf.js) est chargé sans SSR (`ssr: false`).
 */
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import type { BookId } from '@/lib/ui/books';

const PdfBookViewer = dynamic(() => import('./PdfBookViewer'), {
  ssr: false,
  loading: () => (
    <Box sx={{ height: '100dvh', display: 'grid', placeItems: 'center' }}>
      <CircularProgress />
    </Box>
  ),
});

export function RulesViewerPage({ bookId, page }: { bookId: BookId; page: number }) {
  const router = useRouter();
  const term = useSearchParams().get('q') ?? undefined;
  const close = () => {
    // Onglet neuf (une seule entrée d'historique) → pas de « précédent » utile : on renvoie à
    // l'accueil. Sinon (rechargement depuis l'app), on revient à la page d'où l'on venait.
    if (typeof window !== 'undefined' && window.history.length > 1) router.back();
    else router.push('/');
  };
  return (
    <PdfBookViewer
      bookId={bookId}
      initialPage={page}
      term={term}
      chrome="page"
      onClose={close}
    />
  );
}
