/**
 * Contexte de règles assemblé pour le moteur de légalité/conformité
 * (`canAcquireFeature`, `checkCompliance`). Le moteur reste pur et reçoit ses
 * données par injection ; ce module fait le câblage à partir de `@/data` et
 * sert de source unique au wizard (récapitulatif) et à la fiche (avertissements).
 */
import { classById, families, featureById, pathById, progression } from '@/data';
import type { RulesContext } from '@/lib/engine';

const familyById = new Map(families.map((f) => [f.id, f]));

export const rulesContext: RulesContext = {
  featureById,
  pathById,
  classById,
  familyById,
  progression,
};
