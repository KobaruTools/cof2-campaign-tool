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
// Voir NOTICE.md à la racine pour l'attribution. Régénérer : scripts/game-icons/ancestries.
//
// Icônes d'illustration par voie de peuple (pur UI, hors règles CO2). Le markup
// interne est nettoyé (fond retiré, couleur neutralisée) pour hériter de
// \`currentColor\`, ce qui permet de recolorer chaque icône côté composant.

/** Markup SVG interne (sans la balise <svg>) de l'icône d'un peuple, indexé par id de voie. */
export const ANCESTRY_ICON_PATHS: Record<string, string> = {
${rows.map(([id]) => `  ${JSON.stringify(id)}: ${JSON.stringify(paths[id])},`).join('\n')}
};

/** Fichier game-icons.net source de chaque icône (pour audit / attribution). */
export const ANCESTRY_ICON_SOURCES: Record<string, string> = {
${rows.map(([id]) => `  ${JSON.stringify(id)}: ${JSON.stringify(sources[id])},`).join('\n')}
};
`;
writeFileSync('ancestryIcons.ts', out);
console.log('ancestryIcons.ts written,', out.length, 'bytes');
