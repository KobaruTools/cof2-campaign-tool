/**
 * Test bout-en-bout du formulaire de retour utilisateur (PER-463/464/465).
 *
 * Ouvre une VRAIE session Supabase (anonyme → `roleOfUser` la résout en `owner`,
 * même mécanique que `scripts/home-shots-gm-screen.ts`), pilote le dialogue de
 * retour dans un navigateur (Playwright), soumet un ticket avec une capture
 * d'écran ET l'export JSON d'un personnage, puis vérifie via l'API Linear que
 * CHAQUE donnée a bien atterri — titre, description, zone, contexte technique,
 * labels, projet, et le CONTENU des deux pièces jointes — avant de nettoyer le
 * ticket de test.
 *
 * Prérequis : un serveur de développement DÉJÀ LANCÉ (`npm run dev`), comme les
 * scripts de capture d'écran.
 *
 * Lance : `npx tsx scripts/test-feedback-e2e.ts`
 *
 * Variables d'env optionnelles :
 *   - `E2E_BASE_URL` (défaut `http://localhost:3000`)
 *   - `E2E_HEADLESS=1` pour un run silencieux (par défaut : navigateur visible,
 *     ralenti, pour pouvoir REGARDER le parcours se dérouler)
 *   - `E2E_KEEP_TICKET=1` pour NE PAS supprimer le ticket créé (inspection manuelle)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { chromium } from 'playwright';
import { fileSlug } from '@/lib/character/summary';
import { storageKeys } from '@/lib/storage/keys';
import { TOUR_REGISTRY } from '@/lib/tours/registry';

loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const HEADLESS = process.env.E2E_HEADLESS === '1';
const KEEP_TICKET = process.env.E2E_KEEP_TICKET === '1';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const LINEAR_API_KEY = process.env.LINEAR_API_KEY;

const FIXTURE_PATH = join(process.cwd(), 'examples', 'characters', 'test-rodeur-humain.json');
/** Même limite que `home-shots-gm-screen.ts` (découpage `@supabase/ssr` au-delà). */
const COOKIE_CHUNK_LIMIT = 3180;
const SCREENSHOT_FILENAME = 'cof2-e2e-screenshot.png';
/** 1×1 PNG transparent minimal — suffisant pour valider le round-trip binaire. */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

const MARKER = `E2E-${Date.now()}`;
const DESCRIPTION =
  `Ticket de test automatisé (${MARKER}) — vérifie la remontée complète des ` +
  'données (texte + pièces jointes) vers Linear. Peut être supprimé sans risque.';
const EXPECTED_TITLE = `[Bug] ${DESCRIPTION.slice(0, 80)}`;

