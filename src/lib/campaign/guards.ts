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
import { createDefaultCampaign } from './factory';
import { DEFAULT_CAMPAIGN_ID, type Campaign, type Player } from './types';

/** Campagne d'id donné, ou `undefined` si absente (garde FK). */
export function findCampaign(campaigns: Campaign[], campaignId: string): Campaign | undefined {
  return campaigns.find((c) => c.id === campaignId);
}

/** Joueur d'id donné dans une campagne, ou `undefined` si absent (garde FK). */
export function findPlayer(campaign: Campaign, playerId: string): Player | undefined {
  return campaign.players.find((p) => p.id === playerId);
}

/** Campagne de rattachement d'un personnage, ou `undefined` si la FK est orpheline. */
export function campaignOfCharacter(
  campaigns: Campaign[],
  character: Character,
): Campaign | undefined {
  return findCampaign(campaigns, character.campaignId);
}

/**
 * Joueur de rattachement d'un personnage, ou `undefined` si la campagne ou le
 * joueur sont introuvables (le joueur est local à sa campagne).
 */
export function playerOfCharacter(campaigns: Campaign[], character: Character): Player | undefined {
  const campaign = campaignOfCharacter(campaigns, character);
  return campaign && findPlayer(campaign, character.playerId);
}

/** Personnages rattachés à une campagne (filtre par FK). */
export function charactersInCampaign(characters: Character[], campaignId: string): Character[] {
  return characters.filter((c) => c.campaignId === campaignId);
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
 * Garantit l'existence de la « Campagne par défaut » quand au moins un personnage
 * pointe vers elle mais qu'elle n'existe pas encore (typiquement juste après une
 * migration qui a estampillé `DEFAULT_CAMPAIGN_ID` sur des persos préexistants).
 * Idempotent : ne crée rien si la campagne par défaut existe déjà, ou si aucun
 * perso ne la référence. Ne touche jamais aux campagnes existantes.
 */
export function bootstrapCampaigns(campaigns: Campaign[], characters: Character[]): Campaign[] {
  const hasDefault = campaigns.some((c) => c.id === DEFAULT_CAMPAIGN_ID);
  const needsDefault = characters.some((c) => c.campaignId === DEFAULT_CAMPAIGN_ID);
  if (hasDefault || !needsDefault) return campaigns;
  return [createDefaultCampaign(), ...campaigns];
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
