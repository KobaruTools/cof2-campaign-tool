/**
 * Garde-fou anti-régression pour la nomenclature localStorage (PER-410).
 *
 * Lance : `npx tsx scripts/check-storage-keys.ts`
 *
 * Repère tout appel `localStorage.(getItem|setItem|removeItem|key)` dont le
 * premier argument est un littéral (chaîne ou template) au lieu d'une clé
 * résolue via `storageKeys` (`src/lib/storage/keys.ts`) — signe qu'une clé a
 * été retapée à la main en dehors du fichier central, exactement le désordre
 * que PER-408/409 ont nettoyé.
 *
 * Sortie : code de sortie 1 si un littéral non autorisé est trouvé.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'src');

// Le fichier central lui-même et son test : littéraux légitimes (ils
// DÉFINISSENT ou testent la table de migration ancienne clé -> nouvelle clé).
const EXEMPT_FILES = new Set([
  'src/lib/storage/keys.ts',
  'src/lib/storage/migrateLegacyKeys.ts',
  'src/lib/storage/migrateLegacyKeys.test.ts',
]);

// Dette connue à la mise en place du garde-fou (PER-410), repérée hors de
// l'inventaire PER-408/409, migration prévue en PER-411. Ne pas ajouter de
// nouvelles entrées ici : toute clé neuve doit passer par `storageKeys`.
const KNOWN_LEGACY_LITERALS = new Set([
  'sheet:pin-derived-stat-items', // src/app/character/[id]/page.tsx
  'sheet:voies-layout', // src/app/character/[id]/page.tsx
]);

function listFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      listFiles(full, out);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

const CALL_RE = /\b(?:window\.)?localStorage\.(getItem|setItem|removeItem|key)\(\s*(['"`])((?:\\.|(?!\2).)*)\2/g;

type Violation = { file: string; line: number; method: string; literal: string };

const violations: Violation[] = [];

for (const file of listFiles(SRC)) {
  const relPath = relative(ROOT, file).replace(/\\/g, '/');
  if (EXEMPT_FILES.has(relPath)) continue;

  const content = readFileSync(file, 'utf8');
  CALL_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CALL_RE.exec(content))) {
    const [, method, , rawLiteral] = match;
    if (KNOWN_LEGACY_LITERALS.has(rawLiteral)) continue;

    const line = content.slice(0, match.index).split('\n').length;
    violations.push({ file: relPath, line, method, literal: rawLiteral });
  }
}

if (violations.length > 0) {
  console.error('Clé(s) localStorage écrite(s) en dur hors de src/lib/storage/keys.ts :\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line} — localStorage.${v.method}('${v.literal}')`);
  }
  console.error("\nPasser par `storageKeys` (src/lib/storage/keys.ts) au lieu d'un littéral.");
  process.exit(1);
} else {
  console.log(
    `OK — aucune clé localStorage en dur hors du fichier central (dette connue : ${KNOWN_LEGACY_LITERALS.size} exception(s), PER-411).`,
  );
}
