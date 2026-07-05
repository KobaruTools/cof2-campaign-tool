/**
 * Gardes de clés étrangères et logique de cohérence Campagne ⊃ Joueurs ⊃
 * Personnages (PER-179). Fonctions **pures** (aucun accès store) : c'est ici que
 * vit toute la logique métier du store `campaigns` (bootstrap, cascade de
 * suppression, résolution défensive des FK), pour être testable isolément.
 *
 * Rappel du risque assumé (béquille pré-DB) : une FK peut être orpheline (perso
 * pointant une campagne/un joueur supprimés). On le couvre par la **cascade** à
 * la suppression et par ces **gardes défensives à la lecture** (qui renvoient
 * `undefined` plutôt que de présumer l'existence).
 */
import type { Character } from '@/lib/character/types';
import { DEFAULT_CAMPAIGN_ID, type Campaign, type Player } from './types';

/** Campagne d'id donné, ou `undefined` si absente (garde FK). */
export function findCampaign(campaigns: Campaign[], campaignId: string): Campaign | undefined {
  return campaigns.find((c) => c.id === campaignId);
}

/** Joueur d'id donné dans une campagne, ou `undefined` si absent (garde FK). */
export function findPlayer(campaign: Campaign, playerId: string): Player | undefined {
  return campaign.players.find((p) => p.id === playerId);
}

/**
 * Campagne de rattachement d'un personnage, ou `undefined` s'il n'est attribué à
 * aucune campagne (`campaignId === null`, PER-180) ou si la FK est orpheline.
 */
export function campaignOfCharacter(
  campaigns: Campaign[],
  character: Character,
): Campaign | undefined {
  return character.campaignId ? findCampaign(campaigns, character.campaignId) : undefined;
}

/**
 * Joueur de rattachement d'un personnage, ou `undefined` si la campagne ou le
 * joueur sont introuvables (le joueur est local à sa campagne).
 */
export function playerOfCharacter(campaigns: Campaign[], character: Character): Player | undefined {
  const campaign = campaignOfCharacter(campaigns, character);
  return campaign && character.playerId ? findPlayer(campaign, character.playerId) : undefined;
}

/** Personnages rattachés à une campagne (filtre par FK). */
export function charactersInCampaign(characters: Character[], campaignId: string): Character[] {
  return characters.filter((c) => c.campaignId === campaignId);
}

/** Personnages non rattachés à une campagne (« Non attribué », PER-180). */
export function unassignedCharacters(characters: Character[]): Character[] {
  return characters.filter((c) => c.campaignId == null);
}

/** Personnages rattachés à un joueur d'une campagne (filtre par double FK). */
export function charactersOfPlayer(
  characters: Character[],
  campaignId: string,
  playerId: string,
): Character[] {
  return characters.filter((c) => c.campaignId === campaignId && c.playerId === playerId);
}

/**
 * Purge la « Campagne par défaut » auto-créée par l'ancien bootstrap (PER-179).
 * Depuis PER-180 la campagne est optionnelle et les personnages migrés repassent
 * « Non attribué » : cette campagne technique (id réservé `DEFAULT_CAMPAIGN_ID`,
 * jamais choisie par l'utilisateur) n'a plus lieu d'être. Idempotent : ne retire
 * qu'une campagne portant exactement l'id réservé (les campagnes utilisateur ont
 * un uuid), laisse tout le reste intact.
 */
export function pruneDefaultCampaign(campaigns: Campaign[]): Campaign[] {
  return campaigns.some((c) => c.id === DEFAULT_CAMPAIGN_ID)
    ? campaigns.filter((c) => c.id !== DEFAULT_CAMPAIGN_ID)
    : campaigns;
}

/**
 * Cascade de suppression d'une campagne (p. « béquille pré-DB ») : retire la
 * campagne ET tous les personnages qu'elle contient (ses joueurs partent avec la
 * campagne puisqu'ils y sont embarqués). Fonction pure renvoyant les deux
 * tableaux résultants, à appliquer respectivement au store `campaigns` et au
 * store `characters`.
 */
export function cascadeDeleteCampaign(
  campaigns: Campaign[],
  characters: Character[],
  campaignId: string,
): { campaigns: Campaign[]; characters: Character[] } {
  return {
    campaigns: campaigns.filter((c) => c.id !== campaignId),
    characters: characters.filter((c) => c.campaignId !== campaignId),
  };
}
