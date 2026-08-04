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
// Voir NOTICE.md à la racine pour l'attribution. Régénérer : scripts/game-icons/defense-badges.
//
// Icônes propres aux BADGES DE LA CARTE DÉFENSE qui ne relèvent ni d'un type de dégât
// (\`damageTypeIcons\`), ni d'un état de combat (\`statusEffectIcons\`), ni d'une stat dérivée
// (\`derivedStatIcons\`) — c.-à-d. la NATURE d'une protection plutôt que son objet :
//  - \`situational-immunity\` (tête de démon) : protection qui ne joue QUE contre un type
//    d'AGRESSEUR nommé (voie du combat du mal r8, p. 149 : « … provoqués par les morts-vivants,
//    les démons ou les animaux maléfiques ou corrompus »). Distincte de l'immunité permanente,
//    dont le bouclier vert laisserait croire à une protection générale.
// Pur UI, hors règles CO2. Le markup interne est nettoyé (fond retiré, couleur neutralisée) pour
// hériter de \`currentColor\`. Rendu inline par <DefenseBadge>.

/** Clé d'icône de badge défensif (nature de la protection). */
export type DefenseBadgeIconKey = ${rows.map(([id]) => JSON.stringify(id)).join(' | ')};

/** Markup SVG interne (sans la balise <svg>) de l'icône, indexé par clé. */
export const DEFENSE_BADGE_ICON_PATHS: Record<DefenseBadgeIconKey, string> = {
${rows.map(([id]) => `  ${JSON.stringify(id)}: ${JSON.stringify(paths[id])},`).join('\n')}
};

/** Fichier game-icons.net source de chaque icône (pour audit / attribution). */
export const DEFENSE_BADGE_ICON_SOURCES: Record<DefenseBadgeIconKey, string> = {
${rows.map(([id]) => `  ${JSON.stringify(id)}: ${JSON.stringify(sources[id])},`).join('\n')}
};
`;
writeFileSync('defenseBadgeIcons.ts', out);
console.log('defenseBadgeIcons.ts written,', out.length, 'bytes');
