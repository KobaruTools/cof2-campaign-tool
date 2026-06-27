import type { WizardDraft } from '@/lib/character/wizard';

/** Contrat commun à toutes les étapes du wizard de création : le brouillon en
 * cours et la fonction de mise à jour partielle (store zustand). */
export interface StepProps {
  draft: WizardDraft;
  patch: (partial: Partial<WizardDraft>) => void;
}
