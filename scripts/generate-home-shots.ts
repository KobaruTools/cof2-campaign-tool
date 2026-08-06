/**
 * Génère les captures d'écran de la VITRINE (`/`) — celles de la section « À quoi ça
 * ressemble » — dans `public/home/`.
 *
 * Pourquoi un script plutôt que des captures faites à la main : une capture prise une
 * fois vieillit **en silence**. L'UI bouge, la page d'accueil continue de montrer une
 * version de l'outil qui n'existe plus, et personne ne s'en aperçoit. Ici, une commande
 * remet tout à jour, et la composition (personnage montré, cadrage, pages visitées) est
 * versionnée avec le code.
 *
 * Prérequis : un serveur de développement DÉJÀ LANCÉ (`npm run dev`). Le script ne le
 * démarre pas et ne l'arrête pas — il se contente de visiter les pages. L'URL de base
 * est réglable par `HOME_SHOTS_BASE_URL` (défaut `http://localhost:3000`), et
 * `HOME_SHOTS_ONLY` limite la reprise à certaines captures
 * (`HOME_SHOTS_ONLY=gm-screen,sheet`).
 *
 * La fiche de personnage est capturée SANS COMPTE : le personnage d'exemple est injecté
 * dans le `localStorage` du navigateur de test (même clé que le store `characters`),
 * ce qui suffit puisque l'application est locale d'abord. Aucune session, aucun accès à
 * la base — donc rien de privé ne peut fuir dans une capture.
 *
 * Seul l'**écran de MJ** fait exception : il vit derrière l'authentification et lit ses
 * données dans le cloud. Il a donc sa propre mécanique — session de démonstration et
 * campagne fictive — dans `scripts/home-shots-gm-screen.ts`. Là encore, aucune donnée
 * réelle : la campagne, les joueurs et le combat sont inventés, et la base n'est lue que
 * pour les blocs du bestiaire (source libre). Sans variables d'environnement Supabase,
 * cette capture est simplement sautée.
 *
 * `sharp` sert à convertir en WebP (Playwright n'écrit que du PNG ou du JPEG). Il est
 * fourni par Next.js pour l'optimisation d'images ; s'il venait à disparaître, le script
 * le dit clairement au lieu d'échouer obscurément.
 *
 * Lance : `npx tsx scripts/generate-home-shots.ts`
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { chromium, type Page } from 'playwright';
import sharp from 'sharp';
import {
  GM_SHOT_SLUG,
  GM_SHOT_VIEWPORT,
  gmScreenPath,
  openGmScreen,
} from './home-shots-gm-screen';
import {
  WIZARD_FRAMES,
  WIZARD_SHOT_VIEWPORT,
  captureWizardFrame,
} from './home-shots-wizard';

// Charge `.env.local` comme le ferait Next : la capture de l'écran de MJ a besoin des
// variables publiques Supabase (session de démonstration).
loadEnvConfig(process.cwd(), true, { info: () => {}, error: console.error });

const BASE_URL = process.env.HOME_SHOTS_BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = join(process.cwd(), 'public', 'home');

/**
 * Captures à refaire, par leur nom de fichier, séparés par des virgules
 * (`HOME_SHOTS_ONLY=gm-screen`). Vide = toutes. Sert à reprendre UNE capture sans
 * repasser par les autres — et à tirer deux captures de serveurs différents quand il
 * le faut.
 */
const ONLY = (process.env.HOME_SHOTS_ONLY ?? '')
  .split(',')
  .map((slug) => slug.trim())
  .filter(Boolean);

/** Cette capture est-elle demandée ? */
const wanted = (slug: string) => ONLY.length === 0 || ONLY.includes(slug);

/** Cadrage des captures. Assez large pour montrer une mise en page de bureau. */
const VIEWPORT = { width: 1440, height: 900 };

/** Qualité WebP : au-delà, le gain visuel ne paie plus les kilo-octets. */
const WEBP_QUALITY = 78;

/**
 * Personnage d'exemple injecté pour la capture de la fiche. Niveau 20 : la fiche est
 * alors pleine (voies complètes, équipement, capacités), ce qui est bien plus parlant
 * qu'un personnage de niveau 1 à moitié vide. Le nom du fichier de recette est
 * remplacé — « Test — Rôdeur (humain) » ne se montre pas sur une page d'accueil.
 */
const SHEET_FIXTURE = 'examples/characters/test-rodeur-humain.json';
const SHEET_DISPLAY_NAME = 'Sylwen';

