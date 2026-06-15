import { describe, expect, it } from 'vitest';
import { splitGlossary, GLOSSARY } from './glossary';

describe('splitGlossary', () => {
  it('renvoie un seul fragment texte sans terme connu', () => {
    expect(splitGlossary('Le barbare frappe fort.')).toEqual([
      { kind: 'text', value: 'Le barbare frappe fort.' },
    ]);
  });

  it('reconnaît une stat dérivée (DEF) au milieu du texte', () => {
    expect(splitGlossary('un bonus de DEF associé')).toEqual([
      { kind: 'text', value: 'un bonus de ' },
      { kind: 'term', term: 'DEF', entry: GLOSSARY.DEF },
      { kind: 'text', value: ' associé' },
    ]);
  });

  it('reconnaît un terme de jargon (NC)', () => {
    const pieces = splitGlossary('une créature de NC inférieur');
    expect(pieces[1]).toEqual({ kind: 'term', term: 'NC', entry: GLOSSARY.NC });
    expect(GLOSSARY.NC.category).toBe('jargon');
  });

  it('capte « Init. » avec son point sans casser la ponctuation des autres', () => {
    expect(splitGlossary('pas de bonus d’Init.')).toEqual([
      { kind: 'text', value: 'pas de bonus d’' },
      { kind: 'term', term: 'Init.', entry: GLOSSARY.Init },
    ]);
    // Pour les autres termes, le point final reste de la ponctuation.
    expect(splitGlossary('un bonus de DEF.')).toEqual([
      { kind: 'text', value: 'un bonus de ' },
      { kind: 'term', term: 'DEF', entry: GLOSSARY.DEF },
      { kind: 'text', value: '.' },
    ]);
  });

  it('ne confond pas « Init » avec le mot « Initiative »', () => {
    expect(splitGlossary('Initiative')).toEqual([{ kind: 'text', value: 'Initiative' }]);
  });

  it('distingue PNJ et PJ (plus long d’abord)', () => {
    const pieces = splitGlossary('un PNJ et un PJ');
    expect(pieces.map((p) => (p.kind === 'term' ? p.term : p.value))).toEqual([
      'un ', 'PNJ', ' et un ', 'PJ',
    ]);
  });

  it('reconnaît DM (jargon) et le distingue du contexte', () => {
    const pieces = splitGlossary('inflige 1d4° DM de feu');
    expect(pieces.some((p) => p.kind === 'term' && p.term === 'DM')).toBe(true);
  });

  it('est sensible à la casse (def minuscule n’est pas un acronyme)', () => {
    expect(splitGlossary('au-dessus de def')).toEqual([{ kind: 'text', value: 'au-dessus de def' }]);
  });

  it('ne capte pas un acronyme collé dans un mot', () => {
    expect(splitGlossary('ADMINISTRER PVE')).toEqual([{ kind: 'text', value: 'ADMINISTRER PVE' }]);
  });

  it('reconnaît une caractéristique en prose (catégorie ability)', () => {
    expect(GLOSSARY.INT.category).toBe('ability');
    expect(splitGlossary("égal à sa valeur d'INT")).toEqual([
      { kind: 'text', value: "égal à sa valeur d'" },
      { kind: 'term', term: 'INT', entry: GLOSSARY.INT },
    ]);
  });

  it('reconnaît les caracs d’un bloc de profil de créature', () => {
    const terms = splitGlossary('AGI ‑1 | CON +10 | FOR +1')
      .filter((p) => p.kind === 'term')
      .map((p) => (p.kind === 'term' ? p.term : ''));
    expect(terms).toEqual(['AGI', 'CON', 'FOR']);
  });
});
