/**
 * Illustrations de profil supplémentaires (au-delà des `default`/`alt` connues
 * de tous les profils) — importées du livre de base CO2, audit des planches
 * jamais utilisées par l'app (2026-08, cf. mémoire `pdf-illustrations-audit`).
 * Deux origines :
 *  - portraits de chapitre anonymes (`name` absent) : affichés « Illustration N » ;
 *  - portraits de l'annexe « Personnages prétirés » p.348-358 (`name` renseigné,
 *    un des 14 prétirés du livre) : affichés sous leur nom, toujours en dernier
 *    dans la liste de leur profil.
 *
 * Chaque entrée suppose que `/classes/<classId>-<n>.webp` existe déjà (importé
 * via `scratchpad/pdf-illustrations/import_to_app.py`, hors dépôt).
 */
import type { StaticPortraitVariant } from '@/lib/character/types';

export interface ClassPortraitExtra {
  variant: StaticPortraitVariant;
  /** Nom du personnage prétiré si l'illustration en est une, sinon absent (portrait de chapitre anonyme). */
  name?: string;
}

export const CLASS_PORTRAIT_EXTRAS: Record<string, ClassPortraitExtra[]> = {
  guerrier: [{ variant: 'alt3' }, { variant: 'alt4' }],
  barbare: [
    { variant: 'alt3' },
    { variant: 'alt4' },
    { variant: 'alt5' },
    { variant: 'alt6', name: 'Lhagva fille de Nuala' },
  ],
  chevalier: [{ variant: 'alt3' }, { variant: 'alt4', name: 'Mahardil al Issoum' }],
  druide: [{ variant: 'alt3' }, { variant: 'alt4' }, { variant: 'alt5' }],
  pretre: [{ variant: 'alt3' }, { variant: 'alt4', name: 'Elluwée Chanréa' }],
  magicien: [{ variant: 'alt3' }],
  sorcier: [{ variant: 'alt3' }, { variant: 'alt4', name: 'Tybur Prestepied' }],
  ensorceleur: [
    { variant: 'alt3' },
    { variant: 'alt4' },
    { variant: 'alt5' },
    { variant: 'alt6', name: 'Ionas Melenwë' },
  ],
  moine: [{ variant: 'alt3', name: 'Yellen Ëllee' }],
  voleur: [{ variant: 'alt3' }, { variant: 'alt4' }, { variant: 'alt5', name: 'Wilibert Sûreté' }],
  rodeur: [{ variant: 'alt3' }, { variant: 'alt4', name: 'Kamshaka' }],
  barde: [{ variant: 'alt3' }, { variant: 'alt4', name: 'Korléon Chanterune' }],
  forgesort: [{ variant: 'alt3' }, { variant: 'alt4' }, { variant: 'alt5' }],
  arquebusier: [{ variant: 'alt3' }],
};

/** Illustrations supplémentaires (au-delà d'Illustration 1/2) pour un profil, ou tableau vide. */
export function classPortraitExtras(classId: string): ClassPortraitExtra[] {
  return CLASS_PORTRAIT_EXTRAS[classId] ?? [];
}
