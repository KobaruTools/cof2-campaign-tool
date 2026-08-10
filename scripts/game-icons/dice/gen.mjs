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
 * d3 : le d6 (mêmes coordonnées de corps que `delapouite/dice-six-faces-six.svg`, coin
 * arrondi 38.5, pour rester de la même famille visuelle) coupé en deux par sa diagonale —
 * une moitié pleine (le triangle « exprimé »), l'autre en fondu (40 % d'opacité, le
 * triangle « fantôme »).
 */
const CUSTOM_ICONS = {
  d3: '<path d="M36 36 L437.5 36 A38.5 38.5 0 0 0 476 74.5 L476 476 Z"/><path fill-opacity=".4" d="M36 36 L36 437.5 A38.5 38.5 0 0 0 74.5 476 L476 476 Z"/>',
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
