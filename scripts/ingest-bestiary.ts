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
 *   - créatures de la source disparues de la liste supprimées (sync).
 *
 * Option de recette (PER-242) : `npm run ingest -- --with-test-source` seede EN
 * PLUS une source PAYANTE de test (`is_paid = true`) avec des créatures FACTICES,
 * pour recetter le gating par entitlement de bout en bout (aucun vrai contenu
 * payant en jeu ici). Sans le flag, cette source n'est pas touchée.
 *
 * Le contenu PAYANT réel (futur PDF « Le Bestiaire ») s'ingérera par le même
 * script depuis une source distincte (`private/`, gitignoré) — hors périmètre.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { creatures } from '../src/data/creatures';
import type { Creature } from '../src/data/schema';
import type { Database } from '../src/lib/supabase/types';

// ── Source GRATUITE du contenu ingéré ici (livre de base / DRS). ──
const DRS_SOURCE = {
  slug: 'drs',
  name: 'Chroniques Oubliées Fantasy 2 — Livre de base (DRS)',
  is_paid: false,
} as const;

// ── Source PAYANTE de TEST (PER-242), seedée seulement avec `--with-test-source`. ──
const TEST_PAID_SOURCE = {
  slug: 'test-bestiaire-payant',
  name: 'Bestiaire de test (payant)',
  is_paid: true,
} as const;

/**
 * Créatures FACTICES de la source de test payante — servent UNIQUEMENT à recetter
 * le gating par entitlement (PER-242). Aucun contenu réel du livre ; à supprimer
 * (avec la source) une fois la recette faite.
 */
const TEST_PAID_CREATURES: Creature[] = [
  {
    id: 'gobelin-de-test',
    name: 'Gobelin de test',
    category: 'creatures-fantastiques',
    nc: 1,
    size: 'petite',
    nature: ['vivant', 'humanoide'],
    description:
      'Créature FACTICE de recette (PER-242) — sert à vérifier le gating par source. Ne provient d’aucun livre.',
    abilities: { AGI: 2, CON: 0, FOR: -1, PER: 1, CHA: -2, INT: 0, VOL: 0 },
    defense: 12,
    hitPoints: 8,
    initiative: 12,
    sourcePage: 0,
  },
  {
    id: 'dragon-de-test',
    name: 'Dragon de test',
    category: 'creatures-fantastiques',
    nc: 12,
    size: 'enorme',
    nature: ['vivant'],
    description:
      'Créature FACTICE de recette (PER-242) — sert à vérifier le gating par source. Ne provient d’aucun livre.',
    abilities: { AGI: 3, CON: 6, FOR: 8, PER: 4, CHA: 3, INT: 2, VOL: 5 },
    defense: 22,
    hitPoints: 180,
    initiative: 18,
    sourcePage: 0,
  },
];

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

type SupabaseAdmin = ReturnType<typeof createClient<Database>>;
type SourceDef = { slug: string; name: string; is_paid: boolean };

/**
 * Ingère UNE source et ses créatures (idempotent) : bump de `content_version`,
 * upsert de la source puis des créatures (blob + colonnes projetées), et sync des
 * suppressions (les créatures de la source disparues de `list` sont retirées).
 */
async function ingestSource(
  supabase: SupabaseAdmin,
  def: SourceDef,
  list: Creature[],
): Promise<void> {
  // 1. Version courante de la source (pour l'incrémenter).
  const { data: existing, error: readErr } = await supabase
    .from('sources')
    .select('content_version')
    .eq('slug', def.slug)
    .maybeSingle();
  if (readErr) throw readErr;
  const nextVersion = (existing?.content_version ?? 0) + 1;

  // 2. Upsert de la source (sur `slug`), version bumpée.
  const { data: source, error: srcErr } = await supabase
    .from('sources')
    .upsert(
      {
        slug: def.slug,
        name: def.name,
        is_paid: def.is_paid,
        content_version: nextVersion,
      },
      { onConflict: 'slug' },
    )
    .select('id, content_version')
    .single();
  if (srcErr) throw srcErr;
  console.log(
    `Source « ${def.slug} »${def.is_paid ? ' [payante]' : ''} → content_version ${source.content_version} (id ${source.id}).`,
  );

  // 3. Upsert des créatures (sur (source_id, slug)) : blob + colonnes projetées.
  const rows = list.map((c, index) => ({
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

  // 4. Sync : supprime les créatures de la source disparues de la liste.
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

  // Source gratuite du livre de base : toujours ingérée.
  await ingestSource(supabase, DRS_SOURCE, creatures);

  // Source de test payante (recette du gating PER-242) : opt-in par flag.
  if (process.argv.includes('--with-test-source')) {
    await ingestSource(supabase, TEST_PAID_SOURCE, TEST_PAID_CREATURES);
    console.log(
      `Source de test payante « ${TEST_PAID_SOURCE.slug} » seedée (${TEST_PAID_CREATURES.length} créatures factices).`,
    );
  }

  console.log('Ingestion du bestiaire terminée.');
}

main().catch((e) => {
  console.error('Échec de l’ingestion :', e instanceof Error ? e.message : e);
  process.exit(1);
});
