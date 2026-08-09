import type { SvgIconComponent } from '@mui/icons-material';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';

/**
 * Identifiant d'un livre source (clé de contenu, en anglais). Le livre de base porte
 * toutes les données actuelles ; Le Compagnon est consultable dans le visualiseur mais
 * n'alimente aucune donnée extraite (hors scope d'extraction, cf. CLAUDE.md). Le
 * Bestiaire (payant) alimente les créatures de la source `bestiaire` mais n'est pas
 * encore servi dans le visualiseur (`available: false`, cf. ticket PDF payant gaté).
 */
export type BookId = 'core-rulebook' | 'companion' | 'bestiaire';

/** Métadonnées d'affichage d'un livre source. */
export interface BookMeta {
  id: BookId;
  /** Nom affiché du livre (infobulle de la référence de source). */
  name: string;
  /** Icône identifiant le livre d'un coup d'œil (accolée au numéro de page). */
  Icon: SvgIconComponent;
  /**
   * Slug de la SOURCE de contenu (`sources.slug` en base) correspondant à ce livre.
   * Sert de MAPPING réel source → livre (`bookIdForSourceSlug`), remplaçant le codage
   * en dur côté `BestiaryStatBlock` ; et de premier segment du chemin Storage pour les
   * livres payants (`{sourceSlug}/book.pdf`, PER-252). Absent pour un livre non adossé
   * à une source de données (Le Compagnon, hors scope d'extraction).
   */
  sourceSlug?: string;
  /**
   * Décalage de pagination du PDF : `pageFichier = pageImprimée + printedPageOffset`.
   * Les badges (`SourceRef`) et l'URL portent le numéro IMPRIMÉ (cohérent avec le livre
   * papier) ; le visualiseur convertit en interne. `0` pour le livre de base, `3` pour
   * le Bestiaire (3 pages de garde non numérotées avant la page imprimée « 1 »).
   */
  printedPageOffset: number;
  /**
   * Mode de livraison du PDF au visualiseur (milestone « Visualiseur PDF ») :
   *  - `'public-file'` : PDF LIBRE servi statiquement depuis `public/pdf/` (commité via
   *    Git LFS, choix assumé et temporaire, cf. PER-57), chargé par URL (`file`) ;
   *  - `'paid-bucket'` : PDF PAYANT/sous copyright du bucket privé `paid-books`, jamais
   *    dans git ni public : TÉLÉCHARGÉ de façon authentifiée et gaté par entitlement
   *    (RLS Storage, PER-252) au chemin `{sourceSlug}/book.pdf`.
   */
  delivery: 'public-file' | 'paid-bucket';
  /**
   * URL du PDF public statique (mode `'public-file'` seulement), consommée par le
   * visualiseur. Absente en mode `'paid-bucket'` (le fichier vient du bucket privé).
   */
  file?: string;
  /**
   * Le livre est-il RÉELLEMENT servi dans le visualiseur ? `false` = entrée DORMANTE :
   * le renvoi de source (`SourceRef`) affiche le bon libellé/icône mais n'est PAS
   * cliquable (le PDF n'est pas encore disponible), et le visualiseur affiche un
   * message plutôt que de tenter un chargement voué à échouer. Défaut (absent) = `true`.
   */
  available?: boolean;
}

/**
 * Registre des livres sources, indexé par `BookId`. Point d'entrée unique pour associer
 * une page (`sourcePage` des données) à un livre : son nom (infobulle), son icône (badge)
 * et son PDF (visualiseur). Ajouter une entrée ici suffit à faire apparaître un nouveau livre.
 */
export const BOOKS: Record<BookId, BookMeta> = {
  'core-rulebook': {
    id: 'core-rulebook',
    name: 'Livre des règles',
    Icon: MenuBookOutlinedIcon,
    sourceSlug: 'drs',
    printedPageOffset: 0,
    delivery: 'public-file',
    file: '/pdf/core-rulebook.pdf',
  },
  companion: {
    id: 'companion',
    name: 'Le Compagnon',
    Icon: AutoStoriesOutlinedIcon,
    // PDF payant/sous copyright : jamais dans git ni public. Servi de façon GATÉE
    // (bucket privé `paid-books` + RLS par entitlement, même mécanisme que le
    // Bestiaire PER-252) : le visualiseur le TÉLÉCHARGE via la session au chemin
    // `companion/book.pdf`. `sourceSlug: 'companion'` correspond à la source de
    // contenu payant PER-316/322 (registres augmentables, cf. per322-state).
    sourceSlug: 'companion',
    printedPageOffset: 0,
    delivery: 'paid-bucket',
    available: true,
  },
  bestiaire: {
    id: 'bestiaire',
    name: 'Le Bestiaire',
    Icon: PetsOutlinedIcon,
    // PDF payant/sous copyright : jamais dans git ni public. Servi de façon GATÉE
    // (bucket privé `paid-books` + RLS par entitlement, PER-252) : le visualiseur le
    // TÉLÉCHARGE via la session au chemin `bestiaire/book.pdf`. 3 pages de garde non
    // numérotées → `printedPageOffset: 3` (page fichier = page imprimée + 3).
    sourceSlug: 'bestiaire',
    printedPageOffset: 3,
    delivery: 'paid-bucket',
    available: true,
  },
};

/**
 * Livre correspondant à une source de contenu (`sources.slug`), ou `undefined` si
 * aucun livre n'est adossé à ce slug. Mapping réel source → livre : un renvoi de
 * créature (`SourceRef`) le résout depuis le slug de la source de la créature, au lieu
 * de coder le livre en dur — prêt pour d'autres livres payants (PER-252).
 */
export function bookIdForSourceSlug(sourceSlug: string | undefined): BookId | undefined {
  if (!sourceSlug) return undefined;
  for (const book of Object.values(BOOKS)) {
    if (book.sourceSlug === sourceSlug) return book.id;
  }
  return undefined;
}

/**
 * Livre par défaut quand aucun n'est précisé : toutes les données actuelles proviennent du
 * livre de base (leur `sourcePage` ne porte pas encore d'identifiant de livre).
 */
export const DEFAULT_BOOK_ID: BookId = 'core-rulebook';

/** Vrai si `value` est un identifiant de livre connu (garde de validation d'URL, PER-60). */
export function isBookId(value: string): value is BookId {
  return value in BOOKS;
}

/**
 * URL canonique d'une page du visualiseur PDF (PER-60) : `/rules/{book}/{page}[?q=terme]`.
 * Point d'entrée unique — tout renvoi (`SourceRef`) et le bouton d'en-tête pointent ici, ce
 * qui rend l'ouverture du visualiseur **partageable et favorisable**. Le `term` (passage ciblé
 * à surligner/centrer, PER-59/61) est porté par `?q=` quand il est fourni.
 */
export function rulesHref(bookId: BookId, page: number = 1, term?: string): string {
  const safePage = Math.max(1, Math.trunc(page) || 1);
  const query = term && term.trim() ? `?q=${encodeURIComponent(term.trim())}` : '';
  return `/rules/${bookId}/${safePage}${query}`;
}
