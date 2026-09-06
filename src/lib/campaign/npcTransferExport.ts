'use client';

/**
 * Export d'un PNJ en fichier JSON ou presse-papier (PER-505), symétrique à
 * `character/transferExport.ts` (PER-182) — mais sans résolution de contexte
 * (pas de campagne/joueur à rattacher, cf. `npcTransfer.ts`).
 */
import { fileSlug } from '../character/summary';
import { buildNpcExportFile } from './npcTransfer';
import type { Npc } from './types';

/** JSON (texte) de l'enveloppe d'export d'un PNJ. */
function npcExportJson(npc: Npc): string {
  return JSON.stringify(buildNpcExportFile(npc), null, 2);
}

/** Enveloppe le PNJ en JSON et déclenche le téléchargement du fichier. */
export function downloadNpcExport(npc: Npc): void {
  const blob = new Blob([npcExportJson(npc)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileSlug(npc.name)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Enveloppe le PNJ en JSON et le copie dans le presse-papier. */
export async function copyNpcExportToClipboard(npc: Npc): Promise<void> {
  await navigator.clipboard.writeText(npcExportJson(npc));
}