/** Clé `localStorage` du store `characters` (cf. son bloc `persist`). */
const CHARACTERS_STORAGE_KEY = 'cof2-characters';

interface Shot {
  /** Nom du fichier produit, sans extension. */
  slug: string;
  /** Chemin visité, relatif à `BASE_URL`. */
  path: (characterId: string) => string;
  /**
   * Sélecteur dont l'apparition vaut « la page est prête ». Indispensable pour les
   * pages qui chargent leur contenu après le premier rendu (le visualiseur PDF rend
   * ses pages en JavaScript, le bestiaire lit sa base locale).
   */
  readySelector?: string;
  /** Attente supplémentaire (ms) après `readySelector`, pour les rendus progressifs. */
  settleMs?: number;
  /**
   * Région à capturer, en pixels CSS, au lieu de la fenêtre entière. Sert aux captures
   * destinées à un ENCART ÉTROIT : une page entière réduite à 250 px de large ne montre
   * plus rien, alors qu'un cadrage serré sur la zone qui porte le sens reste lisible.
   */
  clip?: { x: number; y: number; width: number; height: number };
  /**
   * Densité de pixels du rendu. `2` double la résolution du fichier produit — utile pour
   * une capture recadrée, qui sera de toute façon affichée petite mais mérite d'être
   * nette sur un écran à haute densité. Défaut `1`.
   */
  scale?: number;
}

const SHOTS: Shot[] = [
  {
    slug: 'sheet',
    path: (id) => `/character/${id}`,
    readySelector: 'h1',
    settleMs: 900,
  },
  {
    slug: 'rules',
    path: () => '/rules/core-rulebook/12',
    // Le visualiseur monte un `canvas` par page rendue : sa présence signe un rendu
    // pdf.js effectif, là où `h1` existerait avant même le chargement du document.
    readySelector: 'canvas',
    settleMs: 1800,
  },
  {
    slug: 'bestiary',
    path: () => '/bestiary',
    readySelector: 'h1',
    settleMs: 900,
  },
  // L'ASSISTANT DE CRÉATION n'est pas ici : ses sept captures (une par étape) exigent un
  // brouillon injecté et un cadrage propre à chaque panneau — cf. `home-shots-wizard.ts`,
  // et `captureWizardFrames` plus bas.
];

/** Charge la recette et la prépare pour l'injection (nom d'affichage lisible). */
function readFixture(): { id: string; character: Record<string, unknown> } {
  const raw = JSON.parse(readFileSync(join(process.cwd(), SHEET_FIXTURE), 'utf8'));
  const id = String(raw.id);
  return { id, character: { ...raw, name: SHEET_DISPLAY_NAME } };
}

/**
 * Masque l'incrustation des outils de développement de Next (le bouton « N » du coin
 * bas-gauche). Elle n'existe QUE sur un serveur de développement — donc jamais pour un
 * visiteur — mais se retrouvait sur les captures, où elle passe pour un élément de
 * l'application.
 */
async function hideDevOverlay(page: Page): Promise<void> {
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
}

/**
 * Capture `page` en PNG, convertit en WebP et écrit le fichier. Retourne sa taille en
 * kilo-octets, pour que la sortie console rende compte du poids ajouté au dépôt.
 */
async function capture(page: Page, slug: string, clip?: Shot['clip']): Promise<number> {
  await hideDevOverlay(page);
  return writeWebp(await page.screenshot({ type: 'png', clip }), slug);
}

/** Convertit un PNG en WebP et l'écrit. Retourne sa taille en kilo-octets. */
async function writeWebp(png: Buffer, slug: string): Promise<number> {
  const webp = await sharp(png).webp({ quality: WEBP_QUALITY }).toBuffer();
  writeFileSync(join(OUT_DIR, `${slug}.webp`), webp);
  return Math.round(webp.byteLength / 1024);
}

