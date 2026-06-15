import { describe, expect, it } from 'vitest';
import { progression } from '@/data/progression';
import type { Abilities } from '@/lib/engine';
import { dieCountAtRank, parseRichText, resolveExpr } from './featureRichText';

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
    // « du sort » n'est pas reconnaissable → crochets conservés (et « rang du
    // sort » n'est PAS le terme `rang` seul).
    expect(parseRichText('[10 + rang du sort]')).toEqual([
      { kind: 'text', value: '[10 + rang du sort]' },
    ]);
  });

  it('reconnaît les termes rang et niveau dans une formule', () => {
    expect(parseRichText('[10 + rang]')).toEqual([
      {
        kind: 'expr',
        raw: '[10 + rang]',
        terms: [
          { kind: 'number', sign: 1, value: 10 },
          { kind: 'rank', sign: 1 },
        ],
      },
    ]);
    expect(parseRichText('[niveau du druide × 4]')).toEqual([
      { kind: 'text', value: '[niveau du druide × 4]' }, // « du druide » non reconnu
    ]);
    expect((parseRichText('[niveau × 4]')[0] as { terms: unknown }).terms).toEqual([
      { kind: 'level', sign: 1, coeff: 4 },
    ]);
  });

  it('reconnaît un multiplicateur sur une caractéristique (avec ou sans espaces)', () => {
    const spaced = parseRichText('[CHA × 100]')[0] as { terms: unknown };
    const tight = parseRichText('[CHA×100]')[0] as { terms: unknown };
    const expected = [{ kind: 'ability', sign: 1, ability: 'CHA', coeff: 100 }];
    expect(spaced.terms).toEqual(expected);
    expect(tight.terms).toEqual(expected);
  });

  it('accepte le multiplicateur dans les deux ordres et avec * ASCII', () => {
    expect((parseRichText('[2 × FOR]')[0] as { terms: unknown }).terms).toEqual([
      { kind: 'ability', sign: 1, ability: 'FOR', coeff: 2 },
    ]);
    expect((parseRichText('[niveau * 3]')[0] as { terms: unknown }).terms).toEqual([
      { kind: 'level', sign: 1, coeff: 3 },
    ]);
  });

  it('reconnaît une quantité [=…] (valeur brute)', () => {
    expect(parseRichText('pendant [=CHA] minutes')).toEqual([
      { kind: 'text', value: 'pendant ' },
      { kind: 'quantity', raw: '[=CHA]', terms: [{ kind: 'ability', sign: 1, ability: 'CHA' }] },
      { kind: 'text', value: ' minutes' },
    ]);
  });

  it('reconnaît une quantité avec multiplicateur', () => {
    expect(parseRichText('[=CHA × 100]')).toEqual([
      {
        kind: 'quantity',
        raw: '[=CHA × 100]',
        terms: [{ kind: 'ability', sign: 1, ability: 'CHA', coeff: 100 }],
      },
    ]);
  });

  it('reconnaît un terme nommé [#rang]/[#niveau] (substantif)', () => {
    expect(parseRichText('égal au [#rang]')).toEqual([
      { kind: 'text', value: 'égal au ' },
      { kind: 'term', raw: '[#rang]', terms: [{ kind: 'rank', sign: 1 }] },
    ]);
    expect(parseRichText('[#niveau]')).toEqual([
      { kind: 'term', raw: '[#niveau]', terms: [{ kind: 'level', sign: 1 }] },
    ]);
  });

  it('reconnaît un terme nommé caractéristique [#INT] (substantif)', () => {
    expect(parseRichText('égal à son [#INT]')).toEqual([
      { kind: 'text', value: 'égal à son ' },
      { kind: 'term', raw: '[#INT]', terms: [{ kind: 'ability', sign: 1, ability: 'INT' }] },
    ]);
  });

  it('restreint [#…] à UN terme nu (rang/niveau/carac) — multiplicateur/opérateur → littéral', () => {
    expect(parseRichText('[#rang × 2]')).toEqual([{ kind: 'text', value: '[#rang × 2]' }]);
    expect(parseRichText('[#10 + rang]')).toEqual([{ kind: 'text', value: '[#10 + rang]' }]);
    expect(parseRichText('[#CHA × 2]')).toEqual([{ kind: 'text', value: '[#CHA × 2]' }]);
  });

  it('rejette un produit de deux variables', () => {
    expect(parseRichText('[CHA × FOR]')).toEqual([{ kind: 'text', value: '[CHA × FOR]' }]);
  });

  it('rejette un dé multiplié', () => {
    expect(parseRichText('[2 × 1d6]')).toEqual([{ kind: 'text', value: '[2 × 1d6]' }]);
  });

  it('rejette un opérateur final orphelin', () => {
    expect(parseRichText('[FOR +]')).toEqual([{ kind: 'text', value: '[FOR +]' }]);
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

  it('résout le terme rang via le rang passé en argument', () => {
    const segs = parseRichText('[10 + rang]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    const r = resolveExpr(expr.terms, abilities, 1, progression, 3);
    expect(r.total).toBe(13); // 10 + rang 3
    expect(r.hasAbility).toBe(true); // une variable est présente
  });

  it('applique le multiplicateur d’un terme caractéristique/niveau', () => {
    const cha = parseRichText('[=CHA × 100]')[0] as Extract<
      ReturnType<typeof parseRichText>[number],
      { kind: 'quantity' }
    >;
    expect(resolveExpr(cha.terms, abilities, 1, progression).total).toBe(400); // CHA 4 × 100
    expect(resolveExpr(cha.terms, abilities, 1, progression).parts[0].symbol).toBe('CHA × 100');
    // Le coeff est exposé pour expliciter la dérivation (« 5 × 100 ») dans l'info-bulle.
    expect(resolveExpr(cha.terms, abilities, 1, progression).parts[0].coeff).toBe(100);

    const niv = parseRichText('[niveau × 5]')[0] as Extract<
      ReturnType<typeof parseRichText>[number],
      { kind: 'expr' }
    >;
    expect(resolveExpr(niv.terms, abilities, 6, progression).total).toBe(30); // niveau 6 × 5
  });

  it('évalue les deux démos de référence (PER-90)', () => {
    // Serviteur invisible : « pendant [=CHA] minutes » → 4 (CHA).
    const serviteur = parseRichText('[=CHA]')[0] as Extract<
      ReturnType<typeof parseRichText>[number],
      { kind: 'quantity' }
    >;
    expect(resolveExpr(serviteur.terms, abilities, 1, progression).total).toBe(4);
    // Murmures dans le vent : « portée est de [=CHA × 100] m » → 400.
    const murmures = parseRichText('[=CHA × 100]')[0] as Extract<
      ReturnType<typeof parseRichText>[number],
      { kind: 'quantity' }
    >;
    expect(resolveExpr(murmures.terms, abilities, 1, progression).total).toBe(400);
  });
});

describe('dé scalant par rang de voie (|C@R)', () => {
  it('parse les paliers de nombre de dés', () => {
    expect(parseRichText('{1d4°|2@4}')).toEqual([
      { kind: 'die', token: { count: 1, die: 'd4', evolving: true, countSteps: [{ minRank: 4, count: 2 }] } },
    ]);
    expect(parseRichText('{2d4°|3@4|4@5}')).toEqual([
      {
        kind: 'die',
        token: { count: 2, die: 'd4', evolving: true, countSteps: [{ minRank: 4, count: 3 }, { minRank: 5, count: 4 }] },
      },
    ]);
  });

  it('dieCountAtRank retient le palier de plus haut seuil atteint', () => {
    const token = { count: 2, die: 'd4' as const, evolving: true, countSteps: [{ minRank: 4, count: 3 }, { minRank: 5, count: 4 }] };
    expect(dieCountAtRank(token, 1)).toBe(2);
    expect(dieCountAtRank(token, 3)).toBe(2);
    expect(dieCountAtRank(token, 4)).toBe(3);
    expect(dieCountAtRank(token, 5)).toBe(4);
    // Dé à nombre fixe (sans paliers) : toujours son count.
    expect(dieCountAtRank({ count: 1, die: 'd4', evolving: true }, 9)).toBe(1);
  });

  it('résout le nombre de dés au rang dans une formule (Arc de feu)', () => {
    const segs = parseRichText('[1d4°|2@4 + INT]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    // rang 3 (5e arg) → 1 dé ; rang 4 → 2 dés.
    expect(resolveExpr(expr.terms, abilities, 1, progression, 3).parts[0].die?.count).toBe(1);
    expect(resolveExpr(expr.terms, abilities, 1, progression, 4).parts[0].die?.count).toBe(2);
  });

  it('un palier mal formé retombe en littéral', () => {
    expect(parseRichText('{1d4°|2@}')).toEqual([{ kind: 'text', value: '{1d4°|2@}' }]);
  });
});
