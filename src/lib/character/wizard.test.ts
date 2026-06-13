import { describe, expect, it } from 'vitest';
import type { AbilityId, Ancestry } from '@/data/schema';
import {
  applyModifiers,
  choicesComplete,
  initialChoices,
  modifierDeltas,
  twoLowest,
} from './ancestry';
import {
  level1FeatureIds,
  finalAbilities,
  createDraft,
  materializeDraft,
  effectiveAncestryPath,
  type WizardDraft,
} from './wizard';

const zero = (): Record<AbilityId, number> => ({
  AGI: 0,
  CON: 0,
  FOR: 0,
  PER: 0,
  CHA: 0,
  INT: 0,
  VOL: 0,
});

// Fixture : peuple à deux modificateurs « ou » (façon demi-elfe).
const halfElf: Ancestry = {
  id: 'demi-elfe',
  name: 'Demi-elfe',
  description: '',
  physical: { startingAge: '', lifeExpectancy: '', height: '', weight: '', traits: '' },
  names: { note: '', male: [], female: [], sourcePage: 45 },
  abilityModifiers: [
    { value: 1, abilities: ['PER', 'CHA'] },
    { value: -1, abilities: ['FOR', 'CON'] },
  ],
  ancestryPathIds: ['humain', 'elfe-sylvain', 'elfe-haut'],
  sourcePage: 45,
};

// Fixture : peuple à modificateur fixe + un choix (façon nain).
const dwarf: Ancestry = {
  id: 'nain',
  name: 'Nain',
  description: '',
  physical: { startingAge: '', lifeExpectancy: '', height: '', weight: '', traits: '' },
  names: { note: '', male: [], female: [], sourcePage: 58 },
  abilityModifiers: [
    { value: 1, abilities: ['CON', 'VOL'] },
    { value: -1, abilities: ['AGI'] },
  ],
  ancestryPathIds: ['nain'],
  sourcePage: 58,
};

describe('choix de modificateurs de peuple', () => {
  it('initialise les caracs fixes et laisse les choix à null', () => {
    expect(initialChoices(halfElf)).toEqual([null, null]);
    expect(initialChoices(dwarf)).toEqual([null, 'AGI']);
  });

  it('détecte les choix incomplets', () => {
    expect(choicesComplete(halfElf, [null, null])).toBe(false);
    expect(choicesComplete(halfElf, ['PER', 'CON'])).toBe(true);
    expect(choicesComplete(dwarf, [null, 'AGI'])).toBe(false);
    expect(choicesComplete(dwarf, ['CON', 'AGI'])).toBe(true);
  });
});

describe('application des modificateurs', () => {
  it('calcule les deltas résolus', () => {
    expect(modifierDeltas(halfElf, ['PER', 'CON'])).toMatchObject({ PER: 1, CON: -1 });
    expect(modifierDeltas(dwarf, ['VOL', 'AGI'])).toMatchObject({ VOL: 1, AGI: -1 });
  });

  it('applique les deltas aux valeurs de base', () => {
    const base = { ...zero(), PER: 2, FOR: 3 };
    const out = applyModifiers(base, halfElf, ['PER', 'FOR']);
    expect(out.PER).toBe(3);
    expect(out.FOR).toBe(2);
  });

  it('ignore les choix non résolus (delta 0)', () => {
    expect(modifierDeltas(halfElf, [null, null])).toEqual(zero());
  });

  it('trouve les deux caractéristiques les plus faibles', () => {
    const base = { AGI: 2, CON: 1, FOR: -1, PER: 3, CHA: 0, INT: -2, VOL: 1 };
    expect(twoLowest(base)).toEqual(['INT', 'FOR']);
  });
});

describe('capacités de niveau 1', () => {
  const base = (over: Partial<WizardDraft> = {}): WizardDraft => ({
    ...createDraft('id-1', '2026-01-01T00:00:00.000Z'),
    chosenPaths: ['rage', 'pourfendeur'],
    ancestryPathId: 'humain',
    ...over,
  });

  it('non-mage : rang 1 des 2 voies + rang 1 de la voie de peuple', () => {
    expect(level1FeatureIds(base()).sort()).toEqual(
      ['humain-r1', 'pourfendeur-r1', 'rage-r1'].sort(),
    );
  });

  it('mage avec bonus rang 2 dans une voie de profil', () => {
    const ids = level1FeatureIds(
      base({
        chosenPaths: ['air', 'invocation'],
        ancestryPathId: 'elfe-haut',
        magePathSlot: true,
        mageBonus: { type: 'class-rank2', pathId: 'invocation' },
      }),
    );
    expect(ids).toEqual(
      expect.arrayContaining(['air-r1', 'invocation-r1', 'elfe-haut-r1', 'mage-r1', 'invocation-r2']),
    );
  });

  it('mage avec bonus rang 2 de la voie du mage', () => {
    const ids = level1FeatureIds(base({ mageBonus: { type: 'mage-rank2' } }));
    expect(ids).toEqual(expect.arrayContaining(['mage-r1', 'mage-r2']));
  });

  it("voie du mage occupe l'emplacement de peuple", () => {
    expect(effectiveAncestryPath(base({ magePathSlot: true }))).toBe('mage');
    expect(effectiveAncestryPath(base())).toBe('humain');
  });
});

describe('materializeDraft', () => {
  it('produit un personnage de niveau 1 cohérent', () => {
    const draft = {
      ...createDraft('perso-9', '2026-01-01T00:00:00.000Z'),
      ancestryId: 'demi-elfe',
      ancestryPathId: 'humain',
      classId: 'barbare',
      baseAbilities: { ...zero(), FOR: 3, CON: 2 },
      ancestryChoices: ['PER', 'CON'] as (AbilityId | null)[],
      chosenPaths: ['rage', 'pourfendeur'],
      name: '  Maalik  ',
    };
    const c = materializeDraft(draft, halfElf, '2026-02-02T00:00:00.000Z');
    expect(c.id).toBe('perso-9');
    expect(c.name).toBe('Maalik'); // trim
    expect(c.level).toBe(1);
    expect(c.abilities.PER).toBe(1); // 0 +1
    expect(c.abilities.CON).toBe(1); // 2 -1
    expect(c.abilities.FOR).toBe(3);
    expect(c.featureIds.sort()).toEqual(['humain-r1', 'pourfendeur-r1', 'rage-r1'].sort());
    expect(c.levelUpHistory).toHaveLength(1);
    expect(c.createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(c.updatedAt).toBe('2026-02-02T00:00:00.000Z');
  });

  it('nom vide → libellé par défaut', () => {
    const c = materializeDraft(
      { ...createDraft('x', '2026-01-01T00:00:00.000Z'), ancestryId: 'demi-elfe' },
      halfElf,
      '2026-01-01T00:00:00.000Z',
    );
    expect(c.name).toBe('Nouveau personnage');
  });
});
