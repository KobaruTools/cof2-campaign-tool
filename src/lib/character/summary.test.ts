import { describe, expect, it } from 'vitest';
import type { Campaign } from '@/lib/campaign/types';
import { SCHEMA_VERSION, type Character } from './types';
import { fileSlug, summarize, summarizeInCampaign } from './summary';

function makeCharacter(over: Partial<Character> = {}): Character {
  return {
    schemaVersion: SCHEMA_VERSION,
    id: 'test',
    name: 'Test',
    identity: {},
    ancestryId: 'humain',
    classId: 'arquebusier',
    level: 1,
    priestVocation: null,
    portraitVariant: 'default',
    firearmsAllowed: true,
    campaignId: null,
    playerId: null,
    status: 'active',
    abilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
    baseAbilities: { AGI: 0, CON: 0, FOR: 0, PER: 0, CHA: 0, INT: 0, VOL: 0 },
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

function makeCampaign(firearmsAllowed: boolean): Campaign {
  return {
    id: 'camp',
    name: 'Campagne',
    description: null,
    rules: { firearmsAllowed, hitDieOnLevelUp: false },
    rumors: [],
    loot: [],
    gmInventory: { categories: [], items: [] },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('summarize (nom effectif selon la campagne, PER-185)', () => {
  it('sans campagne : Arquebusier reste Arquebusier', () => {
    const s = summarize(makeCharacter());
    expect(s.characterClass).toBe('Arquebusier');
    expect(s.firearmsAllowed).toBe(true);
  });

  it('campagne interdit la poudre : Arquebusier s’affiche Arbalétrier', () => {
    const s = summarizeInCampaign(makeCharacter(), makeCampaign(false));
    expect(s.characterClass).toBe('Arbalétrier');
    expect(s.firearmsAllowed).toBe(false);
  });

  it('campagne autorise la poudre : Arquebusier reste Arquebusier', () => {
    const s = summarizeInCampaign(makeCharacter(), makeCampaign(true));
    expect(s.characterClass).toBe('Arquebusier');
    expect(s.firearmsAllowed).toBe(true);
  });

  it('sans campagne (summarizeInCampaign, null) : retombe sur le snapshot', () => {
    const s = summarizeInCampaign(makeCharacter({ firearmsAllowed: false }), null);
    expect(s.characterClass).toBe('Arbalétrier');
    expect(s.firearmsAllowed).toBe(false);
  });
});

describe('fileSlug (nom de fichier d’export)', () => {
  it('replie accents et casse, et relie les mots par des tirets', () => {
    expect(fileSlug('Élise la Rusée')).toBe('elise-la-rusee');
    expect(fileSlug("Gaël d'Aquitaine")).toBe('gael-d-aquitaine');
  });

  /** Sans repli explicite, `œ` était avalé par le filtre `[^a-z0-9]+` et « Cœur » donnait `c-ur`. */
  it('rend les lettres des ligatures œ et æ au lieu de les perdre', () => {
    expect(fileSlug('Cœur de Lion')).toBe('coeur-de-lion');
    expect(fileSlug('Læna')).toBe('laena');
  });

  it('retombe sur un nom par défaut si rien ne subsiste', () => {
    expect(fileSlug('')).toBe('personnage');
    expect(fileSlug('!!! ???')).toBe('personnage');
  });
});
