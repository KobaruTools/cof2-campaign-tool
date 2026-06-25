import { describe, expect, it } from 'vitest';
import { splitGlossary, splitGameTerms, GLOSSARY } from './glossary';

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

describe('splitGameTerms', () => {
  const games = (text: string) =>
    splitGameTerms(text)
      .filter((p) => p.kind === 'game')
      .map((p) => (p.kind === 'game' ? { term: p.term, category: p.entry.category } : null));

  it('texte sans notion de jeu → un seul fragment texte', () => {
    expect(splitGameTerms('Le sorcier invoque un démon.')).toEqual([
      { kind: 'text', value: 'Le sorcier invoque un démon.' },
    ]);
  });

  it('« test » seul → action (gras)', () => {
    expect(games('réussir un test de VOL')).toEqual([{ term: 'test', category: 'action' }]);
  });

  it('« test opposé » prime sur « test » (plus long d’abord)', () => {
    expect(games('un test opposé d’attaque magique')).toEqual([
      { term: 'test opposé', category: 'action' },
      { term: 'attaque magique', category: 'attack' },
    ]);
  });

  it('capte les pluriels « tests » et « tests opposés »', () => {
    expect(games('deux tests de PER')[0]).toEqual({ term: 'tests', category: 'action' });
    expect(games('des tests opposés')[0]).toEqual({ term: 'tests opposés', category: 'action' });
  });

  it('capte les trois jets d’attaque (contact « au » et « de »)', () => {
    expect(games('une attaque au contact')[0]).toEqual({ term: 'attaque au contact', category: 'attack' });
    expect(games('une attaque de contact')[0]).toEqual({ term: 'attaque de contact', category: 'attack' });
    expect(games('une attaque à distance')[0]).toEqual({ term: 'attaque à distance', category: 'attack' });
  });

  it('insensible à la casse, conserve la casse d’origine', () => {
    expect(games('Test d’attaque magique')).toEqual([
      { term: 'Test', category: 'action' },
      { term: 'attaque magique', category: 'attack' },
    ]);
  });

  it('ne capte pas « test » collé dans un mot (tester, attestation)', () => {
    expect(games('il peut tester son attestation')).toEqual([]);
  });

  it('« attaque » seul (sans qualificatif) reste du texte brut', () => {
    expect(games('lors d’une attaque de mêlée classique')).toEqual([]);
  });

  it('capte les notions de règle du voleur (catégorie « rule »)', () => {
    expect(games('un adversaire surpris ou qui lui tourne le dos')).toEqual([
      { term: 'surpris', category: 'rule' },
      { term: 'tourne le dos', category: 'rule' },
    ]);
    expect(games('il réalise une attaque sournoise')).toEqual([
      { term: 'attaque sournoise', category: 'rule' },
    ]);
    expect(games('attaquer dans le dos')[0]).toEqual({ term: 'dans le dos', category: 'rule' });
  });

  it('« surpris » ne capte pas « surprise » (évite le titre « Attaque par surprise »)', () => {
    expect(games('réaliser une attaque par surprise')).toEqual([]);
  });
});
