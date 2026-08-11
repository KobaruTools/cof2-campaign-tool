import { describe, expect, it } from 'vitest';
import { descriptionToDoc, docToDescription } from './richTextEditorSync';

/** Round-trip texte → doc → texte : le contraat central de PER-397 (« sans perte ni corruption »). */
function roundTrip(text: string): string {
  return docToDescription(descriptionToDoc(text));
}

describe('descriptionToDoc / docToDescription', () => {
  it('round-trip un texte sans aucune marque, inchangé', () => {
    const text = 'Bâton de la vigne Larmoyante, trouvé dans les ruines.';
    expect(roundTrip(text)).toBe(text);
  });

  it('round-trip une chaîne vide', () => {
    expect(roundTrip('')).toBe('');
    expect(descriptionToDoc('')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] });
  });

  it('round-trip gras/italique/barré isolés', () => {
    expect(roundTrip('**gras**')).toBe('**gras**');
    expect(roundTrip('*italique*')).toBe('*italique*');
    expect(roundTrip('~~barré~~')).toBe('~~barré~~');
  });

  it('round-trip couleur et taille (paire ouvrante/fermante)', () => {
    expect(roundTrip('{{color:rouge}}danger{{/color}}')).toBe('{{color:rouge}}danger{{/color}}');
    expect(roundTrip('{{size:grand}}IMPORTANT{{/size}}')).toBe('{{size:grand}}IMPORTANT{{/size}}');
  });

  it('round-trip plusieurs marques DIFFÉRENTES dans la même phrase', () => {
    const text = 'Objet **rare** trouvé par *hasard*, contient un poison ~~mortel~~ et un sceau {{color:violet}}arcanique{{/color}}.';
    expect(roundTrip(text)).toBe(text);
  });

  it('round-trip des retours à la ligne simples et multiples', () => {
    expect(roundTrip('ligne 1\nligne 2')).toBe('ligne 1\nligne 2');
    expect(roundTrip('para 1\n\npara 2')).toBe('para 1\n\npara 2');
    expect(roundTrip('a\n\n\nb')).toBe('a\n\n\nb');
    expect(roundTrip('\ndébut par un saut')).toBe('\ndébut par un saut');
    expect(roundTrip('fin par un saut\n')).toBe('fin par un saut\n');
  });

  it('round-trip une marque au milieu de retours à la ligne', () => {
    const text = 'avant\n**gras sur sa ligne**\naprès';
    expect(roundTrip(text)).toBe(text);
  });

  it('un nom de couleur/taille hors enum retombe en texte littéral (non reconnu, cf. splitMarkdownMarks)', () => {
    const text = '{{color:magenta}}pas une couleur valide{{/color}}';
    expect(roundTrip(text)).toBe(text);
  });

  it('produit un nœud text SANS marque pour du texte simple', () => {
    const doc = descriptionToDoc('simple');
    expect(doc).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'simple' }] }],
    });
  });

  it('produit un nœud hardBreak par saut de ligne, jamais un second paragraphe', () => {
    const doc = descriptionToDoc('a\nb');
    expect(doc.content).toHaveLength(1);
    expect(doc.content?.[0].content).toEqual([
      { type: 'text', text: 'a' },
      { type: 'hardBreak' },
      { type: 'text', text: 'b' },
    ]);
  });

  it('porte les attrs `name` pour couleur/taille', () => {
    const doc = descriptionToDoc('{{color:bleu}}x{{/color}}');
    expect(doc.content?.[0].content).toEqual([
      { type: 'text', text: 'x', marks: [{ type: 'richColor', attrs: { name: 'bleu' } }] },
    ]);
  });
});
