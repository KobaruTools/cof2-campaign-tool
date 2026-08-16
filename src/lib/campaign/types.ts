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
import type { EquipmentLine } from '../character/types';

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
  /**
   * **Règle maison** (PER-87) — PAS une règle du livre de base : à chaque montée de
   * niveau, le joueur peut CHOISIR entre les PV fixes habituels et **lancer son dé
   * de vie** (= le dé de récupération de sa famille), le résultat étant saisi
   * librement (les dés se lancent à la vraie table). Le jet remplace la seule part
   * « famille » du gain de PV ; la CON reste ajoutée par-dessus, si bien que la
   * moyenne du dé équivaut au gain fixe à +0,5 près, quelle que soit la CON (le pari
   * ne fait que rajouter de la variance — cf. analyse statistique du ticket). À
   * `false` (défaut), les PV fixes s'appliquent, comportement inchangé.
   */
  hitDieOnLevelUp: boolean;
}

/**
 * Rumeur de taverne (PER-199) — accroche libre pré-écrite par le MJ, piochée au
 * hasard en jeu (typiquement à l'entrée d'une taverne). Rattachement PROPRE à la
 * campagne : persistée dans la colonne `rumors` (jsonb, tableau) de `public.campaigns`,
 * donc soumise à la même RLS propriétaire — les joueurs n'y accèdent jamais.
 *
 * Structure volontairement minimale (décision de cadrage PER-199) : texte libre +
 * drapeau « déjà servie ». Les métadonnées (lieu, thème, vraie/fausse) et une brique
 * de tirage factorisée avec PER-200 (butin) sont différées.
 */
export interface TavernRumor {
  /** Clé stable (UUID) — sert d'ancre de tirage et de `key` React. Slug persisté. */
  id: string;
  /** Texte libre de la rumeur (contenu FR, saisi par le MJ). */
  text: string;
  /**
   * La rumeur a-t-elle déjà été tirée dans le cycle courant ? Persistant : le
   * tirage évite les non-servies jusqu'à ce que le MJ « réinitialise » la réserve.
   */
  served: boolean;
}

/**
 * Objet de butin (PER-200) — récompense pré-écrite par le MJ pour sa campagne,
 * piochée au hasard en jeu (trésor de coffre, récompense, butin sur un adversaire).
 * Même mécanique « réserve + tirage sans répétition » que les rumeurs de taverne,
 * même rattachement PROPRE à la campagne : persisté dans la colonne `loot` (jsonb,
 * tableau) de `public.campaigns`, sous la même RLS propriétaire — les joueurs n'y
 * accèdent jamais.
 *
 * L'objet lui-même est une `EquipmentLine` produite par la MÊME modale de création
 * d'objet que les fiches (`ItemDialog`, PER-214) : variante mécanique d'un objet du
 * livre (arme/armure/bouclier + surcharges) OU objet libre typé (`CustomItem`). On
 * réutilise le système existant tel quel — pas de saisie ad hoc — si bien qu'attribuer
 * le butin revient à pousser cette ligne DANS l'inventaire d'un personnage, sans
 * conversion ni perte (DEF magique, charges, apports de stats… tout est déjà porté).
 *
 * `id`/`served` enrobent la ligne pour le tirage (module pur `loot.ts`, implémentation
 * SŒUR de `rumors.ts`, volontairement dupliquée plutôt que factorisée trop tôt).
 */
export interface LootItem {
  /** Clé stable (UUID) — ancre de tirage et `key` React. Slug persisté. */
  id: string;
  /**
   * L'objet, dans la forme d'inventaire du personnage (`EquipmentRef` variante OU
   * `CustomItem`), produit par `ItemDialog`. Poussé tel quel à l'attribution.
   */
  line: EquipmentLine;
  /**
   * L'objet a-t-il déjà été tiré dans le cycle courant ? Persistant : le tirage évite
   * les non-servis jusqu'à ce que le MJ « réinitialise » la réserve.
   */
  served: boolean;
}

