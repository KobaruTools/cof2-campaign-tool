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
// Voir NOTICE.md à la racine pour l'attribution. Régénérer : scripts/game-icons/god-domains.
//
// Icônes de DOMAINE des dieux du panthéon d'Osgild (Codex, PER-420) — PARTIEL par nature :
// une entrée par dieu ayant un match assez littéral sur game-icons.net, le reste retombe sur
// l'icône de la voie d'origine de sa capacité divine (\`CodexGodsBrowser.tsx\`). Le markup
// interne est nettoyé (fond retiré, couleur neutralisée) pour hériter de \`currentColor\`.

/** Markup SVG interne (sans la balise <svg>) de l'icône de domaine d'un dieu, indexé par
 * \`PriestGod.id\`. Absence de clé = pas de match trouvé (repli sur l'icône de voie). */
export const GOD_DOMAIN_ICON_PATHS: Partial<Record<string, string>> = {
${rows.map(([id]) => `  ${id}: ${JSON.stringify(paths[id])},`).join('\n')}
};

/** Fichier game-icons.net source de chaque icône (pour audit / attribution). */
export const GOD_DOMAIN_ICON_SOURCES: Partial<Record<string, string>> = {
${rows.map(([id]) => `  ${id}: ${JSON.stringify(sources[id])},`).join('\n')}
};
`;
writeFileSync('godDomainIcons.ts', out);
console.log('godDomainIcons.ts written,', out.length, 'bytes');
