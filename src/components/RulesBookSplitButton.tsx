'use client';

/**
 * Bouton « Livre des règles » de l'en-tête, transformé en **bouton scindé**
 * (split-button, PER-254).
 *
 *  - **Corps** : comportement inchangé — ancre vers le livre de base dans le
 *    visualiseur. Zéro régression pour qui n'a rien débloqué.
 *  - **Chevron accolé** (discret, même teinte que la nav, sans séparateur) : présent
 *    UNIQUEMENT si le compte a débloqué au moins un livre payant réellement servi dans
 *    le visualiseur. Ouvre un menu listant le livre de base en tête + ces livres payants ;
 *    chaque entrée est une vraie ancre vers le livre correspondant.
 *
 * Ouverture du menu : **survol** du chevron sur périphérique pointeur (desktop),
 * **clic** au tactile (le survol n'y existe pas). Le clic reste toujours actif (clavier
 * inclus), quel que soit le périphérique.
 *
 * **Auto-gating des données** : la liste des livres débloqués vient des entitlements du
 * compte courant (`listUnlockedSources`, RLS). On ne la charge que pour une session
 * PROPRIÉTAIRE réelle — rien sans Supabase (mode local), rien sans session (visiteur non
 * connecté : aucune requête), rien pour une session JOUEUR anonyme. Toute erreur est
 * silencieuse (best-effort) : pas de chevron, le corps reste fonctionnel.
 */
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { HeaderNavButton } from '@/components/HeaderNavButton';
import { useUnlockedBooks } from '@/lib/ui/useUnlockedBooks';
import { BOOKS, DEFAULT_BOOK_ID, rulesHref, type BookMeta } from '@/lib/ui/books';

/** Délai avant fermeture au survol : laisse le temps de traverser le vide chevron → menu. */
const HOVER_CLOSE_DELAY_MS = 120;

export function RulesBookSplitButton() {
  // Livres payants débloqués ET réellement servis (hors livre de base) ; vide par défaut
  // (aucun chevron) jusqu'à ce que le fetch d'entitlements aboutisse pour une session proprio.
  const unlockedBooks = useUnlockedBooks();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  // Le menu a-t-il été ouvert par une action explicite (clic/clavier) plutôt que par
  // survol ? Détermine l'autofocus : au clavier on focalise le premier item (navigation
  // aux flèches) ; au survol on NE vole PAS le focus (ce serait déroutant, et ça peut
  // faire défiler la page).
  const [openedByIntent, setOpenedByIntent] = useState(false);
  // Périphérique capable de survol (desktop) ? Décidé après montage (matchMedia = navigateur).
  const [hoverCapable, setHoverCapable] = useState(false);
  const chevronRef = useRef<HTMLButtonElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = anchorEl !== null;

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover)');
    const update = () => setHoverCapable(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setAnchorEl(null), HOVER_CLOSE_DELAY_MS);
  };
  useEffect(() => cancelClose, []);

  const BaseIcon = BOOKS[DEFAULT_BOOK_ID].Icon;
  // Menu = livre de base en tête, puis les livres payants débloqués.
  const menuBooks: BookMeta[] = [BOOKS[DEFAULT_BOOK_ID], ...unlockedBooks];

  const body = (
    <HeaderNavButton
      href={rulesHref(DEFAULT_BOOK_ID, 1)}
      icon={<BaseIcon sx={{ fontSize: 20 }} />}
      label="Livre des règles"
    />
  );

  // Aucun livre payant débloqué : bouton simple, strictement identique à avant.
  // `display: contents` : le wrapper de tag ne doit rien changer au layout du bouton seul.
  if (unlockedBooks.length === 0) {
    return (
      <Box sx={{ display: 'contents' }} data-glossary-shot="RulesBookSplitButton">
        {body}
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'inline-flex', alignItems: 'center' }} data-glossary-shot="RulesBookSplitButton">
      {body}
      <Button
        ref={chevronRef}
        color="inherit"
        aria-label="Autres livres débloqués"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          cancelClose();
          setOpenedByIntent(true);
          setAnchorEl((prev) => (prev ? null : chevronRef.current));
        }}
        onMouseEnter={
          hoverCapable
            ? () => {
                cancelClose();
                setOpenedByIntent(false);
                setAnchorEl(chevronRef.current);
              }
            : undefined
        }
        onMouseLeave={hoverCapable ? scheduleClose : undefined}
        sx={{
          minWidth: 0,
          px: 0.25,
          py: 0.5,
          ml: -0.5,
        }}
      >
        <KeyboardArrowDownIcon
          sx={(theme) => ({
            fontSize: 20,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: theme.transitions.create('transform', {
              duration: theme.transitions.duration.short,
            }),
          })}
        />
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        disableScrollLock
        // En mode survol (desktop), on autorise le pointeur à traverser le backdrop
        // (sinon il capterait le survol et fermerait le menu aussitôt) ; le paper le
        // ré-active pour rester cliquable. En mode tactile, backdrop normal (clic-ailleurs
        // ferme). L'autofocus n'est activé qu'au clic/clavier (gêne au survol).
        disableAutoFocusItem={!openedByIntent}
        sx={hoverCapable ? { pointerEvents: 'none' } : undefined}
        slotProps={{
          paper: hoverCapable
            ? {
                onMouseEnter: cancelClose,
                onMouseLeave: scheduleClose,
                sx: { pointerEvents: 'auto' },
              }
            : undefined,
          list: { 'aria-label': 'Livres disponibles' },
        }}
      >
        {menuBooks.map((book) => {
          const Icon = book.Icon;
          return (
            <MenuItem
              key={book.id}
              component={Link}
              href={rulesHref(book.id, 1)}
              onClick={() => setAnchorEl(null)}
            >
              <ListItemIcon>
                <Icon fontSize="small" />
              </ListItemIcon>
              <ListItemText>{book.name}</ListItemText>
            </MenuItem>
          );
        })}
      </Menu>
    </Box>
  );
}
