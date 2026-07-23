/**
 * Modèle de la couche « Bestiaire » cloud (PER-241). La lecture se fait en DEUX
 * ÉTAGES : une **liste légère** (colonnes projetées, sans le blob) pour le
 * filtrage/tri/recherche client instantané, puis le **blob complet** (`Creature`)
 * chargé À LA DEMANDE pour la créature sélectionnée.
 */
import type {
  CreatureCategory,
  CreatureNature,
  CreatureSize,
} from '@/data/schema';

/**
 * Entrée de la liste légère : les colonnes projetées de `public.creatures`,
 * suffisantes pour rendre et filtrer la liste sans charger le blob. `id` = slug de
 * la créature (`Creature.id`), clé de sélection et de chargement du blob.
 */
export interface CreatureListItem {
  id: string;
  name: string;
  category: CreatureCategory;
  nc?: number;
  ncNote?: string;
  size?: CreatureSize;
  nature: CreatureNature[];
  baseCreatureId?: string;
  /** Ordre d'impression du livre — reproduit le tri « par catégorie ». */
  sortOrder: number;
}
