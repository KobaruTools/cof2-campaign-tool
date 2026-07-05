/**
 * Modèle de données « Campagne » (PER-190) — reflet de la table cloud
 * `public.campaigns` (Supabase), possédée par un utilisateur (MJ = `owner_id`).
 *
 * Depuis PER-190 la campagne est **persistée dans le cloud** (plus en
 * localStorage) : le CRUD passe par `repo.ts` (client Supabase + RLS
 * propriétaire) et le store `campaigns` n'en est que le cache mémoire. Les
 * **joueurs** ne sont plus embarqués dans la campagne : ce sont des lignes d'une
 * table normalisée `public.players` gérée en PER-191 (lien magique). Les
 * **personnages** pointent vers la campagne par clé étrangère
 * (`Character.campaignId`) — rattachement OPTIONNEL, la campagne est un simple
 * regroupement (pivot PER-180). Tant que les personnages ne sont pas eux-mêmes
 * dans le cloud (PER-192/193), ils restent en localStorage et référencent l'UUID
 * cloud de la campagne : la vue campagne les filtre par cette FK.
 */

/**
 * Règles de table d'une campagne. Objet **typé** — un champ par règle, pas de
 * registre générique : l'*effet* de chaque règle est du code sur-mesure de toute
 * façon, et le typage explicite vaut mieux qu'un sac de clés tant qu'on a une
 * poignée de règles (on refactorera vers un registre le jour où un pattern commun
 * émergera sur 15+ règles). Persistées dans la colonne `rules` (jsonb) ; leur
 * **édition** et leur **effet** relèvent de la milestone « Campagnes ».
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
 * Campagne : ses notes de MJ et ses règles de table. Regroupe des personnages via
 * la clé étrangère `Character.campaignId`. `id` = UUID généré par la base.
 */
export interface Campaign {
  id: string;
  name: string;
  /** Notes libres du MJ sur la campagne (colonne nullable). */
  description: string | null;
  rules: CampaignRules;
  /** Horodatages ISO recopiés de la base (tri, affichage). */
  createdAt: string;
  updatedAt: string;
}

/**
 * Identifiants réservés de l'ancienne campagne/joueur « par défaut ». Constantes
 * PARTAGÉES par la **migration des personnages** (`src/lib/engine/migrations.ts`)
 * qui a estampillé ces FK sur les persos hérités avant de les repasser `null`
 * (pivot PER-180). Conservées pour cette migration ; plus aucune campagne réelle
 * ne les porte (les campagnes cloud ont un UUID). Slugs neutres persistés.
 */
export const DEFAULT_CAMPAIGN_ID = 'default-campaign';
export const DEFAULT_PLAYER_ID = 'default-player';

/** Règles par défaut : on préserve le comportement historique (armes à feu OK). */
export const DEFAULT_CAMPAIGN_RULES: CampaignRules = { firearmsAllowed: true };
