import { describe, expect, it } from 'vitest';
import type { Database, Json } from '@/lib/supabase/types';
import { createBlankCharacter } from './factory';
import { mergeCharacters, rowToCharacter } from './repo';
import type { Character } from './types';

type CharacterRow = Database['public']['Tables']['characters']['Row'];

/** Personnage valide minimal, avec FK/état posés dans le blob (surchargeables). */
const character = (over: Partial<Character> = {}): Character => ({
  ...createBlankCharacter({ name: 'Aria', now: '2026-07-01T10:00:00Z' }),
  id: 'ch1',
  ...over,
});

/** Ligne SQL `characters` autour d'un blob donné (colonnes surchargeables). */
const row = (blob: Character, over: Partial<CharacterRow> = {}): CharacterRow => ({
  id: blob.id,
  owner_id: 'u1',
  campaign_id: null,
  player_id: null,
  status: 'active',
  version: 1,
  schema_version: blob.schemaVersion,
  data: blob as unknown as Json,
  created_at: '2026-07-01T10:00:00Z',
  updated_at: '2026-07-02T11:00:00Z',
  ...over,
});

describe('rowToCharacter', () => {
  it('migre le blob et remonte la version', () => {
    const blob = character();
    const loaded = rowToCharacter(row(blob, { version: 7 }));
    expect(loaded.version).toBe(7);
    expect(loaded.character.id).toBe('ch1');
    expect(loaded.character.name).toBe('Aria');
    expect(loaded.character.schemaVersion).toBe(blob.schemaVersion);
  });

  it('superpose les colonnes FK/état au blob (les colonnes font foi)', () => {
    // Le blob prétend une campagne/joueur/état ; les colonnes SQL doivent l'emporter
    // (un ON DELETE SET NULL en base ne traverse pas le blob).
    const blob = character({ campaignId: 'stale-camp', playerId: 'stale-player', status: 'active' });
    const loaded = rowToCharacter(
      row(blob, { campaign_id: 'camp-1', player_id: 'player-1', status: 'dead' }),
    );
    expect(loaded.character.campaignId).toBe('camp-1');
    expect(loaded.character.playerId).toBe('player-1');
    expect(loaded.character.status).toBe('dead');
  });

  it('reflète un détachement (colonnes nulles) même si le blob portait une FK', () => {
    const blob = character({ campaignId: 'camp-1', playerId: 'player-1' });
    const loaded = rowToCharacter(row(blob, { campaign_id: null, player_id: null }));
    expect(loaded.character.campaignId).toBeNull();
    expect(loaded.character.playerId).toBeNull();
  });
});

describe('mergeCharacters', () => {
  it('réunit cloud et local sans doublon d’id', () => {
    const cloud = [character({ id: 'a' })];
    const local = [character({ id: 'b' })];
    const merged = mergeCharacters(cloud, local);
    expect(merged.map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('fait primer le cloud pour un id présent des deux côtés', () => {
    const cloud = [character({ id: 'a', name: 'Version cloud' })];
    const local = [character({ id: 'a', name: 'Version locale' })];
    const merged = mergeCharacters(cloud, local);
    expect(merged).toHaveLength(1);
    expect(merged[0].name).toBe('Version cloud');
  });

  it('conserve les persos uniquement locaux (staging non téléversé)', () => {
    const cloud: Character[] = [];
    const local = [character({ id: 'legacy' })];
    expect(mergeCharacters(cloud, local).map((c) => c.id)).toEqual(['legacy']);
  });
});
