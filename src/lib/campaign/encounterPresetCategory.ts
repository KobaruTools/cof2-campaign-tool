/**
 * Moteur PUR des catégories de combats préparés (PER-448, retour propriétaire) —
 * SŒUR de la section catégories de `npc.ts`. Les CATÉGORIES sont persistées sur
 * `Campaign.encounterPresetCategories` (jsonb) — pas dans la table dédiée
 * `campaign_encounter_preset` — d'où des fonctions séparées, qui opèrent sur
 * `EncounterPresetCategory[]` d'un côté et retournent, quand une catégorie
 * disparaît, les ids de combats préparés à recatégoriser en `null` côté appelant
 * (qui doit persister CHAQUE preset affecté via `updateEncounterPreset`, en plus
 * de la liste de catégories via `updateCampaign`).
 */
import type { EncounterPresetCategory } from './types';
import type { EncounterPreset } from '../session/encounterPreset';

function newId(): string {
  return crypto.randomUUID();
}

/** Ajoute une nouvelle catégorie de combat préparé (dépliée) en fin de liste. */
export function addEncounterPresetCategory(
  categories: EncounterPresetCategory[],
  name: string,
): EncounterPresetCategory[] {
  return [...categories, { id: newId(), name, collapsed: false }];
}

/** Renomme une catégorie existante. No-op si l'id est inconnu. */
export function renameEncounterPresetCategory(
  categories: EncounterPresetCategory[],
  categoryId: string,
  name: string,
): EncounterPresetCategory[] {
  return categories.map((c) => (c.id === categoryId ? { ...c, name } : c));
}

/** Replie/déplie une catégorie. No-op si l'id est inconnu. */
export function toggleEncounterPresetCategoryCollapsed(
  categories: EncounterPresetCategory[],
  categoryId: string,
): EncounterPresetCategory[] {
  return categories.map((c) => (c.id === categoryId ? { ...c, collapsed: !c.collapsed } : c));
}

/**
 * Supprime une catégorie. Les combats préparés ne sont JAMAIS supprimés :
 * `reassignedPresetIds` liste ceux qui la référençaient, pour que l'appelant les
 * recatégorise en `null` (mise à jour LOCALE via `reassignEncounterPresetsCategory`,
 * PERSISTÉE via `updateEncounterPreset` un par un — `categoryId` vit sur la ligne
 * `campaign_encounter_preset`, pas dans ce tableau de catégories).
 */
export function removeEncounterPresetCategory(
  categories: EncounterPresetCategory[],
  presets: EncounterPreset[],
  categoryId: string,
): { categories: EncounterPresetCategory[]; reassignedPresetIds: string[] } {
  return {
    categories: categories.filter((c) => c.id !== categoryId),
    reassignedPresetIds: presets.filter((p) => p.categoryId === categoryId).map((p) => p.id),
  };
}

/** Met à jour la `categoryId` locale des presets listés (après persistance serveur individuelle). */
export function reassignEncounterPresetsCategory(
  presets: EncounterPreset[],
  presetIds: string[],
  categoryId: string | null,
): EncounterPreset[] {
  const ids = new Set(presetIds);
  return presets.map((p) => (ids.has(p.id) ? { ...p, categoryId } : p));
}
