/**
 * Fabrique de campagnes — création de la campagne par défaut (bootstrap) et
 * d'une campagne/joueur neufs.
 */
import { newId } from '@/lib/character/factory';
import { DEFAULT_CAMPAIGN_RULES, type Campaign, type Player } from './types';

/** Campagne neuve (id frais), sans joueur, aux règles par défaut. */
export function createCampaign(name: string): Campaign {
  return {
    id: newId(),
    name: name.trim() || 'Nouvelle campagne',
    rules: { ...DEFAULT_CAMPAIGN_RULES },
    players: [],
  };
}

/** Joueur neuf (id frais). */
export function createPlayer(name: string): Player {
  return { id: newId(), name: name.trim() || 'Joueur' };
}
