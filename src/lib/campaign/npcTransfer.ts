/**
 * Enveloppe d'export d'un PNJ de campagne en JSON (PER-505) — même motif que
 * l'enveloppe d'export personnage (`character/transfer.ts`, PER-182), mais SANS
 * contexte de rattachement : il n'existe aucun import PNJ pour l'instant, l'export
 * sert uniquement au partage/sauvegarde hors app (ex. transmission à un autre MJ,
 * copie manuelle dans un autre outil).
 *
 * Module PUR (aucun DOM, aucun store) — le téléchargement/presse-papier vivent
 * dans `npcTransferExport.ts`.
 */
import type { Npc } from './types';

/** Discriminant du fichier d'export PNJ. */
export const NPC_EXPORT_KIND = 'cof2-npc-export';

/** Version du format d'enveloppe (indépendante d'un éventuel futur `schemaVersion` PNJ). */
export const NPC_EXPORT_FORMAT_VERSION = 1;

/** Fichier d'export PNJ : juste l'enveloppe + le PNJ, sans contexte de rattachement. */
export interface NpcExportFile {
  kind: typeof NPC_EXPORT_KIND;
  version: number;
  npc: Npc;
}

/** Construit l'objet d'export enveloppé pour un PNJ. */
export function buildNpcExportFile(npc: Npc): NpcExportFile {
  return { kind: NPC_EXPORT_KIND, version: NPC_EXPORT_FORMAT_VERSION, npc };
}