async function main() {
  const { id, character } = readFixture();
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  // Un contexte par densité de pixels demandée : `deviceScaleFactor` se fixe à la
  // création du contexte et ne peut pas changer en cours de route.
  const contexts = new Map<number, Awaited<ReturnType<typeof browser.newContext>>>();

  const pageFor = async (scale: number) => {
    const existing = contexts.get(scale);
    if (existing) return existing.pages()[0];

    const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: scale });
    // Le personnage est injecté AVANT tout script de la page, sur chaque document : le
    // store le trouve dès sa réhydratation, sans passage par le cloud.
    await context.addInitScript(
      ([key, payload]) => {
        window.localStorage.setItem(key, payload);
      },
      [
        CHARACTERS_STORAGE_KEY,
        JSON.stringify({ state: { characters: [character], cloudBackedIds: [] }, version: 0 }),
      ] as const,
    );
    const page = await context.newPage();
    // Les animations d'entrée (`RevealOnScroll`) et le parallaxe n'ont aucun intérêt sur
    // une capture, et pourraient la figer à mi-transition.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    contexts.set(scale, context);
    return page;
  };

  for (const shot of SHOTS) {
    if (!wanted(shot.slug)) continue;
    const url = `${BASE_URL}${shot.path(id)}`;
    process.stdout.write(`→ ${shot.slug} : ${url}\n`);
    const page = await pageFor(shot.scale ?? 1);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    if (shot.readySelector) {
      await page.waitForSelector(shot.readySelector, { timeout: 30_000 });
    }
    if (shot.settleMs) await page.waitForTimeout(shot.settleMs);
    const kb = await capture(page, shot.slug, shot.clip);
    process.stdout.write(`  ✓ public/home/${shot.slug}.webp (${kb} ko)\n`);
  }

  await captureWizardFrames(browser);
  await captureGmScreen(browser);

  await browser.close();
}

/**
 * Les sept étapes de l'assistant de création, une capture chacune. À part des autres pour
 * deux raisons : elles ont besoin d'un brouillon INJECTÉ (sinon on photographie un
 * formulaire vide) et d'une fenêtre ÉTROITE (360 px), le cadrage de bureau étant illisible
 * une fois réduit à la largeur d'une carte. Toute la mécanique est dans
 * `scripts/home-shots-wizard.ts` ; ici on ne fait que dérouler les sept vues.
 */
async function captureWizardFrames(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  const frames = WIZARD_FRAMES.filter((frame) => wanted(frame.slug));
  if (frames.length === 0) return;

  const context = await browser.newContext({ viewport: WIZARD_SHOT_VIEWPORT, deviceScaleFactor: 2 });
  const page = await context.newPage();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const frame of frames) {
    process.stdout.write(`→ ${frame.slug} : ${BASE_URL}/create (étape ${frame.step + 1})\n`);
    const kb = await writeWebp(await captureWizardFrame(page, BASE_URL, frame), frame.slug);
    process.stdout.write(`  ✓ public/home/${frame.slug}.webp (${kb} ko)\n`);
  }
  await context.close();
}

/**
 * Capture de l'écran de MJ. À part des autres : seul écran derrière l'authentification
 * et alimenté par le cloud, il exige une session et une campagne de démonstration — cf.
 * `scripts/home-shots-gm-screen.ts`, qui porte toute cette mécanique.
 *
 * Sans variables d'environnement Supabase, la capture est SAUTÉE avec un message clair
 * (l'ancienne image reste en place) : le reste de la vitrine se régénère quand même.
 */
async function captureGmScreen(browser: Awaited<ReturnType<typeof chromium.launch>>) {
  if (!wanted(GM_SHOT_SLUG)) return;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!supabaseUrl || !publishableKey) {
    process.stdout.write(
      `→ ${GM_SHOT_SLUG} : sauté (NEXT_PUBLIC_SUPABASE_URL / ` +
        'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY absentes de l’environnement)\n',
    );
    return;
  }

  process.stdout.write(`→ ${GM_SHOT_SLUG} : ${BASE_URL}${gmScreenPath()}\n`);
  const page = await openGmScreen(browser, {
    baseUrl: BASE_URL,
    supabaseUrl,
    publishableKey,
    viewport: GM_SHOT_VIEWPORT,
  });
  // La bande d'initiative est montée (sa bascule de densité en est la preuve la plus
  // stable), puis on attend un NOM DE CRÉATURE : les blocs du bestiaire arrivent après
  // le premier rendu, et sans eux la bande n'aurait que les personnages.
  await page.waitForSelector('[aria-label="Cartes compactes"]', { timeout: 30_000 });
  await page.waitForSelector('text=Momie', { timeout: 30_000 });
  await page.waitForTimeout(2500);
  const kb = await capture(page, GM_SHOT_SLUG);
  process.stdout.write(`  ✓ public/home/${GM_SHOT_SLUG}.webp (${kb} ko)\n`);
}

main().catch((error) => {
  process.stderr.write(`\nÉchec de la génération des captures : ${String(error)}\n`);
  process.stderr.write(
    'Vérifiez qu’un serveur de développement tourne (npm run dev) et que ' +
      'HOME_SHOTS_BASE_URL pointe dessus.\n',
  );
  process.exit(1);
});
