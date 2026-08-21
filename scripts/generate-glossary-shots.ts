/**
 * PER-443 — Capture d'écran de chaque composant listé en section 1 de `GLOSSARY.html`
 * (racine, gitignoré), via l'attribut `data-glossary-shot="NomExact"` posé sur leur élément
 * DOM racine (PER-443 phase 1, workflow de tag). Ce script visite une série de SCÈNES (page
 * + état), et à chaque scène capture — via `locator.screenshot()`, qui scrolle l'élément
 * dans la vue tout seul — tout composant taggué rencontré pour la PREMIÈRE fois. Les
 * composants jamais rencontrés (dialogue nécessitant un clic non scripté, état de jeu
 * particulier) restent avec une note explicite plutôt qu'une image, conformément au critère
 * d'acceptation du ticket.
 *
 * Prérequis : un serveur de développement DÉJÀ LANCÉ (`npm run dev`), comme
 * `generate-home-shots.ts`. Les scènes « écran de MJ » ont besoin en plus des variables
 * Supabase publiques (connexions anonymes) ; sans elles, elles sont sautées proprement.
 *
 * Sortie : `glossary-screenshots/<slug>.webp` (gitignoré) + `glossary-screenshots/manifest.json`
 * (nom → fichier ou raison d'absence), puis réécriture de `GLOSSARY.html` : chaque entrée de
 * la section 1 reçoit soit un lien relatif vers sa capture, soit une note explicite.
 *
 * Lance : `npx tsx scripts/generate-glossary-shots.ts`
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { chromium, type Browser, type Page } from 'playwright';
import sharp from 'sharp';
import {
  GM_SHOT_VIEWPORT,
  gmScreenPath,
  openGmScreen,
} from './home-shots-gm-screen';
import { ancestryById, classById } from '@/data';
import { initialChoices } from '@/lib/character/ancestry';
import { createDraft } from '@/lib/character/wizard';
import { distributeValueSet, initialEquipment, valueSets } from '@/components/wizard/helpers';
import { storageKeys } from '@/lib/storage/keys';

loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

const BASE_URL = process.env.HOME_SHOTS_BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = join(process.cwd(), 'glossary-screenshots');
const GLOSSARY_PATH = join(process.cwd(), 'GLOSSARY.html');
const VIEWPORT = { width: 1440, height: 1000 };
const WEBP_QUALITY = 78;
// Nomenclature `cof2:<domaine>:<sujet>` (PER-408) — les anciens littéraux `cof2-characters` /
// `cof2-wizard-draft` (encore utilisés par generate-home-shots.ts / home-shots-wizard.ts, hors
// périmètre PER-443) sont désormais périmés depuis le branchement des stores à `storageKeys`.
const CHARACTERS_STORAGE_KEY = storageKeys.store.characters;
const WIZARD_STORAGE_KEY = storageKeys.store.wizardDraft;

/**
 * Entrées du glossaire dont le libellé ne correspond à AUCUN nom taggué (le fichier exporte
 * plusieurs composants réels sous d'autres noms — cf. le lot de tag PER-443 phase 1) : on
 * rassemble ici les captures de ces vrais composants plutôt que de laisser une note vide.
 */
const COMPOSITE: Record<string, string[]> = {
  steps: ['ClassStep', 'PathsStep', 'IdentityStep'],
};

/** Composants sans rendu DOM propre — pas de capture possible, note figée. */
const NOT_VISUAL: Record<string, string> = {
  PaidContentBoot: 'Composant sans rendu (déclenche un chargement puis `return null`).',
  HeaderContentSync: 'Pont client pur (`return null` inconditionnel).',
  capabilityScroll: 'Contexte React pur (`Context.Provider` sans nœud DOM).',
  FeatureDeclension: 'Contexte + hooks de déclinaison de texte, sans racine DOM propre.',
  richTextEditorExtensions: 'Configuration Tiptap (Marks/Node/Extension), sans composant React visible.',
  usePathFeatureState: 'Hook pur (état/helpers), sans racine DOM.',
};

/** Slug de fichier sûr à partir du nom exact posé dans `data-glossary-shot`. */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const captured = new Map<string, string>(); // name -> chemin relatif du fichier

