import { describe, expect, it } from 'vitest';
import { featureById, classById, pathById } from '@/data';
import { families } from '@/data/families';
import { progression } from '@/data/progression';
import type { FamilyId } from '@/data/schema';
import type { RulesContext } from '@/lib/engine';
import { SCHEMA_VERSION, type Character } from './types';
import {
  acquirableFeatures,
  applyLevelUp,
  canUndoLastLevelUp,
  deselectFeature,
  FEATURE_POINTS_PER_LEVEL,
  manualFeatureIds,
  totalFeatureCost,
  undoLastLevelUp,
} from './levelUp';

const ctx: RulesContext = {
  featureById,
  pathById,
  classById,
  familyById: new Map(families.map((f) => [f.id as FamilyId, f])),
  progression,
};

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'barbare',
    level: 1,
    portraitVariant: 'default',
    abilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    baseAbilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    ancestryChoices: [],
    ancestryPathId: 'humain',
    featureIds: ['rage-r1'],
    featureChoices: {},
    levelUpHistory: [{ level: 1, chosenFeatureIds: ['rage-r1'] }],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('acquirableFeatures', () => {
  it('ne propose que des capacités légales (rang suivant d’une voie entamée)', () => {
    // Niveau 2 : rage-r1 acquis → rage-r2 (rang 2, niveau requis 2) doit être proposé.
    const c = makeCharacter({ level: 2 });
    const ids = acquirableFeatures(c, ctx).map((f) => f.id);
    expect(ids).toContain('rage-r2');
    // Aucune capacité déjà acquise.
    expect(ids).not.toContain('rage-r1');
    // Aucun rang « à trous » : rage-r3 (niveau requis 3) absent au niveau 2.
    expect(ids).not.toContain('rage-r3');
  });

  it('exclut les voies de prestige avant le niveau 5', () => {
    const c = makeCharacter({ level: 4 });
    const ids = acquirableFeatures(c, ctx).map((f) => f.id);
    expect(ids).not.toContain('prestige-expert-r4');
  });
});

describe('totalFeatureCost', () => {
  it('rang 1-2 coûtent 1 point, rang 3+ coûtent 2 points', () => {
    expect(totalFeatureCost(['brute-r1'], ctx)).toBe(1);
    expect(totalFeatureCost(['brute-r1', 'brute-r2'], ctx)).toBe(2);
    expect(totalFeatureCost(['brute-r3'], ctx)).toBe(2);
    // Deux capacités de rang 3 = 4 points : au-delà du budget d'un niveau (2).
    expect(totalFeatureCost(['brute-r3', 'rage-r3'], ctx)).toBeGreaterThan(
      FEATURE_POINTS_PER_LEVEL,
    );
  });

  it('budget par niveau = 2 points', () => {
    expect(FEATURE_POINTS_PER_LEVEL).toBe(2);
  });
});

describe('manualFeatureIds', () => {
  it('repère les capacités absentes de l’historique (ajout manuel sur la fiche)', () => {
    const c = makeCharacter({
      featureIds: ['rage-r1', 'brute-r1'], // brute-r1 ajouté hors wizard
      levelUpHistory: [{ level: 1, chosenFeatureIds: ['rage-r1'] }],
    });
    const manual = manualFeatureIds(c);
    expect(manual.has('brute-r1')).toBe(true);
    expect(manual.has('rage-r1')).toBe(false);
  });

  it('rien de manuel quand tout vient de l’historique', () => {
    const c = makeCharacter({
      featureIds: ['rage-r1', 'brute-r1'],
      levelUpHistory: [
        { level: 1, chosenFeatureIds: ['rage-r1'] },
        { level: 2, chosenFeatureIds: ['brute-r1'] },
      ],
    });
    expect(manualFeatureIds(c).size).toBe(0);
  });

  it('ensemble vide si aucun historique (rien à distinguer)', () => {
    const c = makeCharacter({ featureIds: ['rage-r1', 'brute-r1'], levelUpHistory: [] });
    expect(manualFeatureIds(c).size).toBe(0);
  });
});

describe('deselectFeature', () => {
  it('retire la capacité visée et les rangs supérieurs de la même voie', () => {
    const picked = ['rage-r2', 'rage-r3', 'brute-r2'];
    expect(deselectFeature(picked, 'rage-r2')).toEqual(['brute-r2']);
  });

  it('ne touche pas aux autres voies', () => {
    const picked = ['rage-r2', 'brute-r2'];
    expect(deselectFeature(picked, 'brute-r2')).toEqual(['rage-r2']);
  });
});

describe('applyLevelUp', () => {
  it('incrémente le niveau, ajoute les capacités et journalise', () => {
    const c = makeCharacter({ level: 1 });
    const next = applyLevelUp(c, ['rage-r2']);
    expect(next.level).toBe(2);
    expect(next.featureIds).toContain('rage-r2');
    expect(next.levelUpHistory).toHaveLength(2);
    expect(next.levelUpHistory[1]).toEqual({ level: 2, chosenFeatureIds: ['rage-r2'] });
  });

  it('n’ajoute pas de doublon dans featureIds', () => {
    const c = makeCharacter({ level: 1, featureIds: ['rage-r1'] });
    const next = applyLevelUp(c, ['rage-r1', 'brute-r1']);
    expect(next.featureIds.filter((id) => id === 'rage-r1')).toHaveLength(1);
    expect(next.featureIds).toContain('brute-r1');
  });
});

describe('undoLastLevelUp', () => {
  it('annule le dernier niveau : retire ses capacités et redescend d’un niveau', () => {
    const leveled = applyLevelUp(makeCharacter({ level: 1 }), ['rage-r2', 'brute-r1']);
    const undone = undoLastLevelUp(leveled);
    expect(undone.level).toBe(1);
    expect(undone.featureIds).not.toContain('rage-r2');
    expect(undone.featureIds).not.toContain('brute-r1');
    expect(undone.featureIds).toContain('rage-r1'); // capacité de création conservée
    expect(undone.levelUpHistory).toHaveLength(1);
  });

  it('ne défait jamais la création (niveau 1)', () => {
    const c = makeCharacter({ level: 1 });
    expect(canUndoLastLevelUp(c)).toBe(false);
    expect(undoLastLevelUp(c)).toBe(c);
  });

  it('round-trip : monter puis annuler restitue l’état initial', () => {
    const c = makeCharacter({ level: 1 });
    const round = undoLastLevelUp(applyLevelUp(c, ['rage-r2']));
    expect(round.level).toBe(c.level);
    expect(round.featureIds).toEqual(c.featureIds);
    expect(round.levelUpHistory).toEqual(c.levelUpHistory);
  });
});
