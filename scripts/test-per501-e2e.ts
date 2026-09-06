/**
 * Test bout-en-bout de la liaison d'identité joueur (PER-501).
 *
 * Monte 1 campagne/joueur/personnage JETABLE en base réelle (via le client admin),
 * pilote un vrai parcours dans un navigateur (Playwright) :
 *   - rejoint le lien magique → session joueur anonyme réelle ;
 *   - depuis `/play`, clique « Lier mon identité » → atterrit sur `/play/account` ;
 *   - vérifie l'état initial (aucune identité liée, providers OAuth proposés) ;
 *   - soumet le formulaire email (`updateUser({ email })`) et vérifie que l'app
 *     répond (succès ou erreur affichée), sans crash.
 *
 * Ne complète PAS le round-trip email/OAuth (pas de boîte mail ni de creds
 * Google/Discord dans cet environnement) : la garantie « les campagnes déjà
 * rejointes restent accessibles après liaison » tient structurellement du fait que
 * `app_metadata` (player_id/campaign_id) et `player_auth_sessions` (auth_user_id)
 * sont indépendants du champ email/des identities Supabase — vérifié par lecture de
 * code (`sessionRole.ts` ne lit que `player_id`, jamais `is_anonymous`), pas
 * reproductible ici sans un vrai clic de confirmation.
 *
 * Prérequis : un serveur de développement DÉJÀ LANCÉ (`npm run dev`).
 * Lance : `npx tsx scripts/test-per501-e2e.ts`
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
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:3000';
const HEADLESS = process.env.E2E_HEADLESS === '1';
const KEEP_DATA = process.env.E2E_KEEP_DATA === '1';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY!;

const FIXTURE_PATH = join(process.cwd(), 'examples', 'characters', 'test-rodeur-humain.json');
const MARKER = `PER501-E2E-${Date.now()}`;

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

const rawFixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf8')) as Record<string, unknown>;

async function main(): Promise<void> {
  if (!SUPABASE_URL || !SECRET_KEY) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY absentes — abandon.');
    process.exit(1);
  }

  console.log('→ Création du propriétaire jetable + 1 campagne/joueur/personnage de test…');
  const { data: owner, error: ownerError } = await admin.auth.admin.createUser({
    email: `${MARKER.toLowerCase()}-owner@example.invalid`,
    email_confirm: true,
  });
  if (ownerError || !owner.user) throw ownerError ?? new Error('création owner échouée');
  const ownerId = owner.user.id;

  const { data: campaign, error: campaignError } = await admin
    .from('campaigns')
    .insert({ owner_id: ownerId, name: `${MARKER} — Campagne` })
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

  const characterId = randomUUID();
  const { error: charError } = await admin.from('characters').insert({
    id: characterId,
    owner_id: ownerId,
    campaign_id: campaign.id,
    player_id: player.id,
    status: 'active',
    version: 1,
    schema_version: rawFixture.schemaVersion as number,
    data: { ...rawFixture, id: characterId, name: `${MARKER} Perso`, campaignId: campaign.id, playerId: player.id, status: 'active' },
  });
  if (charError) throw charError;

  const browser = await chromium.launch({ headless: HEADLESS, slowMo: HEADLESS ? 0 : 150 });
  let authUserId: string | null = null;
  try {
    const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } });
    const page = await ctx.newPage();

    console.log('→ Rejoint le lien magique…');
    await page.goto(`${BASE_URL}/join/${joinSecret}`, { waitUntil: 'networkidle', timeout: 60_000 });
    check('redirigé vers /play', page.url().endsWith('/play'), page.url());
    await page.waitForSelector('h1', { timeout: 30_000 });

    console.log('→ Clique « Lier mon identité »…');
    await page.getByRole('link', { name: 'Lier mon identité' }).click();
    await page.waitForURL('**/play/account', { timeout: 15_000 });
    check('navigation vers /play/account', page.url().endsWith('/play/account'), page.url());

    check(
      'état initial : aucune identité liée',
      await page
        .getByText('Aucune identité liée pour l’instant.')
        .first()
        .waitFor({ state: 'visible', timeout: 10_000 })
        .then(() => true)
        .catch(() => false),
    );
    check(
      'bouton Lier Google présent',
      await page.getByRole('button', { name: 'Lier Google' }).isVisible().catch(() => false),
    );
    check(
      'bouton Lier Discord présent',
      await page.getByRole('button', { name: 'Lier Discord' }).isVisible().catch(() => false),
    );

    console.log('→ Soumet le formulaire email…');
    await page.getByLabel('Email').fill(`${MARKER.toLowerCase()}-player@example.invalid`);
    await page.getByRole('button', { name: 'Envoyer' }).click();
    const responded = await Promise.race([
      page
        .getByText('Un lien de confirmation a été envoyé', { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => 'success' as const)
        .catch(() => null),
      page
        .getByText("L'envoi du lien a échoué", { exact: false })
        .first()
        .waitFor({ state: 'visible', timeout: 15_000 })
        .then(() => 'error' as const)
        .catch(() => null),
    ]);
    check('soumission email : réponse affichée (succès ou erreur), pas de crash', responded !== null, `réponse: ${responded}`);

    // Retrouve l'utilisateur anonyme créé au redeem, pour le nettoyage.
    const { data: sessions } = await admin
      .from('player_auth_sessions')
      .select('auth_user_id')
      .eq('player_id', player.id)
      .maybeSingle();
    authUserId = sessions?.auth_user_id ?? null;
    check('claims préservés : session toujours rattachée au joueur', authUserId !== null);
  } finally {
    await browser.close();
  }

  const passCount = results.filter((r) => r.pass).length;
  console.log(`\n${passCount}/${results.length} vérifications passées.`);

  if (!KEEP_DATA) {
    console.log('→ Nettoyage…');
    await admin.from('characters').delete().eq('id', characterId);
    await admin.from('campaigns').delete().eq('id', campaign.id);
    if (authUserId) {
      await admin.auth.admin.deleteUser(authUserId).catch((e) => console.warn('   échec deleteUser (anon) :', e));
    }
    await admin.auth.admin.deleteUser(ownerId).catch((e) => console.warn('   échec deleteUser (owner) :', e));
    console.log('   fait.');
  } else {
    console.log(`Données de test conservées (campagne ${campaign.id}, owner ${ownerId}).`);
  }

  if (passCount !== results.length) process.exit(1);
}

main().catch((err) => {
  console.error('Échec du test :', err);
  process.exit(1);
});