/**
 * Filtre de scènes (`GLOSSARY_SHOTS_ONLY=accueil,wizard,fiche,fiche-druide,bestiaire,pdf,mj`),
 * pour relancer le script en plusieurs passages courts plutôt qu'un seul très long. Vide =
 * toutes les scènes. Chaque relance recharge le manifeste existant (ci-dessous) : les captures
 * déjà obtenues ne sont jamais refaites, et `GLOSSARY.html` se met à jour de façon cumulative.
 */
const ONLY = (process.env.GLOSSARY_SHOTS_ONLY ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const wanted = (scene: string) => ONLY.length === 0 || ONLY.includes(scene);

const MANIFEST_PATH = join(OUT_DIR, 'manifest.json');

/** Recharge les captures d'un lancement précédent, pour ne jamais les refaire. */
function loadExistingManifest(): void {
  if (!existsSync(MANIFEST_PATH)) return;
  const previous = JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Record<string, string>;
  for (const [name, filename] of Object.entries(previous)) {
    if (existsSync(join(OUT_DIR, filename))) captured.set(name, filename);
  }
}

/** Convertit en WebP et écrit ; retourne le nom de fichier produit. */
async function writeWebp(png: Buffer, slug: string): Promise<string> {
  const webp = await sharp(png).webp({ quality: WEBP_QUALITY }).toBuffer();
  const filename = `${slug}.webp`;
  writeFileSync(join(OUT_DIR, filename), webp);
  return filename;
}

/**
 * Coupe toute transition/animation CSS et masque l'indicateur de dev Next.js. Playwright
 * attend qu'un élément soit visuellement STABLE avant tout clic/capture ; or plusieurs
 * éléments animent en continu (badge de session « qui respire », révélation au scroll de
 * `SheetSection` via IntersectionObserver — non coupée par `reducedMotion: 'reduce'` émulé,
 * MUI ne lit pas cette préférence, seul du CSS le ferait) et l'indicateur Next.js se redessine
 * sans cesse en dev. Sans cette coupe, la moindre action (clic sur « Déplier » compris, pas
 * seulement les captures) attend une stabilité qui n'arrive jamais et finit en timeout.
 * Idempotent : à appeler tôt sur chaque scène (avant tout clic), et re-vérifié dans
 * `captureTaggedOnPage` au cas où une scène l'aurait omis.
 */
async function stabilizePage(page: Page): Promise<void> {
  await page.addStyleTag({
    content:
      'nextjs-portal { display: none !important; } ' +
      '*, *::before, *::after { transition: none !important; animation: none !important; }',
  });
}

/**
 * Capture chaque composant taggué visible sur `page`, jamais rencontré jusqu'ici.
 * `label` sert uniquement aux messages de progression.
 */
async function captureTaggedOnPage(page: Page, label: string): Promise<void> {
  await stabilizePage(page);
  await expandAllCollapsedSections(page);
  await scrollThroughPage(page);
  const names: string[] = await page.evaluate(() =>
    Array.from(new Set(
      Array.from(document.querySelectorAll('[data-glossary-shot]')).map(
        (el) => el.getAttribute('data-glossary-shot') ?? '',
      ),
    )).filter(Boolean),
  );
  for (const name of names) {
    if (captured.has(name)) continue;
    try {
      // Plusieurs éléments peuvent porter le même nom (variantes responsive via container
      // query, ex. `PurseField` qui rend deux fois son en-tête et masque l'une des deux
      // copies en CSS) : `.first()` tombait parfois sur la copie masquée (taille nulle) alors
      // qu'une copie visible existait. On prend la première dont la boîte a une taille réelle.
      const candidates = page.locator(`[data-glossary-shot="${cssEscape(name)}"]`);
      const count = await candidates.count();
      let locator = candidates.first();
      for (let i = 0; i < count; i += 1) {
        const candidate = candidates.nth(i);
        const box = await candidate.boundingBox();
        if (box && box.width > 0 && box.height > 0) {
          locator = candidate;
          break;
        }
      }
      const png = await locator.screenshot({ type: 'png', timeout: 8000 });
      const filename = await writeWebp(png, slugify(name));
      captured.set(name, filename);
      process.stdout.write(`  + ${name} (${label})\n`);
    } catch (error) {
      // Élément présent dans le DOM mais non capturable (taille nulle, hors-écran figé,
      // détaché avant la capture) : on retente à une scène suivante si l'occasion se
      // présente, jamais une erreur fatale pour le reste de la scène.
      process.stdout.write(`  ! ${name} : capture échouée sur cette scène (${label}) — ${String(error).replace(/\n/g, ' | ')}\n`);
    }
  }
}

/** Échappe une valeur pour un sélecteur d'attribut CSS (le nom peut contenir des espaces/`/`). */
function cssEscape(value: string): string {
  return value.replace(/["\\]/g, '\\$&');
}

async function settle(page: Page, ms: number): Promise<void> {
  await page.waitForTimeout(ms);
}

/** Défile toute la hauteur de page par petits pas : déclenche les `IntersectionObserver`
 * de révélation au scroll (`SheetSection` et consorts) — sans ce passage, tout ce qui est
 * sous le pli reste à `opacity: 0` (invisible pour Playwright, jamais capturable), même une
 * fois scrollé dans la vue par `locator.screenshot()` lui-même (l'observer ne s'est jamais
 * déclenché puisqu'on n'était jamais réellement passé par ce point de défilement avant). */
async function scrollThroughPage(page: Page): Promise<void> {
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 350) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await settle(page, 90);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await settle(page, 300);
}

/** Scène « accueil » (visiteur, sans session) : défile jusqu'en bas pour déclencher les
 * apparitions au scroll avant de capturer, sinon `RevealOnScroll` n'a jamais démarré. */
async function captureHome(browser: Browser): Promise<void> {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('h1', { timeout: 30_000 });
  const height = await page.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < height; y += 400) {
    await page.evaluate((scrollY) => window.scrollTo(0, scrollY), y);
    await settle(page, 120);
  }
  await settle(page, 500);
  await captureTaggedOnPage(page, 'accueil');
  await context.close();
}

/** Brouillon complet nain/barbare (même fabrique que la vitrine), positionné sur `step`. */
function buildWizardDraft(step: number) {
  const ancestry = ancestryById.get('nain');
  const characterClass = classById.get('barbare');
  if (!ancestry || !characterClass) {
    throw new Error('Peuple « nain » ou profil « barbare » manquant du catalogue.');
  }
  const ancestryChoices = initialChoices(ancestry);
  ancestryChoices[0] = 'CON';
  return {
    ...createDraft('glossary-shot-wizard', '2026-01-01T00:00:00.000Z', null, null),
    step,
    ancestryId: ancestry.id,
    ancestryPathId: 'nain',
    classId: characterClass.id,
    baseAbilities: distributeValueSet(valueSets[0].values, characterClass.recommendedAbilities),
    ancestryChoices,
    chosenPaths: ['rage', 'brute'],
    equipment: initialEquipment(characterClass),
    name: 'Korik Peau-de-pierre',
    identity: {
      sex: 'male',
      age: '58',
      height: '128',
      weight: '82',
      description: 'Brouillon de démonstration pour PER-443.',
    },
  };
}

/** Les 7 étapes de l'assistant de création, une scène chacune. */
async function captureWizardSteps(browser: Browser): Promise<void> {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1600 } });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (let step = 0; step < 7; step += 1) {
    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key as string, value as string),
      [WIZARD_STORAGE_KEY, JSON.stringify({ state: { draft: buildWizardDraft(step) }, version: 0 })],
    );
    await page.goto(`${BASE_URL}/create`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await page.waitForSelector('.MuiPaper-outlined', { timeout: 60_000 });
    await settle(page, 1200);
    await captureTaggedOnPage(page, `wizard-étape-${step + 1}`);
  }
  await context.close();
}

