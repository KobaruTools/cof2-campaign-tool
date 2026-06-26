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
// Voir NOTICE.md à la racine pour l'attribution. Régénérer : scripts/game-icons/damage-types.
//
// Icônes des TYPES DE DÉGÂT réductibles (pur UI, hors règles CO2). Le markup interne
// est nettoyé (fond retiré, couleur neutralisée) pour hériter de \`currentColor\`.
// L'affichage passe par le composant <DamageTypeIcon>.

import type { ResistibleDamageType } from '@/data/schema';

/** Markup SVG interne (sans la balise <svg>) de l'icône d'un type de dégât, indexé par id. */
export const DAMAGE_TYPE_ICON_PATHS: Record<ResistibleDamageType, string> = {
${rows.map(([id]) => `  ${JSON.stringify(id)}: ${JSON.stringify(paths[id])},`).join('\n')}
};

/** Fichier game-icons.net source de chaque icône (pour audit / attribution). */
export const DAMAGE_TYPE_ICON_SOURCES: Record<ResistibleDamageType, string> = {
${rows.map(([id]) => `  ${JSON.stringify(id)}: ${JSON.stringify(sources[id])},`).join('\n')}
};
`;
writeFileSync('damageTypeIcons.ts', out);
console.log('damageTypeIcons.ts written,', out.length, 'bytes');
