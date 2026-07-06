/**
 * Types et helpers de tri partagés par les listes de personnages (accueil et
 * vue campagne). Le tri porte sur les colonnes du tableau ; `level` est piloté
 * par l'en-tête « Identité » (seul champ ordonnable de la colonne condensée).
 */

/** Clé de tri d'une liste de personnages. `updatedAt` est le défaut usuel. */
export type SortKey = 'updatedAt' | 'name' | 'level' | 'campaign';
export type SortDir = 'asc' | 'desc';

export interface SortState {
  key: SortKey;
  dir: SortDir;
}

export const SORT_LABELS: Record<SortKey, string> = {
  updatedAt: 'Modifié',
  name: 'Nom',
  level: 'Niveau',
  campaign: 'Campagne',
};

/** Sens « naturel » d'une clé au moment où on la sélectionne. */
export const naturalDir = (key: SortKey): SortDir =>
  key === 'name' || key === 'campaign' ? 'asc' : 'desc';

/**
 * Réducteur de sélection de tri : recliquer la clé active inverse le sens,
 * sinon on bascule sur la nouvelle clé dans son sens naturel.
 */
export const pickSortReducer =
  (key: SortKey) =>
  (prev: SortState): SortState =>
    prev.key === key
      ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key, dir: naturalDir(key) };
