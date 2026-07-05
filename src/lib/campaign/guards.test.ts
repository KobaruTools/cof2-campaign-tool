import { describe, expect, it } from 'vitest';
import type { Character } from '@/lib/character/types';
import { createDefaultCampaign } from './factory';
import {
  bootstrapCampaigns,
  campaignOfCharacter,
  cascadeDeleteCampaign,
  charactersInCampaign,
  charactersOfPlayer,
  findCampaign,
  findPlayer,
  playerOfCharacter,
} from './guards';
import { DEFAULT_CAMPAIGN_ID, DEFAULT_PLAYER_ID, type Campaign } from './types';

/**
 * Personnage minimal pour les tests de FK : seuls `campaignId`/`playerId` sont
 * lus par les gardes, on ne construit donc que ce dont elles ont besoin.
 */
function char(campaignId: string, playerId: string, id = `${campaignId}-${playerId}`): Character {
  return { id, campaignId, playerId } as unknown as Character;
}

const campaign = (id: string, playerIds: string[] = []): Campaign => ({
  id,
  name: id,
  rules: { firearmsAllowed: true },
  players: playerIds.map((pid) => ({ id: pid, name: pid })),
});

describe('createDefaultCampaign', () => {
  it('crée la campagne par défaut avec le joueur par défaut et les règles historiques', () => {
    const c = createDefaultCampaign();
    expect(c.id).toBe(DEFAULT_CAMPAIGN_ID);
    expect(c.rules.firearmsAllowed).toBe(true);
    expect(c.players).toEqual([{ id: DEFAULT_PLAYER_ID, name: 'Joueur 1' }]);
  });
});

describe('bootstrapCampaigns', () => {
  it('crée la campagne par défaut si des persos la référencent et qu’elle manque', () => {
    const out = bootstrapCampaigns([], [char(DEFAULT_CAMPAIGN_ID, DEFAULT_PLAYER_ID)]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe(DEFAULT_CAMPAIGN_ID);
  });

  it('idempotent : ne recrée pas la campagne par défaut si elle existe déjà', () => {
    const existing = [campaign(DEFAULT_CAMPAIGN_ID)];
    const out = bootstrapCampaigns(existing, [char(DEFAULT_CAMPAIGN_ID, DEFAULT_PLAYER_ID)]);
    expect(out).toBe(existing); // même référence, aucune modification
  });

  it('ne crée rien si aucun perso ne référence la campagne par défaut', () => {
    const out = bootstrapCampaigns([], [char('autre-campagne', 'p1')]);
    expect(out).toEqual([]);
  });

  it('préserve les campagnes existantes en ajoutant la par défaut en tête', () => {
    const out = bootstrapCampaigns(
      [campaign('autre')],
      [char(DEFAULT_CAMPAIGN_ID, DEFAULT_PLAYER_ID), char('autre', 'p1')],
    );
    expect(out.map((c) => c.id)).toEqual([DEFAULT_CAMPAIGN_ID, 'autre']);
  });
});

describe('gardes FK (lecture)', () => {
  const campaigns = [campaign('c1', ['p1', 'p2']), campaign('c2', ['p3'])];

  it('findCampaign / findPlayer résolvent ou renvoient undefined', () => {
    expect(findCampaign(campaigns, 'c1')?.id).toBe('c1');
    expect(findCampaign(campaigns, 'absente')).toBeUndefined();
    expect(findPlayer(campaigns[0], 'p2')?.id).toBe('p2');
    expect(findPlayer(campaigns[0], 'p9')).toBeUndefined();
  });

  it('campaignOfCharacter renvoie undefined sur une FK orpheline', () => {
    expect(campaignOfCharacter(campaigns, char('c1', 'p1'))?.id).toBe('c1');
    expect(campaignOfCharacter(campaigns, char('disparue', 'p1'))).toBeUndefined();
  });

  it('playerOfCharacter exige campagne ET joueur résolus', () => {
    expect(playerOfCharacter(campaigns, char('c1', 'p2'))?.id).toBe('p2');
    // Joueur inexistant dans une campagne existante → undefined.
    expect(playerOfCharacter(campaigns, char('c1', 'p3'))).toBeUndefined();
    // Campagne inexistante → undefined même si l'id de joueur existe ailleurs.
    expect(playerOfCharacter(campaigns, char('disparue', 'p1'))).toBeUndefined();
  });
});

describe('filtres de rattachement', () => {
  const characters = [
    char('c1', 'p1', 'a'),
    char('c1', 'p2', 'b'),
    char('c1', 'p1', 'c'),
    char('c2', 'p3', 'd'),
  ];

  it('charactersInCampaign filtre par campagne', () => {
    expect(charactersInCampaign(characters, 'c1').map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(charactersInCampaign(characters, 'c2').map((c) => c.id)).toEqual(['d']);
  });

  it('charactersOfPlayer filtre par double FK campagne+joueur', () => {
    expect(charactersOfPlayer(characters, 'c1', 'p1').map((c) => c.id)).toEqual(['a', 'c']);
    expect(charactersOfPlayer(characters, 'c1', 'p3')).toEqual([]);
  });
});

describe('cascadeDeleteCampaign', () => {
  it('retire la campagne et tous ses personnages, laisse les autres intacts', () => {
    const campaigns = [campaign('c1'), campaign('c2')];
    const characters = [char('c1', 'p1', 'a'), char('c2', 'p2', 'b'), char('c1', 'p1', 'c')];
    const out = cascadeDeleteCampaign(campaigns, characters, 'c1');
    expect(out.campaigns.map((c) => c.id)).toEqual(['c2']);
    expect(out.characters.map((c) => c.id)).toEqual(['b']);
  });

  it('sans effet si la campagne est absente', () => {
    const campaigns = [campaign('c1')];
    const characters = [char('c1', 'p1', 'a')];
    const out = cascadeDeleteCampaign(campaigns, characters, 'inexistante');
    expect(out.campaigns).toHaveLength(1);
    expect(out.characters).toHaveLength(1);
  });
});
