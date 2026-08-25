import { describe, expect, it } from 'vitest';
import { CUSTOM_CREATURE_SLUG, type CustomCreature } from './customCreature';
import {
  ENCOUNTER_PRESET_DEFAULT_NAME,
  addCustomPresetEntry,
  addPresetEntry,
  launchEncounterPreset,
  normalizePresetName,
  normalizePresetNote,
  removePresetEntry,
  reviveEntries,
  type EncounterPreset,
  type EncounterPresetEntry,
} from './encounterPreset';

const CUSTOM: CustomCreature = { initiative: 2, hitPoints: 12, defense: 13 };

describe('normalizePresetName', () => {
  it('rogne les espaces de bord et tronque', () => {
    expect(normalizePresetName('  Embuscade au pont  ')).toBe('Embuscade au pont');
    expect(normalizePresetName('x'.repeat(100))).toHaveLength(60);
  });

  it('retombe sur le nom par défaut si vide/non-chaîne', () => {
    expect(normalizePresetName('   ')).toBe(ENCOUNTER_PRESET_DEFAULT_NAME);
    expect(normalizePresetName(undefined)).toBe(ENCOUNTER_PRESET_DEFAULT_NAME);
  });
});

describe('normalizePresetNote', () => {
  it('rogne les espaces de bord ; vide → undefined', () => {
    expect(normalizePresetNote('  tactique  ')).toBe('tactique');
    expect(normalizePresetNote('   ')).toBeUndefined();
    expect(normalizePresetNote(undefined)).toBeUndefined();
  });
});

describe('addPresetEntry / addCustomPresetEntry', () => {
  it('ajoute une entrée bestiaire avec les défauts (camp adversaire, 1 exemplaire)', () => {
    const entries = addPresetEntry([], 'gobelin');
    expect(entries).toEqual<EncounterPresetEntry[]>([{ slug: 'gobelin', side: 'enemy', count: 1 }]);
  });

  it('respecte camp/nom/nombre fournis, borne le nombre', () => {
    const entries = addPresetEntry([], 'gobelin', { side: 'ally', name: '  Garde du corps  ', count: 99 });
    expect(entries).toEqual<EncounterPresetEntry[]>([
      { slug: 'gobelin', side: 'ally', name: 'Garde du corps', count: 20 },
    ]);
  });

  it('ajoute une entrée manuelle valide', () => {
    const entries = addCustomPresetEntry([], CUSTOM, { name: 'Grishnak le borgne' });
    expect(entries).toEqual<EncounterPresetEntry[]>([
      { slug: CUSTOM_CREATURE_SLUG, custom: CUSTOM, side: 'enemy', count: 1, name: 'Grishnak le borgne' },
    ]);
  });

  it('ignore une entrée manuelle sans socle obligatoire (no-op)', () => {
    const entries = addCustomPresetEntry([], { initiative: 2 } as CustomCreature);
    expect(entries).toEqual([]);
  });
});

describe('removePresetEntry', () => {
  it('retire par index, no-op hors bornes', () => {
    const entries = addPresetEntry(addPresetEntry([], 'gobelin'), 'bandit-de-base');
    expect(removePresetEntry(entries, 0)).toEqual([entries[1]]);
    expect(removePresetEntry(entries, 5)).toEqual(entries);
  });
});

describe('reviveEntries', () => {
  it('écarte les entrées mal formées', () => {
    expect(
      reviveEntries([
        { slug: 'gobelin', side: 'enemy', count: 2 },
        { slug: 'bandit', side: 'nope' },
        { slug: '', side: 'ally' },
        null,
        'oops',
        { slug: CUSTOM_CREATURE_SLUG, side: 'enemy', custom: { initiative: 1 } },
      ]),
    ).toEqual<EncounterPresetEntry[]>([{ slug: 'gobelin', side: 'enemy', count: 2 }]);
  });

  it('non-tableau → liste vide', () => {
    expect(reviveEntries(null)).toEqual([]);
    expect(reviveEntries('nope')).toEqual([]);
  });
});

describe('launchEncounterPreset', () => {
  it('expanse chaque entrée en instances distinctes, PV neufs à chaque lancement', () => {
    const preset: EncounterPreset = {
      id: 'p1',
      name: 'Embuscade',
      entries: [
        { slug: 'gobelin', side: 'enemy', count: 2 },
        { slug: CUSTOM_CREATURE_SLUG, custom: CUSTOM, side: 'ally', name: 'Allié', count: 1 },
      ],
    };
    const state = launchEncounterPreset(preset);
    expect(state.creatures).toHaveLength(3);
    expect(state.depletions).toEqual({});
    expect(state.currentTurnKey).toBeNull();
    expect(state.roundNumber).toBe(1);
  });

  it('masque les adversaires par défaut, garde les alliés visibles', () => {
    const preset: EncounterPreset = {
      id: 'p1',
      name: 'Embuscade',
      entries: [
        { slug: 'gobelin', side: 'enemy', count: 1 },
        { slug: 'garde', side: 'ally', count: 1 },
      ],
    };
    const state = launchEncounterPreset(preset);
    const enemy = state.creatures.find((c) => c.slug === 'gobelin');
    const ally = state.creatures.find((c) => c.slug === 'garde');
    expect(enemy?.visible).toBe(false);
    expect(ally?.visible).toBe(true);
  });

  it('un preset vide lance un combat vide', () => {
    const state = launchEncounterPreset({ id: 'p1', name: 'Vide', entries: [] });
    expect(state.creatures).toEqual([]);
  });

  it('deux lancements successifs tirent chacun leur propre graine de départage', () => {
    const preset: EncounterPreset = {
      id: 'p1',
      name: 'Embuscade',
      entries: [{ slug: 'gobelin', side: 'enemy', count: 1 }],
    };
    const first = launchEncounterPreset(preset);
    const second = launchEncounterPreset(preset);
    // Le preset original n'est jamais modifié : chaque lancement repart d'un combat vierge,
    // donc les mêmes ids d'instance (`c-1`…) — c'est la graine de tirage qui varie.
    expect(first.creatures[0].id).toBe(second.creatures[0].id);
    expect(first.tieBreakSeed).not.toBe(second.tieBreakSeed);
  });
});
