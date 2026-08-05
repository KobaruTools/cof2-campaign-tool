'use client';

/**
 * Variante « tiroir » de `RulesBookSplitButton` (menu burger de l'en-tête, sous
 * `HEADER_BURGER_BREAKPOINT`) : dans un tiroir, la place verticale n'est pas contrainte
 * comme dans la Toolbar — pas besoin du chevron/menu au survol, chaque livre débloqué
 * est simplement une ligne pleine largeur sous le livre de base. Même hook de fetch des
 * entitlements (`useUnlockedBooks`) que le bouton scindé desktop : un seul et même fetch,
 * jamais les deux à la fois (l'un ou l'autre est monté selon la largeur).
 */
import Link from 'next/link';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import { useUnlockedBooks } from '@/lib/ui/useUnlockedBooks';
import { BOOKS, DEFAULT_BOOK_ID, rulesHref } from '@/lib/ui/books';

export function RulesBookDrawerItems({ onNavigate }: { onNavigate: () => void }) {
  const unlockedBooks = useUnlockedBooks();
  const books = [BOOKS[DEFAULT_BOOK_ID], ...unlockedBooks];

  return (
    <>
      {books.map((book) => {
        const Icon = book.Icon;
        return (
          <ListItemButton
            key={book.id}
            component={Link}
            href={rulesHref(book.id, 1)}
            onClick={onNavigate}
          >
            <ListItemIcon>
              <Icon />
            </ListItemIcon>
            <ListItemText>{book.name}</ListItemText>
          </ListItemButton>
        );
      })}
    </>
  );
}
