/**
 * Fabrique de campagnes — création de la campagne par défaut (bootstrap) et
 * d'une campagne/joueur neufs.
 */
import { newId } from '@/lib/character/factory';
import {
  DEFAULT_CAMPAIGN_ID,
  DEFAULT_CAMPAIGN_RULES,
  DEFAULT_PLAYER_ID,
  type Campaign,
  type Player,
} from './types';

/**
 * Campagne par défaut du bootstrap (PER-179) : id/joueur « connus » (cf.
 * `DEFAULT_CAMPAIGN_ID` / `DEFAULT_PLAYER_ID`), règles historiques (armes à feu
 * autorisées). C'est là qu'atterrissent les personnages migrés depuis un schéma
 * antérieur à la hiérarchie campagne. Le joueur « Joueur 1 » est renommable.
 */
export function createDefaultCampaign(): Campaign {
  return {
    id: DEFAULT_CAMPAIGN_ID,
    name: 'Campagne par défaut',
    rules: { ...DEFAULT_CAMPAIGN_RULES },
    players: [{ id: DEFAULT_PLAYER_ID, name: 'Joueur 1' }],
  };
}

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