interface CheckResult {
  label: string;
  pass: boolean;
  detail?: string;
}
const results: CheckResult[] = [];
function check(label: string, pass: boolean, detail?: string): void {
  results.push({ label, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${label}${detail && !pass ? ` — ${detail}` : ''}`);
}

/** Session anonyme Supabase — même appel que `home-shots-gm-screen.ts`. */
async function signInAnonymously(supabaseUrl: string, publishableKey: string) {
  const response = await fetch(`${supabaseUrl}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      apikey: publishableKey,
      Authorization: `Bearer ${publishableKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data: {} }),
  });
  const session = (await response.json()) as { access_token?: string };
  if (!response.ok || !session.access_token) {
    throw new Error(
      `connexion anonyme refusée (${response.status}) — les connexions anonymes sont-elles ` +
        'activées sur le projet Supabase ?',
    );
  }
  return session;
}

/** Cookie `@supabase/ssr`, identique au format posé par `home-shots-gm-screen.ts`. */
function sessionCookie(supabaseUrl: string, session: unknown, host: string) {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
  const value = `base64-${Buffer.from(JSON.stringify(session), 'utf8').toString('base64url')}`;
  if (value.length > COOKIE_CHUNK_LIMIT) {
    throw new Error('la session dépasse la taille d’un cookie unique.');
  }
  return {
    name: `sb-${projectRef}-auth-token`,
    value,
    domain: host,
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax' as const,
  };
}

async function linearGraphQL<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: LINEAR_API_KEY! },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await response.json()) as { data?: T; errors?: unknown };
  if (!response.ok || body.errors) {
    throw new Error(`Linear API error: ${JSON.stringify(body.errors ?? response.status)}`);
  }
  return body.data as T;
}

interface LinearIssue {
  id: string;
  title: string;
  description: string;
  project: { name: string } | null;
  labels: { nodes: { name: string }[] };
  attachments: { nodes: { title: string; url: string }[] };
}

/** Pilote le navigateur jusqu'à la réponse `/api/feedback` ; renvoie l'URL du ticket créé (ou `null`). */
async function driveDialog(
  characterPath: string,
  characterId: string,
  rawCharacter: unknown,
  screenshotPath: string,
  session: unknown,
): Promise<{ url: string | null; status: number; body: unknown }> {
  const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 150 });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await context.addCookies([
      sessionCookie(SUPABASE_URL!, session, new URL(BASE_URL).hostname),
    ]);
    await context.addInitScript(
      ([key, payload]) => window.localStorage.setItem(key as string, payload as string),
      [
        storageKeys.store.characters,
        JSON.stringify({ state: { characters: [rawCharacter], cloudBackedIds: [] }, version: 0 }),
      ],
    );
    // Marque tous les tours guidés (PER-423) comme déjà vus : leur overlay intercepterait
    // sinon les clics du parcours (`react-joyride-portal` capte le pointeur).
    const completedVersions = Object.fromEntries(
      Object.entries(TOUR_REGISTRY).map(([tourId, t]) => [tourId, t.version]),
    );
    await context.addInitScript(
      ([key, payload]) => window.localStorage.setItem(key as string, payload as string),
      [storageKeys.store.tours, JSON.stringify({ state: { completedVersions }, version: 0 })],
    );

    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') console.log(`   [console] ${msg.text()}`);
    });

    console.log(`→ Ouverture de ${BASE_URL}${characterPath}…`);
    await page.goto(`${BASE_URL}${characterPath}`, { waitUntil: 'networkidle', timeout: 60_000 });
    await page.waitForSelector('h1', { timeout: 30_000 });

    console.log('→ Ouverture du dialogue de retour…');
    await page.getByRole('button', { name: 'Donner un retour' }).click();
    await page.getByRole('dialog').waitFor();

    // Étape 1 — Type
    await page.getByText('Bug technique', { exact: true }).click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Étape 2 — Zone (« Fiche perso » : seule zone qui propose l'attachement personnage)
    await page.getByText('Fiche perso', { exact: true }).click();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Étape 3 — Détails + pièce jointe capture d'écran
    await page.getByLabel('Décris le problème ou ton idée').fill(DESCRIPTION);
    await page.locator('input[type="file"]').setInputFiles(screenshotPath);
    await page.getByText(SCREENSHOT_FILENAME).waitFor();
    await page.getByRole('button', { name: 'Suivant' }).click();

    // Étape 4 — Récapitulatif : vérifie la présélection AVANT d'envoyer.
    const characterName = String((rawCharacter as { name?: unknown }).name ?? '');
    const recapText = await page.getByRole('dialog').innerText();
    check(
      'Récap — personnage présélectionné (pathname → fiche courante)',
      recapText.includes(characterName),
      recapText,
    );
    check('Récap — capture d’écran comptée', /1 capture/.test(recapText), recapText);

    console.log('→ Envoi…');
    const [response] = await Promise.all([
      page.waitForResponse((r) => r.url().endsWith('/api/feedback') && r.request().method() === 'POST'),
      page.getByRole('button', { name: 'Envoyer' }).click(),
    ]);
    const responseBody = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
    check('Requête /api/feedback → 200', response.status() === 200, `status=${response.status()}`);

    if (responseBody?.url) {
      await page.getByText('Merci pour ton retour !').waitFor({ timeout: 10_000 });
      check('UI — confirmation affichée', true);
    }

    return { url: responseBody?.url ?? null, status: response.status(), body: responseBody };
  } finally {
    await browser.close();
  }
}

async function verifyOnLinear(
  identifier: string,
  characterPath: string,
  characterName: string,
  expectedExportFilename: string,
): Promise<LinearIssue | null> {
  // Laisse le temps aux pièces jointes (best-effort côté serveur, après la réponse) d'atterrir.
  await new Promise((r) => setTimeout(r, 3000));

  const data = await linearGraphQL<{ issue: LinearIssue | null }>(
    `query($id: String!) {
      issue(id: $id) {
        id title description
        project { name }
        labels { nodes { name } }
        attachments { nodes { title url } }
      }
    }`,
    { id: identifier },
  );

  const issue = data.issue;
  check('Ticket trouvé sur Linear', Boolean(issue));
  if (!issue) return null;

  check('Titre = préfixe [Bug] + début de la description', issue.title === EXPECTED_TITLE, issue.title);
  check('Description contient le texte saisi', issue.description.includes(DESCRIPTION));
  check('Description mentionne la zone « Fiche perso »', issue.description.includes('**Zone :** Fiche perso'));
  check('Description mentionne le chemin de la page', issue.description.includes(`Page : ${characterPath}`));
  check(
    'Description mentionne le rapporteur (session anonyme → « Compte »)',
    issue.description.includes('Signalé par : Compte'),
  );
  check('Projet = COF2', issue.project?.name === 'COF2', issue.project?.name ?? 'null');

  const labelNames = [...issue.labels.nodes.map((l) => l.name)].sort();
  check(
    'Labels = Bug + Retour joueur',
    JSON.stringify(labelNames) === JSON.stringify(['Bug', 'Retour joueur']),
    labelNames.join(', ') || '(aucun)',
  );

  check('2 pièces jointes rattachées', issue.attachments.nodes.length === 2, `${issue.attachments.nodes.length} trouvée(s)`);

  const screenshotAttachment = issue.attachments.nodes.find((a) => a.title === SCREENSHOT_FILENAME);
  check('Pièce jointe capture d’écran présente (bon nom)', Boolean(screenshotAttachment));
  if (screenshotAttachment) {
    // `uploads.linear.app` exige l'en-tête `Authorization`, comme le reste de l'API
    // (sans lui, il répond `{"error":"unauthorized",...}` — un JSON qui passerait
    // silencieusement pour un fichier vide sans ce détail).
    const res = await fetch(screenshotAttachment.url, {
      headers: { Authorization: LINEAR_API_KEY! },
    });
    const buf = Buffer.from(await res.arrayBuffer());
    check(
      'Capture d’écran — contenu binaire identique à l’original',
      buf.equals(Buffer.from(PNG_BASE64, 'base64')),
      `${buf.length} octet(s), content-type=${res.headers.get('content-type')}`,
    );
  }

  const characterAttachment = issue.attachments.nodes.find((a) => a.title === expectedExportFilename);
  check(`Pièce jointe personnage présente (${expectedExportFilename})`, Boolean(characterAttachment));
  if (characterAttachment) {
    const res = await fetch(characterAttachment.url, {
      headers: { Authorization: LINEAR_API_KEY! },
    });
    const json = (await res.json()) as { kind?: string; character?: { name?: string } };
    check('Export JSON — enveloppe `cof2-character-export`', json.kind === 'cof2-character-export', json.kind);
    check('Export JSON — nom du personnage correct', json.character?.name === characterName, json.character?.name);
  }

  return issue;
}

function report(): void {
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${results.length - failed.length}/${results.length} vérifications passées`);
  if (failed.length > 0) {
    console.log('Échecs :');
    for (const f of failed) console.log(`  - ${f.label}${f.detail ? ` : ${f.detail}` : ''}`);
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  if (!SUPABASE_URL || !PUBLISHABLE_KEY) {
    console.error(
      'NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY absentes — abandon.',
    );
    process.exit(1);
  }
  if (!LINEAR_API_KEY) {
    console.error('LINEAR_API_KEY absente — abandon (nécessaire pour vérifier le ticket créé).');
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as Record<string, unknown>;
  const characterId = String(raw.id);
  const characterName = String(raw.name);
  const characterPath = `/character/${characterId}`;
  const expectedExportFilename = `${fileSlug(characterName)}.json`;

  const screenshotPath = join(tmpdir(), SCREENSHOT_FILENAME);
  writeFileSync(screenshotPath, Buffer.from(PNG_BASE64, 'base64'));

  console.log(`→ Session anonyme Supabase (${SUPABASE_URL})…`);
  const session = await signInAnonymously(SUPABASE_URL, PUBLISHABLE_KEY);

  const { url, status, body } = await driveDialog(
    characterPath,
    characterId,
    raw,
    screenshotPath,
    session,
  );

  if (!url) {
    check('Réponse contient une URL de ticket', false, `status=${status} body=${JSON.stringify(body)}`);
    report();
    return;
  }
  check('Réponse contient une URL de ticket', true);

  const identifierMatch = /\/issue\/([A-Z]+-\d+)\//.exec(url);
  const identifier = identifierMatch?.[1];
  check('URL de ticket contient un identifiant Linear', Boolean(identifier), url);
  if (!identifier) {
    report();
    return;
  }

  console.log(`→ Vérification côté Linear (${identifier})…`);
  const issue = await verifyOnLinear(identifier, characterPath, characterName, expectedExportFilename);

  if (issue) {
    if (!KEEP_TICKET) {
      console.log('→ Nettoyage du ticket de test…');
      try {
        await linearGraphQL(`mutation($id: String!) { issueDelete(id: $id) { success } }`, {
          id: issue.id,
        });
        console.log('   ticket supprimé.');
      } catch (e) {
        console.warn('   échec de la suppression (à faire à la main) :', e);
      }
    } else {
      console.log(`→ Ticket conservé (E2E_KEEP_TICKET=1) : ${url}`);
    }
  }

  report();
}

main().catch((e) => {
  console.error('Échec du script :', e);
  process.exit(1);
});
