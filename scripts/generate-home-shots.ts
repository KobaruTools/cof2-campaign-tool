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
 * est réglable par `HOME_SHOTS_BASE_URL` (défaut `http://localhost:3000`).
 *
 * La fiche de personnage est capturée SANS COMPTE : le personnage d'exemple est injecté
 * dans le `localStorage` du navigateur de test (même clé que le store `characters`),
 * ce qui suffit puisque l'application est locale d'abord. Aucune session, aucun accès à
 * la base — donc rien de privé ne peut fuir dans une capture.
 *
 * `sharp` sert à convertir en WebP (Playwright n'écrit que du PNG ou du JPEG). Il est
 * fourni par Next.js pour l'optimisation d'images ; s'il venait à disparaître, le script
 * le dit clairement au lieu d'échouer obscurément.
 *
 * Lance : `npx tsx scripts/generate-home-shots.ts`
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium, type Page } from 'playwright';
import sharp from 'sharp';

const BASE_URL = process.env.HOME_SHOTS_BASE_URL ?? 'http://localhost:3000';
const OUT_DIR = join(process.cwd(), 'public', 'home');

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
  {
    // Assistant de création, destiné à l'encart étroit de la carte « Création guidée ».
    // On cadre sur la frise d'étapes et le haut du premier panneau : c'est la FORME qui
    // dit « pas à pas », et elle survit à la réduction — là où une page entière ne
    // laisserait qu'une bouillie grise.
    slug: 'wizard',
    path: () => '/create',
    readySelector: 'h1',
    settleMs: 1200,
    // Cadrage calé sur le RATIO de l'encart de la carte (~1.2) : sinon le recadrage CSS
    // rogne les côtés et l'on perd la moitié de la frise d'étapes. Couvre la frise ET le
    // panneau de choix des peuples, ce qui donne à voir un vrai écran d'assistant.
    clip: { x: 294, y: 100, width: 560, height: 460 },
    scale: 2,
  },
];

/** Charge la recette et la prépare pour l'injection (nom d'affichage lisible). */
function readFixture(): { id: string; character: Record<string, unknown> } {
  const raw = JSON.parse(readFileSync(join(process.cwd(), SHEET_FIXTURE), 'utf8'));
  const id = String(raw.id);
  return { id, character: { ...raw, name: SHEET_DISPLAY_NAME } };
}

/**
 * Capture `page` en PNG, convertit en WebP et écrit le fichier. Retourne sa taille en
 * kilo-octets, pour que la sortie console rende compte du poids ajouté au dépôt.
 */
async function capture(page: Page, shot: Shot): Promise<number> {
  const png = await page.screenshot({ type: 'png', clip: shot.clip });
  const webp = await sharp(png).webp({ quality: WEBP_QUALITY }).toBuffer();
  writeFileSync(join(OUT_DIR, `${shot.slug}.webp`), webp);
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
    const url = `${BASE_URL}${shot.path(id)}`;
    process.stdout.write(`→ ${shot.slug} : ${url}\n`);
    const page = await pageFor(shot.scale ?? 1);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
    if (shot.readySelector) {
      await page.waitForSelector(shot.readySelector, { timeout: 30_000 });
    }
    if (shot.settleMs) await page.waitForTimeout(shot.settleMs);
    const kb = await capture(page, shot);
    process.stdout.write(`  ✓ public/home/${shot.slug}.webp (${kb} ko)\n`);
  }

  await browser.close();
}

main().catch((error) => {
  process.stderr.write(`\nÉchec de la génération des captures : ${String(error)}\n`);
  process.stderr.write(
    'Vérifiez qu’un serveur de développement tourne (npm run dev) et que ' +
      'HOME_SHOTS_BASE_URL pointe dessus.\n',
  );
  process.exit(1);
});
