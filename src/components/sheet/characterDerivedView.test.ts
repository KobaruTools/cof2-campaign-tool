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
    companionDepletion: {},
    companionInstances: {},
    mounts: [],
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

  it('barde « en selle » (PER-216) : le malus d’Init. du cavalier est fondu dans l’Initiative', () => {
    const base = makeCharacter(); // PER 0 → Initiative de base 10.
    expect(deriveStats(buildCharacterDerivedView(base).derivedInput!).initiative).toBe(10);
    // Barde de plaque (−4) sur un cheval de guerre, à pied → aucun impact sur la fiche.
    const afoot = makeCharacter({
      mounts: [{ id: 'm', catalogId: 'cheval-de-guerre', bardeId: 'barde-de-plaque', hp: {}, mounted: false }],
    });
    expect(deriveStats(buildCharacterDerivedView(afoot).derivedInput!).initiative).toBe(10);
    // En selle → −4 appliqué à l’Initiative de la fiche.
    const mounted = makeCharacter({
      mounts: [{ id: 'm', catalogId: 'cheval-de-guerre', bardeId: 'barde-de-plaque', hp: {}, mounted: true }],
    });
    expect(deriveStats(buildCharacterDerivedView(mounted).derivedInput!).initiative).toBe(6);
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

  it('PER-141 : sans arme de contact portée, vue mains nues présente et DM d’arme null', () => {
    const view = buildCharacterDerivedView(makeCharacter());
    expect(view.meleeWeaponDamage).toBeNull();
    expect(view.unarmed.damage).toEqual({ count: 1, die: 'd3', nonLethal: true });
    expect(Array.isArray(view.unarmedCriticalRanges)).toBe(true);
  });

  it('PER-141 : DM de l’arme de contact tenue en main principale (dé + FOR)', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({
        equipment: [{ itemId: 'epee-longue', quantity: 1, worn: { slot: 'mainHand' } }],
      }),
    );
    expect(view.meleeWeaponDamage).toEqual({
      dice: '1d8',
      abilities: ['FOR'],
      flatBonuses: [],
      nonLethal: false,
      name: 'Épée longue',
    });
  });

  it('PER-115 : DM de l’arme à distance portée (dé seul, aucune carac — p. 185)', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({
        equipment: [{ itemId: 'arc-long', quantity: 1, worn: { slot: 'mainHand' } }],
      }),
    );
    expect(view.rangedWeaponDamage).toEqual({
      dice: '1d8',
      abilities: [],
      flatBonuses: [],
      nonLethal: false,
      name: 'Arc long',
    });
  });

  it('PER-115 : rôdeur Archer émérite avec un arc → +PER agrégé au DM à distance', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({
        classId: 'rodeur',
        featureIds: ['archer-r1'],
        equipment: [{ itemId: 'arc-long', quantity: 1, worn: { slot: 'mainHand' } }],
      }),
    );
    expect(view.rangedWeaponDamage?.abilities).toEqual(['PER']);
  });

  it('PER-115 : sans arme à distance portée, DM à distance null', () => {
    const view = buildCharacterDerivedView(makeCharacter());
    expect(view.rangedWeaponDamage).toBeNull();
  });

  it('PER-141 : une arme de contact simplement rangée ne compte pas', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({ equipment: [{ itemId: 'epee-longue', quantity: 1 }] }),
    );
    expect(view.meleeWeaponDamage).toBeNull();
  });

  it('PER-141 : moine avec Morsure du serpent → badge de critique mains nues', () => {
    const view = buildCharacterDerivedView(
      makeCharacter({ classId: 'moine', featureIds: ['maitrise-r3'] }),
    );
    expect(view.unarmed.lethality).toBe('choice');
    expect(view.unarmedCriticalRanges).toHaveLength(1);
    expect(view.unarmedCriticalRanges[0].text).toBe('19-20');
  });
});
