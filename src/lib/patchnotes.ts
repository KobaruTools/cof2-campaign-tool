import rawPatchnotes from '@/data/patchnotes.json';

/**
 * Une entrée de patch note affichée aux joueurs (PER-460). `id` est un simple
 * compteur (position dans le tableau) : jamais de SHA ni de référence git dans
 * ce fichier, c'est le JSON servi au site.
 */
export interface PatchnoteEntry {
  id: number;
  date: string;
  items: string[];
}

export const patchnotes: PatchnoteEntry[] = rawPatchnotes as PatchnoteEntry[];

/** `0` si aucune entrée n'existe encore. */
export function getLatestPatchnoteId(): number {
  return patchnotes.length > 0 ? patchnotes[patchnotes.length - 1].id : 0;
}
