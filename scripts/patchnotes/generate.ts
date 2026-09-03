/**
 * Génère une entrée de patch note joueur à partir des commits `feat`/`fix`/`perf`
 * non encore traités, puis la commite (PER-460). Appelé par le hook `pre-push`
 * local (`.git/hooks/pre-push`, non tracké) à chaque push sur `main`.
 *
 * Lancer manuellement : `npx tsx scripts/patchnotes/generate.ts`
 *
 * Ne touche jamais `src/data/patchnotes.json` (servi au site, jamais de SHA
 * dedans) sans mettre aussi à jour `scripts/patchnotes/state.json` (SHA du
 * dernier commit traité, jamais exposé au site) — et inversement. Si aucun
 * commit ne matche, ne rien écrire ni committer (le push ne doit pas être
 * bloqué pour un commit non user-facing).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const STATE_PATH = join(ROOT, 'scripts', 'patchnotes', 'state.json');
const DATA_PATH = join(ROOT, 'src', 'data', 'patchnotes.json');
const BOOTSTRAP_COMMIT_COUNT = 30;

interface State {
  lastSha: string | null;
}

interface PatchnoteEntry {
  id: number;
  date: string;
  items: string[];
}

interface MatchedCommit {
  type: 'feat' | 'fix' | 'perf';
  subject: string;
}

const CONVENTIONAL_RE = /^(feat|fix|perf)(\([^)]+\))?!?:\s*(.+)$/;
const TICKET_REF_RE = /\s*\(?\bPER-\d+\)?\s*$/i;

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8' }).trim();
}

function readState(): State {
  if (!existsSync(STATE_PATH)) return { lastSha: null };
  try {
    return JSON.parse(readFileSync(STATE_PATH, 'utf-8')) as State;
  } catch {
    return { lastSha: null };
  }
}

function readPatchnotes(): PatchnoteEntry[] {
  if (!existsSync(DATA_PATH)) return [];
  try {
    return JSON.parse(readFileSync(DATA_PATH, 'utf-8')) as PatchnoteEntry[];
  } catch {
    return [];
  }
}

function cleanSubject(subject: string): string {
  return subject.replace(TICKET_REF_RE, '').trim();
}

function getMatchedCommits(state: State): MatchedCommit[] {
  const range = state.lastSha ? `${state.lastSha}..HEAD` : null;
  const logArgs = range
    ? ['log', range, '--pretty=format:%s']
    : ['log', `-${BOOTSTRAP_COMMIT_COUNT}`, '--pretty=format:%s'];
  const raw = git(logArgs);
  if (!raw) return [];

  const matched: MatchedCommit[] = [];
  for (const line of raw.split('\n')) {
    const m = CONVENTIONAL_RE.exec(line.trim());
    if (!m) continue;
    const [, type, , subject] = m;
    matched.push({ type: type as MatchedCommit['type'], subject: cleanSubject(subject) });
  }
  // git log liste du plus récent au plus ancien : on remet en ordre chronologique.
  return matched.reverse();
}

function fallbackItems(commits: MatchedCommit[]): string[] {
  const labels: Record<MatchedCommit['type'], string> = {
    feat: 'Nouveau',
    fix: 'Corrigé',
    perf: 'Amélioration',
  };
  return commits.map((c) => `${labels[c.type]} : ${c.subject}`);
}

function tryClaudeRewrite(commits: MatchedCommit[]): string[] | null {
  const list = commits.map((c, i) => `${i + 1}. ${c.subject}`).join('\n');
  const prompt = `Voici des messages de commit techniques d'une mise à jour d'un outil de jeu de rôle (Chroniques Oubliées Fantasy). Reformule chacun en une phrase courte et naturelle en français, destinée aux joueurs : pas de jargon technique, pas de nom de fichier ni de composant, pas de référence de ticket. Réponds UNIQUEMENT avec un tableau JSON de chaînes de caractères, une par message, dans le même ordre, sans aucun autre texte.\n\nMessages :\n${list}`;

  try {
    const out = execFileSync('claude', ['-p', prompt], {
      encoding: 'utf-8',
      timeout: 60000,
    });
    const start = out.indexOf('[');
    const end = out.lastIndexOf(']');
    if (start === -1 || end === -1 || end < start) return null;
    const parsed: unknown = JSON.parse(out.slice(start, end + 1));
    if (!Array.isArray(parsed) || parsed.length !== commits.length) return null;
    if (!parsed.every((item) => typeof item === 'string' && item.trim().length > 0)) return null;
    return parsed as string[];
  } catch {
    return null;
  }
}

function main() {
  const state = readState();
  const commits = getMatchedCommits(state);

  if (commits.length === 0) {
    console.log('[patchnotes] aucun commit feat/fix/perf a traiter, rien a faire.');
    return;
  }

  const items = tryClaudeRewrite(commits) ?? fallbackItems(commits);

  const entries = readPatchnotes();
  const entry: PatchnoteEntry = {
    id: entries.length + 1,
    date: new Date().toISOString().slice(0, 10),
    items,
  };
  entries.push(entry);
  writeFileSync(DATA_PATH, `${JSON.stringify(entries, null, 2)}\n`, 'utf-8');

  const newState: State = { lastSha: git(['rev-parse', 'HEAD']) };
  writeFileSync(STATE_PATH, `${JSON.stringify(newState, null, 2)}\n`, 'utf-8');

  git(['add', 'src/data/patchnotes.json', 'scripts/patchnotes/state.json']);
  git(['commit', '-m', 'chore(patchnotes): mise a jour automatique']);
  console.log(`[patchnotes] entree #${entry.id} generee et commitee (${items.length} item(s)).`);
}

main();
