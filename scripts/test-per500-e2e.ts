/**
 * Test bout-en-bout du sélecteur de campagnes (PER-500) + non-régression de la
 * lecture du roster joueur après le correctif `is_member_of_campaign` (migration
 * 0045, PER-499/498).
 *
 * Monte 3 campagnes/joueurs/personnages JETABLES en base réelle (via le client
 * admin), pilote deux vrais parcours dans un navigateur (Playwright) :
 *   - Identité A : rejoint 2 liens magiques successifs dans la MÊME session
 *     (PER-499) → vérifie que le roster de CHAQUE campagne reste lisible (non-
 *     régression 0045), que le sélecteur apparaît avec les 2 campagnes, et que
 *     basculer dessus change effectivement la campagne affichée (PER-500).
 *   - Identité B : rejoint UN SEUL lien → vérifie l'absence de sélecteur (pas de
 *     changement d'UI pour un joueur mono-campagne).
 * Nettoie ensuite tout ce qu'il a créé (personnages, joueurs, campagnes,
 * utilisateurs anonymes + propriétaire jetable).
 *
 * Prérequis : un serveur de développement DÉJÀ LANCÉ (`npm run dev`).
 * Lance : `npx tsx scripts/test-per500-e2e.ts`
 *
 * Variables d'env optionnelles :
 *   - `E2E_BASE_URL` (défaut `http://localhost:3000`)
 *   - `E2E_HEADLESS=1` pour un run silencieux (par défaut : navigateur visible, ralenti)
 *   - `E2E_KEEP_DATA=1` pour NE PAS nettoyer les données de test (inspection manuelle)
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadEnvConfig } from '@next/env';
import { chromium, type BrowserContext, type Page } from 'playwright';
import { createClient } from '@supabase/supabase-js';

loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const HEADLESS = process.env.E2E_HEADLESS === '1';
const KEEP_DATA = process.env.E2E_KEEP_DATA === '1';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

const FIXTURE_PATH = join(process.cwd(), 'examples', 'characters', 'test-rodeur-humain.json');
const MARKER = `PER500-E2E-${Date.now()}`;

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

const admin = createClient(SUPABASE_URL, SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/**
 * Le roster charge après un fetch client asynchrone (le store persos interroge
 * Supabase APRÈS le premier rendu SSR de `h1`) : un `isVisible()` ponctuel juste
 * après `waitForSelector('h1')` est une course perdue d'avance. `waitFor` de
 * Playwright réessaie jusqu'au timeout — c'est la bonne primitive ici.
 */
async function waitVisible(page: Page, text: string, timeoutMs = 10_000): Promise<boolean> {
  try {
    await page.getByText(text).first().waitFor({ state: 'visible', timeout: timeoutMs });
    return true;
  } catch {
    return false;
  }
}

/** Inverse : attend la DISPARITION (utilisé après une bascule de campagne). */
async function waitHidden(page: Page, text: string, timeoutMs = 10_000): Promise<boolean> {
  try {
    await page.getByText(text).first().waitFor({ state: 'hidden', timeout: timeoutMs });
    return true;
  } catch {
    return (await page.getByText(text).count()) === 0;
  }
}

const rawFixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as Record<string, unknown>;

/** Construit un blob `Character` jetable à partir de la fixture, attribué à une campagne/joueur. */
function buildCharacter(name: string, campaignId: string, playerId: string | null) {
  return {
    ...rawFixture,
    id: randomUUID(),
    name,
    campaignId,
    playerId,
    status: 'active',
  };
}

interface TestCampaign {
  campaignId: string;
  playerId: string;
  joinSecret: string;
  characterIds: string[];
}

