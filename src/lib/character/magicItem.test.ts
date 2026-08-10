import { describe, expect, it } from 'vitest';
import {
  MAGIC_PROPERTY_RULES,
  isMagicItem,
  magicItemValue,
  magicLevel,
  magicPropertyLabel,
  normalizeMagicProperty,
  propertyMagicLevel,
} from './magicItem';
import type { MagicProperty } from './types';

describe('propertyMagicLevel', () => {
  it('affûtée, fléau et propriétés défensives simples valent +1 (p. 251/253)', () => {
    expect(propertyMagicLevel({ kind: 'sharp' })).toBe(1);
    expect(propertyMagicLevel({ kind: 'bane', creatureCategory: 'démons' })).toBe(1);
    expect(propertyMagicLevel({ kind: 'mobile' })).toBe(1);
    expect(propertyMagicLevel({ kind: 'free-action' })).toBe(1);
    expect(propertyMagicLevel({ kind: 'resistance', substance: 'fire', amount: 10 })).toBe(1);
  });

  it('un élément vaut +2 (p. 251)', () => {
    expect(propertyMagicLevel({ kind: 'elemental', substance: 'fire' })).toBe(2);
  });

  it('la Parade vaut son bonus de DEF (p. 251)', () => {
    expect(propertyMagicLevel({ kind: 'parry', defBonus: 3 })).toBe(3);
    expect(propertyMagicLevel({ kind: 'parry' })).toBe(0);
  });

  it('Défense = +1 (RD 2), Défense supérieure = +2 (RD 4) (p. 253)', () => {
    expect(propertyMagicLevel({ kind: 'defense', tier: 1 })).toBe(1);
    expect(propertyMagicLevel({ kind: 'defense' })).toBe(1);
    expect(propertyMagicLevel({ kind: 'defense', tier: 2 })).toBe(2);
  });

  it('une propriété doublée double son niveau de magie (p. 251)', () => {
    expect(propertyMagicLevel({ kind: 'elemental', substance: 'fire', doubled: true })).toBe(4);
    expect(propertyMagicLevel({ kind: 'sharp', doubled: true })).toBe(2);
    expect(propertyMagicLevel({ kind: 'defense', tier: 2, doubled: true })).toBe(4);
  });

  it('dé personnalisé (RÈGLE MAISON) : le niveau suit le DM moyen relatif à 1d4 (arrondi au supérieur)', () => {
    // +2d6 feu : (2×3,5) / 2,5 = 2,8 → niveau livre 2 × 2,8 = 5,6 → 6.
    expect(
      propertyMagicLevel({ kind: 'elemental', substance: 'fire', customDice: { count: 2, die: 'd6' } }),
    ).toBe(6);
    // Fléau +3d4° : dé évolutif → moyenne identique à 1d4, seul le nombre compte → niveau 1×3 = 3.
    expect(
      propertyMagicLevel({
        kind: 'bane',
        creatureCategory: 'morts-vivants',
        customDice: { count: 3, die: 'd4', evolving: true },
      }),
    ).toBe(3);
    // Sans dé personnalisé, le comportement livre (fixe) ne change pas.
    expect(
      propertyMagicLevel({ kind: 'bane', creatureCategory: 'démons', customDice: undefined }),
    ).toBe(1);
  });

  it('dé personnalisé + doublée : le doublage se cumule au-dessus de la mise à l’échelle', () => {
    // +1d6 feu doublé : niveau de base ceil(2×(3,5/2,5))=ceil(2,8)=3, doublé → 6.
    expect(
      propertyMagicLevel({
        kind: 'elemental',
        substance: 'fire',
        customDice: { count: 1, die: 'd6' },
        doubled: true,
      }),
    ).toBe(6);
  });
});

describe('magicLevel', () => {
  it('objet nu = niveau 0', () => {
    expect(magicLevel({})).toBe(0);
  });

  it("exemple du livre : épée +2 de feu intense = 6 (2 + 2×(+2)) (p. 251)", () => {
    const sword = {
      magicBonus: 2,
      magicProperties: [{ kind: 'elemental', substance: 'fire', doubled: true } as MagicProperty],
    };
    expect(magicLevel(sword)).toBe(6);
  });

  it('épée +2 de feu, fléau des démons = 2 + 2 + 1 = 5', () => {
    const sword = {
      magicBonus: 2,
      magicProperties: [
        { kind: 'elemental', substance: 'fire' } as MagicProperty,
        { kind: 'bane', creatureCategory: 'démons' } as MagicProperty,
      ],
    };
    expect(magicLevel(sword)).toBe(5);
  });

  it('objet défensif : cotte de mailles +2 Défense supérieure = 2 + 2 = 4 (p. 253)', () => {
    const armor = {
      magicDef: 2,
      magicProperties: [{ kind: 'defense', tier: 2 } as MagicProperty],
    };
    expect(magicLevel(armor)).toBe(4);
  });

  it('additionne bonus d’arme et de défense (cas mixte)', () => {
    expect(magicLevel({ magicBonus: 1, magicDef: 2 })).toBe(3);
  });
});

