import { describe, expect, it } from 'vitest';
import type { Abilities } from '@/lib/engine';
import { richTextToPdfRuns } from './richTextToPdfRuns';

const abilities: Abilities = { AGI: 1, CON: 2, FOR: 3, PER: 1, CHA: 4, INT: 0, VOL: -1 };
const ctx = { abilities, level: 5, rank: 3 };

describe('richTextToPdfRuns', () => {
  it('rend du texte brut en un seul run', () => {
    expect(richTextToPdfRuns('Le barbare frappe fort.', ctx)).toEqual([
      { text: 'Le barbare frappe fort.' },
    ]);
  });

  it('marque le gras (Markdown) sans imbrication', () => {
    expect(richTextToPdfRuns('un **bonus** permanent', ctx)).toEqual([
      { text: 'un ' },
      { text: 'bonus', bold: true },
      { text: ' permanent' },
    ]);
  });

  it('résout un dé au rang atteint (compte omis à 1, comme le reste de l’app)', () => {
    expect(richTextToPdfRuns('{1d4°}', ctx)).toEqual([{ text: 'd4°' }]);
  });

  it('résout une formule déterministe en son total', () => {
    // FOR (3) + 1 = 4, au rang/niveau du contexte — aucun dé, donc un total unique.
    expect(richTextToPdfRuns('[FOR + 1]', ctx)).toEqual([{ text: '4' }]);
  });

  it('résout une formule avec dé en détail symbole + valeur', () => {
    expect(richTextToPdfRuns('[1d4° + CHA]', ctx)).toEqual([{ text: 'd4° + CHA (4)' }]);
  });

  it('rend une référence de caractéristique par son code', () => {
    expect(richTextToPdfRuns('@FOR', ctx)).toEqual([{ text: 'FOR' }]);
  });

  it('rend une référence de statut par son libellé', () => {
    expect(richTextToPdfRuns('[!blinded]', ctx)).toEqual([{ text: 'Aveuglé' }]);
  });

  it('rend une référence de capacité inconnue par son id, faute de mieux', () => {
    expect(richTextToPdfRuns('[&id-inexistant]', ctx)).toEqual([{ text: 'id-inexistant' }]);
  });

  it('rend une référence de capacité avec texte explicite par ce texte', () => {
    expect(richTextToPdfRuns('[&id-inexistant|encaisser un coup]', ctx)).toEqual([
      { text: 'encaisser un coup' },
    ]);
  });
});
