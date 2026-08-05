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
// Voir NOTICE.md à la racine pour l'attribution. Régénérer : scripts/game-icons/weapon-kinds.
//
// Icônes des SOUS-TYPES D'ARME (pur UI, hors règles CO2) : épée, hache, arc, arbalète…
// Le markup interne est nettoyé (fond retiré, couleur neutralisée) pour hériter de
// \`currentColor\`. La résolution arme → sous-type vit dans \`weaponKind.ts\`, l'affichage
// passe par le composant <ItemTypeIcon> (prop \`weaponKind\`).

import type { WeaponIconKind } from '@/lib/ui/weaponKind';

/** Markup SVG interne (sans la balise <svg>) de l'icône d'un sous-type d'arme, indexé par id. */
export const WEAPON_KIND_ICON_PATHS: Record<WeaponIconKind, string> = {
${rows.map(([id]) => `  ${JSON.stringify(id)}: ${JSON.stringify(paths[id])},`).join('\n')}
};

/** Fichier game-icons.net source de chaque icône (pour audit / attribution). */
export const WEAPON_KIND_ICON_SOURCES: Record<WeaponIconKind, string> = {
${rows.map(([id]) => `  ${JSON.stringify(id)}: ${JSON.stringify(sources[id])},`).join('\n')}
};
`;
writeFileSync('weaponKindIcons.ts', out);
console.log('weaponKindIcons.ts written,', out.length, 'bytes');
