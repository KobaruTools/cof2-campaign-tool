/**
 * Modèle PUR d'un « combat préparé à l'avance » (PER-448) — une RECETTE d'adversaires
 * (et éventuellement d'alliés/PNJ) que le MJ compose entre deux séances, indépendamment
 * du combat en cours (`GmCombatState`). SANS React ni accès réseau.
 *
 * Un preset ne stocke QUE la composition — pas de PV, pas d'id d'instance, pas d'état de
 * combat : ce n'est pas un combat, c'est ce qui permet d'en recréer un IDENTIQUE à chaque
 * lancement (`launchEncounterPreset`). Les personnages joueurs et leurs compagnons/montures
 * actifs n'y figurent JAMAIS : ils rejoignent le combat automatiquement au lancement, comme
 * ils le font déjà pour le combat en cours (`useGmScreenCombat`, `claimed`/`companionRoster`).
 *
 * Persisté table `campaign_encounter_preset` (migration 0041, `encounterPresetRepo.ts`),
 * réservé au MJ propriétaire de la campagne — jamais lu par un joueur.
 */
import type { CreatureSide } from '@/lib/ui/creature';
import {
  addCreatures,
  addCustomCreatures,
  clampAddCount,
  normalizeCreatureName,
  EMPTY_COMBAT_STATE,
  type GmCombatState,
} from './combatState';
import {
  normalizeCustomCreature,
  CUSTOM_CREATURE_SLUG,
  type CustomCreature,
} from './customCreature';
import { randomTieBreakSeed } from './initiativeOrder';

/** Longueur maximale du nom d'un preset. */
export const ENCOUNTER_PRESET_NAME_MAX_LENGTH = 60;

/** Longueur maximale de la note libre d'un preset. */
export const ENCOUNTER_PRESET_NOTE_MAX_LENGTH = 2000;

/** Nom par défaut d'un preset sans nom saisi (garde-fou : `name` reste obligatoire en base). */
export const ENCOUNTER_PRESET_DEFAULT_NAME = 'Combat sans nom';

/**
 * Un ajout groupé de créatures au preset — même granularité que `addCreatures`/
 * `addCustomCreatures` sur le combat en cours (« 5 gobelins » = UNE entrée, `count: 5`),
 * le lancement expansera chaque entrée en instances distinctes.
 */
export interface EncounterPresetEntry {
  /** Slug de la créature du bestiaire, ou `CUSTOM_CREATURE_SLUG` pour une créature manuelle. */
  slug: string;
  /** Bloc de stats saisi à la main — présent seulement si `slug === CUSTOM_CREATURE_SLUG`. */
  custom?: CustomCreature;
  /** Nom personnalisé partagé par les exemplaires de cette entrée. Absent = nom du bestiaire. */
  name?: string;
  /** Camp de cette entrée dans le preset. */
  side: CreatureSide;
  /** Nombre d'exemplaires à créer au lancement. Toujours ≥ 1. */
  count: number;
}

/** Un combat préparé à l'avance : nom, note libre, composition. */
export interface EncounterPreset {
  id: string;
  name: string;
  note?: string;
  entries: EncounterPresetEntry[];
}

/** Nom nettoyé et tronqué ; chaîne vide/espaces → nom par défaut (le champ reste obligatoire). */
export function normalizePresetName(raw: unknown): string {
  if (typeof raw !== 'string') return ENCOUNTER_PRESET_DEFAULT_NAME;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, ENCOUNTER_PRESET_NAME_MAX_LENGTH) : ENCOUNTER_PRESET_DEFAULT_NAME;
}

/** Note nettoyée et tronquée, ou `undefined` si vide — jamais persistée vide. */
export function normalizePresetNote(raw: unknown): string | undefined {
  if (typeof raw !== 'string') return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed.slice(0, ENCOUNTER_PRESET_NOTE_MAX_LENGTH) : undefined;
}

/**
 * Reconstruit défensivement UNE entrée relue (colonne `entries`, jamais garantie propre par
 * la base). Écarte une entrée dont le socle (slug, camp) n'est pas exploitable. Une entrée
 * manuelle (`custom` présent) dont le bloc n'a plus son socle obligatoire (initiative/PV/
 * défense) est écartée — même garde que `combatState.reviveCreatures`.
 */