async function createCampaign(
  ownerId: string,
  campaignName: string,
  characterSpecs: { name: string; claimable: boolean }[],
): Promise<TestCampaign> {
  const { data: campaign, error: campaignError } = await admin
    .from('campaigns')
    .insert({ owner_id: ownerId, name: campaignName })
    .select('id')
    .single();
  if (campaignError) throw campaignError;

  const joinSecret = randomUUID();
  const { data: player, error: playerError } = await admin
    .from('players')
    .insert({ campaign_id: campaign.id, name: 'Joueur E2E', join_secret: joinSecret })
    .select('id')
    .single();
  if (playerError) throw playerError;

  const characterIds: string[] = [];
  for (const spec of characterSpecs) {
    const character = buildCharacter(spec.name, campaign.id, spec.claimable ? null : player.id);
    const { error: charError } = await admin.from('characters').insert({
      id: character.id,
      owner_id: ownerId,
      campaign_id: campaign.id,
      player_id: spec.claimable ? null : player.id,
      status: 'active',
      version: 1,
      schema_version: rawFixture.schemaVersion as number,
      data: character,
    });
    if (charError) throw charError;
    characterIds.push(character.id);
  }

  return { campaignId: campaign.id, playerId: player.id, joinSecret, characterIds };
}

/** Retrouve les utilisateurs anonymes créés au redeem, pour les supprimer au nettoyage. */
async function authUserIdsForPlayers(playerIds: string[]): Promise<string[]> {
  const { data, error } = await admin
    .from('player_auth_sessions')
    .select('auth_user_id')
    .in('player_id', playerIds);
  if (error) throw error;
  return [...new Set((data ?? []).map((r) => r.auth_user_id as string))];
}

async function cleanup(ownerId: string, campaigns: TestCampaign[]): Promise<void> {
  const allPlayerIds = campaigns.map((c) => c.playerId);
  const authUserIds = await authUserIdsForPlayers(allPlayerIds).catch(() => []);

  for (const c of campaigns) {
    if (c.characterIds.length > 0) {
      await admin.from('characters').delete().in('id', c.characterIds);
    }
  }
  await admin
    .from('campaigns')
    .delete()
    .in('id', campaigns.map((c) => c.campaignId));
  for (const authUserId of authUserIds) {
    await admin.auth.admin.deleteUser(authUserId).catch((e) => console.warn('   échec deleteUser (anon) :', e));
  }
  await admin.auth.admin.deleteUser(ownerId).catch((e) => console.warn('   échec deleteUser (owner) :', e));
}

async function newContext(browser: Awaited<ReturnType<typeof chromium.launch>>): Promise<BrowserContext> {
  return browser.newContext({ viewport: { width: 1000, height: 800 } });
}

