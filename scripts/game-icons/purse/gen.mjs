import { readFileSync, writeFileSync } from 'node:fs';

const rows = readFileSync('map.tsv', 'utf8').trim().split('\n')
  .map(l => l.split('\t')).filter(([id]) => id);

function clean(svg) {
  let inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  inner = inner.replace('<path d="M0 0h512v512H0z"/>', ''); // fond noir
  inner = inner.replace(/\sfill="#fff"/g, '');               // -> hérite de currentColor
  return inner.trim();
}

// Jeu d'une seule icône (la bourse) : on exporte des constantes uniques plutôt
// qu'une table indexée (cf. les autres jeux). map.tsv en garde le format commun.
const [id, src] = rows[0];
const path = clean(readFileSync(`gi-raw/${id}.svg`, 'utf8'));

const out = `// FICHIER GÉNÉRÉ — ne pas éditer à la main.
// Source : game-icons.net (https://game-icons.net), licence CC BY 3.0.
// Voir NOTICE.md à la racine pour l'attribution. Régénérer : scripts/game-icons/purse.
//
// Icône « bourse » (sac à monnaie) — pur UI, hors règles CO2. Le markup interne est
// nettoyé (fond retiré, couleur neutralisée) pour hériter de \`currentColor\`. Affichée
// par le composant <PurseIcon> en tête du bloc « Inventaire » (cf. PurseField).

/** Markup SVG interne (sans la balise <svg>) de l'icône de la bourse. */
export const PURSE_ICON_PATH = ${JSON.stringify(path)};

/** Fichier game-icons.net source (pour audit / attribution). */
export const PURSE_ICON_SOURCE = ${JSON.stringify(src)};
`;
writeFileSync('purseIcon.ts', out);
console.log('purseIcon.ts written,', out.length, 'bytes');
