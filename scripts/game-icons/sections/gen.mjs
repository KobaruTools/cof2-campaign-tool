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

const union = rows.map(([id]) => `'${id}'`).join(' | ');

const out = `// FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : game-icons.net (https://game-icons.net), licence CC BY 3.0.
// Voir NOTICE.md à la racine pour l'attribution. Régénérer : scripts/game-icons/sections.
//
// Icônes des titres de section de la fiche de personnage (pur UI, hors règles CO2).
// Le markup interne est nettoyé (fond retiré, couleur neutralisée) pour hériter de
// \`currentColor\`. L'affichage passe toujours par le composant <SectionIcon>.

/** Clé d'icône de section (une par titre de bloc de la fiche). */
export type SectionIconName = ${union};

/** Markup SVG interne (sans la balise <svg>) de l'icône d'une section, indexé par clé. */
export const SECTION_ICON_PATHS: Record<SectionIconName, string> = {
${rows.map(([id]) => `  ${id}: ${JSON.stringify(paths[id])},`).join('\n')}
};

/** Fichier game-icons.net source de chaque icône (pour audit / attribution). */
export const SECTION_ICON_SOURCES: Record<SectionIconName, string> = {
${rows.map(([id]) => `  ${id}: ${JSON.stringify(sources[id])},`).join('\n')}
};
`;
writeFileSync('sectionIcons.ts', out);
console.log('sectionIcons.ts written,', out.length, 'bytes');
