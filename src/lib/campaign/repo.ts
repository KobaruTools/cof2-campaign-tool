/**
 * Accès aux données « Campagne » côté cloud (PER-190) — CRUD via le client
 * Supabase **navigateur**, scopé par la RLS propriétaire (`owner_id = auth.uid()`,
 * migration 0001). Ce module est le seul point de contact entre l'UI et la table
 * `public.campaigns` ; le store `campaigns` s'appuie dessus et n'en garde qu'un
 * cache mémoire.
 *
 * Toutes les fonctions **lèvent** en cas d'erreur Supabase (le store les capte et
 * expose un état d'erreur à l'UI). Le mapping ligne → `Campaign` est isolé dans
 * `rowToCampaign` (fonction pure, testée).
 */
import type { EquipmentLine } from '@/lib/character/types';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Database, Json } from '@/lib/supabase/types';
import {
  DEFAULT_CAMPAIGN_RULES,
  type Campaign,
  type CampaignRules,
  type GmInventory,
  type LootItem,
  type Npc,
  type NpcCategory,
  type TavernRumor,
} from './types';

type CampaignRow = Database['public']['Tables']['campaigns']['Row'];
type NpcRow = Database['public']['Tables']['campaign_npcs']['Row'];

/**
 * Parse défensif de la colonne `rules` (jsonb) vers `CampaignRules`. La valeur
 * stockée peut être partielle (défaut base `{}`) ou d'un ancien format : on
 * retombe sur les règles par défaut champ par champ, sans jamais lever.
 */
export function parseRules(raw: Json): CampaignRules {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    firearmsAllowed:
      typeof obj.firearmsAllowed === 'boolean'
        ? obj.firearmsAllowed
        : DEFAULT_CAMPAIGN_RULES.firearmsAllowed,
    hitDieOnLevelUp:
      typeof obj.hitDieOnLevelUp === 'boolean'
        ? obj.hitDieOnLevelUp
        : DEFAULT_CAMPAIGN_RULES.hitDieOnLevelUp,
  };
}

/**
 * Parse défensif de la colonne `rumors` (jsonb) vers `TavernRumor[]` (PER-199). La
 * valeur stockée est un blob opaque côté base : on n'accepte QUE les éléments bien
 * formés (`id`/`text` chaînes, `served` booléen), on ignore les autres, et on ne
 * lève jamais. Une valeur non-tableau (ancien format, `null`) → réserve vide.
 */
export function parseRumors(raw: Json): TavernRumor[] {
  if (!Array.isArray(raw)) return [];
  const out: TavernRumor[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const { id, text, served } = item as Record<string, unknown>;
      if (typeof id === 'string' && typeof text === 'string') {
        out.push({ id, text, served: served === true });
      }
    }
  }
  return out;
}

/**
 * Une valeur brute est-elle une `EquipmentLine` PLAUSIBLE ? Même niveau de confiance
 * que l'équipement des personnages (formes produites par `ItemDialog`, validées côté
 * client, blob opaque en base) : on vérifie le DISCRIMINANT — objet libre (`custom:true`
 * + `name` chaîne) OU référence catalogue (`itemId` chaîne) — sans revalider chaque
 * champ optionnel. La ligne est conservée telle quelle (poussée intacte à l'inventaire).
 */
function isPlausibleEquipmentLine(v: unknown): v is EquipmentLine {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  if (o.custom === true) return typeof o.name === 'string';
  return typeof o.itemId === 'string';
}

/**
 * Parse défensif de la colonne `loot` (jsonb) vers `LootItem[]` (PER-200). Même esprit
 * que `parseRumors` : on n'accepte QUE les éléments bien formés (`id` chaîne + `line`
 * plausible), on ignore les autres, on ne lève jamais. Une valeur non-tableau (ancien
 * format, `null`) → réserve vide.
 */
export function parseLoot(raw: Json): LootItem[] {
  if (!Array.isArray(raw)) return [];
  const out: LootItem[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const { id, line, served } = item as Record<string, unknown>;
      if (typeof id === 'string' && isPlausibleEquipmentLine(line)) {
        out.push({ id, line, served: served === true });
      }
    }
  }
  return out;
}

/**
 * Parse défensif de la colonne `gm_inventory` (jsonb) vers `GmInventory` — inventaire
 * PERMANENT du MJ, à part de `loot` (extension PER-200). Même esprit que `parseLoot` :
 * on n'accepte QUE les éléments bien formés, on ignore les autres, on ne lève jamais.
 * Une valeur non-objet (ancien format, `null`) → inventaire vide. Un item dont
 * `categoryId` ne pointe vers AUCUNE catégorie retombe sur `null` (garde-fou
 * catégorie supprimée par ailleurs / donnée corrompue).
 */