async function main(): Promise<void> {
  if (!SUPABASE_URL || !SECRET_KEY) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY absentes — abandon.');
    process.exit(1);
  }

  console.log('→ Création du propriétaire jetable + 3 campagnes de test…');
  const { data: owner, error: ownerError } = await admin.auth.admin.createUser({
    email: `${MARKER.toLowerCase()}-owner@example.invalid`,
    email_confirm: true,
  });
  if (ownerError || !owner.user) throw ownerError ?? new Error('création owner échouée');
  const ownerId = owner.user.id;

  const campA = await createCampaign(ownerId, `${MARKER} — Campagne A`, [
    { name: `${MARKER} Perso A (attribué)`, claimable: false },
    { name: `${MARKER} Perso A (à réclamer)`, claimable: true },
  ]);
  const campB = await createCampaign(ownerId, `${MARKER} — Campagne B`, [
    { name: `${MARKER} Perso B (attribué)`, claimable: false },
  ]);
  const campC = await createCampaign(ownerId, `${MARKER} — Campagne C (solo)`, [
    { name: `${MARKER} Perso C (attribué)`, claimable: false },
  ]);

  const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 150 });
  try {
    // ── Identité A : 2 campagnes dans la même session ────────────────────────
    const ctxA = await newContext(browser);
    const pageA = await ctxA.newPage();

    console.log('→ Identité A — rejoint le lien de la campagne A…');
    await pageA.goto(`${BASE_URL}/join/${campA.joinSecret}`, { waitUntil: 'networkidle', timeout: 60_000 });
    check('A — redirigé vers /play', pageA.url().endsWith('/play'), pageA.url());
    await pageA.waitForSelector('h1', { timeout: 30_000 });
    check(
      'A — perso attribué visible (roster non-régression 0045)',
      await waitVisible(pageA, `${MARKER} Perso A (attribué)`),
    );
    check(
      'A — perso réclamable visible',
      await waitVisible(pageA, `${MARKER} Perso A (à réclamer)`),
    );
    check(
      'A — 1 seule campagne pour l’instant : PAS de sélecteur',
      (await pageA.locator('h1 button, h1 [role="button"]').count()) === 0,
    );

    console.log('→ Identité A — rejoint EN PLUS le lien de la campagne B…');
    await pageA.goto(`${BASE_URL}/join/${campB.joinSecret}`, { waitUntil: 'networkidle', timeout: 60_000 });
    check('A — redirigé vers /play (2e campagne)', pageA.url().endsWith('/play'), pageA.url());
    await pageA.waitForSelector('h1', { timeout: 30_000 });
    check(
      'A — perso de la campagne B visible juste après la 2e jonction',
      await waitVisible(pageA, `${MARKER} Perso B (attribué)`),
    );

    console.log('→ Identité A — vérifie le sélecteur de campagnes…');
    const crumbButton = pageA.locator('h1 button, h1 [role="button"]').first();
    check('A — le sélecteur apparaît (2 campagnes membres)', (await crumbButton.count()) > 0);
    await crumbButton.click();
    const menu = pageA.getByRole('menu');
    await menu.waitFor({ timeout: 10_000 });
    const menuText = await menu.innerText();
    check('A — menu liste la campagne A', menuText.includes('Campagne A'), menuText);
    check('A — menu liste la campagne B', menuText.includes('Campagne B'), menuText);

    console.log('→ Identité A — bascule vers la campagne A…');
    await pageA.getByRole('menuitem', { name: /Campagne A/ }).click();
    await pageA.waitForURL('**/play', { timeout: 30_000 });
    await pageA.waitForSelector('h1', { timeout: 30_000 });
    check(
      'A — après bascule : perso de la campagne A de nouveau visible',
      await waitVisible(pageA, `${MARKER} Perso A (attribué)`),
    );
    check(
      'A — après bascule : perso de la campagne B disparu (roster filtré par campagne)',
      await waitHidden(pageA, `${MARKER} Perso B (attribué)`),
    );

    console.log('→ Identité A — bascule retour vers la campagne B (aller-retour)…');
    await pageA.locator('h1 button, h1 [role="button"]').first().click();
    await pageA.getByRole('menuitem', { name: /Campagne B/ }).click();
    await pageA.waitForURL('**/play', { timeout: 30_000 });
    await pageA.waitForSelector('h1', { timeout: 30_000 });
    check(
      'A — bascule retour : perso de la campagne B visible',
      await waitVisible(pageA, `${MARKER} Perso B (attribué)`),
    );

    await ctxA.close();

    // ── Identité B : une seule campagne, aucun sélecteur attendu ─────────────
    const ctxB = await newContext(browser);
    const pageB = await ctxB.newPage();
    console.log('→ Identité B (solo) — rejoint la campagne C…');
    await pageB.goto(`${BASE_URL}/join/${campC.joinSecret}`, { waitUntil: 'networkidle', timeout: 60_000 });
    await pageB.waitForSelector('h1', { timeout: 30_000 });
    check(
      'B — perso de la campagne C visible',
      await waitVisible(pageB, `${MARKER} Perso C (attribué)`),
    );
    check(
      'B — mono-campagne : aucun sélecteur (pas de changement d’UI)',
      (await pageB.locator('h1 button, h1 [role="button"]').count()) === 0,
    );
    await ctxB.close();
  } finally {
    await browser.close();
  }

  if (!KEEP_DATA) {
    console.log('→ Nettoyage des données de test…');
    await cleanup(ownerId, [campA, campB, campC]);
    console.log('   fait.');
  } else {
    console.log(`→ Données conservées (E2E_KEEP_DATA=1), marqueur : ${MARKER}`);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`${results.length - failed.length}/${results.length} vérifications passées`);
  if (failed.length > 0) {
    console.log('Échecs :');
    for (const f of failed) console.log(`  - ${f.label}${f.detail ? ` : ${f.detail}` : ''}`);
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error('Échec du script :', e);
  process.exit(1);
});
