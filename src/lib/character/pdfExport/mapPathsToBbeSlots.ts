/**
 * Route les groupes de voies (`PdfPathGroup.slot`, PER-202) vers les emplacements fixes de la
 * trame BBE : « Voie du peuple » (page 1) puis « Voie 1 » à « Voie 5 » + « Prestige »
 * (page 2). Au-delà de 5 voies de profil (cas RAW extrême), les suivantes sont
 * silencieusement tronquées — même esprit pragmatique que les autres simplifications
 * documentées en tête de `buildCharacterPdfData.ts`.
 */
import type { PdfPathGroup } from './buildCharacterPdfData';

export interface BbeSlots {
  peoplePath: PdfPathGroup | null;
  classPaths: PdfPathGroup[];
  prestigePath: PdfPathGroup | null;
}

export function mapPathsToBbeSlots(paths: PdfPathGroup[]): BbeSlots {
  return {
    peoplePath: paths.find((p) => p.slot === 'people') ?? null,
    classPaths: paths.filter((p) => p.slot === 'class').slice(0, 5),
    prestigePath: paths.find((p) => p.slot === 'prestige') ?? null,
  };
}
