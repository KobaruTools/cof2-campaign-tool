import { describe, expect, it } from 'vitest';
import { featureById, classById, pathById } from '@/data';
import { families } from '@/data/families';
import { progression } from '@/data/progression';
import type { FamilyId } from '@/data/schema';
import { maxHp, type RulesContext } from '@/lib/engine';
import { SCHEMA_VERSION, type Character, type LevelUpEntry } from './types';
import { familyHpGains, hpLevelGains, level1FamilyHp, level1HybridFamilies } from './hp';

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
    featureChoices: {},
    effectToggles: {},
    levelUpHistory: [],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

const history = (...entries: LevelUpEntry[]): LevelUpEntry[] => entries;

describe('familyHpGains', () => {
  it('profil mono-famille : gain = hpPerLevel à chaque niveau (combattant = 5)', () => {
    const c = makeCharacter({
      classId: 'barbare',
      level: 3,
      levelUpHistory: history(
        { level: 1, chosenFeatureIds: ['brute-r1'] },
        { level: 2, chosenFeatureIds: ['brute-r2'] },
        { level: 3, chosenFeatureIds: ['pagne-r1'] },
      ),
    });
    expect(familyHpGains(c, ctx)).toEqual([5, 5]);
  });

  it('historique absent : retombe sur la famille du profil principal', () => {
    const c = makeCharacter({ classId: 'barbare', level: 4, levelUpHistory: [] });
    expect(familyHpGains(c, ctx)).toEqual([5, 5, 5]);
  });

  it('niveau mixte (mage 3 + aventurier 4 = 3,5) : arrondi alterné inf puis sup (p. 177)', () => {
    // Exemple du livre : rang 1 puis rang 2 de mage ET d’aventurier, sur deux
    // niveaux. Les deux niveaux valent 3,5 → arrondis à 3 puis 4 (total 7).
    const c = makeCharacter({
      classId: 'magicien',
      level: 3,
      levelUpHistory: history(
        { level: 1, chosenFeatureIds: [] },
        { level: 2, chosenFeatureIds: ['air-r1', 'artilleur-r1'] },
        { level: 3, chosenFeatureIds: ['air-r2', 'artilleur-r2'] },
      ),
    });
    expect(familyHpGains(c, ctx)).toEqual([3, 4]);
  });

  it('niveau mixte sans demi-PV (combattant 5 + mage 3 = 4) : pas d’alternance', () => {
    const c = makeCharacter({
      classId: 'barbare',
      level: 2,
      levelUpHistory: history(
        { level: 1, chosenFeatureIds: [] },
        { level: 2, chosenFeatureIds: ['brute-r1', 'air-r1'] },
      ),
    });
    expect(familyHpGains(c, ctx)).toEqual([4]);
  });

  it('voie de peuple comptée comme la famille du profil principal', () => {
    // Une capacité de voie de peuple à un niveau → famille du profil principal
    // (barbare = combattant), donc 5, pas de moyenne.
    const c = makeCharacter({
      classId: 'barbare',
      ancestryPathId: 'humain',
      level: 2,
      levelUpHistory: history(
        { level: 1, chosenFeatureIds: [] },
        { level: 2, chosenFeatureIds: ['humain-r2'] },
      ),
    });
    expect(familyHpGains(c, ctx)).toEqual([5]);
  });
});

describe('maxHp avec gains hybrides', () => {
  const fighters = families.find((f) => f.id === 'fighters')!;
  const mages = families.find((f) => f.id === 'mages')!;

  it('sans gains : identique à la formule fermée (rétro-compatible)', () => {
    // 2×5 + CON(2) puis 2 niveaux à (5 + 2) = 10 + 2 + 14 = 26.
    expect(maxHp(3, fighters, 2)).toBe(maxHp(3, fighters, 2, {}, [5, 5]));
    expect(maxHp(3, fighters, 2)).toBe(26);
  });

  it('avec gains hybrides : remplace la composante famille, garde la CON par niveau', () => {
    // Mage : base 2×3 + CON(1) = 7. Deux niveaux mixtes à 3 et 4 PV famille,
    // + CON(1) chacun → 7 + (3+1) + (4+1) = 16.
    expect(maxHp(3, mages, 1, {}, [3, 4])).toBe(16);
  });

  it('PV de base hybride au niveau 1 : somme des deux familles + CON (p. 180)', () => {
    // Exemple du livre : barbare (5) + druide (4) = 9 PV + CON.
    expect(maxHp(1, fighters, 2, {}, undefined, 9)).toBe(11); // 9 + CON(2)
    // Absent → 2 × baseHp (profil standard), rétro-compatible.
    expect(maxHp(1, fighters, 2)).toBe(12); // 2×5 + 2
  });
});

describe('level1FamilyHp', () => {
  it('profil standard : 2 × PV de base de la famille principale', () => {
    // Deux voies de combattant + voie de peuple → 5 + 5 = 10.
    const c = makeCharacter({
      classId: 'barbare',
      ancestryPathId: 'humain',
      levelUpHistory: history({
        level: 1,
        chosenFeatureIds: ['rage-r1', 'pourfendeur-r1', 'humain-r1'],
      }),
    });
    expect(level1FamilyHp(c, ctx)).toBe(10);
  });

  it('hybride niveau 1 : somme des PV des deux familles (barbare 5 + druide 4 = 9, p. 180)', () => {
    const c = makeCharacter({
      classId: 'barbare',
      ancestryPathId: 'humain',
      levelUpHistory: history({
        level: 1,
        chosenFeatureIds: ['pagne-r1', 'animaux-r1', 'humain-r1'],
      }),
    });
    expect(level1FamilyHp(c, ctx)).toBe(9);
  });

  it('historique absent : retombe sur 2 × famille principale (rétro-compatible)', () => {
    const c = makeCharacter({ classId: 'barbare', levelUpHistory: [] });
    expect(level1FamilyHp(c, ctx)).toBe(10);
  });
});

describe('level1HybridFamilies', () => {
  it('hybride : familles des deux voies de profil (combattant + mystique)', () => {
    const c = makeCharacter({
      classId: 'barbare',
      levelUpHistory: history({ level: 1, chosenFeatureIds: ['pagne-r1', 'animaux-r1', 'humain-r1'] }),
    });
    expect(level1HybridFamilies(c, ctx)).toEqual(['fighters', 'mystics']);
  });

  it('profil standard (familles identiques) : aucun détail', () => {
    const c = makeCharacter({
      classId: 'barbare',
      levelUpHistory: history({ level: 1, chosenFeatureIds: ['rage-r1', 'pourfendeur-r1', 'humain-r1'] }),
    });
    expect(level1HybridFamilies(c, ctx)).toEqual([]);
  });
});

describe('hpLevelGains', () => {
  it('détaille chaque niveau : familles concernées + gain (niveau mixte → moyenne)', () => {
    const c = makeCharacter({
      classId: 'magicien',
      level: 3,
      levelUpHistory: history(
        { level: 1, chosenFeatureIds: [] },
        { level: 2, chosenFeatureIds: ['air-r1', 'artilleur-r1'] },
        { level: 3, chosenFeatureIds: ['air-r2', 'artilleur-r2'] },
      ),
    });
    const gains = hpLevelGains(c, ctx);
    expect(gains).toEqual([
      { level: 2, familyIds: ['mages', 'adventurers'], familyGain: 3 },
      { level: 3, familyIds: ['mages', 'adventurers'], familyGain: 4 },
    ]);
    // Cohérence avec la vue numérique consommée par le moteur.
    expect(gains.map((g) => g.familyGain)).toEqual(familyHpGains(c, ctx));
  });
});
