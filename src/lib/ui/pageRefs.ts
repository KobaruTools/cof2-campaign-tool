import type { BookId } from './books';

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
  | { kind: 'page'; page: string; book?: BookId };

/**
 * Qualificatif de LIVRE optionnel (PER-395) : « (p. 40, Compagnon) » distingue une page
 * du Compagnon d'une page du livre de base. Mot-clé tapé (pas le nom d'affichage complet
 * de `BOOKS`) → `BookId`. Absent = livre de base, rétrocompatible avec `(p. N)` sans
 * qualificatif (`SourceRef` retombe alors sur `DEFAULT_BOOK_ID`).
 */
const PAGE_REF_BOOK_QUALIFIERS: Record<string, BookId> = {
  compagnon: 'companion',
  bestiaire: 'bestiaire',
};

/**
 * « (p. 188) », « (p.188) », « (p. 219-220) » (tiret simple ou demi-cadratin), ainsi
 * que la prose du livre « (voir page 78) », « (voir pages 219-220) », « (voir p. 60) ».
 * Le préfixe « voir » et le mot « page(s) » sont optionnels/interchangeables ; seule la
 * (les) page(s) est capturée. Une double référence « (voir pages 51 et 56) » n'est PAS
 * reconnue (forme rare, laissée en texte plutôt que tronquée à la première page).
 *
 * Qualificatif de livre optionnel `, Nom` (PER-395) : le nom est borné à la liste fermée
 * de `PAGE_REF_BOOK_QUALIFIERS` DANS le motif — un qualificatif inconnu (« (p. 10,
 * Almanach) ») ne referme donc jamais le groupe optionnel, la parenthèse n'est plus
 * immédiatement après le nombre de page, et le match échoue ENTIÈREMENT (retombe en
 * texte littéral, comme la double référence ci-dessus) plutôt que d'avaler la prose qui
 * suit la virgule.
 */
const PAGE_REF = new RegExp(
  `\\((?:voir\\s+)?(?:p\\.\\s*|pages?\\s+)(\\d+(?:[-–]\\d+)?)(?:,\\s*(${Object.keys(PAGE_REF_BOOK_QUALIFIERS).join('|')}))?\\)`,
  'gi',
);

/**
 * Mot-clé qualificatif (grammaire ci-dessus) pour un livre donné, ou `undefined` si ce livre
 * n'a pas de qualificatif dédié (livre de base — `(p. N)` sans suffixe). Réciproque de
 * `PAGE_REF_BOOK_QUALIFIERS` : sert à l'UI d'INSERTION (`RichTextEditor.tsx`) pour ne
 * proposer que les livres réellement debloquables (croisé avec `useUnlockedBooks`), sans
 * dupliquer la liste des mots-clés.
 */
export function pageRefQualifierForBook(bookId: BookId): string | undefined {
  return Object.entries(PAGE_REF_BOOK_QUALIFIERS).find(([, id]) => id === bookId)?.[0];
}

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
    const book = match[2] ? PAGE_REF_BOOK_QUALIFIERS[match[2].toLowerCase()] : undefined;
    segments.push(book ? { kind: 'page', page: match[1], book } : { kind: 'page', page: match[1] });
    last = start + match[0].length;
  }
  if (last < text.length) segments.push({ kind: 'text', value: text.slice(last) });
  return segments;
}
