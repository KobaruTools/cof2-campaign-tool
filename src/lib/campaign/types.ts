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
import type { EquipmentLine, Sex } from '../character/types';
import type { CustomCreature } from '../session/customCreature';
import { SIDE_ACCENT } from '../ui/creature';

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
  /**
   * Règle optionnelle d'ENCOMBREMENT (PER-447) — tirée du supplément payant *Atlas* (p. 156-158),
   * PAS du livre de base. Ajoute une valeur d'encombrement (petit/moyen/grand) aux objets et, une
   * fois activée, propose un champ de poids à la création d'un objet personnalisé. Le calcul du
   * total par personnage et des paliers (essoufflé/ralenti/immobilisé) n'est PAS encore branché
   * (ticket séparé) : à `true`, seule la donnée est collectée. Défaut `false` : comportement
   * historique inchangé (aucun poids suivi).
   */
  encumbranceEnabled: boolean;
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
 * Disposition d'un PNJ envers les PJ (PER-429) — badge coloré sur sa carte.
 * `NPC_DISPOSITION_ACCENT`/`NPC_DISPOSITION_LABELS` en portent l'affichage.
 */
export type NpcDisposition = 'ally' | 'enemy' | 'neutral';

/** Statut de rencontre d'un PNJ (PER-429). Voir `NPC_STATUS_LABELS`. */
export type NpcStatus = 'not-encountered' | 'encountered' | 'dead';

/**
 * Couleurs d'accent par disposition (PER-429) — allié/ennemi RÉUTILISENT
 * `SIDE_ACCENT` (écran de MJ, PER-249) ; neutre ambre nouveau pour ce ticket.
 */
export const NPC_DISPOSITION_ACCENT: Record<NpcDisposition, string> = {
  ally: SIDE_ACCENT.ally,
  enemy: SIDE_ACCENT.enemy,
  neutral: '#ffb74d',
};

/** Libellés français de la disposition (badges + formulaire). */
export const NPC_DISPOSITION_LABELS: Record<NpcDisposition, string> = {
  ally: 'Allié',
  enemy: 'Ennemi',
  neutral: 'Neutre',
};

/** Libellés français du statut de rencontre (badges + formulaire). */
export const NPC_STATUS_LABELS: Record<NpcStatus, string> = {
  'not-encountered': 'Pas encore rencontré',
  encountered: 'Rencontré',
  dead: 'Mort',
};

/**
 * Catégorie de PNJ (PER-430) — regroupement libre, renommable et repliable, MÊME
 * FORME que `GmInventoryCategory` mais persistée séparément (`campaigns.npc_categories`,
 * jsonb, posée par la migration 0029) : les PNJ vivent dans leur table dédiée
 * `campaign_npcs` (voir `Npc`), donc leur rattachement à une catégorie passe par
 * `Npc.categoryId`, PAS par un tableau `items` comme `GmInventory`.
 */
export interface NpcCategory {
  /** Clé stable (UUID). */
  id: string;
  /** Nom affiché, librement édité par le MJ. */
  name: string;
  /** La catégorie est-elle repliée dans le tiroir ? Persistant, propre au MJ. */
  collapsed: boolean;
}

/**
 * Catégorie de combat préparé (PER-448, retour propriétaire) — MÊME FORME que
 * `NpcCategory`, persistée séparément (`campaigns.encounter_preset_categories`,
 * jsonb, posée par la migration 0042) : les combats préparés vivent dans leur
 * table dédiée `campaign_encounter_preset` (voir `EncounterPreset`), donc leur
 * rattachement à une catégorie passe par `EncounterPreset.categoryId`.
 */
export interface EncounterPresetCategory {
  /** Clé stable (UUID). */
  id: string;
  /** Nom affiché, librement édité par le MJ. */
  name: string;
  /** La catégorie est-elle repliée dans le tiroir ? Persistant, propre au MJ. */
  collapsed: boolean;
}

/**
 * PNJ du MJ (PER-428 socle + PER-429 fiche complète). Persisté dans une table
 * DÉDIÉE `campaign_npcs` — PAS un jsonb sur `Campaign` comme les entités
 * ci-dessus (rumeurs/butin/inventaire) — car `gmNotes` (privées) et les futures
 * statistiques de combat ne doivent JAMAIS fuiter à un joueur : la RLS Postgres
 * filtre par LIGNE, pas par colonne dans un jsonb. Voir le commentaire des
 * migrations 0029/0030 et de `fetchNpcs`/`rowToNpc` (`repo.ts`) pour la règle
 * complète. 100% MJ tant qu'aucun écran joueur n'existe pour les PNJ.
 */
