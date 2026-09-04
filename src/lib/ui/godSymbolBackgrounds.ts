/**
 * Symboles divins fan-made (`public/gods/*.svg`, vectorisés depuis les PNG du forum BBE) utilisés
 * en filigrane sur les blocs du Codex > Dieux. Attribution complète : `src/data/gods/godSymbolCredits.ts`,
 * réutilisée ici pour l'auteur affiché au survol. Seuls les fichiers dont le nom correspond
 * (exactement ou à une coquille près) à un `id` de `priest-gods.ts` sont mappés ici — les autres
 * (abalath, delia, desdemone, livine, maedra, miesserith) n'ont aucun dieu correspondant dans nos
 * données et restent inutilisés.
 */
import { GOD_SYMBOL_CREDITS } from '@/data/gods/godSymbolCredits';

const GOD_BACKGROUND_SYMBOL_FILE: Partial<Record<string, string>> = {
  arshran: 'ashran nb.svg', // fichier "ashran" (sans le second r) — coquille du fan-art
  axender: 'axender nb.svg',
  gaeln: 'gaelm nb.svg', // fichier "gaelm" = bonne orthographe (le nom du dieu est « Gaëlm », l'id reste « gaeln »)
  jeweln: 'jeweln nb.svg',
  mephistre: 'mephistere nb.svg', // fichier "mephistere" = bonne orthographe (le nom du dieu est « Méphistère », l'id reste « mephistre »)
  mirandia: 'mirandia nb.svg',
  orbis: 'orbis nb.svg',
  oumaros: 'oumaros nb - dessiné par KYR.svg',
  selenne: 'selenne nb.svg',
  solar: 'solar nb.svg',
};

// `godSymbolCredits.ts` référence encore les `.png` d'origine (le SVG n'existait pas au moment de
// l'attribution) — on compare par nom de base sans extension plutôt que de dupliquer/désynchroniser
// deux listes de fichiers.
const baseName = (file: string) => file.replace(/\.(png|svg)$/i, '');
const CREDIT_BY_BASENAME = new Map(GOD_SYMBOL_CREDITS.map((c) => [baseName(c.file), c]));

export interface GodBackgroundSymbol {
  url: string;
  author: string;
}

export function godBackgroundSymbol(godId: string): GodBackgroundSymbol | undefined {
  const file = GOD_BACKGROUND_SYMBOL_FILE[godId];
  if (!file) return undefined;
  const credit = CREDIT_BY_BASENAME.get(baseName(file));
  if (!credit) return undefined;
  return { url: encodeURI(`/gods/${file}`), author: credit.author };
}
