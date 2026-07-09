/**
 * Découpe d'un texte français sur ses références de page du livre — notion GLOBALE
 * (les règles citent leur page partout : notes de calcul, avertissements, verbatim).
 * Reconnaît la forme parenthésée conventionnelle « (p. 188) » et « (p. 219-220) »
 * (plage), pour la remplacer à l'affichage par la puce de source (`SourceRef`).
 *
 * Pur (testable) : ne rend rien, renvoie une suite de segments texte / page. Le
 * rendu vit dans `PageRefText` (`src/components/SourceRef.tsx`).
 */
export type PageRefSegment =
  | { kind: 'text'; value: string }
  | { kind: 'page'; page: string };

/** « (p. 188) », « (p.188) », « (p. 219-220) » (tiret simple ou demi-cadratin). */
const PAGE_REF = /\(p\.\s*(\d+(?:[-–]\d+)?)\)/g;

/**
 * Découpe `text` en segments : portions littérales et références de page extraites.
 * Les segments texte vides sont omis. L'ordre et la concaténation des `value`/`(p. N)`
 * reconstituent exactement le texte d'origine.
 */
export function splitPageRefs(text: string): PageRefSegment[] {
  const segments: PageRefSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(PAGE_REF)) {
    const start = match.index;
    if (start > last) segments.push({ kind: 'text', value: text.slice(last, start) });
    segments.push({ kind: 'page', page: match[1] });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ kind: 'text', value: text.slice(last) });
  return segments;
}
