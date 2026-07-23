import type { SvgIconComponent } from '@mui/icons-material';
import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';

/**
 * Identifiant d'un livre source (clé de contenu, en anglais). Le livre de base porte
 * toutes les données actuelles ; Le Compagnon est consultable dans le visualiseur mais
 * n'alimente aucune donnée extraite (hors scope d'extraction, cf. CLAUDE.md).
 */
export type BookId = 'core-rulebook' | 'companion';

/** Métadonnées d'affichage d'un livre source. */
export interface BookMeta {
  id: BookId;
  /** Nom affiché du livre (infobulle de la référence de source). */
  name: string;
  /** Icône identifiant le livre d'un coup d'œil (accolée au numéro de page). */
  Icon: SvgIconComponent;
  /**
   * URL du PDF servi par l'app, consommée par le visualiseur (milestone « Visualiseur PDF »).
   * Fichier commité via Git LFS sous `public/rules/` (choix assumé et temporaire, cf. PER-57).
   */
  file: string;
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
    file: '/rules/core-rulebook.pdf',
  },
  companion: {
    id: 'companion',
    name: 'Le Compagnon',
    Icon: AutoStoriesOutlinedIcon,
    file: '/rules/companion.pdf',
  },
};

/**
 * Livre par défaut quand aucun n'est précisé : toutes les données actuelles proviennent du
 * livre de base (leur `sourcePage` ne porte pas encore d'identifiant de livre).
 */
export const DEFAULT_BOOK_ID: BookId = 'core-rulebook';
