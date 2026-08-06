/**
 * Captures de l'ASSISTANT DE CRÉATION, une par étape, pour la carte « Création guidée »
 * de la vitrine (`FeatureShowcase` → `GuidedCreationDemo`).
 *
 * Pourquoi un module à part, comme `home-shots-gm-screen` : ces captures ne se prennent
 * pas en visitant une URL. Il faut d'abord un brouillon de personnage COMPLET, sinon on
 * photographie un formulaire au repos — c'était le défaut de la capture unique qu'elles
 * remplacent : huit boutons radio vides, un bouton « Précédent » grisé, et la frise coupée
 * en plein mot.
 *
 * COMMENT LE BROUILLON EST FABRIQUÉ : pas en cliquant dans l'interface (treize profils,
 * choix de rang 1, kits d'équipement — fragile et interminable), mais en INJECTANT dans le
 * `localStorage` le brouillon que le wizard y persiste (`cof2-wizard-draft`), construit ici
 * avec les VRAIES fonctions du domaine (`createDraft`, `initialChoices`, `distributeValueSet`,
 * `initialEquipment`). Même procédé que la capture de fiche, qui injecte un personnage.
 * Conséquence utile : si une de ces fonctions change de forme, ce script cesse de compiler
 * au lieu de produire des captures fausses en silence.
 *
 * LE PERSONNAGE : un nain barbare. Choisi parce qu'il ne traîne aucun cas particulier
 * (le prêtre exigerait une vocation, un mage une capacité de rang 2 supplémentaire, un
 * arquebusier la règle des armes à feu), que ses deux voies sont rouge vif à l'écran, et
 * que son peuple porte un modificateur « au choix » (+1 CON ou VOL) — ce qui donne à voir,
 * à l'étape 3, la règle qui s'applique toute seule (« Nain +1 », « Nain -1 »).
 *
 * LE CADRAGE : viewport ÉTROIT (360 px) plutôt que recadrage d'une page large. À 273 px
 * dans la carte, une page de bureau réduite ne montre plus rien ; le rendu compact de
 * l'application, lui, arrive quasiment à l'échelle 1 (le panneau fait 328 px, soit 0,83).
 * On photographie le seul PANNEAU de l'étape — la frise, elle, est rendue en vrai DOM par
 * la carte, avec des libellés nets et cliquables.
 *
 * `offsetY` est le décalage vertical (px CSS) de la fenêtre à l'intérieur du panneau : le
 * haut de chaque étape est occupé par sa consigne, et ce n'est pas elle qu'on veut montrer.
 */
import type { Page } from 'playwright';
import { ancestryById, classById } from '@/data';
import { initialChoices } from '@/lib/character/ancestry';
import { createDraft, type WizardDraft } from '@/lib/character/wizard';
import { distributeValueSet, initialEquipment, valueSets } from '@/components/wizard/helpers';

/** Clé `localStorage` du brouillon (cf. le bloc `persist` de `stores/wizard`). */
const WIZARD_STORAGE_KEY = 'cof2-wizard-draft';

/**
 * Largeur de fenêtre des captures. 360 px = un téléphone courant, et surtout la largeur à
 * laquelle le panneau de l'étape (328 px) tient tout entier dans la carte sans réduction
 * illisible. La hauteur est généreuse : on photographie un élément, pas la fenêtre.
 */
export const WIZARD_SHOT_VIEWPORT = { width: 360, height: 1400 };

/**
 * Rapport largeur/hauteur de la fenêtre montrée dans la carte, à la disposition en QUATRE
 * COLONNES qui est celle du bureau : 233 × 180. Les 233 px sont la largeur de carte (273)
 * MOINS son rembourrage (2 × 20) — se caler sur 273 rognait la dernière colonne du
 * récapitulatif. Aux autres largeurs, la carte s'élargit et le composant recadre en `cover`
 * par le bas, ce qui coupe du contenu mais jamais le haut de l'étape.
 *
 * À tenir synchronisé avec `FRAME_HEIGHT` et la largeur de carte dans
 * `src/components/home/GuidedCreationDemo.tsx`.
 */
const FRAME_RATIO = 233 / 180;

/** Le panneau de l'étape courante — le `Paper variant="outlined"` de `/create`. */
const PANEL_SELECTOR = '.MuiPaper-outlined';

export interface WizardFrame {
  /** Nom du fichier produit (`public/home/<slug>.webp`). */
  slug: string;
  /** Index de l'étape dans `STEPS` de `/create`. */
  step: number;
  /** Décalage vertical dans le panneau (px CSS) : ce que la fenêtre doit cadrer. */
  offsetY: number;
}

