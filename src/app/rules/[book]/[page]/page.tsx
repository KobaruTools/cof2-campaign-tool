import { notFound } from 'next/navigation';
import { isBookId } from '@/lib/ui/books';
import { RulesViewerPage } from '@/components/pdf/RulesViewerPage';

/**
 * Route RÉELLE du visualiseur PDF (PER-60) : `/rules/{book}/{page}[?q=terme]`, rendue plein écran.
 * Servie au rechargement, au lien partagé ou à l'ouverture dans un nouvel onglet (aucune
 * interception). Depuis l'app, un renvoi (`SourceRef`) navigue en douceur vers cette même URL et
 * c'est la variante INTERCEPTÉE (`@viewer/(.)rules/...`) qui prend le relais en overlay.
 *
 * Le terme ciblé (`?q=`) est lu côté client dans `RulesViewerPage` (`useSearchParams`), par
 * cohérence avec la route interceptée — on ne consomme donc ici que `params`.
 */
export default async function RulesFullScreenPage({
  params,
}: {
  params: Promise<{ book: string; page: string }>;
}) {
  const { book, page } = await params;
  if (!isBookId(book)) notFound();
  const pageNum = Number.parseInt(page, 10);
  if (!Number.isFinite(pageNum) || pageNum < 1) notFound();
  return <RulesViewerPage bookId={book} page={pageNum} />;
}
