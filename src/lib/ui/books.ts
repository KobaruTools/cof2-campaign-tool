import type { SvgIconComponent } from '@mui/icons-material';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';

/**
 * Identifiant d'un livre source (clé de contenu, en anglais). Un seul pour l'instant ;
 * d'autres livres viendront (Le Compagnon…), chacun avec sa propre icône et son propre nom.
 */
export type BookId = 'core-rulebook';

/** Métadonnées d'affichage d'un livre source. */
export interface BookMeta {
  id: BookId;
  /** Nom affiché du livre (infobulle de la référence de source). */
  name: string;
  /** Icône identifiant le livre d'un coup d'œil (accolée au numéro de page). */
  Icon: SvgIconComponent;
}

/**
 * Registre des livres sources, indexé par `BookId`. Point d'entrée unique pour associer
 * une page (`sourcePage` des données) à un livre : son nom (infobulle) et son icône (badge).
 * Ajouter une entrée ici suffit à faire apparaître un nouveau livre dans l'app.
 */
export const BOOKS: Record<BookId, BookMeta> = {
  'core-rulebook': {
    id: 'core-rulebook',
    name: 'Livre des règles',
    Icon: MenuBookOutlinedIcon,
  },
};

/**
 * Livre par défaut quand aucun n'est précisé : toutes les données actuelles proviennent du
 * livre de base (leur `sourcePage` ne porte pas encore d'identifiant de livre).
 */
export const DEFAULT_BOOK_ID: BookId = 'core-rulebook';
