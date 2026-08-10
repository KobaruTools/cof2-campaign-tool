import { describe, expect, it } from 'vitest';
import {
  MAGIC_ITEM_FEATURE_ID,
  PROTECTION_CONDITION,
  magicDamageReductions,
  magicImmunities,
  magicMobilePenaltyReduction,
  magicPropertyDefBonus,
  magicPropertyTestBonuses,
  magicWeaponCriticalRanges,
  magicWeaponFlatDamage,
  magicWeaponSituationalDamage,
  weaponMagicBonus,
} from './magicItemEffects';
import type { EquipmentLine, MagicProperty } from './types';

/** Ligne d'équipement minimale (le module ne lit que l'enchantement). */
function line(enchant: { magicBonus?: number; magicProperties?: MagicProperty[] }): EquipmentLine {
  return { itemId: 'epee-longue', quantity: 1, ...enchant } as EquipmentLine;
}

describe('weaponMagicBonus / magicWeaponFlatDamage — +N d’arme (p. 251)', () => {
  it('lit le magicBonus (0 si absent), jamais doublé', () => {
    expect(weaponMagicBonus(line({ magicBonus: 2 }))).toBe(2);
    expect(weaponMagicBonus(line({}))).toBe(0);
    expect(weaponMagicBonus(null)).toBe(0);
  });

  it('rend le +N en bonus PLAT permanent aux DM, null si aucun', () => {
    expect(magicWeaponFlatDamage(line({ magicBonus: 3 }), 'Épée longue +3')).toEqual({
      featureId: MAGIC_ITEM_FEATURE_ID,
      name: 'Épée longue +3',
      sourcePage: 251,
      value: 3,
    });
    expect(magicWeaponFlatDamage(line({}), 'Épée longue')).toBeNull();
  });
});

describe('magicWeaponSituationalDamage — Fléau / Élément / Affûtée (p. 251)', () => {
  it('Fléau des démons → +1d4° contre les démons', () => {
    const [rider] = magicWeaponSituationalDamage(
      line({ magicProperties: [{ kind: 'bane', creatureCategory: 'démons' }] }),
      'Fléau des démons',
      1,
    );
    expect(rider.dice).toEqual({ count: 1, die: 'd4', evolving: true });
    expect(rider.conditionLabel).toBe('contre les démons');
    expect(rider.featureId).toBe(MAGIC_ITEM_FEATURE_ID);
  });

  it('Élément (feu) → +1d4° de feu ; le dé évolue avec le niveau (p. 43)', () => {
    const at1 = magicWeaponSituationalDamage(
      line({ magicProperties: [{ kind: 'elemental', substance: 'fire' }] }),
      'Épée de feu',
      1,
    )[0];
    expect(at1.dice).toEqual({ count: 1, die: 'd4', evolving: true });
    expect(at1.conditionLabel).toBe('feu');
    const at9 = magicWeaponSituationalDamage(
      line({ magicProperties: [{ kind: 'elemental', substance: 'fire' }] }),
      'Épée de feu',
      9,
    )[0];
    expect(at9.dice?.die).toBe('d8'); // 9-11 → d8 (table p. 43)
  });

  it('Affûtée → rider « aux attaques critiques » ; doublée → 2d4°', () => {
    const [rider] = magicWeaponSituationalDamage(
      line({ magicProperties: [{ kind: 'sharp', doubled: true }] }),
      'Vivelame affûtée',
      1,
    );
    expect(rider.conditionLabel).toBe('aux attaques critiques');
    expect(rider.dice).toEqual({ count: 2, die: 'd4', evolving: true });
  });

  it('dé personnalisé fixe (RÈGLE MAISON) — « arc +2d6 de feu » : ne change pas avec le niveau', () => {
    const at1 = magicWeaponSituationalDamage(
      line({ magicProperties: [{ kind: 'elemental', substance: 'fire', customDice: { count: 2, die: 'd6' } }] }),
      'Arc de feu',
      1,
    )[0];
    expect(at1.dice).toEqual({ count: 2, die: 'd6' });
    const at9 = magicWeaponSituationalDamage(
      line({ magicProperties: [{ kind: 'elemental', substance: 'fire', customDice: { count: 2, die: 'd6' } }] }),
      'Arc de feu',
      9,
    )[0];
    expect(at9.dice).toEqual({ count: 2, die: 'd6' });
  });

  it('dé personnalisé ÉVOLUTIF — « +3d4° de froid » : le nombre est fixe, la face évolue (table p. 43)', () => {
    const rider = magicWeaponSituationalDamage(
      line({
        magicProperties: [
          { kind: 'bane', creatureCategory: 'morts-vivants', customDice: { count: 3, die: 'd4', evolving: true } },
        ],
      }),
      'Masse',
      9,
    )[0];
    expect(rider.dice).toEqual({ count: 3, die: 'd8', evolving: true }); // 9-11 → d8 (table p. 43)
  });

  it('dé personnalisé + doublée : le NOMBRE de dés double, jamais la face', () => {
    const rider = magicWeaponSituationalDamage(
      line({
        magicProperties: [
          { kind: 'elemental', substance: 'cold', customDice: { count: 2, die: 'd6' }, doubled: true },
        ],
      }),
      'Épée de froid',
      1,
    )[0];
    expect(rider.dice).toEqual({ count: 4, die: 'd6' });
  });

  it('ignore les propriétés défensives et l’absence d’enchantement', () => {
    expect(magicWeaponSituationalDamage(line({ magicProperties: [{ kind: 'mobile' }] }), 'x', 1)).toEqual(
      [],
    );
    expect(magicWeaponSituationalDamage(null, 'x', 1)).toEqual([]);
  });
});