/** Clique le premier bouton dont le nom accessible correspond à `pattern`, sans échouer si absent.
 * Clic DOM natif (cf. `expandAllCollapsedSections`) : l'attente d'actionabilité standard de
 * Playwright (`stable`) peut ne jamais se résoudre sur cette page (cause non isolée). */
async function tryClick(page: Page, pattern: RegExp, label: string): Promise<boolean> {
  try {
    const button = page.getByRole('button', { name: pattern }).first();
    await button.waitFor({ state: 'attached', timeout: 3000 });
    const clicked = await button.evaluate((el) => {
      (el as HTMLElement).click();
      return true;
    });
    await settle(page, 800);
    return clicked;
  } catch {
    process.stdout.write(`  ! interaction non déclenchée : ${label}\n`);
    return false;
  }
}

/** Déplie toutes les `SheetSection` repliées (`SheetSection.tsx`, bouton « Déplier » en bas de
 * bloc) : plusieurs composants tagués (Inventaire, Voies & capacités, Historique…) vivent DANS
 * un `Collapse` fermé par défaut/persisté, donc absents visuellement malgré un DOM présent. */
async function expandAllCollapsedSections(page: Page): Promise<void> {
  for (let round = 0; round < 8; round += 1) {
    const count = await page.locator('[aria-label="Déplier"]').count();
    if (count === 0) break;
    // Un clic normal (même `force`) attend parfois une stabilité qui n'arrive jamais sur
    // cette page (cause non isolée) : on déclenche le state React directement via un clic DOM
    // natif, en contournant entièrement l'attente d'actionabilité de Playwright.
    const toggled = await page
      .locator('[aria-label="Déplier"]')
      .first()
      .evaluate((el) => {
        (el as HTMLElement).click();
        return true;
      })
      .catch(() => false);
    if (!toggled) break;
    await settle(page, 500);
    if ((await page.locator('[aria-label="Déplier"]').count()) === count) break;
  }
}

