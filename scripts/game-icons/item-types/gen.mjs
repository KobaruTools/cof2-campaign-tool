import { readFileSync, writeFileSync } from 'node:fs';

const rows = readFileSync('map.tsv', 'utf8').trim().split('\n')
  .map(l => l.split('\t')).filter(([id]) => id);

function clean(svg) {
  let inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  inner = inner.replace('<path d="M0 0h512v512H0z"/>', ''); // fond noir
  inner = inner.replace(/\sfill="#fff"/g, '');               // -> hérite de currentColor
  return inner.trim();
}

const paths = {}, sources = {};
for (const [id, src] of rows) {
  paths[id] = clean(readFileSync(`gi-raw/${id}.svg`, 'utf8'));
  sources[id] = src;
}

const out = `// FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : game-icons.net (https://game-icons.net), licence CC BY 3.0.
// Voir NOTICE.md à la racine pour l'attribution. Régénérer : scripts/game-icons/item-types.
//
// Icônes des TYPES D'OBJET d'inventaire (pur UI, hors règles CO2). Le markup interne
// est nettoyé (fond retiré, couleur neutralisée) pour hériter de \`currentColor\`.
// L'affichage passe par le composant <ItemTypeIcon>.

import type { ItemType } from '@/lib/character/types';

/** Markup SVG interne (sans la balise <svg>) de l'icône d'un type d'objet, indexé par id. */
export const ITEM_TYPE_ICON_PATHS: Record<ItemType, string> = {
${rows.map(([id]) => `  ${JSON.stringify(id)}: ${JSON.stringify(paths[id])},`).join('\n')}
};

/** Fichier game-icons.net source de chaque icône (pour audit / attribution). */
export const ITEM_TYPE_ICON_SOURCES: Record<ItemType, string> = {
${rows.map(([id]) => `  ${JSON.stringify(id)}: ${JSON.stringify(sources[id])},`).join('\n')}
};
`;
writeFileSync('itemTypeIcons.ts', out);
console.log('itemTypeIcons.ts written,', out.length, 'bytes');
