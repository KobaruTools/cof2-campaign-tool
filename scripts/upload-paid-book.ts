/**
 * Téléversement d'un PDF payant vers le bucket privé `paid-books` (PER-252) —
 * script CLI LOCAL one-shot, à lancer par le propriétaire : `npm run upload-book`.
 *
 * Le fichier (ex. `pdf-payants/bestiaire.pdf`, ~43 Mo, GITIGNORÉ car sous copyright
 * BBE) est poussé vers `paid-books/{sourceSlug}/book.pdf` avec la clé SECRÈTE
 * (`service_role`, contourne la RLS) — variable d'env LOCALE seulement (`.env.local`),
 * jamais commitée ni déployée en CI. La lecture, elle, est gardée par la RLS de la
 * migration 0011 (entitlement sur la source, PER-242).
 *
 * Idempotent : `upsert: true` réécrit le fichier à chaque passage.
 *
 * Le bucket doit exister (migration 0011 appliquée). Convention de chemin : le 1er
 * segment est le SLUG de la source (`bestiaire`), résolu par la policy RLS.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/types';

const BUCKET = 'paid-books';

// Livre(s) payant(s) à téléverser : source slug → chemin local du PDF (hors git).
// Le chemin distant est déduit : `{sourceSlug}/book.pdf`.
const BOOKS: { sourceSlug: string; localPath: string }[] = [
  { sourceSlug: 'bestiaire', localPath: 'pdf-payants/bestiaire.pdf' },
];

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

async function main(): Promise<void> {
  loadDotEnvLocal();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "Téléversement impossible : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SECRET_KEY requis dans l'environnement local (.env.local).",
    );
  }

  const supabase = createClient<Database>(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  for (const book of BOOKS) {
    let pdf: Buffer;
    try {
      pdf = readFileSync(resolve(process.cwd(), book.localPath));
    } catch {
      console.warn(
        `« ${book.sourceSlug} » : fichier local ${book.localPath} introuvable — ignoré.`,
      );
      continue;
    }

    const remotePath = `${book.sourceSlug}/book.pdf`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(remotePath, pdf, { contentType: 'application/pdf', upsert: true });
    if (error) throw error;
    console.log(
      `Téléversé : ${book.localPath} → ${BUCKET}/${remotePath} (${(pdf.length / 1_048_576).toFixed(1)} Mo).`,
    );
  }

  console.log('Téléversement des livres payants terminé.');
}

main().catch((e) => {
  console.error('Échec du téléversement :', e instanceof Error ? e.message : e);
  process.exit(1);
});
