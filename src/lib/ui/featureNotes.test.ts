import { describe, expect, it } from 'vitest';
import { splitNotes } from './featureNotes';

describe('splitNotes', () => {
  it('isole une note de fin précédée de deux sauts de ligne', () => {
    const text = "Le druide gagne +2 en DEF.\n\nNote : ce bonus ne se cumule pas.";
    expect(splitNotes(text)).toEqual([
      { kind: 'body', value: 'Le druide gagne +2 en DEF.\n\n' },
      { kind: 'note', value: 'Note : ce bonus ne se cumule pas.' },
    ]);
  });

  it('attrape une note sur un simple saut de ligne', () => {
    const text = "Effet principal.\nNote : précision.";
    expect(splitNotes(text)).toEqual([
      { kind: 'body', value: 'Effet principal.\n' },
      { kind: 'note', value: 'Note : précision.' },
    ]);
  });

  it('gère « Note:» sans espace et un texte qui n’est QUE la note', () => {
    expect(splitNotes('Note: rien d’autre.')).toEqual([
      { kind: 'note', value: 'Note: rien d’autre.' },
    ]);
  });

  it('laisse un texte sans note en un seul segment de corps', () => {
    const text = "Aucune note ici.\nDeuxième ligne.";
    expect(splitNotes(text)).toEqual([{ kind: 'body', value: text }]);
  });

  it('continue à rendre le corps qui suit une note (note en milieu de texte)', () => {
    const text = "Avant.\nNote : au milieu.\nAprès la note.";
    expect(splitNotes(text)).toEqual([
      { kind: 'body', value: 'Avant.\n' },
      { kind: 'note', value: 'Note : au milieu.' },
      { kind: 'body', value: '\nAprès la note.' },
    ]);
  });

  it("ne confond pas un mot contenant « note » au fil de la phrase", () => {
    const text = "Il prend note de tout. La note de musique résonne.";
    expect(splitNotes(text)).toEqual([{ kind: 'body', value: text }]);
  });
});
