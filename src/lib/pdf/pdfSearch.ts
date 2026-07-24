/**
 * Recherche plein-texte dans un livre de règles (milestone « Visualiseur PDF », PER-58).
 *
 * Fonctions PURES : l'indexation (lecture de la couche texte de pdf.js, asynchrone et propre
 * au navigateur) est faite par l'appelant ([[PdfViewerDialog]]) ; ici on ne manipule que du
 * texte déjà extrait. La recherche est insensible à la CASSE **et** aux ACCENTS — à la table on
 * tape « chute », « epee » ou « surprise » sans se soucier des diacritiques ni des majuscules.
 *
 * Le repli des accents décompose (NFD) puis retire les diacritiques combinants ; comme cette
 * opération change la longueur de la chaîne (é → e), on conserve une CARTE index-normalisé →
 * index-d'origine pour reconstituer des extraits et des offsets de surlignage fidèles au texte
 * affiché (accents conservés).
 */

/** Plage Unicode des diacritiques combinants (retirés lors du repli des accents). */
const COMBINING_MARKS = /[̀-ͯ]/g;

/** Texte d'une page indexée (concaténation ordonnée des items de la couche texte pdf.js). */
export interface IndexedPage {
  /** Numéro de page (1-based, = numéro imprimé dans le livre). */
  page: number;
  /** Texte brut de la page, dans l'ordre de lecture. */
  text: string;
}

/** Une occurrence trouvée, dans l'ordre de lecture (page, puis position dans la page). */
export interface PdfSearchMatch {
  /** Numéro de page où se trouve l'occurrence. */
  page: number;
  /** Court extrait de contexte autour de l'occurrence (accents d'origine conservés). */
  snippet: string;
  /** Offset de l'occurrence DANS `snippet` (pour la surligner dans la liste de résultats). */
  snippetMatchStart: number;
  /** Longueur de l'occurrence dans `snippet`. */
  snippetMatchLength: number;
}

/** Nombre de caractères de contexte affichés de part et d'autre d'une occurrence. */
const SNIPPET_RADIUS = 40;

/** Longueur minimale d'une requête (en dessous, trop de bruit — on ne cherche pas). */
export const MIN_QUERY_LENGTH = 2;

/** Replie un caractère : minuscule + suppression des diacritiques (é → e, à → a…). */
function foldChar(ch: string): string {
  return ch.toLowerCase().normalize('NFD').replace(COMBINING_MARKS, '');
}

/** Normalise une requête pour comparaison : repli d'accents/casse + espaces effondrés. */
export function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(COMBINING_MARKS, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Normalise `input` caractère par caractère en conservant une carte de positions :
 * `map[i]` = index, dans `input` d'origine, du i-ème caractère de `value`.
 */
function normalizeWithMap(input: string): { value: string; map: number[] } {
  let value = '';
  const map: number[] = [];
  for (let i = 0; i < input.length; i++) {
    const folded = foldChar(input[i]);
    for (let j = 0; j < folded.length; j++) {
      value += folded[j];
      map.push(i);
    }
  }
  return { value, map };
}

/** Construit l'extrait de contexte autour de `[start, end)` (indices dans le texte d'origine). */
function buildSnippet(
  text: string,
  start: number,
  end: number,
): { snippet: string; snippetMatchStart: number; snippetMatchLength: number } {
  const before = text.slice(Math.max(0, start - SNIPPET_RADIUS), start).replace(/\s+/g, ' ');
  const match = text.slice(start, end).replace(/\s+/g, ' ');
  const after = text.slice(end, end + SNIPPET_RADIUS).replace(/\s+/g, ' ');
  const prefix = (start - SNIPPET_RADIUS > 0 ? '… ' : '') + before.replace(/^ /, '');
  const suffix = after.replace(/ $/, '') + (end + SNIPPET_RADIUS < text.length ? ' …' : '');
  return {
    snippet: prefix + match + suffix,
    snippetMatchStart: prefix.length,
    snippetMatchLength: match.length,
  };
}

/**
 * Cherche `rawQuery` dans les pages indexées et renvoie toutes les occurrences, dans l'ordre de
 * lecture. Renvoie `[]` si la requête (normalisée) est trop courte.
 */
export function searchIndexedPages(pages: IndexedPage[], rawQuery: string): PdfSearchMatch[] {
  const query = normalizeQuery(rawQuery);
  if (query.length < MIN_QUERY_LENGTH) return [];

  const matches: PdfSearchMatch[] = [];
  for (const { page, text } of pages) {
    const { value: haystack, map } = normalizeWithMap(text);
    let from = 0;
    for (;;) {
      const idx = haystack.indexOf(query, from);
      if (idx === -1) break;
      const origStart = map[idx];
      // Fin EXCLUSIVE dans l'original : index du dernier caractère normalisé de l'occurrence + 1.
      const origEnd = map[idx + query.length - 1] + 1;
      const { snippet, snippetMatchStart, snippetMatchLength } = buildSnippet(text, origStart, origEnd);
      matches.push({ page, snippet, snippetMatchStart, snippetMatchLength });
      from = idx + query.length;
    }
  }
  return matches;
}

const HTML_ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

/** Échappe le HTML (le texte PDF est injecté en innerHTML par `customTextRenderer`). */
function escapeHtml(input: string): string {
  return input.replace(/[&<>]/g, (c) => HTML_ESCAPES[c]);
}

/**
 * Rend un item de la couche texte en enrobant les occurrences de `rawQuery` d'un `<mark>`.
 * Utilisé par le `customTextRenderer` de react-pdf : le retour est une chaîne HTML (échappée hors
 * des balises `<mark>`). Sans requête (ou trop courte), renvoie simplement le texte échappé.
 */
export function renderTextItemWithHighlight(str: string, rawQuery: string): string {
  const query = normalizeQuery(rawQuery);
  if (query.length < MIN_QUERY_LENGTH) return escapeHtml(str);

  const { value, map } = normalizeWithMap(str);
  let result = '';
  let cursor = 0; // dernier index d'origine déjà émis
  let from = 0;
  for (;;) {
    const idx = value.indexOf(query, from);
    if (idx === -1) break;
    const origStart = map[idx];
    const origEnd = map[idx + query.length - 1] + 1;
    result += escapeHtml(str.slice(cursor, origStart));
    result += `<mark>${escapeHtml(str.slice(origStart, origEnd))}</mark>`;
    cursor = origEnd;
    from = idx + query.length;
  }
  result += escapeHtml(str.slice(cursor));
  return result;
}
