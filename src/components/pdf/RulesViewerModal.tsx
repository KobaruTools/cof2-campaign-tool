'use client';

/**
 * Habillage MODALE du visualiseur PDF (PER-60), rendu par la route INTERCEPTÉE
 * `@viewer/(.)rules/[book]/[page]`. Superposé à la page courante (navigation douce depuis un
 * renvoi) ; fermer = `router.back()`, ce qui retire l'URL `/rules/...` de l'historique et
 * réaffiche la page en dessous.
 *
 * Le terme ciblé (`?q=`) est lu ICI, CÔTÉ CLIENT (`useSearchParams`), et NON via le prop
 * `searchParams` de la page serveur : dans un slot parallèle, `searchParams` n'est pas transmis de
 * façon fiable au `page.tsx` intercepté (contrairement à `params`) → il arriverait vide et le
 * passage ciblé ne serait ni surligné ni proposé à la bascule. Lecture client = robuste sur les
 * deux routes.
 *
 * Le composant lourd ([[PdfBookViewer]] + react-pdf/pdf.js) est chargé sans SSR (`ssr: false`) :
 * react-pdf touche à `window` et au worker pdf.js.
 */
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import type { BookId } from '@/lib/ui/books';

const PdfBookViewer = dynamic(() => import('./PdfBookViewer'), {
  ssr: false,
  loading: () => (
    <Box sx={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', zIndex: 1300 }}>
      <CircularProgress />
    </Box>
  ),
});

export function RulesViewerModal({ bookId, page }: { bookId: BookId; page: number }) {
  const router = useRouter();
  const term = useSearchParams().get('q') ?? undefined;
  return (
    <PdfBookViewer
      bookId={bookId}
      initialPage={page}
      term={term}
      chrome="dialog"
      onClose={() => router.back()}
    />
  );
}
