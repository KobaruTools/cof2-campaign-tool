import { describe, expect, it } from 'vitest';
import type { Abilities } from '@/lib/engine';
import { buildDefenseBreakdown } from './statBreakdown';

/** Caractéristiques de test (valeurs neutres : la DEF de base des créatures ne dépend que du rang). */
const ABILITIES: Abilities = { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 };

describe('buildDefenseBreakdown (PER-256)', () => {
  it('décompose une DEF de base « [10 + rang] » en Base + Rang', () => {
    const bd = buildDefenseBreakdown('[10 + rang]', [], ABILITIES, 5, 3);
    expect(bd).not.toBeNull();
    expect(bd!.total).toBe(13);
    expect(bd!.contributions).toEqual([
      { label: 'Base', value: 10 },
      { label: 'Rang', value: 3 },
    ]);
  });

  it('ajoute un bonus propagé du maître (golem « Runes de défense »), avec sa capacité source', () => {
    const bd = buildDefenseBreakdown(
      '[10 + rang]',
      [{ featureId: 'runes-r1', name: 'Runes de défense', value: 4 }],
      ABILITIES,
      10,
      5,
    );
    expect(bd).not.toBeNull();
    // 10 (base) + 5 (rang) + 4 (runes) = 19.
    expect(bd!.total).toBe(19);
    expect(bd!.contributions).toEqual([
      { label: 'Base', value: 10 },
      { label: 'Rang', value: 5 },
      { label: 'Runes de défense', value: 4, featureId: 'runes-r1' },
    ]);
  });

  it('gère une DEF de base littérale « [18] » (Mâle alpha) + bonus', () => {
    const bd = buildDefenseBreakdown(
      '[18]',
      [{ featureId: 'compagnon-animal-r5', name: 'Tactiques de meute', value: 1 }],
      ABILITIES,
      5,
      5,
    );
    expect(bd!.total).toBe(19);
    expect(bd!.contributions).toEqual([
      { label: 'Base', value: 18 },
      { label: 'Tactiques de meute', value: 1, featureId: 'compagnon-animal-r5' },
    ]);
  });

  it('cumule plusieurs bonus propagés', () => {
    const bd = buildDefenseBreakdown(
      '[10 + rang]',
      [
        { featureId: 'runes-r1', name: 'Runes de défense', value: 2 },
        { featureId: 'golem-r5', name: 'Golem supérieur', value: 5 },
      ],
      ABILITIES,
      5,
      2,
    );
    // 10 + 2 (rang) + 2 (runes) + 5 (armure) = 19.
    expect(bd!.total).toBe(19);
    expect(bd!.contributions).toHaveLength(4);
  });

  it('renvoie null quand il n’y a pas de DEF de base', () => {
    expect(buildDefenseBreakdown(undefined, [], ABILITIES, 5, 5)).toBeNull();
  });

  it('renvoie null quand la DEF contient un dé (pas de total unique à ventiler)', () => {
    expect(buildDefenseBreakdown('[2d6]', [], ABILITIES, 5, 5)).toBeNull();
  });
});