describe('magicItemValue', () => {
  it('valeur = niveau² × 200 po (p. 244)', () => {
    expect(magicItemValue(1)).toBe(200);
    expect(magicItemValue(5)).toBe(5000);
    expect(magicItemValue(6)).toBe(7200);
    expect(magicItemValue(0)).toBe(0);
  });
});

describe('isMagicItem', () => {
  it('faux pour un objet nu, vrai dès un bonus ou une propriété', () => {
    expect(isMagicItem({})).toBe(false);
    expect(isMagicItem({ magicBonus: 1 })).toBe(true);
    expect(isMagicItem({ magicProperties: [{ kind: 'sharp' }] })).toBe(true);
    // Parade sans bonus saisi : niveau 0 mais la propriété existe → c'est magique.
    expect(isMagicItem({ magicProperties: [{ kind: 'parry' }] })).toBe(true);
  });
});

describe('magicPropertyLabel', () => {
  it('paramètre les libellés', () => {
    expect(magicPropertyLabel({ kind: 'bane', creatureCategory: 'démons' })).toBe(
      'Fléau des démons',
    );
    expect(magicPropertyLabel({ kind: 'elemental', substance: 'fire' })).toBe('Feu');
    expect(magicPropertyLabel({ kind: 'parry', defBonus: 3 })).toBe('Parade +3');
    expect(magicPropertyLabel({ kind: 'defense', tier: 2 })).toBe('Défense supérieure');
    expect(magicPropertyLabel({ kind: 'resistance', substance: 'fire', amount: 10 })).toBe(
      'Résistance feu 10',
    );
  });

  it('suffixe « (doublée) » quand doublée', () => {
    expect(magicPropertyLabel({ kind: 'elemental', substance: 'cold', doubled: true })).toBe(
      'Froid (doublée)',
    );
  });

  it('dé personnalisé : notation en suffixe, doublage inclus dans le nombre (pas de « (doublée) »)', () => {
    expect(
      magicPropertyLabel({ kind: 'elemental', substance: 'fire', customDice: { count: 2, die: 'd6' } }),
    ).toBe('Feu (+2d6)');
    expect(
      magicPropertyLabel({
        kind: 'bane',
        creatureCategory: 'morts-vivants',
        customDice: { count: 3, die: 'd4', evolving: true },
      }),
    ).toBe('Fléau des morts-vivants (+3d4°)');
    expect(
      magicPropertyLabel({
        kind: 'elemental',
        substance: 'cold',
        customDice: { count: 1, die: 'd6' },
        doubled: true,
      }),
    ).toBe('Froid (+2d6)');
  });
});

describe('normalizeMagicProperty', () => {
  it('ne garde que les paramètres pertinents au kind', () => {
    // Passage resistance → elemental : amount orphelin retiré, substance conservée.
    expect(
      normalizeMagicProperty({ kind: 'elemental', substance: 'fire', amount: 10 }),
    ).toEqual({ kind: 'elemental', substance: 'fire' });
    expect(
      normalizeMagicProperty({ kind: 'resistance', substance: 'cold', amount: 5 }),
    ).toEqual({ kind: 'resistance', substance: 'cold', amount: 5 });
    expect(normalizeMagicProperty({ kind: 'parry', defBonus: 2, tier: 2 })).toEqual({
      kind: 'parry',
      defBonus: 2,
    });
  });

  it('nettoie la catégorie de Fléau et abandonne tier 1 (défaut)', () => {
    expect(
      normalizeMagicProperty({ kind: 'bane', creatureCategory: '  démons  ' }),
    ).toEqual({ kind: 'bane', creatureCategory: 'démons' });
    expect(normalizeMagicProperty({ kind: 'defense', tier: 1 })).toEqual({ kind: 'defense' });
    expect(normalizeMagicProperty({ kind: 'defense', tier: 2 })).toEqual({
      kind: 'defense',
      tier: 2,
    });
  });

  it('conserve le doublage', () => {
    expect(
      normalizeMagicProperty({ kind: 'sharp', doubled: true }),
    ).toEqual({ kind: 'sharp', doubled: true });
  });

  it('normalise le dé personnalisé (nombre plancher à 1, evolving absent si faux)', () => {
    expect(
      normalizeMagicProperty({
        kind: 'elemental',
        substance: 'fire',
        customDice: { count: 0, die: 'd6', evolving: false },
      }),
    ).toEqual({ kind: 'elemental', substance: 'fire', customDice: { count: 1, die: 'd6' } });
    expect(
      normalizeMagicProperty({
        kind: 'bane',
        creatureCategory: 'démons',
        customDice: { count: 3, die: 'd4', evolving: true },
      }),
    ).toEqual({
      kind: 'bane',
      creatureCategory: 'démons',
      customDice: { count: 3, die: 'd4', evolving: true },
    });
  });
});

describe('MAGIC_PROPERTY_RULES', () => {
  it('chaque propriété porte un verbatim et une page source', () => {
    for (const rule of Object.values(MAGIC_PROPERTY_RULES)) {
      expect(rule.verbatim.length).toBeGreaterThan(0);
      expect(rule.sourcePage).toBeGreaterThanOrEqual(251);
      expect(rule.sourcePage).toBeLessThanOrEqual(254);
    }
  });
});
