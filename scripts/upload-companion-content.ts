/**
 * Montage de la source PAYANTE « Le Compagnon » et téléversement de son lot de
 * contenu de construction de personnage (PER-316, socle PER-321) — script CLI
 * LOCAL one-shot, à lancer par le propriétaire : `npm run upload-companion`.
 *
 * Deux gestes, avec la clé SECRÈTE (`service_role`, contourne la RLS) — variable
 * d'env LOCALE seulement (`.env.local`), jamais commitée ni déployée en CI :
 *  1. Upsert de la source `companion` (`is_paid = true`), avec bump de
 *     `content_version` (invalide le cache client, PER-244/321) et pose du code de
 *     déblocage `companion-bbe` (PER-243 ; rotable ensuite à la main).
 *  2. Téléversement du lot JSON vers `paid-books/companion/content.json` — MÊME
 *     bucket privé + MÊME RLS par entitlement que les PDF payants (migration 0011) :
 *     un compte non débloqué reçoit un refus RLS, un joueur anonyme n'y accède
 *     jamais. Aucun contenu payant n'atteint git.
 *
 * Le contenu réel (verbatim du Compagnon, sous copyright BBE) vit dans
 * `private/companion-content.ts` — fichier GITIGNORÉ, importé de façon TOLÉRANTE :
 * absent (CI, autre machine) → source ignorée sans erreur, exactement comme
 * `private/bestiary-paid.ts` (cf. `ingest-bestiary.ts`).
 *
 * Idempotent : `upsert` sur la source (sur `slug`) et sur le fichier Storage.
 * Prérequis : migration 0011 appliquée (bucket `paid-books` + policy RLS).
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { ContentBundle } from '../src/data/contentRegistry';
import type { Database } from '../src/lib/supabase/types';

const BUCKET = 'paid-books';

// Source PAYANTE « Le Compagnon ». Le slug `companion` est le 1er segment du chemin
// Storage (`companion/content.json`), résolu par la policy RLS 0011, et la clé
// itérée par le chargeur gaté côté app (PER-321). Le code `companion-bbe` ne vit
// QU'ICI (posé dans `sources.redeem_code`), jamais versé dans le contenu.
const COMPANION_SOURCE = {
  slug: 'companion',
  name: 'Chroniques Oubliées Fantasy 2 — Le Compagnon du joueur',
  is_paid: true,
  redeemCode: 'companion-bbe',
} as const;

// Spécificateur NON littéral : le fichier étant gitignoré, un `import('…')` littéral
// ferait échouer le typecheck partout où il est absent (CI, build Vercel).
const CONTENT_MODULE = '../private/companion-content';

/**
 * Charge le lot de contenu payant extrait (`private/companion-content.ts`) de façon
 * TOLÉRANTE : le fichier est gitignoré, donc absent en CI ou sur une autre machine →
 * on renvoie `null` sans casser (import dynamique dans un try/catch).
 */
async function loadCompanionContent(): Promise<ContentBundle | null> {
  try {
    const mod = (await import(CONTENT_MODULE)) as { companionContent?: ContentBundle };
    return mod.companionContent ?? null;
  } catch {
    return null;
  }
}

/**
 * Charge `.env.local` (racine projet) dans `process.env` sans écraser une variable
 * déjà présente. Copié de `ingest-bestiary.ts` (même socle, sans dépendance dotenv).
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

/** Compte les entrées d'un lot, par clé, pour le journal de recette. */
function summarizeBundle(bundle: ContentBundle): string {
  return (['ancestries', 'classes', 'paths', 'features', 'equipment'] as const)
    .map((key) => `${key}: ${bundle[key]?.length ?? 0}`)
    .join(', ');
}

async function main(): Promise<void> {
  loadDotEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "Téléversement impossible : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY requis dans l'environnement local (.env.local).",
    );
  }

  const bundle = await loadCompanionContent();
  if (!bundle) {
    console.warn(
      `private/companion-content.ts introuvable ou vide — source « ${COMPANION_SOURCE.slug} » ignorée (rien à téléverser).`,
    );
    return;
  }

  const supabase = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 1. Upsert de la source (sur `slug`), `content_version` bumpée à chaque passage
  //    pour que le chargeur client re-télécharge le lot (réconciliation par version).
  const { data: existing, error: readErr } = await supabase
    .from('sources')
    .select('content_version')
    .eq('slug', COMPANION_SOURCE.slug)
    .maybeSingle();
  if (readErr) throw readErr;
  const nextVersion = (existing?.content_version ?? 0) + 1;

  const { data: source, error: srcErr } = await supabase
    .from('sources')
    .upsert(
      {
        slug: COMPANION_SOURCE.slug,
        name: COMPANION_SOURCE.name,
        is_paid: COMPANION_SOURCE.is_paid,
        content_version: nextVersion,
        redeem_code: COMPANION_SOURCE.redeemCode,
      },
      { onConflict: 'slug' },
    )
    .select('id, content_version')
    .single();
  if (srcErr) throw srcErr;
  console.log(
    `Source « ${COMPANION_SOURCE.slug} » [payante] → content_version ${source.content_version} (id ${source.id}).`,
  );

  // 2. Téléversement du lot JSON dans le bucket privé (même RLS que les PDF payants).
  const json = Buffer.from(JSON.stringify(bundle), 'utf8');
  const remotePath = `${COMPANION_SOURCE.slug}/content.json`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(remotePath, json, { contentType: 'application/json', upsert: true });
  if (upErr) throw upErr;
  console.log(
    `Téléversé : ${remotePath} (${(json.length / 1024).toFixed(1)} Ko) — ${summarizeBundle(bundle)}.`,
  );

  console.log('Montage de la source « companion » terminé.');
}

main().catch((e) => {
  console.error('Échec du téléversement :', e instanceof Error ? e.message : e);
  process.exit(1);
});