function reviveEntry(raw: unknown): EncounterPresetEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const entry = raw as Partial<EncounterPresetEntry>;
  if (typeof entry.slug !== 'string' || !entry.slug) return null;
  if (entry.side !== 'ally' && entry.side !== 'enemy') return null;
  const count = clampAddCount(entry.count);
  const name = normalizeCreatureName(entry.name);
  if (entry.slug === CUSTOM_CREATURE_SLUG) {
    const custom = normalizeCustomCreature(entry.custom);
    if (!custom) return null;
    return { slug: CUSTOM_CREATURE_SLUG, custom, side: entry.side, count, ...(name ? { name } : {}) };
  }
  return { slug: entry.slug, side: entry.side, count, ...(name ? { name } : {}) };
}

/** Reconstruit défensivement la liste d'entrées relue (colonne `entries`). */
export function reviveEntries(raw: unknown): EncounterPresetEntry[] {
  if (!Array.isArray(raw)) return [];
  const out: EncounterPresetEntry[] = [];
  for (const item of raw) {
    const revived = reviveEntry(item);
    if (revived) out.push(revived);
  }
  return out;
}

/** Options d'ajout d'une entrée au preset — mêmes champs qu'`AddCreatureOptions`, sans visibilité. */
export interface AddPresetEntryOptions {
  side?: CreatureSide;
  name?: string;
  count?: number;
}

/** Ajoute une entrée « créature du bestiaire » à la composition d'un preset. */
export function addPresetEntry(
  entries: readonly EncounterPresetEntry[],
  slug: string,
  options: AddPresetEntryOptions = {},
): EncounterPresetEntry[] {
  const name = normalizeCreatureName(options.name);
  return [
    ...entries,
    {
      slug,
      side: options.side ?? 'enemy',
      count: clampAddCount(options.count ?? 1),
      ...(name ? { name } : {}),
    },
  ];
}

/**
 * Ajoute une entrée « créature créée à la main » à la composition d'un preset. No-op (liste
 * inchangée) si le socle obligatoire (initiative, PV, défense) est incomplet.
 */
export function addCustomPresetEntry(
  entries: readonly EncounterPresetEntry[],
  custom: CustomCreature,
  options: AddPresetEntryOptions = {},
): EncounterPresetEntry[] {
  const normalized = normalizeCustomCreature(custom);
  if (!normalized) return [...entries];
  const name = normalizeCreatureName(options.name);
  return [
    ...entries,
    {
      slug: CUSTOM_CREATURE_SLUG,
      custom: normalized,
      side: options.side ?? 'enemy',
      count: clampAddCount(options.count ?? 1),
      ...(name ? { name } : {}),
    },
  ];
}

/** Retire l'entrée à `index`. No-op si hors bornes. */
export function removePresetEntry(
  entries: readonly EncounterPresetEntry[],
  index: number,
): EncounterPresetEntry[] {
  if (index < 0 || index >= entries.length) return [...entries];
  return entries.filter((_e, i) => i !== index);
}

/**
 * Construit l'état de combat résultant du LANCEMENT d'un preset (PER-448) : un combat NEUF
 * (`EMPTY_COMBAT_STATE`), peuplé en expansant chaque entrée via les mêmes réducteurs purs que
 * l'ajout manuel au combat en cours (`addCreatures`/`addCustomCreatures`) — les PV sont donc
 * retirés à ce moment, jamais figés à la préparation.
 *
 * Les adversaires démarrent MASQUÉS aux joueurs par défaut (effet de surprise préparable à
 * l'avance) ; les alliés démarrent visibles. Ceci ignore volontairement toute visibilité qui
 * aurait pu être saisie en préparant l'entrée — le lancement est le seul moment qui compte,
 * la visibilité individuelle se règle ensuite normalement (bascule œil de la carte).
 *
 * Nouvelle graine de départage à égalité d'initiative (même geste qu'une réinitialisation de
 * combat, `resetCombat`) : un preset lancé EST un nouveau combat.
 */
export function launchEncounterPreset(preset: EncounterPreset): GmCombatState {
  let state = EMPTY_COMBAT_STATE;
  for (const entry of preset.entries) {
    const options = {
      side: entry.side,
      name: entry.name,
      count: entry.count,
      visible: entry.side !== 'enemy',
    };
    state = entry.custom
      ? addCustomCreatures(state, entry.custom, options)
      : addCreatures(state, entry.slug, options);
  }
  return { ...state, tieBreakSeed: randomTieBreakSeed() };
}