/**
 * Catégorie de l'inventaire permanent du MJ — regroupement libre, renommable et
 * repliable, purement organisationnel (aucune règle de jeu attachée).
 */
export interface GmInventoryCategory {
  /** Clé stable (UUID). */
  id: string;
  /** Nom affiché, librement édité par le MJ. */
  name: string;
  /** La catégorie est-elle repliée dans le tiroir ? Persistant, propre au MJ. */
  collapsed: boolean;
}

/**
 * Objet de l'inventaire PERMANENT du MJ — à PART de la réserve piochée au hasard
 * (`LootItem`/`loot`) : préparé pour être distribué À LA MAIN (pas de tirage), classé
 * dans une catégorie (`categoryId`) ou non (`null`).
 */
export interface GmInventoryItem {
  /** Clé stable (UUID) — ancre de glisser-déposer et `key` React. */
  id: string;
  /** Même forme que `LootItem.line`, produite par `ItemDialog`. */
  line: EquipmentLine;
  /** Catégorie d'appartenance, ou `null` = « Sans catégorie ». */
  categoryId: string | null;
}

/**
 * Inventaire permanent du MJ (extension PER-200) — réserve SŒUR de `loot` mais
 * distincte : un objet n'appartient qu'à UNE des deux réserves à la fois (le
 * glisser-déposer entre les deux RELOCALISE l'objet, ne le duplique jamais).
 */
export interface GmInventory {
  categories: GmInventoryCategory[];
  items: GmInventoryItem[];
}

/**
 * PNJ du MJ (PER-428, socle) — nom seul pour l'instant. Persisté dans une table
 * DÉDIÉE `campaign_npcs` — PAS un jsonb sur `Campaign` comme les entités
 * ci-dessus (rumeurs/butin/inventaire) — car les champs riches à venir (PER-429 :
 * `gm_notes` privées, statistiques de combat) ne doivent JAMAIS fuiter à un
 * joueur : la RLS Postgres filtre par LIGNE, pas par colonne dans un jsonb. Voir
 * le commentaire de la migration 0029 et de `fetchNpcs`/`rowToNpc` (`repo.ts`)
 * pour la règle complète. 100% MJ tant qu'aucun écran joueur n'existe pour les PNJ.
 */
export interface Npc {
  /** Clé stable (UUID, générée par la base). */
  id: string;
  /** Campagne propriétaire (FK `campaign_npcs.campaign_id`). */
  campaignId: string;
  /** Nom affiché, seul champ obligatoire de ce socle. */
  name: string;
  /** Horodatage ISO recopié de la base. */
  createdAt: string;
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
  /**
   * Réserve de rumeurs de taverne du MJ (PER-199). Vide par défaut (`[]`), jamais
   * `null` (colonne `not null default '[]'`). Lecture défensive via `parseRumors`.
   */
  rumors: TavernRumor[];
  /**
   * Réserve d'objets de butin du MJ (PER-200). Vide par défaut (`[]`), jamais `null`
   * (colonne `not null default '[]'`). Lecture défensive via `parseLoot`.
   */
  loot: LootItem[];
  /**
   * Inventaire PERMANENT du MJ — à part de `loot` (extension PER-200) : objets
   * distribués à la main, classés en catégories. Vide par défaut, jamais `null`
   * (colonne `not null default '{"categories":[],"items":[]}'`). Lecture défensive
   * via `parseGmInventory`.
   */
  gmInventory: GmInventory;
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

/**
 * Règles par défaut : on préserve le comportement historique (armes à feu OK, dé
 * de vie à la montée de niveau désactivé — les PV fixes du livre s'appliquent).
 */
export const DEFAULT_CAMPAIGN_RULES: CampaignRules = {
  firearmsAllowed: true,
  hitDieOnLevelUp: false,
};
