/**
 * Enveloppe d'export d'une créature de combat en JSON (idée joueur, réponse à PER-505 :
 * étendre l'export/copie JSON aux créatures — combat en cours ET combats préparés).
 * Même motif que l'enveloppe PNJ (`campaign/npcTransfer.ts`) : aucun contexte de
 * rattachement, aucun import prévu, sert au partage/sauvegarde hors app.
 *
 * Le blob exporté est le `Creature` TEL QU'AFFICHÉ sur la carte (synthétisé depuis
 * `CustomCreature` pour une créature manuelle, ou chargé depuis le bestiaire) —
 * `GmScreenCreatureCard`/`EncounterPresetEntryCard` le calculent déjà pour leur rendu.
 *
 * Module PUR (aucun DOM, aucun store) — le téléchargement/presse-papier vivent dans
 * `creatureTransferExport.ts`.
 */
import type { Creature } from '@/data/schema';
import type { CreatureListItem } from '@/lib/bestiary/types';
import { CUSTOM_CREATURE_SLUG } from './customCreature';

/** Discriminant du fichier d'export créature. */
export const CREATURE_EXPORT_KIND = 'cof2-creature-export';

/** Version du format d'enveloppe (indépendante d'un éventuel futur `schemaVersion` créature). */
export const CREATURE_EXPORT_FORMAT_VERSION = 1;

/** Fichier d'export créature : juste l'enveloppe + le bloc, sans contexte de rattachement. */
export interface CreatureExportFile {
  kind: typeof CREATURE_EXPORT_KIND;
  version: number;
  creature: Creature;
}

/** Construit l'objet d'export enveloppé pour une créature. */
export function buildCreatureExportFile(creature: Creature): CreatureExportFile {
  return { kind: CREATURE_EXPORT_KIND, version: CREATURE_EXPORT_FORMAT_VERSION, creature };
}

/**
 * Une créature d'une source PAYANTE (Le Compagnon) ne doit jamais voir son bloc complet
 * exporté : le JSON pourrait être partagé hors app (ex. Discord) et fuiter du contenu
 * gaté à un non-entitled — cf. CLAUDE.md. `list` peut être `null` (pas encore chargée) :
 * dans ce cas on refuse prudemment l'export plutôt que de le supposer gratuit.
 */
export function isBestiaryCreaturePaid(
  slug: string,
  list: readonly CreatureListItem[] | null,
  paidSourceIds: ReadonlySet<string>,
): boolean {
  const item = list?.find((i) => i.id === slug);
  if (!item) return true;
  return paidSourceIds.has(item.sourceId);
}

/**
 * Une créature créée à la main (`CUSTOM_CREATURE_SLUG`) est toujours exportable — aucun
 * contenu de livre dedans. Une créature du bestiaire ne l'est que si sa source n'est pas
 * payante (cf. `isBestiaryCreaturePaid`).
 */
export function isCreatureExportable(
  slug: string,
  list: readonly CreatureListItem[] | null,
  paidSourceIds: ReadonlySet<string>,
): boolean {
  return slug === CUSTOM_CREATURE_SLUG || !isBestiaryCreaturePaid(slug, list, paidSourceIds);
}
