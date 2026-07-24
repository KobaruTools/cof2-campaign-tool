'use client';

/**
 * État du visualiseur PDF (milestone « Visualiseur PDF », socle v1 PER-240) : une fenêtre
 * modale unique, partagée par toute l'app, qui ouvre un livre de règles à une page donnée.
 *
 * Volontairement **éphémère** (pas de `persist`) : c'est un état d'interface, pas une donnée
 * de personnage ni de compte. En v1 c'est un simple état applicatif, PAS une route ni une URL
 * partageable — ce dernier point est le sujet de PER-60.
 *
 * Point d'entrée unique : `openAt(bookId, page)`, appelé par `SourceRef` (donc par tout renvoi
 * « (p. N) » de l'app via [[splitPageRefs]]).
 */
import { create } from 'zustand';
import type { BookId } from '@/lib/ui/books';

interface PdfViewerState {
  /** Le visualiseur est-il ouvert ? */
  open: boolean;
  /** Livre affiché (null tant que rien n'a été ouvert). */
  bookId: BookId | null;
  /** Page demandée (numéro imprimé = numéro de page du PDF). */
  page: number;
  /**
   * Terme à CIBLER sur la page demandée (PER-59/61) : nom de la capacité/créature/état dont ce
   * renvoi cite la page. À l'ouverture, le visualiseur le surligne (couleur distincte) et centre
   * la 1re occurrence sur la page cible. Chaîne vide = simple saut de page (renvoi générique).
   */
  term: string;
  /**
   * Compteur incrémenté à CHAQUE `openAt`. Le visualiseur s'en sert pour resynchroniser sa
   * page affichée même quand deux ouvertures visent la même page (`page` inchangé) : un simple
   * suivi de `page` raterait ce cas (rouvrir sur p. 10 alors qu'on avait navigué ailleurs).
   */
  nonce: number;
  /**
   * Ouvre le visualiseur sur `bookId`, positionné à `page` (défaut : page 1). `term` (optionnel)
   * est le passage à surligner/centrer sur cette page (cf. `term`).
   */
  openAt: (bookId: BookId, page?: number, term?: string) => void;
  /** Ferme le visualiseur (conserve le dernier livre/page pour une réouverture immédiate). */
  close: () => void;
}

export const usePdfViewerStore = create<PdfViewerState>((set) => ({
  open: false,
  bookId: null,
  page: 1,
  term: '',
  nonce: 0,
  openAt: (bookId, page = 1, term = '') =>
    set((s) => ({
      open: true,
      bookId,
      page: Math.max(1, Math.trunc(page)),
      term,
      nonce: s.nonce + 1,
    })),
  close: () => set({ open: false }),
}));