/**
 * Les sept étapes, et ce que chaque fenêtre doit montrer. Les décalages ont été réglés à
 * l'œil sur les captures : ils suivent le CONTENU, pas une grille.
 */
export const WIZARD_FRAMES: WizardFrame[] = [
  // La liste des peuples. Le cadrage descend jusqu'à « Nain » : montrer la liste sans le
  // peuple COCHÉ reviendrait à reprendre le défaut qu'on corrige.
  // La fenêtre s'arrête AVANT l'illustration du peuple, dont le fond blanc trancherait au
  // bas d'une carte sombre.
  { slug: 'wizard-1-peuple', step: 0, offsetY: 188 },
  // Les familles de profils et leurs icônes colorées, « Barbare » coché sous son en-tête.
  { slug: 'wizard-2-profil', step: 1, offsetY: 272 },
  // Les caractéristiques et, en marge, les modificateurs de peuple appliqués tout seuls.
  { slug: 'wizard-3-caracs', step: 2, offsetY: 355 },
  // Les voies du barbare. Les deux voies retenues sont à quatre rangs d'écart : impossible
  // de les tenir ensemble dans la fenêtre, on cale donc sur la première (« Voie de la
  // brute », encadrée de rouge) plutôt que de n'en montrer aucune entière.
  { slug: 'wizard-4-voies', step: 3, offsetY: 176 },
  // L'inventaire de départ, armes en main.
  { slug: 'wizard-5-equipement', step: 4, offsetY: 170 },
  // L'identité renseignée (genre, âge, taille, poids, description).
  { slug: 'wizard-6-identite', step: 5, offsetY: 78 },
  // Le récapitulatif : caractéristiques, statistiques dérivées, capacités acquises.
  { slug: 'wizard-7-recapitulatif', step: 6, offsetY: 20 },
];

/**
 * Brouillon complet d'un nain barbare, positionné sur `step`. Toutes les étapes sont
 * renseignées quelle que soit l'étape affichée : le récapitulatif doit être complet, et
 * une étape antérieure ne s'abîme pas d'être déjà remplie.
 */
export function buildWizardDraft(step: number): WizardDraft {
  const ancestry = ancestryById.get('nain');
  const characterClass = classById.get('barbare');
  if (!ancestry || !characterClass) {
    throw new Error('Données manquantes : le peuple « nain » ou le profil « barbare » a disparu du catalogue.');
  }
  // « +1 CON ou VOL » (p. 28) : le choix doit être tranché, sinon l'étape reste invalide et
  // l'assistant affiche son avertissement au lieu de son contenu.
  const ancestryChoices = initialChoices(ancestry);
  ancestryChoices[0] = 'CON';

  return {
    ...createDraft('home-shot-wizard', '2026-01-01T00:00:00.000Z', null, null),
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
      description:
        'Ancien contremaître d’une mine noyée, il a troqué le pic contre la hache le jour où la montagne a repris ce qu’elle avait prêté.',
    },
  };
}

/**
 * Photographie une étape et retourne le PNG. Le brouillon est injecté avant le chargement
 * (`addInitScript`) : la page trouve son étape déjà en place et n'affiche jamais l'écran
 * intermédiaire « on démarre un brouillon ».
 *
 * La fenêtre est calculée à partir de la boîte du panneau, pas de coordonnées de page :
 * un décalage de la mise en page (bandeau, avertissement) ne dérègle donc pas le cadrage.
 */
export async function captureWizardFrame(
  page: Page,
  baseUrl: string,
  frame: WizardFrame,
): Promise<Buffer> {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key as string, value as string),
    [WIZARD_STORAGE_KEY, JSON.stringify({ state: { draft: buildWizardDraft(frame.step) }, version: 0 })],
  );
  await page.goto(`${baseUrl}/create`, { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForSelector(PANEL_SELECTOR, { timeout: 60_000 });
  // Le panneau se stabilise après hydratation (illustrations, accordéons) : sans cette
  // pause, la fenêtre se calcule sur une hauteur qui n'est pas encore la bonne.
  await page.waitForTimeout(1400);
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });

  const panel = page.locator(PANEL_SELECTOR).first();
  const box = await panel.boundingBox();
  if (!box) throw new Error(`Panneau introuvable pour l'étape ${frame.step + 1} (${frame.slug}).`);

  const height = Math.round(box.width / FRAME_RATIO);
  // Bornée au bas du panneau : une étape courte ne doit pas faire déborder la fenêtre sur
  // la page (Playwright refuse un `clip` qui sort du document).
  const top = Math.min(box.y + frame.offsetY, box.y + Math.max(0, box.height - height));

  return page.screenshot({
    type: 'png',
    clip: { x: box.x, y: top, width: box.width, height },
  });
}
