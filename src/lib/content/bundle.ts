/**
 * Cœur PUR (sans IO) du chargeur de contenu payant gaté (PER-321) : validation
 * défensive d'un lot JSON téléchargé, et planification de la réconciliation
 * cache disque ↔ entitlements. Testé unitairement, sans réseau ni IndexedDB.
 *
 * Invariant légal : ce module ne contient AUCUN contenu payant — uniquement la
 * mécanique générique qui le fusionnera dans les registres une fois téléchargé.
 */
import type { ContentBundle } from '@/data';

export type { ContentBundle };

/** Clés reconnues d'un lot de contenu (dans l'ordre de fusion). */
const BUNDLE_KEYS = ['ancestries', 'classes', 'paths', 'features', 'equipment'] as const;

/**
 * Normalise un lot JSON téléchargé en `ContentBundle` sûr à fusionner. Le JSON est
 * de confiance (produit par nous, hors git, servi de façon gatée), mais on reste
 * DÉFENSIF : on ne garde que les clés connues, dont la valeur est un tableau, et au
 * sein de chaque tableau les seules entrées « objet avec un `id` string ». Toute
 * clé inconnue ou entrée malformée est silencieusement écartée (jamais d'exception :
 * un lot partiellement corrompu ne doit pas casser le boot d'un utilisateur entitlé).
 */
export function parseContentBundle(raw: unknown): ContentBundle {
  const accumulator: Record<string, { id: string }[]> = {};
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  for (const key of BUNDLE_KEYS) {
    const value = obj[key];
    if (!Array.isArray(value)) continue;
    const entries = value.filter(
      (entry): entry is { id: string } =>
        !!entry && typeof entry === 'object' && typeof (entry as { id?: unknown }).id === 'string',
    );
    if (entries.length > 0) accumulator[key] = entries;
  }
  // Les entités ont été validées sur leur `id` ; le reste de leur forme est garanti
  // par notre pipeline de production du JSON (le moteur les consomme comme le contenu
  // de base). Conversion contrôlée vers le type hétérogène `ContentBundle`.
  return accumulator as ContentBundle;
}

// ────────────────────────────────────────────────────────────────────────────
// Planification de réconciliation cache ↔ entitlements.
// ────────────────────────────────────────────────────────────────────────────

/** Une source payante ACCESSIBLE (entitlée) au rôle courant, avec sa version. */
export interface EntitledPaidSource {
  slug: string;
  contentVersion: number;
}

/** Métadonnée d'un lot en cache disque (sans le contenu lui-même). */
export interface CachedBundleMeta {
  slug: string;
  contentVersion: number;
}

/** Plan de réconciliation d'un chargement de contenu payant. */
export interface ContentReconciliationPlan {
  /** Slugs en cache ET à jour : servir DIRECTEMENT depuis le disque (fusion instantanée). */
  fresh: string[];
  /** Slugs nouveaux ou dont la version a bougé : à (re)télécharger depuis le bucket. */
  toFetch: string[];
  /** Slugs en cache mais plus entitlés (accès perdu / source retirée) : à purger du disque. */
  toPurge: string[];
}

/**
 * Compare les sources payantes entitlées (fraîches, via le manifeste) au cache
 * disque. Une source à jour (`content_version` identique) est servie du cache ;
 * nouvelle ou version bumpée → à retélécharger ; en cache mais plus entitlée → à
 * purger. On ne sert JAMAIS un cache périmé pour ne pas fusionner d'entrées figées
 * qui masqueraient la version fraîche (la fusion est additive « base gagne »).
 */
export function planContentReconciliation(
  entitled: EntitledPaidSource[],
  cached: CachedBundleMeta[],
): ContentReconciliationPlan {
  const cachedVersionBySlug = new Map(cached.map((c) => [c.slug, c.contentVersion]));
  const entitledSlugs = new Set(entitled.map((e) => e.slug));
  const fresh: string[] = [];
  const toFetch: string[] = [];
  for (const source of entitled) {
    if (cachedVersionBySlug.get(source.slug) === source.contentVersion) fresh.push(source.slug);
    else toFetch.push(source.slug);
  }
  const toPurge = cached.filter((c) => !entitledSlugs.has(c.slug)).map((c) => c.slug);
  return { fresh, toFetch, toPurge };
}