export interface Npc {
  /** Clé stable (UUID, générée par la base). */
  id: string;
  /** Campagne propriétaire (FK `campaign_npcs.campaign_id`). */
  campaignId: string;
  /** Nom affiché, seul champ obligatoire. */
  name: string;
  /** Rôle court, affiché en sous-titre de la carte (ex. « Aubergiste »). */
  role: string | null;
  /**
   * Peuple (PER-432) — purement narratif, AUCUNE carac/stat dérivée n'en dépend
   * (contrairement à `Character.ancestryId`). Référence un id du registre
   * `ancestries` (`src/data/ancestries.ts`, `@/data`), SANS FK en base — même
   * motif que `linkedCharacterIds`. `null` = non renseigné, ou id d'un peuple
   * payant non chargé côté client (traité comme absent par l'UI).
   */
  ancestryId: string | null;
  /**
   * Genre (PER-433) — purement narratif, même type `Sex` que le personnage-joueur
   * (`Identity.sex`). Sert au générateur de nom (`pickName`, tri par
   * `Ancestry.names.male`/`female`) : sans genre renseigné, pas de génération.
   * `null` = non renseigné.
   */
  sex: Sex | null;
  /** Catégorie d'appartenance (PER-430), ou `null` = « Sans catégorie ». Référence un id de
   * `Campaign.npcCategories` SANS FK en base — même motif que `ancestryId`. */
  categoryId: string | null;
  /**
   * Niveau de Challenge (stub posé par PER-430 pour que le tri « par NC » fonctionne
   * dès maintenant) — DÉRIVÉ de `stats.nc` par `deriveChallengeRatingFromStats` (`npc.ts`)
   * à chaque enregistrement du formulaire (PER-431), jamais saisi séparément. `null` =
   * pas de bloc de stats, ou NC non renseigné/non numérique dans le bloc — retombe en
   * fin de liste au tri.
   */
  challengeRating: number | null;
  /**
   * Statistiques de combat (PER-431), section repliée par défaut du formulaire. COPIE
   * FIGÉE au format `CustomCreature` (même forme qu'une créature créée à la main sur le
   * tracker) — que le MJ l'ait saisie lui-même ou copiée depuis une entrée du bestiaire
   * au moment de la sélection (`customCreatureFromBestiary`) : une fois copiée, elle
   * n'a plus aucun lien avec l'entrée d'origine, éditable librement. `null` = aucune
   * statistique renseignée.
   */
  stats: CustomCreature | null;
  /** Lieu libre, SÉPARÉ de la description — pont volontaire vers un futur système de Lieux. */
  location: string | null;
  /** Disposition envers les PJ — badge coloré sur la carte. */
  disposition: NpcDisposition;
  /** Statut de rencontre. */
  status: NpcStatus;
  /**
   * Description libre, POTENTIELLEMENT publique un jour (`descriptionVisibleToPlayers`).
   * Personne ne la lit côté joueur aujourd'hui — aucun écran joueur PNJ n'existe.
   */
  description: string | null;
  /** Bascule de publication de `description` — désactivée par défaut, aucun consommateur pour l'instant. */
  descriptionVisibleToPlayers: boolean;
  /**
   * Notes du MJ — TOUJOURS privées, SANS bascule, jamais destinées à un joueur.
   * Visuellement séparées de `description` dans le formulaire (encart « MJ seul »).
   */
  gmNotes: string | null;
  /** Personnages joueurs de la campagne liés à ce PNJ (`Character.id[]`), sans FK en base. */
  linkedCharacterIds: string[];
  /** Horodatage ISO recopié de la base. */
  createdAt: string;
}

/**
 * Vue PUBLIQUE d'un PNJ, telle que renvoyée au joueur par le RPC
 * `fetch_campaign_npcs_for_player` (migration 0037) — onglet « PNJ » de la
 * fiche personnage. Ne contient QUE ce qui n'est jamais sensible : ni `stats`
 * (caractéristiques de combat), ni `gmNotes`, ni `challengeRating` (dérivé des
 * stats), ni `categoryId`/`linkedCharacterIds` (organisation interne du MJ).
 * `description` est déjà nettoyée côté serveur (`null` si le MJ ne l'a pas
 * publiée via `descriptionVisibleToPlayers`) — le client n'a PAS à revérifier
 * cette bascule. N'inclut que les PNJ dont `status !== 'not-encountered'`
 * (déjà filtré côté RPC).
 */
export interface PlayerNpc {
  id: string;
  name: string;
  role: string | null;
  ancestryId: string | null;
  sex: Sex | null;
  location: string | null;
  disposition: NpcDisposition;
  status: NpcStatus;
  description: string | null;
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
  /**
   * Catégories de PNJ (PER-430) — vide par défaut (`[]`), jamais `null` (colonne
   * `not null default '[]'`, posée par la migration 0029). Lecture défensive via
   * `parseNpcCategories`.
   */
  npcCategories: NpcCategory[];
  /**
   * Catégories de combats préparés (PER-448) — vide par défaut (`[]`), jamais
   * `null` (colonne `not null default '[]'`, posée par la migration 0042).
   * Lecture défensive via `parseEncounterPresetCategories`.
   */
  encounterPresetCategories: EncounterPresetCategory[];
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
  encumbranceEnabled: false,
};
