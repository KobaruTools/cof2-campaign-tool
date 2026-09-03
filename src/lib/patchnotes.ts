import rawPatchnotes from '@/data/patchnotes.json';
import type { PatchnoteTagId } from '@/data/patchnoteTags';

/** Un item de patch note, rattaché à une zone du site (PER-460). */
export interface PatchnoteItem {
  text: string;
  tag: PatchnoteTagId;
}

/**
 * Une entrée de patch note affichée aux joueurs (PER-460). `id` est un simple
 * compteur (position dans le tableau) : jamais de SHA ni de référence git dans
 * ce fichier, c'est le JSON servi au site.
 */
export interface PatchnoteEntry {
  id: number;
  date: string;
  items: PatchnoteItem[];
}

export const patchnotes: PatchnoteEntry[] = rawPatchnotes as PatchnoteEntry[];

/** `0` si aucune entrée n'existe encore. */
export function getLatestPatchnoteId(): number {
  return patchnotes.length > 0 ? patchnotes[patchnotes.length - 1].id : 0;
}
