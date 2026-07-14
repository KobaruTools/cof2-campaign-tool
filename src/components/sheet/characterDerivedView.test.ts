import { describe, expect, it } from 'vitest';
import { deriveStats } from '@/lib/engine';
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import { buildCharacterDerivedView } from './characterDerivedView';

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'guerrier',
    level: 1,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: null,
    playerId: null,
    status: 'active',
    abilities: { AGI: 1, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
    baseAbilities: { AGI: 1, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
    ancestryChoices: [],
    ancestryPathId: 'humain',
    featureIds: [],
    featureChoices: {},
    effectToggles: {},
    effectInputs: {},
    usageCounters: {},
    depletion: {},
    purse: { platinum: 0, gold: 0, silver: 0, copper: 0 },
    levelUpHistory: [],
    equipment: [],
    overrides: {},
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  };
}

describe('buildCharacterDerivedView', () => {
  it('profil valide : entrée moteur exploitable + tableaux de badges présents', () => {
    const view = buildCharacterDerivedView(makeCharacter());
    expect(view.derivedInput).not.toBeNull();
    // L'entrée alimente réellement le moteur (PV finis, défense numérique).
    const stats = deriveStats(view.derivedInput!);
    expect(stats.maxHp).toBeGreaterThan(0);
    expect(Number.isFinite(stats.defense)).toBe(true);
    // Sous-produits toujours fournis (même vides), utilisés par la fiche.
    expect(Array.isArray(view.modFeatureIds)).toBe(true);
    expect(Array.isArray(view.defenseBadges)).toBe(true);
    expect(Array.isArray(view.meleeCriticalRanges)).toBe(true);
    expect(Array.isArray(view.rangedCriticalRanges)).toBe(true);
  });

  it('caractéristiques effectives : la défense suit l’AGI saisie', () => {
    const low = deriveStats(buildCharacterDerivedView(makeCharacter({
      abilities: { AGI: 0, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
      baseAbilities: { AGI: 0, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
    })).derivedInput!);
    const high = deriveStats(buildCharacterDerivedView(makeCharacter({
      abilities: { AGI: 4, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
      baseAbilities: { AGI: 4, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 0, VOL: 1 },
    })).derivedInput!);
    expect(high.defense).toBeGreaterThan(low.defense);
  });

  it('profil incomplet (famille introuvable) : derivedInput null, badges quand même présents', () => {
    const view = buildCharacterDerivedView(makeCharacter({ classId: 'inexistant' }));
    expect(view.derivedInput).toBeNull();
    expect(Array.isArray(view.defenseBadges)).toBe(true);
    expect(Array.isArray(view.modFeatureIds)).toBe(true);
  });
});
