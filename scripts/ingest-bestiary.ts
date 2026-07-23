/**
 * Ingestion du bestiaire vers Supabase (PER-241) — script CLI LOCAL, à lancer par
 * le propriétaire du projet : `npm run ingest`.
 *
 * Seede la source GRATUITE « DRS » (livre de base) et upserte les créatures lues
 * depuis `src/data/creatures.ts` (conservé comme artefact d'extraction reviewable
 * dans git). Écrit dans `public.sources` / `public.creatures` avec la **clé
 * secrète** (`service_role`, contourne la RLS) — variable d'env LOCALE seulement
 * (`.env.local`), jamais commitée ni déployée en CI.
 *
 * Idempotent :
 *   - source upsertée sur `slug`, `content_version` incrémentée à chaque passage ;
 *   - créatures upsertées sur `(source_id, slug)` — ré-exécution sans doublon ;
 *   - créatures de la source disparues de `creatures.ts` supprimées (sync).
 *
 * Le contenu PAYANT (futur PDF « Le Bestiaire ») s'ingérera par le même script
 * depuis une source distincte (`private/`, gitignoré) — hors périmètre PER-241.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { creatures } from '../src/data/creatures';
import type { Database } from '../src/lib/supabase/types';

// ── Source GRATUITE du contenu ingéré ici (livre de base / DRS). ──
const DRS_SOURCE = {
  slug: 'drs',
  name: 'Chroniques Oubliées Fantasy 2 — Livre de base (DRS)',
  is_paid: false,
} as const;

/**
 * Charge `.env.local` (racine projet) dans `process.env` sans écraser une variable
 * déjà présente. Évite une dépendance dotenv et reste portable (Windows/Unix).
 */
function loadDotEnvLocal(): void {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8');
  } catch {
    return; // Pas de .env.local : on s'appuie sur l'environnement du shell.
  }
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

async function main(): Promise<void> {
  loadDotEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "Ingestion impossible : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY requis dans l'environnement local (.env.local).",
    );
  }

  const supabase = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Version courante de la source (pour l'incrémenter).
  const { data: existing, error: readErr } = await supabase
    .from('sources')
    .select('content_version')
    .eq('slug', DRS_SOURCE.slug)
    .maybeSingle();
  if (readErr) throw readErr;
  const nextVersion = (existing?.content_version ?? 0) + 1;

  // 2. Upsert de la source (sur `slug`), version bumpée.
  const { data: source, error: srcErr } = await supabase
    .from('sources')
    .upsert(
      {
        slug: DRS_SOURCE.slug,
        name: DRS_SOURCE.name,
        is_paid: DRS_SOURCE.is_paid,
        content_version: nextVersion,
      },
      { onConflict: 'slug' },
    )
    .select('id, content_version')
    .single();
  if (srcErr) throw srcErr;
  console.log(
    `Source « ${DRS_SOURCE.slug} » → content_version ${source.content_version} (id ${source.id}).`,
  );

  // 3. Upsert des créatures (sur (source_id, slug)) : blob + colonnes projetées.
  const rows = creatures.map((c, index) => ({
    source_id: source.id,
    slug: c.id,
    name: c.name,
    category: c.category,
    nc: c.nc ?? null,
    nc_note: c.ncNote ?? null,
    size: c.size ?? null,
    nature: c.nature ?? [],
    base_creature_id: c.baseCreatureId ?? null,
    sort_order: index,
    data: c as unknown as Database['public']['Tables']['creatures']['Insert']['data'],
  }));

  const { error: upErr } = await supabase
    .from('creatures')
    .upsert(rows, { onConflict: 'source_id,slug' });
  if (upErr) throw upErr;
  console.log(`Upsert de ${rows.length} créatures.`);

  // 4. Sync : supprime les créatures de la source disparues de `creatures.ts`.
  const currentSlugs = new Set(rows.map((r) => r.slug));
  const { data: dbRows, error: listErr } = await supabase
    .from('creatures')
    .select('slug')
    .eq('source_id', source.id);
  if (listErr) throw listErr;
  const stale = (dbRows ?? []).map((r) => r.slug).filter((s) => !currentSlugs.has(s));
  if (stale.length > 0) {
    const { error: delErr } = await supabase
      .from('creatures')
      .delete()
      .eq('source_id', source.id)
      .in('slug', stale);
    if (delErr) throw delErr;
    console.log(`Suppression de ${stale.length} créatures obsolètes : ${stale.join(', ')}.`);
  }

  console.log('Ingestion du bestiaire terminée.');
}

main().catch((e) => {
  console.error('Échec de l’ingestion :', e instanceof Error ? e.message : e);
  process.exit(1);
});
