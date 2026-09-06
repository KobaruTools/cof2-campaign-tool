'use client';

/**
 * Export d'une créature de combat en fichier JSON ou presse-papier, symétrique à
 * `campaign/npcTransferExport.ts` (PER-505) — mais pour une créature de combat (bestiaire
 * gratuit ou manuelle), cf. `creatureTransfer.ts`.
 */
import type { Creature } from '@/data/schema';
import { fileSlug } from '@/lib/character/summary';
import { buildCreatureExportFile } from './creatureTransfer';

/** JSON (texte) de l'enveloppe d'export d'une créature. */
function creatureExportJson(creature: Creature): string {
  return JSON.stringify(buildCreatureExportFile(creature), null, 2);
}

/** Enveloppe la créature en JSON et déclenche le téléchargement du fichier. */
export function downloadCreatureExport(creature: Creature): void {
  const blob = new Blob([creatureExportJson(creature)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${fileSlug(creature.name)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Enveloppe la créature en JSON et la copie dans le presse-papier. */
export async function copyCreatureExportToClipboard(creature: Creature): Promise<void> {
  await navigator.clipboard.writeText(creatureExportJson(creature));
}
