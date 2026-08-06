import { describe, expect, it } from 'vitest';
import { registerContentBundle } from '@/data';
import { SCHEMA_VERSION, type Character } from '@/lib/character/types';
import {
  effectiveFeatureIdsForMods,
  grantedFeatureIds,
  suppressedTestBonusFeatureIds,
} from './choices';
import { effectContext, testBonusSources } from './effects';

// Capacités SYNTHÉTIQUES (aucun contenu payant) : prouvent la primitive générique `grantedFeature`
// (PER-323, cambion « Enfant des ténèbres »). Ids uniques → pas de pollution des autres suites.
registerContentBundle({
  paths: [
    {
      id: 'test-granted-path',
      name: 'Voie octroyée de test',
      type: 'ancestry',
      ancestryIds: ['test-granted-path'],
      featureIds: ['test-granted-spell'],
      sourcePage: 0,
    },
    {
      id: 'test-granter-path',
      name: 'Voie octroyeuse de test',
      type: 'ancestry',
      ancestryIds: ['test-granter-path'],
      featureIds: ['test-granter-suppress', 'test-granter-plain'],
      sourcePage: 0,
    },
  ],
  features: [
    {
      // Le SORT octroyé porte un « bonus de compétence associé » (test-bonus), comme Ténèbres.
      id: 'test-granted-spell',
      name: 'Sort octroyé de test',
      pathId: 'test-granted-path',
      rank: 1,
      isSpell: true,
      actionTypes: ['L'],
      text: 'Sort octroyé de test.',
      sourcePage: 0,
      effects: [{ kind: 'test-bonus', domains: ['occult-lore'] }],
    },
    {
      // Octroi AVEC suppression du bonus de compétence.
      id: 'test-granter-suppress',
      name: 'Octroyeur (suppression)',
      pathId: 'test-granter-path',
      rank: 1,
      isSpell: false,
      actionTypes: [],
      text: 'Octroie le sort de test sans son bonus de compétence.',
      sourcePage: 0,
      grantedFeature: { featureId: 'test-granted-spell', suppressTestBonus: true, freeActionIfOwned: ['G'] },
    },
    {
      // Octroi SANS suppression : le bonus de compétence du sort octroyé compte normalement.
      id: 'test-granter-plain',
      name: 'Octroyeur (sans suppression)',
      pathId: 'test-granter-path',
      rank: 1,
      isSpell: false,
      actionTypes: [],
      text: 'Octroie le sort de test avec son bonus de compétence.',
      sourcePage: 0,
      grantedFeature: { featureId: 'test-granted-spell' },
    },
  ],
});

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'guerrier',
    level: 5,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: null,
    playerId: null,
    status: 'active',
    abilities: { AGI: 2, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 1, VOL: 4 },
    baseAbilities: { AGI: 2, CON: 2, FOR: 3, PER: 0, CHA: -1, INT: 1, VOL: 4 },
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
    poisonedWeapons: [],
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

describe('grantedFeature — octroi fixe d\'une capacité (PER-323)', () => {
  it('octroie la capacité cible quand la capacité hôte est acquise', () => {
    const c = makeCharacter({ featureIds: ['test-granter-suppress'] });
    expect(grantedFeatureIds(c)).toEqual(['test-granted-spell']);
    expect(effectiveFeatureIdsForMods(c)).toContain('test-granted-spell');
  });

  it('n\'octroie RIEN si la capacité est déjà possédée nativement (pas de doublon)', () => {
    const c = makeCharacter({ featureIds: ['test-granter-suppress', 'test-granted-spell'] });
    expect(grantedFeatureIds(c)).toEqual([]);
    // Elle reste dans le pool effectif via `featureIds`, mais pas via l'octroi (dédoublonné).
    expect(effectiveFeatureIdsForMods(c).filter((id) => id === 'test-granted-spell')).toHaveLength(1);
  });

  it('sans la capacité hôte : aucun octroi', () => {
    expect(grantedFeatureIds(makeCharacter())).toEqual([]);
  });

  it('suppressTestBonus : la cible octroyée figure dans l\'ensemble supprimé', () => {
    const c = makeCharacter({ featureIds: ['test-granter-suppress'] });
    expect([...suppressedTestBonusFeatureIds(c)]).toEqual(['test-granted-spell']);
  });

  it('sans suppressTestBonus : ensemble supprimé vide', () => {
    const c = makeCharacter({ featureIds: ['test-granter-plain'] });
    expect([...suppressedTestBonusFeatureIds(c)]).toEqual([]);
  });

  it('déjà possédée nativement : rien à supprimer (le bonus natif reste)', () => {
    const c = makeCharacter({ featureIds: ['test-granter-suppress', 'test-granted-spell'] });
    expect([...suppressedTestBonusFeatureIds(c)]).toEqual([]);
  });
});

describe('grantedFeature — « bonus de compétence associé » (test-bonus)', () => {
  it('supprimé : le test-bonus du sort octroyé NE compte PAS', () => {
    const c = makeCharacter({ featureIds: ['test-granter-suppress'] });
    const tests = testBonusSources(effectiveFeatureIdsForMods(c), effectContext(c));
    expect(tests.find((t) => t.domain === 'occult-lore')).toBeUndefined();
  });

  it('non supprimé : le test-bonus du sort octroyé compte (+3, catégorie peuple)', () => {
    const c = makeCharacter({ featureIds: ['test-granter-plain'] });
    const tests = testBonusSources(effectiveFeatureIdsForMods(c), effectContext(c));
    expect(tests.find((t) => t.domain === 'occult-lore')?.total).toBe(3);
  });
});
