import { describe, expect, it } from 'vitest';
import { progression } from '@/data/progression';
import type { Abilities } from '@/lib/engine';
import { scalingDie } from '@/lib/engine';
import { dieAtRank, dieCountAtRank, parseRichText, resolveExpr } from './featureRichText';

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

  it('reconnaît un terme nommé sur une expression déterministe [#AGI + 2] (substantif)', () => {
    expect(parseRichText('égal à votre [#AGI + 2]')).toEqual([
      { kind: 'text', value: 'égal à votre ' },
      {
        kind: 'term',
        raw: '[#AGI + 2]',
        terms: [
          { kind: 'ability', sign: 1, ability: 'AGI' },
          { kind: 'number', sign: 1, value: 2 },
        ],
      },
    ]);
    expect(parseRichText('[#CHA × 2]')).toEqual([
      { kind: 'term', raw: '[#CHA × 2]', terms: [{ kind: 'ability', sign: 1, ability: 'CHA', coeff: 2 }] },
    ]);
  });

  it('refuse un dé dans un terme nommé [#1d6] (pas de valeur unique) → littéral', () => {
    expect(parseRichText('[#1d6]')).toEqual([{ kind: 'text', value: '[#1d6]' }]);
    expect(parseRichText('[#1d6 + AGI]')).toEqual([{ kind: 'text', value: '[#1d6 + AGI]' }]);
  });

  it('parse un produit de deux variables en terme `product` (PER-163)', () => {
    expect((parseRichText('[CHA × FOR]')[0] as { terms: unknown }).terms).toEqual([
      {
        kind: 'product',
        sign: 1,
        factors: [
          { kind: 'ability', ability: 'CHA' },
          { kind: 'ability', ability: 'FOR' },
        ],
      },
    ]);
  });

  it('parse un produit variable × variable avec coeff numérique (`niveau × INT`)', () => {
    expect((parseRichText('[=niveau × INT]')[0] as { terms: unknown }).terms).toEqual([
      {
        kind: 'product',
        sign: 1,
        factors: [{ kind: 'level' }, { kind: 'ability', ability: 'INT' }],
      },
    ]);
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

  it('terme `paliers` : bonus plat injecté (Marteau de la foi)', () => {
    const segs = parseRichText('[2d4° + CHA + paliers]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    // milestoneBonus = 2 (2 autres voies de prêtre au rang 4) → 3 termes, +2 en dernier.
    const r = resolveExpr(expr.terms, abilities, 1, progression, 0, 2);
    expect(r.hasDie).toBe(true);
    expect(r.parts).toHaveLength(3);
    expect(r.parts[2].kind).toBe('milestoneBonus');
    expect(r.parts[2].value).toBe(2);
  });

  it('terme `paliers` : OMIS quand le bonus est 0 (pas de « + 0 » parasite)', () => {
    const segs = parseRichText('[2d4° + CHA + paliers]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    const r = resolveExpr(expr.terms, abilities, 1, progression, 0, 0);
    expect(r.parts).toHaveLength(2); // dé + CHA, le terme paliers disparaît
    expect(r.parts.some((p) => p.kind === 'milestoneBonus')).toBe(false);
  });

  it('terme `paliers` : multipliable (« +2 par palier »)', () => {
    const segs = parseRichText('[2 × paliers]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    const r = resolveExpr(expr.terms, abilities, 1, progression, 0, 3); // 3 paliers × 2
    expect(r.hasDie).toBe(false);
    expect(r.total).toBe(6);
  });

  it('terme `paliers` dans une QUANTITÉ : chargeur de l’arquebusier (PER-118)', () => {
    // Capacité du chargeur = 2 + INT + (voies d'arquebusier au rang 3). INT 0 ici, 5 voies au rang 3.
    const segs = parseRichText('[=2 + INT + paliers]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'quantity' }>;
    expect(expr.kind).toBe('quantity');
    const r = resolveExpr(expr.terms, abilities, 1, progression, 0, 5);
    expect(r.hasDie).toBe(false);
    expect(r.total).toBe(7); // 2 + INT(0) + 5
    // À 0 voie au rang 3, le terme paliers disparaît → 2 + INT.
    expect(resolveExpr(expr.terms, abilities, 1, progression, 0, 0).total).toBe(2);
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

  it('progression de Récupération majeure (soins-r3) : +1d4° par voie de prêtre au rang 5', () => {
    // « rang » passé = nombre de voies de prêtre au rang 5 (0 → 3d4°, …, 5 → 8d4°).
    const segs = parseRichText('[3d4°|4@1|5@2|6@3|7@4|8@5 + CHA]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    const dieTerm = expr.terms.find((t) => t.kind === 'die') as Extract<
      (typeof expr.terms)[number],
      { kind: 'die' }
    >;
    expect(dieCountAtRank(dieTerm.token, 0)).toBe(3);
    expect(dieCountAtRank(dieTerm.token, 1)).toBe(4);
    expect(dieCountAtRank(dieTerm.token, 5)).toBe(8);
    expect(dieCountAtRank(dieTerm.token, 9)).toBe(8); // jamais au-delà du dernier palier
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

describe('dé COMPLET scalant par rang de voie (|CdF@R)', () => {
  it('parse les paliers de dé complet (Poings de fer)', () => {
    expect(parseRichText('{1d6|1d8@2|1d10@3|1d12@4|2d6@5}')).toEqual([
      {
        kind: 'die',
        token: {
          count: 1,
          die: 'd6',
          evolving: false,
          dieSteps: [
            { minRank: 2, count: 1, die: 'd8' },
            { minRank: 3, count: 1, die: 'd10' },
            { minRank: 4, count: 1, die: 'd12' },
            { minRank: 5, count: 2, die: 'd6' },
          ],
        },
      },
    ]);
  });

  it('dieAtRank retient le dé du palier de plus haut seuil atteint', () => {
    const token = {
      count: 1,
      die: 'd6' as const,
      evolving: false,
      dieSteps: [
        { minRank: 2, count: 1, die: 'd8' as const },
        { minRank: 3, count: 1, die: 'd10' as const },
        { minRank: 4, count: 1, die: 'd12' as const },
        { minRank: 5, count: 2, die: 'd6' as const },
      ],
    };
    expect(dieAtRank(token, 1)).toEqual({ count: 1, die: 'd6', evolving: false });
    expect(dieAtRank(token, 2)).toEqual({ count: 1, die: 'd8', evolving: false });
    expect(dieAtRank(token, 4)).toEqual({ count: 1, die: 'd12', evolving: false });
    expect(dieAtRank(token, 5)).toEqual({ count: 2, die: 'd6', evolving: false });
    // Dé fixe (sans paliers) : toujours son dé de base.
    expect(dieAtRank({ count: 1, die: 'd6', evolving: false }, 9)).toEqual({ count: 1, die: 'd6', evolving: false });
  });

  it('résout le dé au rang dans une formule de DM (Poings de fer)', () => {
    const segs = parseRichText('[1d6|1d8@2|1d10@3|1d12@4|2d6@5 + FOR/AGI]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    // rang 1 → 1d6 ; rang 5 → 2d6.
    const r1 = resolveExpr(expr.terms, abilities, 1, progression, 1).parts[0].die;
    expect(r1).toMatchObject({ count: 1, displayDie: 'd6' });
    const r5 = resolveExpr(expr.terms, abilities, 1, progression, 5).parts[0].die;
    expect(r5).toMatchObject({ count: 2, displayDie: 'd6' });
  });

  it('un palier de dé complet peut rendre le dé évolutif (Lanceur de couteau)', () => {
    // `[1d4|1d4°@5 + AGI]` : 1d4 FIXE aux rangs 1-4, 1d4° ÉVOLUTIF au rang 5.
    const segs = parseRichText('[1d4|1d4°@5 + AGI]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    const dieTerm = expr.terms.find((t) => t.kind === 'die') as Extract<
      (typeof expr.terms)[number],
      { kind: 'die' }
    >;
    expect(dieTerm.token.dieSteps).toEqual([{ minRank: 5, count: 1, die: 'd4', evolving: true }]);
    // Rang 4 : fixe → displayDie = d4, non évolutif. Rang 5 : évolutif → displayDie au niveau.
    expect(dieAtRank(dieTerm.token, 4)).toEqual({ count: 1, die: 'd4', evolving: false });
    expect(dieAtRank(dieTerm.token, 5)).toEqual({ count: 1, die: 'd4', evolving: true });
    const r4 = resolveExpr(expr.terms, abilities, 12, progression, 4).parts[0].die;
    expect(r4).toMatchObject({ count: 1, displayDie: 'd4', evolving: false });
    const r5 = resolveExpr(expr.terms, abilities, 12, progression, 5).parts[0].die;
    expect(r5?.evolving).toBe(true);
    expect(r5?.displayDie).toBe(scalingDie(12, progression));
  });
});

describe('meilleure de plusieurs caractéristiques (FOR/AGI)', () => {
  it('parse une « meilleure de » en terme abilityBest', () => {
    expect(parseRichText('[FOR/AGI]')).toEqual([
      {
        kind: 'expr',
        terms: [{ kind: 'abilityBest', sign: 1, abilities: ['FOR', 'AGI'] }],
        raw: '[FOR/AGI]',
      },
    ]);
  });

  it('retient la carac la plus forte et l\'affiche', () => {
    const segs = parseRichText('[FOR/AGI]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    // Fixture : FOR (3) > AGI (1) → retient FOR.
    const r = resolveExpr(expr.terms, abilities, 1, progression).parts[0];
    expect(r).toMatchObject({ kind: 'abilityBest', symbol: 'FOR', value: 3 });
    // AGI plus forte → retient AGI.
    const agiFort: Abilities = { ...abilities, AGI: 5 };
    const r2 = resolveExpr(expr.terms, agiFort, 1, progression).parts[0];
    expect(r2).toMatchObject({ symbol: 'AGI', value: 5 });
  });

  it('résout la meilleure carac dans une formule à dé (Poings de fer)', () => {
    const segs = parseRichText('[1d6 + FOR/AGI]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'expr' }>;
    const resolved = resolveExpr(expr.terms, abilities, 1, progression);
    expect(resolved.hasDie).toBe(true);
    // Le terme carac retient la plus forte (FOR 3).
    expect(resolved.parts[1]).toMatchObject({ kind: 'abilityBest', symbol: 'FOR', value: 3 });
  });
});

describe('resolveExpr — produit de variables (Téléportation, PER-163)', () => {
  it('multiplie les variables et expose le détail des facteurs', () => {
    const segs = parseRichText('[=niveau × CHA]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'quantity' }>;
    const r = resolveExpr(expr.terms, abilities, 5, progression); // niveau 5 × CHA 4
    expect(r.hasDie).toBe(false);
    expect(r.hasAbility).toBe(true);
    expect(r.total).toBe(20);
    expect(r.parts[0]).toMatchObject({
      kind: 'product',
      symbol: 'niveau × CHA',
      value: 20,
      productParts: [
        { symbol: 'niveau', value: 5 },
        { symbol: 'CHA', value: 4 },
      ],
    });
  });
});

describe('resolveExpr — substitution de caractéristique contextuelle (PER-163)', () => {
  const CHA_TO_INT = [{ from: 'CHA', to: 'INT' } as const];

  it('substitue CHA→INT quand INT est strictement plus élevée, et marque la substitution', () => {
    const segs = parseRichText('[=CHA]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'quantity' }>;
    const forgesort: Abilities = { ...abilities, CHA: 2, INT: 5 };
    const r = resolveExpr(expr.terms, forgesort, 1, progression, 0, 0, CHA_TO_INT);
    expect(r.total).toBe(5); // INT (5) au lieu de CHA (2)
    expect(r.parts[0].substituted).toEqual({ from: 'CHA', to: 'INT' });
    expect(r.parts[0].symbol).toBe('INT');
  });

  it('n’applique PAS la substitution si INT ≤ CHA (exception à l’exception)', () => {
    const segs = parseRichText('[=CHA]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'quantity' }>;
    // Fixture : CHA 4 ≥ INT 0 → pas de substitution.
    const r = resolveExpr(expr.terms, abilities, 1, progression, 0, 0, CHA_TO_INT);
    expect(r.total).toBe(4); // CHA conservé
    expect(r.parts[0].substituted).toBeUndefined();
    expect(r.parts[0].symbol).toBe('CHA');
  });

  it('n’affecte pas les autres caractéristiques', () => {
    const segs = parseRichText('[=PER]');
    const expr = segs[0] as Extract<(typeof segs)[number], { kind: 'quantity' }>;
    const forgesort: Abilities = { ...abilities, PER: 1, INT: 5 };
    // Substitution ciblée sur CHA uniquement → PER intact.
    const r = resolveExpr(expr.terms, forgesort, 1, progression, 0, 0, CHA_TO_INT);
    expect(r.total).toBe(1);
    expect(r.parts[0].substituted).toBeUndefined();
  });
});