describe('magicWeaponCriticalRanges — Affûtée (p. 251)', () => {
  it('élargit de 1 (doublée : 2), sur la portée de l’arme', () => {
    expect(magicWeaponCriticalRanges(line({ magicProperties: [{ kind: 'sharp' }] }), 'melee')).toEqual([
      { name: 'Affûtée', scope: 'melee', value: 1 },
    ]);
    expect(
      magicWeaponCriticalRanges(line({ magicProperties: [{ kind: 'sharp', doubled: true }] }), 'ranged'),
    ).toEqual([{ name: 'Affûtée (doublée)', scope: 'ranged', value: 2 }]);
  });

  it('rien sans Affûtée', () => {
    expect(magicWeaponCriticalRanges(line({ magicProperties: [{ kind: 'bane' }] }), 'melee')).toEqual([]);
  });
});

describe('magicPropertyDefBonus — Parade / Résistance à la magie (p. 251/253)', () => {
  it('Parade apporte son bonus de DEF (doublé si doublée)', () => {
    expect(magicPropertyDefBonus(line({ magicProperties: [{ kind: 'parry', defBonus: 2 }] }))).toBe(2);
    expect(
      magicPropertyDefBonus(line({ magicProperties: [{ kind: 'parry', defBonus: 2, doubled: true }] })),
    ).toBe(4);
  });

  it('Résistance à la magie apporte +5 en DEF (lecture littérale p. 253)', () => {
    expect(magicPropertyDefBonus(line({ magicProperties: [{ kind: 'magic-resistance' }] }))).toBe(5);
  });

  it('cumule les propriétés et ignore les autres', () => {
    expect(
      magicPropertyDefBonus(
        line({ magicProperties: [{ kind: 'parry', defBonus: 1 }, { kind: 'magic-resistance' }, { kind: 'sharp' }] }),
      ),
    ).toBe(6);
  });
});

describe('magicDamageReductions — Défense / Résistance / Protection (p. 253)', () => {
  it('Défense = RD 2 (tous DM), Défense supérieure = RD 4, doublage sur la valeur plate', () => {
    expect(magicDamageReductions(line({ magicProperties: [{ kind: 'defense' }] }))).toEqual([
      { kind: 'flat', value: 2 },
    ]);
    expect(magicDamageReductions(line({ magicProperties: [{ kind: 'defense', tier: 2 }] }))).toEqual([
      { kind: 'flat', value: 4 },
    ]);
    expect(
      magicDamageReductions(line({ magicProperties: [{ kind: 'defense', doubled: true }] })),
    ).toEqual([{ kind: 'flat', value: 4 }]);
  });

  it('Résistance [substance] X → RD plate typée ; ignorée si substance/valeur manquante', () => {
    expect(
      magicDamageReductions(line({ magicProperties: [{ kind: 'resistance', substance: 'fire', amount: 10 }] })),
    ).toEqual([{ kind: 'flat', value: 10, scopes: ['fire'] }]);
    expect(magicDamageReductions(line({ magicProperties: [{ kind: 'resistance', substance: 'fire' }] }))).toEqual(
      [],
    );
  });

  it('Protection → division par 2 restreinte aux critiques/sournoises', () => {
    expect(magicDamageReductions(line({ magicProperties: [{ kind: 'protection' }] }))).toEqual([
      { kind: 'divide', value: 2, againstAggressors: PROTECTION_CONDITION },
    ]);
  });
});

describe('magicImmunities — Action libre (p. 253)', () => {
  it('accorde ralenti/immobilisé/paralysé', () => {
    expect(magicImmunities(line({ magicProperties: [{ kind: 'free-action' }] }))).toEqual([
      'slowed',
      'immobilized',
      'paralyzed',
    ]);
  });

  it('rien sans Action libre', () => {
    expect(magicImmunities(line({ magicProperties: [{ kind: 'defense' }] }))).toEqual([]);
  });
});

describe('magicPropertyTestBonuses — Ombre / Natation (p. 253)', () => {
  it('Ombre → +5 en Discrétion, Natation → +5 en Natation ; doublage → +10', () => {
    expect(magicPropertyTestBonuses(line({ magicProperties: [{ kind: 'shadow' }] }))).toEqual([
      { domain: 'stealth', value: 5 },
    ]);
    expect(
      magicPropertyTestBonuses(line({ magicProperties: [{ kind: 'swimming', doubled: true }] })),
    ).toEqual([{ domain: 'swimming', value: 10 }]);
  });

  it('ignore les propriétés sans domaine de test', () => {
    expect(magicPropertyTestBonuses(line({ magicProperties: [{ kind: 'magic-resistance' }] }))).toEqual([]);
  });
});

describe('magicMobilePenaltyReduction — Mobile (p. 253)', () => {
  it('réduit le malus d’armure de 4 (doublée : 8)', () => {
    expect(magicMobilePenaltyReduction(line({ magicProperties: [{ kind: 'mobile' }] }))).toBe(4);
    expect(magicMobilePenaltyReduction(line({ magicProperties: [{ kind: 'mobile', doubled: true }] }))).toBe(8);
    expect(magicMobilePenaltyReduction(line({}))).toBe(0);
  });
});
