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
   * URL du PDF servi par l'app, consommée par le visualiseur (milestone « Visualiseur PDF »).
   * Les PDF libres sont commités via Git LFS sous `public/pdf/` (choix assumé et temporaire,
   * cf. PER-57). Les PDF payants/sous copyright vivent hors du repo (`pdf-payants/`, gitignored)
   * et ne sont donc pas servis : leur entrée reste dormante tant que le fichier n'est pas fourni.
   */
  file: string;
  /**
   * Le livre est-il RÉELLEMENT servi dans le visualiseur ? `false` = entrée DORMANTE :
   * le renvoi de source (`SourceRef`) affiche le bon libellé/icône mais n'est PAS
   * cliquable (le PDF n'est pas encore disponible), et le visualiseur affiche un
   * message plutôt que de tenter un chargement voué à échouer. Défaut (absent) = `true`.
   * Le Bestiaire payant repassera à `true` quand son PDF sera servi de façon gatée
   * (Supabase Storage privé + URL signée — ticket dédié).
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
    file: '/pdf/core-rulebook.pdf',
  },
  companion: {
    id: 'companion',
    name: 'Le Compagnon',
    Icon: AutoStoriesOutlinedIcon,
    // PDF payant/sous copyright : hors du repo (`pdf-payants/compagnon.pdf`, non servi).
    // Entrée dormante — aucune donnée ne pointe encore ce livre (hors scope d'extraction).
    file: '/pdf/companion.pdf',
    available: false,
  },
  bestiaire: {
    id: 'bestiaire',
    name: 'Le Bestiaire',
    Icon: PetsOutlinedIcon,
    // PDF payant/sous copyright : hors du repo (`pdf-payants/bestiaire.pdf`, non servi
    // publiquement). Sera servi de façon GATÉE (Supabase Storage privé + URL signée par
    // entitlement) — ticket dédié. Dormant en attendant : renvoi non cliquable.
    file: '/pdf/bestiaire.pdf',
    available: false,
  },
};

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