export function parseGmInventory(raw: Json): GmInventory {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const rawCategories = Array.isArray(obj.categories) ? obj.categories : [];
  const categories = rawCategories.flatMap((c) => {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return [];
    const { id, name, collapsed } = c as Record<string, unknown>;
    if (typeof id !== 'string' || typeof name !== 'string') return [];
    return [{ id, name, collapsed: collapsed === true }];
  });
  const categoryIds = new Set(categories.map((c) => c.id));

  const rawItems = Array.isArray(obj.items) ? obj.items : [];
  const items = rawItems.flatMap((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) return [];
    const { id, line, categoryId } = item as Record<string, unknown>;
    if (typeof id !== 'string' || !isPlausibleEquipmentLine(line)) return [];
    return [
      {
        id,
        line,
        categoryId: typeof categoryId === 'string' && categoryIds.has(categoryId) ? categoryId : null,
      },
    ];
  });

  return { categories, items };
}

/**
 * Parse défensif de la colonne `npc_categories` (jsonb) vers `NpcCategory[]` (PER-430).
 * Même esprit que `parseGmInventory.categories` : on n'accepte QUE les éléments bien
 * formés (`id`/`name` chaînes), on ignore les autres, on ne lève jamais. Une valeur
 * non-tableau (ancien format, `null`) → réserve vide.
 */
export function parseNpcCategories(raw: Json): NpcCategory[] {
  if (!Array.isArray(raw)) return [];
  const out: NpcCategory[] = [];
  for (const item of raw) {
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      const { id, name, collapsed } = item as Record<string, unknown>;
      if (typeof id === 'string' && typeof name === 'string') {
        out.push({ id, name, collapsed: collapsed === true });
      }
    }
  }
  return out;
}

/** Mappe une ligne SQL `campaigns` vers l'entité `Campaign` de l'application. */
export function rowToCampaign(row: CampaignRow): Campaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    rules: parseRules(row.rules),
    rumors: parseRumors(row.rumors),
    loot: parseLoot(row.loot),
    gmInventory: parseGmInventory(row.gm_inventory),
    npcCategories: parseNpcCategories(row.npc_categories),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Toutes les campagnes possédées par l'utilisateur courant (RLS), triées par nom. */
export async function fetchCampaigns(): Promise<Campaign[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('campaigns')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToCampaign);
}

/**
 * Crée une campagne possédée par l'utilisateur courant. `owner_id` est posé
 * explicitement depuis la session (la RLS `with check` le valide contre
 * `auth.uid()`). Les `rules` sont posées **dès la création** (assistant PER-198,
 * qui recueille les règles de table avant de créer) ; à défaut, on retombe sur le
 * défaut historique (armes à feu OK).
 */
export async function insertCampaign(input: {
  name: string;
  description?: string | null;
  rules?: CampaignRules;
}): Promise<Campaign> {
  const supabase = createBrowserSupabaseClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!user) throw new Error('Session absente : impossible de créer une campagne.');

  const { data, error } = await supabase
    .from('campaigns')
    .insert({
      owner_id: user.id,
      name: input.name,
      description: input.description ?? null,
      rules: (input.rules ?? DEFAULT_CAMPAIGN_RULES) as unknown as Json,
    })
    .select('*')
    .single();
  if (error) throw error;
  return rowToCampaign(data);
}

/**
 * Met à jour le nom, les notes, les règles de table, la réserve de rumeurs (PER-199)
 * et/ou la réserve de butin (PER-200) d'une campagne (RLS propriétaire). Écriture
 * **simple** (pas de verrou optimiste) : la table `campaigns` n'a pas de colonne
 * `version` et l'édition est mono-propriétaire (le MJ, seul) — pas de scénario de
 * concurrence à arbitrer. Les `rules`/`rumors`/`loot`/`gmInventory` sont sérialisées
 * telles quelles vers leur colonne jsonb ; leur relecture reste défensive
 * (`parseRules`/`parseRumors`/`parseLoot`/`parseGmInventory`).
 */
export async function updateCampaign(
  id: string,
  patch: {
    name?: string;
    description?: string | null;
    rules?: CampaignRules;
    rumors?: TavernRumor[];
    loot?: LootItem[];
    gmInventory?: GmInventory;
    npcCategories?: NpcCategory[];
  },
): Promise<Campaign> {
  const supabase = createBrowserSupabaseClient();
  const { rules, rumors, loot, gmInventory, npcCategories, ...rest } = patch;
  const row: Database['public']['Tables']['campaigns']['Update'] = { ...rest };
  if (rules) row.rules = rules as unknown as Json;
  if (rumors) row.rumors = rumors as unknown as Json;
  if (loot) row.loot = loot as unknown as Json;
  if (gmInventory) row.gm_inventory = gmInventory as unknown as Json;
  if (npcCategories) row.npc_categories = npcCategories as unknown as Json;
  const { data, error } = await supabase
    .from('campaigns')
    .update(row)
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToCampaign(data);
}

