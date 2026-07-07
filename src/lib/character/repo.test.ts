import { describe, expect, it } from 'vitest';
import type { Database, Json } from '@/lib/supabase/types';
import { createBlankCharacter } from './factory';
import { bindForUpload, isUniqueViolation, mergeCharacters, rowToCharacter } from './repo';
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

describe('bindForUpload', () => {
  it('rattache à la campagne cible et horodate ; remet le joueur à null si la campagne change', () => {
    const local = character({ campaignId: null, playerId: 'p-old', updatedAt: '2020-01-01T00:00:00Z' });
    const bound = bindForUpload(local, 'camp-1', '2026-07-06T09:00:00Z');
    expect(bound.campaignId).toBe('camp-1');
    expect(bound.playerId).toBeNull(); // campagne changée (null → camp-1) ⇒ joueur écarté
    expect(bound.updatedAt).toBe('2026-07-06T09:00:00Z');
    expect(bound.id).toBe(local.id); // id conservé
  });

  it('préserve le joueur si le perso reste dans SA campagne (aucune perte à l’import→téléversement)', () => {
    const local = character({ campaignId: 'camp-1', playerId: 'p-1' });
    const bound = bindForUpload(local, 'camp-1', '2026-07-06T09:00:00Z');
    expect(bound.campaignId).toBe('camp-1');
    expect(bound.playerId).toBe('p-1');
  });

  it('écarte le joueur si le perso change de campagne (joueur local à l’ancienne campagne)', () => {
    const local = character({ campaignId: 'camp-1', playerId: 'p-1' });
    const bound = bindForUpload(local, 'camp-2', '2026-07-06T09:00:00Z');
    expect(bound.campaignId).toBe('camp-2');
    expect(bound.playerId).toBeNull();
  });

  it('accepte « Non attribué » (campagne null) et écarte le joueur', () => {
    const bound = bindForUpload(character({ campaignId: 'stale', playerId: 'p-1' }), null, '2026-07-06T09:00:00Z');
    expect(bound.campaignId).toBeNull();
    expect(bound.playerId).toBeNull();
  });

  it('ne mute pas le personnage source', () => {
    const local = character({ campaignId: null, playerId: 'p-old' });
    bindForUpload(local, 'camp-1', '2026-07-06T09:00:00Z');
    expect(local.campaignId).toBeNull();
    expect(local.playerId).toBe('p-old');
  });
});

describe('isUniqueViolation', () => {
  it('reconnaît le code SQLSTATE 23505', () => {
    expect(isUniqueViolation({ code: '23505', message: 'duplicate key' })).toBe(true);
  });

  it('rejette les autres erreurs', () => {
    expect(isUniqueViolation({ code: '23503' })).toBe(false);
    expect(isUniqueViolation(new Error('réseau'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation('23505')).toBe(false);
  });
});
