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
// Voir NOTICE.md à la racine pour l'attribution. Régénérer : scripts/game-icons/status-effects.
//
// Icônes des ÉTATS DE COMBAT — trois usages qui partagent le même jeu d'icônes :
//  - les IMMUNITÉS D'ÉTAT (peur, charme/possession, sommeil magique… cf. \`ImmunityId\`),
//    puces de la carte Défense ;
//  - les ÉTATS PRÉJUDICIABLES du glossaire (aveuglé, affaibli, étourdi, invalide… cf.
//    \`StatusEffectId\`), palette du Combat Tracker (PER-279) ;
//  - les ÉTATS D'ENVIRONNEMENT (combat aquatique… cf. \`EnvironmentalEffectId\`), même palette.
// Les espaces d'ids d'immunités et d'états se recoupent (ralenti, immobilisé, paralysé, renversé,
// surpris) ; la clé est donc l'UNION \`ImmunityId | StatusEffectId | EnvironmentalEffectId\`. Pur UI,
// hors règles CO2. Le markup interne est nettoyé (fond retiré, couleur neutralisée) pour hériter de
// \`currentColor\`. L'affichage passe par le composant <StatusEffectIcon>.

import type { EnvironmentalEffectId, ImmunityId, StatusEffectId } from '@/data/schema';

/** Clé d'icône : union des trois espaces d'ids qui partagent ce jeu d'icônes. */
export type StatusIconKey = ImmunityId | StatusEffectId | EnvironmentalEffectId;

/** Markup SVG interne (sans la balise <svg>) de l'icône d'un état de combat, indexé par id. */
export const STATUS_EFFECT_ICON_PATHS: Record<StatusIconKey, string> = {
${rows.map(([id]) => `  ${JSON.stringify(id)}: ${JSON.stringify(paths[id])},`).join('\n')}
};

/** Fichier game-icons.net source de chaque icône (pour audit / attribution). */
export const STATUS_EFFECT_ICON_SOURCES: Record<StatusIconKey, string> = {
${rows.map(([id]) => `  ${JSON.stringify(id)}: ${JSON.stringify(sources[id])},`).join('\n')}
};
`;
writeFileSync('statusEffectIcons.ts', out);
console.log('statusEffectIcons.ts written,', out.length, 'bytes');
