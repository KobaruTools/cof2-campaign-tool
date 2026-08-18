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
 * Contenu PAYANT réel (« Le Bestiaire ») : `npm run ingest -- --with-bestiary`
 * ingère EN PLUS la source payante `bestiaire` (code de déblocage `bestiaire-bbe`)
 * depuis `private/bestiary-paid.ts` — fichier GITIGNORÉ (copyright BBE), importé de
 * façon TOLÉRANTE : s'il est absent (CI, autre machine), la source est ignorée sans
 * erreur. Sans le flag, cette source n'est pas touchée.
 */
import { readFileSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { creatures } from '../src/data/creatures';
import { withInheritedDefense } from '../src/lib/bestiary/creatureDefense';
import type { Creature } from '../src/data/schema';
import type { Database } from '../src/lib/supabase/types';

// ── Source GRATUITE du contenu ingéré ici (livre de base / DRS). ──
const DRS_SOURCE = {
  slug: 'drs',
  name: 'Chroniques Oubliées Fantasy 2 — Livre de base (DRS)',
  is_paid: false,
} as const;

// ── Source PAYANTE de TEST (PER-242), seedée seulement avec `--with-test-source`. ──
// `redeemCode` (PER-243) : code de déblocage self-service à saisir dans l'UI pour
// recetter la RPC `redeem_source_code` de bout en bout.
const TEST_PAID_SOURCE = {
  slug: 'test-bestiaire-payant',
  name: 'Bestiaire de test (payant)',
  is_paid: true,
  redeemCode: 'TEST-BESTIAIRE',
} as const;

// ── Source PAYANTE RÉELLE « Le Bestiaire » (BBE), seedée avec `--with-bestiary`. ──
// Contenu ingéré depuis `private/bestiary-paid.ts` (gitignoré, copyright). Le code
// `bestiaire-bbe` ne vit QU'ICI (posé dans `sources.redeem_code` en DB), jamais en git.
const PAID_BESTIARY_SOURCE = {
  slug: 'bestiaire',
  name: 'Chroniques Oubliées Fantasy 2 — Le Bestiaire',
  is_paid: true,
  redeemCode: 'bestiaire-bbe',
} as const;

// Spécificateur NON littéral : le fichier étant gitignoré, un `import('…')` littéral
// ferait échouer le typecheck partout où il est absent (CI, build Vercel).
const PAID_MODULE = '../private/bestiary-paid';

/**
 * Charge le contenu payant extrait (`private/bestiary-paid.ts`) de façon TOLÉRANTE :
 * le fichier est gitignoré, donc absent en CI ou sur une autre machine → on renvoie
 * `null` sans casser (import dynamique dans un try/catch).
 */
async function loadPaidBestiary(): Promise<Creature[] | null> {
  try {
    const mod = (await import(PAID_MODULE)) as { paidBestiary?: Creature[] };
    return mod.paidBestiary ?? null;
  } catch {
    return null;
  }
}

// ── Illustrations du contenu PAYANT (PER-245) ────────────────────────────────
// Elles ne peuvent pas vivre dans `public/` (assets statiques servis à tous, sans
// auth) : on les embarque en DATA URI dans le blob JSONB de la créature, où elles
// héritent exactement de la même barrière RLS que le texte. Aucun bucket, aucune
// URL signée. Les fichiers sources sont gitignorés (`private/illustrations/`) et
// produits par `private/tools/extract-illustrations.py`.
const PAID_ILLUSTRATIONS_DIR = 'private/illustrations';

const MIME_BY_EXTENSION: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

/**
 * Remplace le champ `illustration` d'une créature PAYANTE — un simple NOM DE FICHIER
 * (`aberratus.webp`) — par la data URI du fichier `private/illustrations/` correspondant.
 *
 * Le contenu GRATUIT n'est pas concerné : ses illustrations sont des chemins publics
 * (`/bestiary/loup.webp`, cf. `withIllustrations` dans `src/data/creatures.ts`) et sont
 * laissées telles quelles — d'où la discrimination sur le `/` initial. Une data URI déjà
 * formée est également laissée intacte (ré-ingestion d'une liste déjà encodée).
 *
 * Fichier introuvable → avertissement + champ RETIRÉ (fail-safe) : mieux vaut une créature
 * sans filigrane qu'un `url(aberratus.webp)` résolu en 404 relative dans le navigateur.
 */
function withEmbeddedIllustrations(list: Creature[]): Creature[] {
  let embedded = 0;
  let bytes = 0;
  const out = list.map((c) => {
    const ref = c.illustration;
    if (!ref || ref.startsWith('/') || ref.startsWith('data:')) return c;
    try {
      const file = readFileSync(resolve(process.cwd(), PAID_ILLUSTRATIONS_DIR, ref));
      const mime = MIME_BY_EXTENSION[extname(ref).toLowerCase()];
      if (!mime) throw new Error(`extension non gérée (${extname(ref)})`);
      embedded += 1;
      bytes += file.byteLength;
      return { ...c, illustration: `data:${mime};base64,${file.toString('base64')}` };
    } catch (e) {
      console.warn(
        `⚠ Illustration « ${ref} » (${c.id}) introuvable dans ${PAID_ILLUSTRATIONS_DIR} — ` +
          `créature ingérée SANS filigrane. ${e instanceof Error ? e.message : ''}`,
      );
      const withoutIllustration = { ...c };
      delete withoutIllustration.illustration;
      return withoutIllustration;
    }
  });
  if (embedded > 0) {
    console.log(
      `${embedded} illustration(s) embarquée(s) en data URI (${(bytes / 1024).toFixed(0)} Ko d’images, ` +
        `≈ ${((bytes * 4) / 3 / 1024).toFixed(0)} Ko une fois en base64).`,
    );
  }
  return out;
}

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
// `redeemCode` (PER-243) : code de déblocage rotable, posé seulement sur les sources
// payantes ; `null` pour le contenu gratuit (aucun code).
type SourceDef = { slug: string; name: string; is_paid: boolean; redeemCode?: string };

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
        // Code de déblocage (PER-243) : posé sur les payantes, null sur le gratuit.
        redeem_code: def.redeemCode ?? null,
      },
      { onConflict: 'slug' },
    )
    .select('id, content_version')
    .single();
  if (srcErr) throw srcErr;
  console.log(
    `Source « ${def.slug} »${def.is_paid ? ' [payante]' : ''} → content_version ${source.content_version} (id ${source.id}).`,
  );

  // 2 bis. GARDE-FOU d'unicité des slugs ENTRE SOURCES. Toute l'app indexe une créature par son
  // seul slug (blobs en mémoire, cache IndexedDB, instances du tracker de combat) : deux sources
  // qui portent le même slug se marchent dessus (symptôme observé : « Impossible de charger le
  // détail de cette créature », le blob remontant deux lignes). Un supplément qui RÉIMPRIME une
  // créature du livre de base ne doit donc pas la ré-ingérer.
  const slugs = list.map((c) => c.id);
  const { data: foreign, error: dupErr } = await supabase
    .from('creatures')
    .select('slug, source_id')
    .in('slug', slugs)
    .neq('source_id', source.id);
  if (dupErr) throw dupErr;
  // On AVERTIT sans bloquer : l'ingestion du livre de base ne doit pas être prise en otage par une
  // ligne périmée d'un supplément (elle disparaîtra à la prochaine ingestion de ce supplément), et
  // le rendu retombe de son côté sur la source gratuite (cf. `fetchCreatureBlob`).
  if ((foreign ?? []).length > 0) {
    const dups = [...new Set((foreign ?? []).map((r) => r.slug))].sort();
    console.warn(
      `⚠ Source « ${def.slug} » : ${dups.length} slug(s) déjà porté(s) par une AUTRE source — ` +
        `${dups.join(', ')}.\n` +
        `  Une créature réimprimée par un supplément ne doit être ingérée QUE par la source du ` +
        `livre de base (ou recevoir un slug propre) : sinon les deux lignes se disputent le même ` +
        `blob (« Impossible de charger le détail de cette créature »).`,
    );
  }

  // 3. Upsert des créatures (sur (source_id, slug)) : blob + colonnes projetées.
  // Les VARIANTES héritent au passage des traits défensifs de leur base (PER-260) : le blob
  // stocké porte donc déjà les badges du cadre Défense, quelle que soit la source.
  const rows = withInheritedDefense(list).map((c, index) => ({
    source_id: source.id,
    slug: c.id,
    name: c.name,
    category: c.category,
    nc: c.nc ?? null,
    nc_note: c.ncNote ?? null,
    size: c.size ?? null,
    nature: c.nature ?? [],
    animal_form_category: c.animalFormCategory ?? null,
    animal_form_flavor: c.animalFormFlavor ?? null,
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

  // Source payante RÉELLE « Le Bestiaire » : opt-in par flag, contenu gitignoré.
  if (process.argv.includes('--with-bestiary')) {
    const paid = await loadPaidBestiary();
    if (!paid || paid.length === 0) {
      console.warn(
        'Flag --with-bestiary : private/bestiary-paid.ts introuvable ou vide — source « bestiaire » ignorée.',
      );
    } else {
      // Les illustrations payantes sont embarquées en data URI DANS le blob (PER-245) :
      // même barrière RLS que le texte, rien en asset public.
      await ingestSource(supabase, PAID_BESTIARY_SOURCE, withEmbeddedIllustrations(paid));
      console.log(
        `Source payante « ${PAID_BESTIARY_SOURCE.slug} » ingérée (${paid.length} créatures).`,
      );
    }
  }

  console.log('Ingestion du bestiaire terminée.');
}

main().catch((e) => {
  console.error('Échec de l’ingestion :', e instanceof Error ? e.message : e);
  process.exit(1);
});
