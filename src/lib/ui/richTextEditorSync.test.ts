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

  it('round-trip un dé mécanique isolé, porté par un nœud mechToken dédié', () => {
    expect(roundTrip('{1d4}')).toBe('{1d4}');
    const doc = descriptionToDoc('{1d4}');
    expect(doc.content?.[0].content).toEqual([{ type: 'mechToken', attrs: { raw: '{1d4}' } }]);
  });

  it('round-trip une référence de caractéristique, une formule et un statut', () => {
    expect(roundTrip('@FOR')).toBe('@FOR');
    expect(roundTrip('[FOR + 1]')).toBe('[FOR + 1]');
    expect(roundTrip('[!immobilized]')).toBe('[!immobilized]');
    expect(roundTrip('[&epee-longue]')).toBe('[&epee-longue]');
  });

  it('un token mal formé retombe en texte littéral (aucun nœud mechToken)', () => {
    expect(roundTrip('[!pas-un-etat]')).toBe('[!pas-un-etat]');
    const doc = descriptionToDoc('[!pas-un-etat]');
    expect(doc.content?.[0].content).toEqual([{ type: 'text', text: '[!pas-un-etat]' }]);
  });

  it('round-trip un renvoi de page, avec ou sans qualificatif de livre', () => {
    expect(roundTrip('(p. 42)')).toBe('(p. 42)');
    const doc = descriptionToDoc('(p. 42, compagnon)');
    expect(doc.content?.[0].content).toEqual([{ type: 'mechToken', attrs: { raw: '(p. 42, compagnon)' } }]);
    expect(docToDescription(doc)).toBe('(p. 42, compagnon)');
  });

  it('un token mécanique ne porte jamais de marque, même adjacent à du texte marqué', () => {
    const text = '**avant** {1d4} *après*';
    expect(roundTrip(text)).toBe(text);
    expect(descriptionToDoc(text).content?.[0].content).toEqual([
      { type: 'text', text: 'avant', marks: [{ type: 'bold' }] },
      { type: 'text', text: ' ' },
      { type: 'mechToken', attrs: { raw: '{1d4}' } },
      { type: 'text', text: ' ' },
      { type: 'text', text: 'après', marks: [{ type: 'italic' }] },
    ]);
  });

  it('porte les attrs `name` pour couleur/taille', () => {
    const doc = descriptionToDoc('{{color:bleu}}x{{/color}}');
    expect(doc.content?.[0].content).toEqual([
      { type: 'text', text: 'x', marks: [{ type: 'richColor', attrs: { name: 'bleu' } }] },
    ]);
  });
});
