import { describe, expect, it } from 'vitest';
import {
  MIN_QUERY_LENGTH,
  normalizeQuery,
  renderTextItemWithHighlight,
  searchIndexedPages,
  type IndexedPage,
} from './pdfSearch';

describe('normalizeQuery', () => {
  it('replie casse et accents', () => {
    expect(normalizeQuery('ÉPÉE')).toBe('epee');
    expect(normalizeQuery('Chûte')).toBe('chute');
  });

  it('effondre les espaces et rogne les bords', () => {
    expect(normalizeQuery('  jet   de   dés  ')).toBe('jet de des');
  });
});

describe('searchIndexedPages', () => {
  const pages: IndexedPage[] = [
    { page: 10, text: 'La chute inflige des dégâts. Une autre chute est fatale.' },
    { page: 42, text: "L'épée longue est une arme de contact." },
    { page: 43, text: 'Rien à voir ici.' },
  ];

  it('trouve toutes les occurrences dans l’ordre de lecture', () => {
    const matches = searchIndexedPages(pages, 'chute');
    expect(matches).toHaveLength(2);
    expect(matches.every((m) => m.page === 10)).toBe(true);
  });

  it('est insensible aux accents (epee → épée)', () => {
    const matches = searchIndexedPages(pages, 'epee');
    expect(matches).toHaveLength(1);
    expect(matches[0].page).toBe(42);
    // L'extrait conserve l'accent d'origine, à l'offset annoncé.
    const { snippet, snippetMatchStart, snippetMatchLength } = matches[0];
    expect(snippet.slice(snippetMatchStart, snippetMatchStart + snippetMatchLength)).toBe('épée');
  });

  it('ne renvoie rien sous la longueur minimale', () => {
    expect(MIN_QUERY_LENGTH).toBe(2);
    expect(searchIndexedPages(pages, 'a')).toEqual([]);
    expect(searchIndexedPages(pages, '   ')).toEqual([]);
  });

  it('renvoie une liste vide sans occurrence', () => {
    expect(searchIndexedPages(pages, 'dragon')).toEqual([]);
  });
});

describe('renderTextItemWithHighlight', () => {
  it('enrobe l’occurrence d’un <mark> en conservant l’accent', () => {
    expect(renderTextItemWithHighlight("L'épée longue", 'epee')).toBe(
      "L'<mark>épée</mark> longue",
    );
  });

  it('surligne plusieurs occurrences', () => {
    expect(renderTextItemWithHighlight('chute puis chute', 'chute')).toBe(
      '<mark>chute</mark> puis <mark>chute</mark>',
    );
  });

  it('échappe le HTML hors des balises de surlignage', () => {
    expect(renderTextItemWithHighlight('a < b & chute', 'chute')).toBe(
      'a &lt; b &amp; <mark>chute</mark>',
    );
  });

  it('renvoie le texte échappé sans requête utile', () => {
    expect(renderTextItemWithHighlight('a < b', '')).toBe('a &lt; b');
    expect(renderTextItemWithHighlight('a < b', 'x')).toBe('a &lt; b');
  });

  it('ajoute la classe CSS fournie au <mark> (terme ciblé vs recherche)', () => {
    expect(renderTextItemWithHighlight('la chute', 'chute', 'pdf-target')).toBe(
      'la <mark class="pdf-target">chute</mark>',
    );
  });
});
