/**
 * Découpe d'un texte français sur ses références de page du livre — notion GLOBALE
 * (les règles citent leur page partout : notes de calcul, avertissements, verbatim,
 * descriptions de capacités). Reconnaît la forme parenthésée conventionnelle
 * « (p. 188) » / « (p. 219-220) » (plage) ET la forme en PROSE du livre
 * « (voir page 78) » / « (voir p. 60) », pour la remplacer INTÉGRALEMENT à l'affichage
 * par la puce de source (`SourceRef`) — le « voir page » disparaît, la puce suffit.
 *
 * Pur (testable) : ne rend rien, renvoie une suite de segments texte / page. Le
 * rendu vit dans `PageRefText` (`src/components/SourceRef.tsx`).
 */
export type PageRefSegment =
  | { kind: 'text'; value: string }
  | { kind: 'page'; page: string };

/**
 * « (p. 188) », « (p.188) », « (p. 219-220) » (tiret simple ou demi-cadratin), ainsi
 * que la prose du livre « (voir page 78) », « (voir pages 219-220) », « (voir p. 60) ».
 * Le préfixe « voir » et le mot « page(s) » sont optionnels/interchangeables ; seule la
 * (les) page(s) est capturée. Une double référence « (voir pages 51 et 56) » n'est PAS
 * reconnue (forme rare, laissée en texte plutôt que tronquée à la première page).
 */
const PAGE_REF = /\((?:voir\s+)?(?:p\.\s*|pages?\s+)(\d+(?:[-–]\d+)?)\)/gi;

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
