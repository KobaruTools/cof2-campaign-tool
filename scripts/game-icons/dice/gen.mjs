import { readFileSync, writeFileSync } from 'node:fs';

const rows = readFileSync('map.tsv', 'utf8').trim().split('\n')
  .map(l => l.split('\t')).filter(([id]) => id);

function clean(svg) {
  let inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  inner = inner.replace('<path d="M0 0h512v512H0z"/>', ''); // fond noir
  inner = inner.replace(/\sfill="#fff"/g, '');               // -> hérite de currentColor
  return inner.trim();
}

/**
 * Icônes DESSINÉES MAISON, absentes du catalogue game-icons.net — seule exception à la
 * règle « toute icône vient de game-icons.net » (voir README.md, NOTICE.md). Marquées
 * `custom:` dans `map.tsv` au lieu d'un chemin game-icons.net, elles court-circuitent la
 * lecture de `gi-raw/<id>.svg` ci-dessous.
 *
 * d3 : le corps du d6 (mêmes coordonnées, coin arrondi 38.5, pour rester de la même
 * famille visuelle) coupé en deux par une barre VERTICALE — moitié gauche pleine (le côté
 * « exprimé »), moitié droite en simple contour dashed (le côté « fantôme », sans aucun
 * remplissage). Le contour dashed est un trait normal (mise à l'échelle avec l'icône comme
 * tout le reste du fichier, PAS de `vector-effect: non-scaling-stroke` + `clip-path`) tracé
 * sur un chemin RENTRÉ de la moitié de son épaisseur (bord haut/droit/bas décalés de 15,
 * rayon de coin réduit d'autant, 38.5→23.5) : le trait, centré sur ce chemin rentré, affleure
 * pile la silhouette du d6 côté extérieur — dans la continuité de la partie pleine — sans
 * jamais déborder au-delà. Tentative précédente (`non-scaling-stroke` + `clip-path`, épaisseur
 * fixe 2px) : marche en gros à 24-48px mais dégénère en amas de blobs à 13-20px (tailles
 * réelles de l'app, cf. écrans fournis par l'utilisateur le 2026-08-11) — abandonnée, jamais
 * la retenter. Le dashed est scindé en DEUX chemins (haut et bas), chacun démarrant sa propre
 * alternance dash/gap depuis la barre verticale — sans ça, une seule alternance filée sur
 * tout le pourtour tombe en bout de course sur un reste de longueur quelconque et casse la
 * symétrie visuelle haut/bas. Scindés au milieu du bord droit (y=256), les deux moitiés ont
 * exactement la même longueur donc le même rendu, en miroir parfait l'une de l'autre. Affiche
 * en plus sa face à 3 points en diagonale (haut-gauche / centre / bas-droite) légèrement
 * resserrés vers le centre et un peu plus petits que les pastilles du d6 pour ne pas empiéter
 * sur ce contour. Le point central tombe pile sur la barre : côté gauche il est découpé en
 * trou (sens de balayage opposé au contour extérieur), côté droit rien n'est dessiné, donc le
 * disque transparent se complète tout seul.
 */
const DASHED_ATTRS = `fill="none" stroke="currentColor" stroke-width="20" stroke-dasharray="38 28" stroke-linecap="round"`;

const CUSTOM_ICONS = {
  d3:
    `<path d="M74.5 36A38.5 38.5 0 0 0 36 74.5v363A38.5 38.5 0 0 0 74.5 476H256V36zM100 142A42 42 0 0 1 184 142A42 42 0 0 1 100 142ZM214 256A42 42 0 0 1 298 256A42 42 0 0 1 214 256Z"/>` +
    `<path ${DASHED_ATTRS} d="M256 51H437.5A23.5 23.5 0 0 0 461 74.5V256"/>` +
    `<path ${DASHED_ATTRS} d="M256 461H437.5A23.5 23.5 0 0 1 461 437.5V256"/>` +
    `<path d="M328 370A42 42 0 0 1 412 370A42 42 0 0 1 328 370Z"/>`,
};

const paths = {}, sources = {};
for (const [id, src] of rows) {
  paths[id] = src.startsWith('custom:') ? CUSTOM_ICONS[id] : clean(readFileSync(`gi-raw/${id}.svg`, 'utf8'));
  sources[id] = src;
}

const out = `// FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : game-icons.net (https://game-icons.net), licence CC BY 3.0, SAUF le d3 (dessin
// maison, cf. NOTICE.md et la constante CUSTOM_ICONS de ce générateur).
// Voir NOTICE.md à la racine pour l'attribution. Régénérer : scripts/gen-dice-icons.
//
// Icônes des dés polyédriques (pur UI, hors règles CO2). Le markup interne est
// nettoyé (fond retiré, couleur neutralisée) pour hériter de \`currentColor\`.
// L'affichage passe toujours par le composant <DieIcon>.

import type { DamageDie } from '@/data/schema';

/** Markup SVG interne (sans la balise <svg>) de l'icône d'un dé, indexé par id. */
export const DIE_ICON_PATHS: Record<DamageDie, string> = {
${rows.map(([id]) => `  ${id}: ${JSON.stringify(paths[id])},`).join('\n')}
};

/** Fichier game-icons.net source de chaque icône (pour audit / attribution). */
export const DIE_ICON_SOURCES: Record<DamageDie, string> = {
${rows.map(([id]) => `  ${id}: ${JSON.stringify(sources[id])},`).join('\n')}
};
`;
writeFileSync('diceIcons.ts', out);
console.log('diceIcons.ts written,', out.length, 'bytes');
