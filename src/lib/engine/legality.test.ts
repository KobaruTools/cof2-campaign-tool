import { describe, expect, it } from 'vitest';
import { featureById, classById, pathById } from '@/data';
import { families } from '@/data/families';
import { progression } from '@/data/progression';
import type { FamilyId } from '@/data/schema';
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import {
  featureCost,
  minLevelForRank,
  canAcquireFeature,
  checkCompliance,
  type RulesContext,
} from './legality';

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
    featureIds: [],
    levelUpHistory: [],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('featureCost', () => {
  const feature = (id: string) => featureById.get(id)!;
  it('rang 1 et 2 coûtent 1, rang 3+ coûtent 2', () => {
    expect(featureCost(feature('brute-r1'), progression)).toBe(1);
    expect(featureCost(feature('brute-r2'), progression)).toBe(1);
    expect(featureCost(feature('brute-r3'), progression)).toBe(2);
    expect(featureCost(feature('brute-r5'), progression)).toBe(2);
  });
});

describe('minLevelForRank', () => {
  const mages = families.find((f) => f.id === 'mages')!;
  const combattants = families.find((f) => f.id === 'fighters')!;
  it('suit la table (rang 3 → 3, rang 4 → 5)', () => {
    expect(minLevelForRank(3, combattants, progression)).toBe(3);
    expect(minLevelForRank(4, combattants, progression)).toBe(5);
  });
  it('exception mage : rang 2 dès le niveau 1', () => {
    expect(minLevelForRank(2, mages, progression)).toBe(1);
    expect(minLevelForRank(2, combattants, progression)).toBe(2);
  });
});

describe('canAcquireFeature', () => {
  it('légal : ouvrir une voie de profil au rang 1', () => {
    const c = makeCharacter({ classId: 'guerrier', featureIds: [] });
    expect(canAcquireFeature(c, 'combat-r1', ctx).legal).toBe(true);
  });

  it('illégal : capacité déjà acquise', () => {
    const c = makeCharacter({ featureIds: ['brute-r1'] });
    const r = canAcquireFeature(c, 'brute-r1', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/déjà acquise/);
  });

  it('illégal : rang dans le désordre (rang 3 sans 1 et 2)', () => {
    const c = makeCharacter({ level: 3, featureIds: [] });
    const r = canAcquireFeature(c, 'brute-r3', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/Rang 1.*non acquis|Rang 2.*non acquis/);
  });

  it('illégal : niveau insuffisant pour le rang', () => {
    const c = makeCharacter({ level: 1, featureIds: ['brute-r1', 'brute-r2'] });
    const r = canAcquireFeature(c, 'brute-r3', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/Niveau 3 requis/);
  });

  it('illégal : voie de prestige avant le niveau 5', () => {
    const c = makeCharacter({ level: 4 });
    const r = canAcquireFeature(c, 'prestige-expert-r4', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/niveau 5/);
  });

  it('illégal : voie de profil d’un autre profil', () => {
    // « combat » est une voie du guerrier, pas du barbare.
    const c = makeCharacter({ classId: 'barbare', featureIds: [] });
    const r = canAcquireFeature(c, 'combat-r1', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/n'est pas une voie de votre profil/);
  });

  it('illégal : voie de peuple d’un autre peuple', () => {
    // Voie de peuple retenue = humain ; on ne peut pas progresser dans « nain ».
    const c = makeCharacter({ ancestryPathId: 'humain', featureIds: [] });
    const r = canAcquireFeature(c, 'nain-r1', ctx);
    expect(r.legal).toBe(false);
    expect(r.reasons.join(' ')).toMatch(/n'est pas votre voie de peuple/);
  });

  it('légal : sa propre voie de peuple', () => {
    const c = makeCharacter({ ancestryPathId: 'humain', featureIds: [] });
    expect(canAcquireFeature(c, 'humain-r1', ctx).legal).toBe(true);
  });

  it('légal : ouvrir une autre voie de son propre profil', () => {
    // Barbare : « brute » fait partie de ses 5 voies, ouvrable au rang 1.
    const c = makeCharacter({ classId: 'barbare', featureIds: [] });
    expect(canAcquireFeature(c, 'brute-r1', ctx).legal).toBe(true);
  });
});

describe('checkCompliance', () => {
  it('Lhagva niveau 1 (capacités réelles) : aucun avertissement', () => {
    const c = makeCharacter({
      classId: 'barbare',
      ancestryId: 'humain',
      ancestryPathId: 'humain',
      level: 1,
      abilities: { AGI: 1, CON: 2, FOR: 3, PER: 1, CHA: -1, INT: 0, VOL: 1 },
      featureIds: ['pourfendeur-r1', 'rage-r1', 'humain-r1'],
    });
    expect(checkCompliance(c, ctx)).toEqual([]);
  });

  it('signale un trou de rang dans une voie', () => {
    const c = makeCharacter({ level: 5, featureIds: ['brute-r1', 'brute-r3'] });
    const codes = checkCompliance(c, ctx).map((a) => a.code);
    expect(codes).toContain('MISSING_RANK');
  });

  it('signale une caractéristique hors plage', () => {
    const c = makeCharacter({
      abilities: { AGI: 0, CON: 7, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
      featureIds: [],
    });
    const codes = checkCompliance(c, ctx).map((a) => a.code);
    expect(codes).toContain('ABILITY_OUT_OF_RANGE');
  });

  it('signale une capacité de rang au-dessus du niveau', () => {
    // brute rang 3 (niveau requis 3) sur un personnage de niveau 1
    const c = makeCharacter({ level: 1, featureIds: ['brute-r1', 'brute-r2', 'brute-r3'] });
    const codes = checkCompliance(c, ctx).map((a) => a.code);
    expect(codes).toContain('RANK_LEVEL_TOO_LOW');
  });
});
