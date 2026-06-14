import { describe, expect, it } from 'vitest';
import { progression } from '@/data/progression';
import type { Abilities } from '@/lib/engine';
import { parseRichText, resolveExpr } from './featureRichText';

const abilities: Abilities = { AGI: 1, CON: 2, FOR: 3, PER: 1, CHA: 4, INT: 0, VOL: -1 };

describe('parseRichText — découpage', () => {
  it('renvoie un seul segment texte pour du texte brut', () => {
    expect(parseRichText('Le barbare frappe fort.')).toEqual([
      { kind: 'text', value: 'Le barbare frappe fort.' },
    ]);
  });

  it('reconnaît un dé simple entre accolades', () => {
    expect(parseRichText('{d6}')).toEqual([
      { kind: 'die', token: { count: 1, die: 'd6', evolving: false } },
    ]);
  });

  it('reconnaît un dé évolutif avec multiplicateur', () => {
    expect(parseRichText('{2d4°}')).toEqual([
      { kind: 'die', token: { count: 2, die: 'd4', evolving: true } },
    ]);
  });

  it('intercale dé et texte dans le bon ordre', () => {
    const segs = parseRichText('+{1d4°} aux DM');
    expect(segs).toEqual([
      { kind: 'text', value: '+' },
      { kind: 'die', token: { count: 1, die: 'd4', evolving: true } },
      { kind: 'text', value: ' aux DM' },
    ]);
  });

  it('reconnaît une formule caractéristique + nombre', () => {
    const segs = parseRichText('[FOR + 1]');
    expect(segs).toEqual([
      {
        kind: 'expr',
        raw: '[FOR + 1]',
        terms: [
          { kind: 'ability', sign: 1, ability: 'FOR' },
          { kind: 'number', sign: 1, value: 1 },
        ],
      },
    ]);
  });

  it('reconnaît une formule dé + caractéristique', () => {
    const segs = parseRichText('[1d4° + CHA] DM');
    expect(segs[0]).toEqual({
      kind: 'expr',
      raw: '[1d4° + CHA]',
      terms: [
        { kind: 'die', sign: 1, token: { count: 1, die: 'd4', evolving: true } },
        { kind: 'ability', sign: 1, ability: 'CHA' },
      ],
    });
    expect(segs[1]).toEqual({ kind: 'text', value: ' DM' });
  });

  it('gère un signe négatif dans une formule', () => {
    const segs = parseRichText('[FOR - 2]');
    expect(segs[0]).toMatchObject({
      kind: 'expr',
      terms: [
        { kind: 'ability', sign: 1, ability: 'FOR' },
        { kind: 'number', sign: -1, value: 2 },
      ],
    });
  });

  it('reconnaît une référence de caractéristique @CODE', () => {
    expect(parseRichText('un test de @FOR difficulté 10')).toEqual([
      { kind: 'text', value: 'un test de ' },
      { kind: 'abilityRef', ability: 'FOR' },
      { kind: 'text', value: ' difficulté 10' },
    ]);
  });

  it('reconnaît plusieurs références dans une phrase', () => {
    const segs = parseRichText('une @AGI et une @INT de +0');
    expect(segs).toEqual([
      { kind: 'text', value: 'une ' },
      { kind: 'abilityRef', ability: 'AGI' },
      { kind: 'text', value: ' et une ' },
      { kind: 'abilityRef', ability: 'INT' },
      { kind: 'text', value: ' de +0' },
    ]);
  });

  it('ne confond pas @CODE avec un mot plus long ni un faux code', () => {
    expect(parseRichText('@FORtune et @gmail')).toEqual([
      { kind: 'text', value: '@FORtune et @gmail' },
    ]);
  });

  it('retombe en texte littéral si le contenu des accolades est invalide', () => {
    expect(parseRichText('{xyz}')).toEqual([{ kind: 'text', value: '{xyz}' }]);
  });

  it('retombe en texte littéral si la formule contient un terme inconnu', () => {
    // « rang du sort » n'est pas une caractéristique → crochets conservés.
    expect(parseRichText('[10 + rang du sort]')).toEqual([
      { kind: 'text', value: '[10 + rang du sort]' },
    ]);
  });
});

describe('resolveExpr — évaluation', () => {
  it('calcule le total d’une formule déterministe', () => {
    const segs = parseRichText('[FOR + 1]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    const r = resolveExpr(expr.terms, abilities, 1, progression);
    expect(r.hasDie).toBe(false);
    expect(r.total).toBe(4); // FOR 3 + 1
  });

  it('expose le symbole et le drapeau caractéristique pour l’affichage', () => {
    const segs = parseRichText('[CHA]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    const r = resolveExpr(expr.terms, abilities, 1, progression);
    expect(r.hasAbility).toBe(true);
    expect(r.total).toBe(4); // CHA
    expect(r.parts[0].symbol).toBe('CHA');
  });

  it('soustrait un terme négatif', () => {
    const segs = parseRichText('[FOR - 2]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    expect(resolveExpr(expr.terms, abilities, 1, progression).total).toBe(1); // 3 − 2
  });

  it('ne calcule pas de total quand un dé est présent et résout le dé au niveau', () => {
    const segs = parseRichText('[1d4° + CHA]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    const r = resolveExpr(expr.terms, abilities, 6, progression); // niveau 6 → d6
    expect(r.hasDie).toBe(true);
    expect(r.total).toBeNull();
    expect(r.parts[0].die).toEqual({ count: 1, displayDie: 'd6', evolving: true });
    expect(r.parts[1].value).toBe(4); // CHA
  });

  it('résout un dé NON évolutif à sa face d’origine', () => {
    const segs = parseRichText('[2d6 + FOR]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    const r = resolveExpr(expr.terms, abilities, 12, progression);
    expect(r.parts[0].die).toEqual({ count: 2, displayDie: 'd6', evolving: false });
  });
});
