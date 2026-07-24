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
  /**
   * Source (uuid `sources.id`) à laquelle la créature appartient. Sert au cache
   * persistant (PER-244) : la liste est mise en cache **groupée par source** et
   * estampillée par la `content_version` de la source, pour un re-fetch ciblé.
   */
  sourceId: string;
  /**
   * Horodatage de dernière modification (`creatures.updated_at`, ISO 8601). Sert à
   * l'invalidation FINE des blobs déjà mis en cache : un blob n'est jeté que si
   * l'`updatedAt` de sa créature a réellement avancé (PER-244).
   */
  updatedAt: string;
}

/**
 * Entrée du **manifeste des sources** (PER-244) : `source_id → content_version`.
 * C'est le SEUL appel toujours frais (jamais mis en cache). Le client le compare
 * au cache disque pour ne re-fetcher que les sources dont la version a bougé, et
 * pour purger celles qui ont disparu du manifeste (source retirée / entitlement
 * perdu — la RLS ne renvoie que les sources accessibles au rôle courant).
 */
export interface SourceManifestEntry {
  /** uuid de la source (`sources.id`). */
  id: string;
  /** Slug stable de la source (débogage / lisibilité). */
  slug: string;
  /** Version du contenu, incrémentée à chaque ingestion. */
  contentVersion: number;
}
