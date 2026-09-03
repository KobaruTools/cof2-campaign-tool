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
 *
 * Contenu payant (« Le Compagnon ») — INTERDIT à vie dans les patchnotes,
 * repo public : tout commit qui matche `paidContentBlocklist.ts` est exclu,
 * silencieusement (juste un log console), jamais reformulé « en générique ».
 * Voir `scripts/patchnotes/paidContentBlocklist.ts` pour la règle complète.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { containsPaidContent } from './paidContentBlocklist';
import { PATCHNOTE_TAG_ORDER, isPatchnoteTagId, type PatchnoteTagId } from '@/data/patchnoteTags';

const ROOT = join(__dirname, '..', '..');
const STATE_PATH = join(ROOT, 'scripts', 'patchnotes', 'state.json');
const DATA_PATH = join(ROOT, 'src', 'data', 'patchnotes.json');
const BOOTSTRAP_COMMIT_COUNT = 30;

interface State {
  lastSha: string | null;
}

interface PatchnoteItem {
  text: string;
  tag: PatchnoteTagId;
}

interface PatchnoteEntry {
  id: number;
  date: string;
  items: PatchnoteItem[];
}

interface MatchedCommit {
  type: 'feat' | 'fix' | 'perf';
  scope: string | null;
  subject: string;
}

const CONVENTIONAL_RE = /^(feat|fix|perf)(\(([^)]+)\))?!?:\s*(.+)$/;
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
    const [, type, , scope, subject] = m;
    const cleaned = cleanSubject(subject);
    if (containsPaidContent(cleaned) || (scope && containsPaidContent(scope))) {
      console.log(`[patchnotes] commit exclu (contenu payant) : ${line.trim()}`);
      continue;
    }
    matched.push({ type: type as MatchedCommit['type'], scope: scope ?? null, subject: cleaned });
  }
  // git log liste du plus récent au plus ancien : on remet en ordre chronologique.
  return matched.reverse();
}

/** Heuristique de repli (pas de Claude dispo) : scope conventionnel puis mots-clés du sujet. */
function guessTag(commit: MatchedCommit): PatchnoteTagId {
  const haystack = `${commit.scope ?? ''} ${commit.subject}`
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const rules: Array<[PatchnoteTagId, RegExp]> = [
    ['gm-screen', /\b(mj|gm|meneur|initiative|combat|projection)\b/],
    ['codex', /\bcodex\b/],
    ['bestiary', /\b(bestiaire|creature)\b/],
    ['campaign', /\b(campagne|joueurs?)\b/],
    ['account', /\b(compte|connexion|auth)\b/],
    ['creation-levelup', /\b(creation|assistant|wizard|niveau)\b/],
    ['reference-sheet', /\baide-memoire\b/],
    ['character-sheet', /\b(fiche|personnage|inventaire|equipement|prestige|lutin|kobold|peuples?)\b/],
  ];
  for (const [tag, re] of rules) {
    if (re.test(haystack)) return tag;
  }
  return 'other';
}

function fallbackItems(commits: MatchedCommit[]): PatchnoteItem[] {
  const labels: Record<MatchedCommit['type'], string> = {
    feat: 'Nouveau',
    fix: 'Corrigé',
    perf: 'Amélioration',
  };
  return commits.map((c) => ({
    text: `${labels[c.type]} : ${c.subject}`,
    tag: guessTag(c),
  }));
}

function tryClaudeRewrite(commits: MatchedCommit[]): PatchnoteItem[] | null {
  const list = commits.map((c, i) => `${i + 1}. ${c.subject}`).join('\n');
  const tagList = PATCHNOTE_TAG_ORDER.join(', ');
  const prompt = `Voici des messages de commit techniques d'une mise à jour d'un outil de jeu de rôle (Chroniques Oubliées Fantasy). Pour chaque message : (1) reformule-le en une phrase courte et naturelle en français, destinée aux joueurs — pas de jargon technique, pas de nom de fichier ni de composant, pas de référence de ticket ; (2) classe-le dans UNE seule zone du site parmi cette liste exacte d'identifiants : ${tagList}. Réponds UNIQUEMENT avec un tableau JSON d'objets {"text": string, "tag": string}, un par message, dans le même ordre, sans aucun autre texte.\n\nMessages :\n${list}`;

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
    const items: PatchnoteItem[] = [];
    for (let i = 0; i < parsed.length; i++) {
      const entry = parsed[i] as { text?: unknown; tag?: unknown };
      if (typeof entry.text !== 'string' || entry.text.trim().length === 0) return null;
      const tag = typeof entry.tag === 'string' && isPatchnoteTagId(entry.tag) ? entry.tag : guessTag(commits[i]);
      items.push({ text: entry.text, tag });
    }
    return items;
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

  const rewritten = tryClaudeRewrite(commits) ?? fallbackItems(commits);
  // Filet de sécurité : même reformulé par Claude, un item citant du contenu
  // payant est retiré plutôt que publié (voir paidContentBlocklist.ts).
  const items = rewritten.filter((item) => {
    if (containsPaidContent(item.text)) {
      console.log(`[patchnotes] item exclu apres reformulation (contenu payant) : ${item.text}`);
      return false;
    }
    return true;
  });

  if (items.length === 0) {
    console.log('[patchnotes] tous les commits matches etaient du contenu payant, rien a publier.');
    return;
  }

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