async function closeDialog(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await settle(page, 400);
}

/** Fiche de personnage riche (recette du dépôt), + quelques ouvertures de dialogue en best-effort. */
async function captureSheet(browser: Browser, fixture: string, label: string): Promise<void> {
  const raw = JSON.parse(readFileSync(join(process.cwd(), 'examples', 'characters', fixture), 'utf8'));
  const id = String(raw.id);
  const context = await browser.newContext({ viewport: { width: 1440, height: 1200 } });
  await context.addInitScript(
    ([key, payload]) => window.localStorage.setItem(key as string, payload as string),
    [CHARACTERS_STORAGE_KEY, JSON.stringify({ state: { characters: [raw], cloudBackedIds: [] }, version: 0 })],
  );
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE_URL}/character/${id}`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('h1', { timeout: 30_000 });
  await settle(page, 1000);
  await captureTaggedOnPage(page, label);

  if (await tryClick(page, /repos long/i, 'LongRestDialog')) {
    await captureTaggedOnPage(page, `${label}-repos-long`);
    await closeDialog(page);
  }
  if (await tryClick(page, /repos court/i, 'ShortRestDialog')) {
    await captureTaggedOnPage(page, `${label}-repos-court`);
    await closeDialog(page);
  }
  if (await tryClick(page, /se transformer|forme animale|prendre une forme/i, 'transformation')) {
    await captureTaggedOnPage(page, `${label}-transformation`);
  }

  await context.close();
}

/** Bestiaire libre : liste puis détail de la première créature. */
async function captureBestiary(browser: Browser): Promise<void> {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`${BASE_URL}/bestiary`, { waitUntil: 'networkidle', timeout: 60_000 });
  await page.waitForSelector('h1', { timeout: 30_000 });
  await settle(page, 900);
  await captureTaggedOnPage(page, 'bestiaire-liste');
  try {
    await page.locator('[role="button"], a, li').filter({ hasText: /./ }).first().click({ timeout: 3000 });
    await settle(page, 900);
    await captureTaggedOnPage(page, 'bestiaire-detail');
  } catch {
    process.stdout.write('  ! bestiaire : ouverture du détail non déclenchée\n');
  }
  await context.close();
}

/** Visualiseur PDF (livre de base) et aide-mémoire de règles, chacun sur sa propre page. */
async function capturePdfAndReference(browser: Browser): Promise<void> {
  const context = await browser.newContext({ viewport: VIEWPORT });
  const pdfPage = await context.newPage();
  await pdfPage.emulateMedia({ reducedMotion: 'reduce' });
  await pdfPage.goto(`${BASE_URL}/rules/core-rulebook/12`, { waitUntil: 'networkidle', timeout: 60_000 });
  await pdfPage.waitForSelector('canvas', { timeout: 30_000 });
  await settle(pdfPage, 1800);
  await captureTaggedOnPage(pdfPage, 'pdf');

  const referencePage = await context.newPage();
  await referencePage.emulateMedia({ reducedMotion: 'reduce' });
  await referencePage.goto(`${BASE_URL}/reference`, { waitUntil: 'networkidle', timeout: 60_000 });
  await referencePage.waitForSelector('[aria-label="Sections de l’aide-mémoire"]', { timeout: 30_000 });
  await settle(referencePage, 900);
  await captureTaggedOnPage(referencePage, 'aide-mémoire');
  await context.close();
}

/** Écran de MJ de la campagne de démonstration : vue de base + chaque tiroir latéral (via son
 * paramètre d'URL dédié), une navigation à la fois pour ne jamais superposer deux tiroirs. */
async function captureGmScreen(browser: Browser): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    process.stdout.write(
      '  ! écran de MJ sauté (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY absentes)\n',
    );
    return;
  }
  // `openGmScreen` fait un aller-retour réseau (connexion anonyme) sans délai propre :
  // borné ici pour ne jamais bloquer tout le script si Supabase ne répond pas.
  const page = await Promise.race([
    openGmScreen(browser, { baseUrl: BASE_URL, supabaseUrl, publishableKey, viewport: GM_SHOT_VIEWPORT }),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('connexion anonyme Supabase : délai dépassé (20 s)')), 20_000),
    ),
  ]);
  await page.waitForSelector('[aria-label="Cartes compactes"]', { timeout: 30_000 });
  await page.waitForSelector('text=Momie', { timeout: 30_000 });
  await settle(page, 1500);
  await captureTaggedOnPage(page, 'mj-écran');

  const sheetFixture = JSON.parse(
    readFileSync(join(process.cwd(), 'examples', 'characters', 'test-chevalier-humain.json'), 'utf8'),
  );
  const drawers: { param: string; value: string; label: string; wait?: string }[] = [
    { param: 'sheet', value: String(sheetFixture.id), label: 'mj-tiroir-fiche' },
    { param: 'bestiary', value: '1', label: 'mj-tiroir-bestiaire' },
    { param: 'history', value: '1', label: 'mj-tiroir-historique' },
    { param: 'rumors', value: '1', label: 'mj-tiroir-rumeurs' },
    { param: 'npc', value: '1', label: 'mj-tiroir-pnj' },
    { param: 'notes', value: '1', label: 'mj-tiroir-notes' },
    { param: 'loot', value: '1', label: 'mj-tiroir-butin' },
    { param: 'reference', value: '1', label: 'mj-tiroir-aide-memoire' },
  ];
  for (const drawer of drawers) {
    try {
      await page.goto(`${BASE_URL}${gmScreenPath()}?${drawer.param}=${drawer.value}`, {
        waitUntil: 'networkidle',
        timeout: 60_000,
      });
      await settle(page, 1400);
      await captureTaggedOnPage(page, drawer.label);
    } catch {
      process.stdout.write(`  ! tiroir MJ non ouvert : ${drawer.label}\n`);
    }
  }
  await page.context().close();
}

/**
 * Réécrit `GLOSSARY.html` : chaque `<div class="entry">` de la section 1 dont le `<h4>`
 * correspond à un nom connu reçoit une ligne `<p class="shot">` — lien relatif vers la
 * capture si elle existe, sinon note explicite (non-visuel ou capture non atteinte).
 */
function patchGlossary(): { linked: number; noted: number } {
  const original = readFileSync(GLOSSARY_PATH, 'utf8');
  let linked = 0;
  let noted = 0;
  // Uniquement la section 1 (Composants UI) : les sections 2 (Domaine CO2) et 3 (Primitifs
  // de code) ne sont pas des composants React et n'ont rien à capturer.
  const sectionStart = original.indexOf('<section id="ui">');
  const sectionEnd = original.indexOf('</section>', sectionStart);
  if (sectionStart === -1 || sectionEnd === -1) {
    throw new Error('Section "ui" introuvable dans GLOSSARY.html.');
  }
  const before = original.slice(0, sectionStart);
  const section = original.slice(sectionStart, sectionEnd);
  const after = original.slice(sectionEnd);

  const patchedSection = section.replace(
    /<div class="entry"><h4>([^<]+)<\/h4>([\s\S]*?)<\/div>/g,
    (full, name: string, rest: string) => {
      // On retire toute ligne posée par un lancer précédent du script (relance après capture
      // partielle) pour toujours refléter l'état COURANT de `captured`, y compris le passage
      // d'une note « non atteint » à une vraie capture.
      const cleanedRest = rest.replace(/<p class="(?:shot|shot-note)"[^>]*>[\s\S]*?<\/p>/g, '');
      const filename = captured.get(name);
      const compositeNames = COMPOSITE[name];
      let shot: string;
      if (filename) {
        linked += 1;
        shot = `<p class="shot"><img src="glossary-screenshots/${filename}" alt="Capture de ${name}" loading="lazy"></p>`;
      } else if (compositeNames) {
        const images = compositeNames
          .map((n) => captured.get(n))
          .filter((f): f is string => Boolean(f))
          .map((f, i) => `<p class="shot"><img src="glossary-screenshots/${f}" alt="Capture de ${compositeNames[i]}" loading="lazy"></p>`)
          .join('');
        if (images) {
          linked += 1;
          shot =
            `<p class="shot-note">Le fichier exporte ${compositeNames.length} composants réels ` +
            `(${compositeNames.join(', ')}), chacun capturé séparément :</p>${images}`;
        } else {
          noted += 1;
          shot = `<p class="shot-note">Capture non atteinte à cette passe (état de jeu/données particulières).</p>`;
        }
      } else {
        noted += 1;
        const reason = NOT_VISUAL[name] ?? 'Capture non atteinte à cette passe (état de jeu/données particulières).';
        shot = `<p class="shot-note">${reason}</p>`;
      }
      return `<div class="entry"><h4>${name}</h4>${cleanedRest}${shot}</div>`;
    },
  );
  writeFileSync(GLOSSARY_PATH, before + patchedSection + after);
  return { linked, noted };
}

/** Exécute une scène sans jamais faire échouer les suivantes : un blocage isolé (fixture
 * introuvable, sélecteur qui ne charge jamais) ne doit pas priver les autres scènes. */
async function runScene(label: string, scene: () => Promise<void>): Promise<void> {
  try {
    await scene();
  } catch (error) {
    process.stdout.write(`  !! scène « ${label} » interrompue : ${String(error)}\n`);
  }
}

async function main(): Promise<void> {
  mkdirSync(OUT_DIR, { recursive: true });
  loadExistingManifest();
  const browser = await chromium.launch();

  if (wanted('accueil')) await runScene('accueil', () => captureHome(browser));
  if (wanted('wizard')) await runScene('wizard', () => captureWizardSteps(browser));
  if (wanted('fiche')) await runScene('fiche', () => captureSheet(browser, 'test-rodeur-humain.json', 'fiche'));
  if (
    wanted('fiche-druide') &&
    existsSync(join(process.cwd(), 'examples', 'characters', 'recette-per378-druide-maitre-de-la-nature.json'))
  ) {
    await runScene('fiche-druide', () =>
      captureSheet(browser, 'recette-per378-druide-maitre-de-la-nature.json', 'fiche-druide'),
    );
  }
  if (wanted('bestiaire')) await runScene('bestiaire', () => captureBestiary(browser));
  if (wanted('pdf')) await runScene('pdf+reference', () => capturePdfAndReference(browser));
  if (wanted('mj')) await runScene('mj-écran', () => captureGmScreen(browser));

  await browser.close();

  writeFileSync(MANIFEST_PATH, JSON.stringify(Object.fromEntries(captured), null, 2));
  const { linked, noted } = patchGlossary();
  process.stdout.write(
    `\nTerminé : ${captured.size} captures écrites dans glossary-screenshots/, ` +
      `${linked} entrées liées dans GLOSSARY.html, ${noted} laissées avec une note.\n`,
  );
}

main().catch((error) => {
  process.stderr.write(`\nÉchec de la génération des captures du glossaire : ${String(error)}\n`);
  process.stderr.write('Vérifiez qu’un serveur de développement tourne (npm run dev).\n');
  process.exit(1);
});
