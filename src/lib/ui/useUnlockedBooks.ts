'use client';

/**
 * Livres payants débloqués ET réellement servis (hors livre de base) pour le compte
 * courant. Extrait de `RulesBookSplitButton` (PER-254) pour être partagé avec
 * `RulesBookDrawerItems`, sa variante « tiroir » utilisée sous le seuil burger de
 * l'en-tête (`AppHeaderNavDrawer`) — un seul et même fetch d'entitlements, quelle que
 * soit la présentation.
 *
 * **Auto-gating** : la liste vient des entitlements du compte courant (`listUnlockedSources`,
 * RLS). On ne la charge que pour une session PROPRIÉTAIRE réelle — rien sans Supabase
 * (mode local), rien sans session (visiteur non connecté : aucune requête), rien pour une
 * session JOUEUR anonyme. Toute erreur est silencieuse (best-effort) : liste vide.
 */
import { useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { listUnlockedSources } from '@/lib/bestiary';
import { BOOKS, DEFAULT_BOOK_ID, bookIdForSourceSlug, type BookMeta } from '@/lib/ui/books';

const IS_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

export function useUnlockedBooks(): BookMeta[] {
  const [unlockedBooks, setUnlockedBooks] = useState<BookMeta[]>([]);

  useEffect(() => {
    if (!IS_CONFIGURED) return;
    let cancelled = false;
    const supabase = createBrowserSupabaseClient();
    // `getSession()` lit la session en cache local (aucun réseau). Pas de session →
    // visiteur non connecté : on n'interroge JAMAIS les entitlements. Session joueur
    // (anonyme scopé) → pas de contenu payant à lui proposer.
    void supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (cancelled || !user) return;
      const isPlayer = Boolean(
        (user.app_metadata as { player_id?: string } | undefined)?.player_id,
      );
      if (isPlayer) return;
      void listUnlockedSources()
        .then((sources) => {
          if (cancelled) return;
          // Croise chaque source débloquée avec le registre des livres, en ne gardant
          // que les livres RÉELLEMENT servis (`available !== false`) et distincts du
          // livre de base (ajouté à part en tête de liste). Dédoublonne par id de livre.
          const byId = new Map<string, BookMeta>();
          for (const source of sources) {
            const bookId = bookIdForSourceSlug(source.slug);
            if (!bookId || bookId === DEFAULT_BOOK_ID) continue;
            const book = BOOKS[bookId];
            if (book.available === false) continue;
            byId.set(book.id, book);
          }
          setUnlockedBooks([...byId.values()]);
        })
        .catch(() => {
          /* silencieux : liste vide en cas d'erreur, le reste de l'UI fonctionne */
        });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return unlockedBooks;
}