/**
 * Supprime une campagne. La base répercute les FK (migration 0001) : les
 * **joueurs** de la campagne partent en cascade (`ON DELETE CASCADE`), les
 * **personnages** cloud sont détachés (`ON DELETE SET NULL`). Le détachement des
 * personnages encore **locaux** (localStorage) est fait par le store appelant.
 */
export async function deleteCampaign(id: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from('campaigns').delete().eq('id', id);
  if (error) throw error;
}

/** Mappe une ligne SQL `campaign_npcs` vers l'entité `Npc` de l'application. */
export function rowToNpc(row: NpcRow): Npc {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    name: row.name,
    role: row.role,
    ancestryId: row.ancestry_id,
    sex: row.sex as Npc['sex'],
    categoryId: row.category_id,
    challengeRating: row.challenge_rating,
    location: row.location,
    disposition: row.disposition as Npc['disposition'],
    status: row.status as Npc['status'],
    description: row.description,
    descriptionVisibleToPlayers: row.description_visible_to_players,
    gmNotes: row.gm_notes,
    linkedCharacterIds: row.linked_character_ids,
    createdAt: row.created_at,
  };
}

/** Champs éditables d'un PNJ (formulaire PER-429), tous optionnels à la création. */
export interface NpcInput {
  name: string;
  role?: string | null;
  ancestryId?: string | null;
  sex?: Npc['sex'];
  categoryId?: string | null;
  challengeRating?: number | null;
  location?: string | null;
  disposition?: Npc['disposition'];
  status?: Npc['status'];
  description?: string | null;
  descriptionVisibleToPlayers?: boolean;
  gmNotes?: string | null;
  linkedCharacterIds?: string[];
}

type NpcRowUpdate = Database['public']['Tables']['campaign_npcs']['Update'];

/** Mappe un `NpcInput` (partiel) vers les colonnes SQL correspondantes. */
function npcInputToRow(input: Partial<NpcInput>): NpcRowUpdate {
  const row: NpcRowUpdate = {};
  if (input.name !== undefined) row.name = input.name;
  if (input.role !== undefined) row.role = input.role;
  if (input.ancestryId !== undefined) row.ancestry_id = input.ancestryId;
  if (input.sex !== undefined) row.sex = input.sex;
  if (input.categoryId !== undefined) row.category_id = input.categoryId;
  if (input.challengeRating !== undefined) row.challenge_rating = input.challengeRating;
  if (input.location !== undefined) row.location = input.location;
  if (input.disposition !== undefined) row.disposition = input.disposition;
  if (input.status !== undefined) row.status = input.status;
  if (input.description !== undefined) row.description = input.description;
  if (input.descriptionVisibleToPlayers !== undefined) {
    row.description_visible_to_players = input.descriptionVisibleToPlayers;
  }
  if (input.gmNotes !== undefined) row.gm_notes = input.gmNotes;
  if (input.linkedCharacterIds !== undefined) row.linked_character_ids = input.linkedCharacterIds;
  return row;
}

/**
 * Tous les PNJ d'une campagne (RLS propriétaire, migration 0029), triés par nom.
 *
 * ⚠️ Cette fonction — comme toute lecture de `campaign_npcs` — ne doit JAMAIS
 * être exposée telle quelle à un écran joueur : les champs riches à venir
 * (PER-429, `gm_notes` privées et statistiques de combat) sont sensibles, et la
 * RLS Postgres filtre par LIGNE, pas par colonne. Le jour où un écran joueur doit
 * afficher un PNJ, il DOIT passer par une vue/RPC serveur ne sélectionnant que
 * `name`+`description` (et seulement si publiée) — jamais cet accès client brut.
 */
export async function fetchNpcs(campaignId: string): Promise<Npc[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('campaign_npcs')
    .select('*')
    .eq('campaign_id', campaignId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map(rowToNpc);
}

/** Crée un PNJ pour une campagne possédée par l'utilisateur courant (fiche complète, PER-429). */
export async function insertNpc(campaignId: string, input: NpcInput): Promise<Npc> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('campaign_npcs')
    .insert({ ...npcInputToRow(input), campaign_id: campaignId, name: input.name })
    .select('*')
    .single();
  if (error) throw error;
  return rowToNpc(data);
}

/** Met à jour un PNJ (édition de la fiche complète, PER-429). Écriture simple, pas de verrou optimiste. */
export async function updateNpc(id: string, patch: Partial<NpcInput>): Promise<Npc> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('campaign_npcs')
    .update(npcInputToRow(patch))
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return rowToNpc(data);
}

/** Supprime un PNJ. */
export async function deleteNpc(id: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from('campaign_npcs').delete().eq('id', id);
  if (error) throw error;
}
