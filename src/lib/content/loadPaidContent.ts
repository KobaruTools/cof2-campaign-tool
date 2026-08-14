/**
 * Orchestrateur du chargement de contenu payant gaté (PER-321) : le point d'entrée
 * appelé UNE fois au boot d'une session propriétaire. Il enchaîne gating → manifeste
 * → plan de réconciliation → fusion (cache d'abord, réseau ensuite) → mise en cache
 * → purge, en réutilisant l'infra existante (entitlements RLS, bucket privé, cache
 * IndexedDB) sans embarquer aucun contenu payant.
 *
 * Gating (fallback non-entitlé, décision proprio) : aucun fetch n'est déclenché pour
 * un visiteur non connecté ni pour une session JOUEUR anonyme (/play). Ceux-ci
 * n'obtiennent donc jamais le contenu payant — les éléments qui en dépendent sont
 * simplement ABSENTS des registres (`.get(id)` → `undefined`), sans placeholder ni
 * fuite de verbatim ; la fiche reste calculée et affichée à partir de ses stats.
 */
import { registerContentBundle, setContentLoading } from '@/data';
import { fetchSourceManifest } from '@/lib/bestiary/repo';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  parseContentBundle,
  planContentReconciliation,
  type EntitledPaidSource,
} from './bundle';
import { fetchPaidContentJson } from './paidContentRepo';
import {
  purgeCachedBundles,
  readAllCachedBundles,
  writeCachedBundle,
} from './paidContentCache';

const IS_CONFIGURED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

/** Bilan d'un chargement : sources fusionnées + nombre total d'entrées ajoutées. */
export interface LoadPaidContentResult {
  registered: string[];
  added: number;
}

const EMPTY: LoadPaidContentResult = { registered: [], added: 0 };

// Singleton de module : le chargement ne s'exécute qu'UNE fois par chargement de page
// (un refresh le relance ; StrictMode / remontages partagent la même promesse). La
// fusion étant idempotente et additive, un rejeu éventuel serait de toute façon sûr.
let loadPromise: Promise<LoadPaidContentResult> | null = null;

/** Charge et fusionne le contenu payant accessible au compte courant (voir en-tête). */
export function loadPaidContent(): Promise<LoadPaidContentResult> {
  if (!loadPromise) {
    // Posé AVANT le premier `await` : les vues abonnées (`usePaidContentLoading`) le
    // voient dès le montage de `PaidContentBoot`, avant même la lecture de session.
    setContentLoading(true);
    loadPromise = runLoad()
      .catch(() => EMPTY)
      .finally(() => setContentLoading(false));
  }
  return loadPromise;
}

async function runLoad(): Promise<LoadPaidContentResult> {
  if (!IS_CONFIGURED) return EMPTY;

  const supabase = createBrowserSupabaseClient();
  // `getSession()` lit le cache local (aucun réseau). Pas de session → visiteur non
  // connecté : on n'interroge jamais les entitlements ni le bucket.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return EMPTY;
  const isPlayer = Boolean((user.app_metadata as { player_id?: string } | undefined)?.player_id);
  if (isPlayer) return EMPTY; // Session joueur anonyme → aucun contenu payant.

  const cached = await readAllCachedBundles();
  const cachedBySlug = new Map(cached.map((c) => [c.slug, c]));

  let manifest;
  try {
    manifest = await fetchSourceManifest(); // Toujours frais — lève hors-ligne.
  } catch {
    // Hors-ligne : best-effort, fusionne tout ce qui est en cache disque tel quel.
    return mergeBundles(cached.map((c) => ({ slug: c.slug, bundle: c.bundle })));
  }

  const entitledPaid: EntitledPaidSource[] = manifest
    .filter((m) => m.isPaid)
    .map((m) => ({ slug: m.slug, contentVersion: m.contentVersion }));
  const versionBySlug = new Map(entitledPaid.map((e) => [e.slug, e.contentVersion]));

  const plan = planContentReconciliation(
    entitledPaid,
    cached.map((c) => ({ slug: c.slug, contentVersion: c.contentVersion })),
  );

  const registered: string[] = [];
  let added = 0;

  // 1. Sources à jour → fusion INSTANTANÉE depuis le cache disque.
  for (const slug of plan.fresh) {
    const entry = cachedBySlug.get(slug);
    if (!entry) continue;
    added += registerContentBundle(entry.bundle).added;
    registered.push(slug);
  }

  // 2. Sources nouvelles / version bumpée → téléchargement gaté, fusion, mise en cache.
  for (const slug of plan.toFetch) {
    try {
      // Passe la version cible pour le cache-busting d'URL (cf. `fetchPaidContentJson`) : une source
      // republiée (version bumpée) est ainsi TOUJOURS re-téléchargée fraîche, jamais servie du cache HTTP.
      const raw = await fetchPaidContentJson(slug, versionBySlug.get(slug));
      if (raw == null) continue; // Entitlé mais pas de content.json (ex. Bestiaire) → rien.
      const bundle = parseContentBundle(raw);
      added += registerContentBundle(bundle).added;
      registered.push(slug);
      await writeCachedBundle({ slug, contentVersion: versionBySlug.get(slug) ?? 0, bundle });
    } catch {
      // Échec réseau ponctuel : on conserve le reste, réessai au prochain boot.
    }
  }

  // 3. Purge DISQUE des sources dont l'entitlement a été perdu. La mémoire ne peut pas
  //    être « dé-fusionnée » dans la session courante : effectif au prochain rechargement.
  await purgeCachedBundles(plan.toPurge);

  return { registered, added };
}

/** Fusionne une liste de lots (chemin hors-ligne) et renvoie le bilan. */
function mergeBundles(
  entries: { slug: string; bundle: import('./bundle').ContentBundle }[],
): LoadPaidContentResult {
  const registered: string[] = [];
  let added = 0;
  for (const entry of entries) {
    added += registerContentBundle(entry.bundle).added;
    registered.push(entry.slug);
  }
  return { registered, added };
}

// Note dev/Fast Refresh : la survie du contenu payant fusionné à travers la
// ré-exécution de `@/data` par HMR est traitée directement dans `src/data/index.ts`
// (stash sur `globalThis`, rejoué de façon synchrone à l'init du module) — ce fichier
// n'a plus besoin de s'y accrocher. L'ancienne tentative ici utilisait
// `import.meta.webpackHot`, une API webpack absente sous Turbopack (bundler par
// défaut depuis Next 16) : le garde ne s'exécutait donc jamais.
