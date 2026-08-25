/**
 * Accès aux données « bibliothèque de combats préparés » (PER-448) — table
 * `campaign_encounter_preset` (migration 0041), via le client Supabase navigateur.
 *
 * Portée CAMPAGNE, PLUSIEURS presets par campagne (contrairement à `campaign_combat`,
 * une seule ligne). Réservé au MJ propriétaire (RLS 0041, `owner_all` — aucune lecture
 * membre : un preset n'est jamais montré à un joueur).
 *
 * Les fonctions **lèvent** en cas d'erreur Supabase (l'appelant capte).
 */
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import type { Json } from '@/lib/supabase/types';
import { reviveEntries, type EncounterPreset, type EncounterPresetEntry } from './encounterPreset';

/** Ligne relue de `campaign_encounter_preset`, entrées reconstruites défensivement. */
export type EncounterPresetRow = EncounterPreset;

/** Liste les presets d'une campagne, dans l'ordre de création. */
export async function listEncounterPresets(campaignId: string): Promise<EncounterPresetRow[]> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('campaign_encounter_preset')
    .select('id, name, note, entries')
    .eq('campaign_id', campaignId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    note: row.note ?? undefined,
    entries: reviveEntries(row.entries),
  }));
}

/** Crée un preset et renvoie son id. */
export async function createEncounterPreset(
  campaignId: string,
  input: { name: string; note?: string; entries: EncounterPresetEntry[] },
): Promise<string> {
  const supabase = createBrowserSupabaseClient();
  const { data, error } = await supabase
    .from('campaign_encounter_preset')
    .insert({
      campaign_id: campaignId,
      name: input.name,
      note: input.note ?? null,
      entries: input.entries as unknown as Json,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/** Champs modifiables d'un preset. Une clé absente laisse la valeur en place. */
export interface UpdateEncounterPresetPatch {
  name?: string;
  note?: string | null;
  entries?: EncounterPresetEntry[];
}

/** Modifie un preset existant (renommage, note, composition). */
export async function updateEncounterPreset(
  id: string,
  patch: UpdateEncounterPresetPatch,
): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const update: { name?: string; note?: string | null; entries?: Json } = {};
  if (patch.name !== undefined) update.name = patch.name;
  if (patch.note !== undefined) update.note = patch.note;
  if (patch.entries !== undefined) update.entries = patch.entries as unknown as Json;
  const { error } = await supabase.from('campaign_encounter_preset').update(update).eq('id', id);
  if (error) throw error;
}

/** Supprime un preset. */
export async function deleteEncounterPreset(id: string): Promise<void> {
  const supabase = createBrowserSupabaseClient();
  const { error } = await supabase.from('campaign_encounter_preset').delete().eq('id', id);
  if (error) throw error;
}
