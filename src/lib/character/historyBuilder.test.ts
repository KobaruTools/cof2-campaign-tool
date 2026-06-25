import { describe, expect, it } from 'vitest';
import { rulesContext as ctx } from './rulesContext';
import {
  canAcquireFeature,
  checkCompliance,
  featurePointBudget,
} from '@/lib/engine';
import { packLevelUpHistory } from './historyBuilder';
import { createBlankCharacter } from './factory';
import type { Character } from './types';

/** Personnage de niveau 1 prêtre/haut-elfe avec ses capacités gratuites de création. */
function pretreLevel1(): Character {
  const free = ['priere-r1', 'spiritualite-r1', 'elfe-haut-r1'];
  return {
    ...createBlankCharacter({ name: 'test', now: '2026-01-01T00:00:00.000Z' }),
    ancestryId: 'elfe-haut',
    classId: 'pretre',
    ancestryPathId: 'elfe-haut',
    level: 1,
    featureIds: [...free],
    levelUpHistory: [{ level: 1, chosenFeatureIds: [...free] }],
  };
}

describe('packLevelUpHistory', () => {
  it('reconstruit un historique complet, légal et conforme jusqu’au niveau visé', () => {
    const base = pretreLevel1();
    // Hybride prêtre/magicien niveau 16 : prêtre (prière + spiritualité), peuple
    // (haut-elfe) et magicien (magie protectrice), toutes les voies au rang 5.
    const target = [
      'elfe-haut-r1', 'elfe-haut-r2', 'elfe-haut-r3', 'elfe-haut-r4', 'elfe-haut-r5',
      'priere-r1', 'priere-r2', 'priere-r3', 'priere-r4', 'priere-r5',
      'spiritualite-r1', 'spiritualite-r2', 'spiritualite-r3', 'spiritualite-r4', 'spiritualite-r5',
      'magie-protectrice-r1', 'magie-protectrice-r2', 'magie-protectrice-r3', 'magie-protectrice-r4', 'magie-protectrice-r5',
    ];

    const { character, unspentByLevel } = packLevelUpHistory(base, target, 16, ctx);

    expect(character.level).toBe(16);
    // Ensemble final identique à la cible (ordre indifférent).
    expect(new Set(character.featureIds)).toEqual(new Set(target));
    // Une entrée d'historique par niveau (création + 15 montées).
    expect(character.levelUpHistory.map((e) => e.level)).toEqual(
      Array.from({ length: 16 }, (_, i) => i + 1),
    );
    // Chaque capacité achetée était légale à l'instant où l'historique la place
    // (rang dans l'ordre, niveau minimal respecté). On rejoue l'historique.
    const replay = pretreLevel1();
    let level = 1;
    let owned = [...replay.featureIds];
    for (const entry of character.levelUpHistory.filter((e) => e.level > 1)) {
      level = entry.level;
      for (const id of entry.chosenFeatureIds) {
        const probe: Character = { ...replay, level, featureIds: owned };
        expect(canAcquireFeature(probe, id, ctx).legal, `niv ${level} : ${id}`).toBe(true);
        owned = [...owned, id];
      }
    }
    // Conformité : aucune sur-dépense ni voie à trous.
    const warnings = checkCompliance(character, ctx);
    expect(warnings.filter((w) => w.code === 'FEATURE_POINTS_OVERSPENT')).toHaveLength(0);
    expect(warnings.filter((w) => w.code === 'MISSING_RANK')).toHaveLength(0);
    // 29 points nécessaires pour 30 disponibles → exactement 1 point orphelin.
    const budget = featurePointBudget(character, ctx);
    expect(budget.available - budget.spent).toBe(1);
    expect(Object.values(unspentByLevel).reduce((s, v) => s + v, 0)).toBe(1);
  });

  it('lève une erreur si l’ensemble visé est inatteignable au niveau demandé', () => {
    const base = pretreLevel1();
    // Rang 5 exige le niveau 7 : impossible d'atteindre priere-r5 au niveau 3.
    expect(() => packLevelUpHistory(base, ['priere-r1', 'priere-r2', 'priere-r3', 'priere-r4', 'priere-r5'], 3, ctx)).toThrow();
  });
});
