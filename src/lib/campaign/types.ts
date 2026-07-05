/**
 * Modèle de données « Campagne » et « Joueur » (PER-179) — entièrement
 * sérialisable en JSON (localStorage, export/import, future migration Supabase).
 *
 * Hiérarchie stricte : **Campagne ⊃ Joueurs ⊃ Personnages**. Les joueurs sont
 * EMBARQUÉS dans la campagne (pas de troisième store) ; les personnages restent
 * dans leur store dédié et pointent vers la campagne/le joueur par clé étrangère
 * (`Character.campaignId` / `Character.playerId`).
 *
 * Béquille pré-base de données assumée (phase 1, 100 % localStorage) : ce
 * découpage plat + FK sera transféré tel quel dans une vraie DB en phase 2.
 */

/**
 * Règles de table d'une campagne. Objet **typé** — un champ par règle, pas de
 * registre générique : l'*effet* de chaque règle est du code sur-mesure de toute
 * façon, et le typage explicite vaut mieux qu'un sac de clés tant qu'on a une
 * poignée de règles (on refactorera vers un registre le jour où un pattern commun
 * émergera sur 15+ règles).
 */
export interface CampaignRules {
  /**
   * Les armes à feu sont-elles autorisées dans l'univers de la campagne
   * (livre de base p. 62, encadré « Poudre ou pas poudre ? ») ? À `false`,
   * l'arquebusier devient « Arbalétrier » (voir PER-174). Défaut `true` :
   * on préserve le comportement historique (armes à feu autorisées).
   */
  firearmsAllowed: boolean;
}

/**
 * Joueur **local** à une campagne : un simple prénom, étiquette d'attribution
 * d'un personnage. Embryon du futur système de compte (phase 2). Le même humain
 * jouant dans deux campagnes est représenté par DEUX `Player` distincts (un par
 * campagne) — un vrai joueur global n'a de sens qu'avec des comptes.
 */
export interface Player {
  id: string;
  name: string;
}

/**
 * Campagne : ses règles de table et ses joueurs embarqués. Regroupe des
 * personnages via la clé étrangère `Character.campaignId`.
 */
export interface Campaign {
  id: string;
  name: string;
  /** Notes libres du MJ sur la campagne (optionnel). */
  description?: string;
  rules: CampaignRules;
  players: Player[];
}

/**
 * Identifiants « connus » de la campagne et du joueur par défaut. Constantes
 * PARTAGÉES entre la migration des personnages (qui estampille ces FK sur tout
 * perso préexistant) et le bootstrap du store `campaigns` (qui garantit
 * l'existence de la campagne correspondante) : les deux doivent employer
 * exactement les mêmes valeurs pour que la FK résolve. Slugs neutres persistés.
 */
export const DEFAULT_CAMPAIGN_ID = 'default-campaign';
export const DEFAULT_PLAYER_ID = 'default-player';

/** Règles par défaut : on préserve le comportement historique (armes à feu OK). */
export const DEFAULT_CAMPAIGN_RULES: CampaignRules = { firearmsAllowed: true };
