'use client';

/**
 * Store de la « bibliothèque de combats préparés » par campagne (PER-448) —
 * au-dessus de la table `campaign_encounter_preset` (migration 0041). MJ seul auteur,
 * écriture DIRECTE (RLS `owner_all`) : pas de temps réel, pas de lecture joueur — un
 * preset n'est jamais montré à un joueur, contrairement au combat en cours.
 *
 * Sans variables d'env Supabase (mode 100 % local), la bibliothèque reste vide et
 * inerte plutôt que d'échouer bruyamment : la préparation à l'avance suppose une
 * campagne persistée en base.
 */
import { create } from 'zustand';
import {
  createEncounterPreset,
  deleteEncounterPreset,
  listEncounterPresets,
  updateEncounterPreset,
  type UpdateEncounterPresetPatch,
} from '@/lib/session/encounterPresetRepo';
import {
  addCustomPresetEntry,
  addPresetEntry,
  normalizePresetName,
  normalizePresetNote,
  removePresetEntry,
  type AddPresetEntryOptions,
  type EncounterPreset,
} from '@/lib/session/encounterPreset';
import type { CustomCreature } from '@/lib/session/customCreature';

export type EncounterPresetsStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unconfigured';

/** L'app est-elle branchée sur Supabase (variables d'env publiques présentes) ? */
function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

interface EncounterPresetsState {
  byCampaign: Record<string, EncounterPreset[]>;
  status: Record<string, EncounterPresetsStatus>;

  /** Charge les presets de la campagne. Idempotent (no-op si déjà chargée/en charge). */
  load: (campaignId: string) => Promise<void>;
  /** Crée un preset vide nommé, ajouté en fin de liste. */
  create: (campaignId: string, name: string) => Promise<void>;
  /** Renomme un preset. */
  rename: (campaignId: string, presetId: string, name: string) => Promise<void>;
  /** Modifie la note libre d'un preset. */
  setNote: (campaignId: string, presetId: string, note: string) => Promise<void>;
  /** Ajoute une entrée « créature du bestiaire » à la composition d'un preset. */
  addEntry: (
    campaignId: string,
    presetId: string,
    slug: string,
    options?: AddPresetEntryOptions,
  ) => Promise<void>;
  /** Ajoute une entrée « créature créée à la main » à la composition d'un preset. */
  addCustomEntry: (
    campaignId: string,
    presetId: string,
    custom: CustomCreature,
    options?: AddPresetEntryOptions,
  ) => Promise<void>;
  /** Retire l'entrée `index` de la composition d'un preset. */
  removeEntry: (campaignId: string, presetId: string, index: number) => Promise<void>;
  /** Duplique un preset (nouvelle ligne, nom suffixé « (copie) »). */
  duplicate: (campaignId: string, presetId: string) => Promise<void>;
  /** Supprime un preset. */
  remove: (campaignId: string, presetId: string) => Promise<void>;
}

export const useEncounterPresetsStore = create<EncounterPresetsState>()((set, get) => ({
  byCampaign: {},
  status: {},

  load: async (campaignId) => {
    const status = get().status[campaignId];
    if (status === 'loading' || status === 'ready') return;

    if (!isSupabaseConfigured()) {
      set((s) => ({ status: { ...s.status, [campaignId]: 'unconfigured' } }));
      return;
    }

    set((s) => ({ status: { ...s.status, [campaignId]: 'loading' } }));
    try {
      const presets = await listEncounterPresets(campaignId);
      set((s) => ({
        byCampaign: { ...s.byCampaign, [campaignId]: presets },
        status: { ...s.status, [campaignId]: 'ready' },
      }));
    } catch {
      set((s) => ({ status: { ...s.status, [campaignId]: 'error' } }));
    }
  },

  create: async (campaignId, name) => {
    const preset: Omit<EncounterPreset, 'id'> = { name: normalizePresetName(name), entries: [] };
    const id = await createEncounterPreset(campaignId, preset);
    set((s) => ({
      byCampaign: {
        ...s.byCampaign,
        [campaignId]: [...(s.byCampaign[campaignId] ?? []), { id, ...preset }],
      },
    }));
  },

  rename: async (campaignId, presetId, name) => {
    const normalized = normalizePresetName(name);
    await updateEncounterPreset(presetId, { name: normalized });
    patchPreset(set, campaignId, presetId, (p) => ({ ...p, name: normalized }));
  },

  setNote: async (campaignId, presetId, note) => {
    const normalized = normalizePresetNote(note);
    await updateEncounterPreset(presetId, { note: normalized ?? null });
    patchPreset(set, campaignId, presetId, (p) => ({ ...p, note: normalized }));
  },

  addEntry: async (campaignId, presetId, slug, options) => {
    await mutateEntries(set, get, campaignId, presetId, (entries) =>
      addPresetEntry(entries, slug, options),
    );
  },

  addCustomEntry: async (campaignId, presetId, custom, options) => {
    await mutateEntries(set, get, campaignId, presetId, (entries) =>
      addCustomPresetEntry(entries, custom, options),
    );
  },

  removeEntry: async (campaignId, presetId, index) => {
    await mutateEntries(set, get, campaignId, presetId, (entries) =>
      removePresetEntry(entries, index),
    );
  },

  duplicate: async (campaignId, presetId) => {
    const source = get().byCampaign[campaignId]?.find((p) => p.id === presetId);
    if (!source) return;
    const copy: Omit<EncounterPreset, 'id'> = {
      name: normalizePresetName(`${source.name} (copie)`),
      ...(source.note ? { note: source.note } : {}),
      entries: source.entries,
    };
    const id = await createEncounterPreset(campaignId, copy);
    set((s) => ({
      byCampaign: {
        ...s.byCampaign,
        [campaignId]: [...(s.byCampaign[campaignId] ?? []), { id, ...copy }],
      },
    }));
  },

  remove: async (campaignId, presetId) => {
    await deleteEncounterPreset(presetId);
    set((s) => ({
      byCampaign: {
        ...s.byCampaign,
        [campaignId]: (s.byCampaign[campaignId] ?? []).filter((p) => p.id !== presetId),
      },
    }));
  },
}));

/** Applique `patch` au preset `presetId` du store (mutation LOCALE, après écriture serveur). */
function patchPreset(
  set: (fn: (s: EncounterPresetsState) => Partial<EncounterPresetsState>) => void,
  campaignId: string,
  presetId: string,
  patch: (preset: EncounterPreset) => EncounterPreset,
): void {
  set((s) => ({
    byCampaign: {
      ...s.byCampaign,
      [campaignId]: (s.byCampaign[campaignId] ?? []).map((p) => (p.id === presetId ? patch(p) : p)),
    },
  }));
}

/**
 * Réducteur commun aux mutations de composition (ajout/retrait d'entrée) : calcule les
 * nouvelles entrées depuis l'état COURANT du store, persiste, puis répercute localement.
 * No-op silencieux si le preset est introuvable (store pas encore chargé).
 */
async function mutateEntries(
  set: (fn: (s: EncounterPresetsState) => Partial<EncounterPresetsState>) => void,
  get: () => EncounterPresetsState,
  campaignId: string,
  presetId: string,
  reduce: (entries: EncounterPreset['entries']) => EncounterPreset['entries'],
): Promise<void> {
  const preset = get().byCampaign[campaignId]?.find((p) => p.id === presetId);
  if (!preset) return;
  const entries = reduce(preset.entries);
  const patch: UpdateEncounterPresetPatch = { entries };
  await updateEncounterPreset(presetId, patch);
  patchPreset(set, campaignId, presetId, (p) => ({ ...p, entries }));
}
