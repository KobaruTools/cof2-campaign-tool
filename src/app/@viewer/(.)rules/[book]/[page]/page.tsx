import { notFound } from 'next/navigation';
import { isBookId } from '@/lib/ui/books';
import { RulesViewerModal } from '@/components/pdf/RulesViewerModal';

/**
 * Route INTERCEPTÉE du visualiseur PDF (PER-60), rendue dans le slot parallèle `@viewer`.
 * Déclenchée par une navigation DOUCE vers `/rules/{book}/{page}` (clic sur un renvoi in-app) :
 * le visualiseur s'ouvre en overlay PAR-DESSUS la page courante, préservée en dessous, et l'URL
 * `/rules/...` devient partageable. Un rechargement de cette URL ne passe plus par l'interception
 * et sert la page plein écran (`app/rules/[book]/[page]/page.tsx`).
 *
 * Matcher `(.)` : au niveau RACINE, Next.js impose `(.)` (et refuse `(..)`) pour intercepter une
 * route sœur (`rules`, enfant direct de `app`) depuis le slot `@viewer`.
 */
// Le terme ciblé (`?q=`) n'est PAS lu ici : dans un slot parallèle, `searchParams` n'est pas
// transmis de façon fiable au `page.tsx` intercepté. Il est lu côté client dans `RulesViewerModal`
// via `useSearchParams`. On ne consomme donc que `params` (fiable dans les slots).
export default async function RulesInterceptedPage({
  params,
}: {
  params: Promise<{ book: string; page: string }>;
}) {
  const { book, page } = await params;
  if (!isBookId(book)) notFound();
  const pageNum = Number.parseInt(page, 10);
  if (!Number.isFinite(pageNum) || pageNum < 1) notFound();
  return <RulesViewerModal bookId={book} page={pageNum} />;
}
