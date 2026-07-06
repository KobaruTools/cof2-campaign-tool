import type { WizardDraft } from '@/lib/character/wizard';

/** Contrat commun à toutes les étapes du wizard de création : le brouillon en
 * cours et la fonction de mise à jour partielle (store zustand). */
export interface StepProps {
  draft: WizardDraft;
  patch: (partial: Partial<WizardDraft>) => void;
  /**
   * La campagne de rattachement du brouillon autorise-t-elle les armes à feu
   * (disponibilité d'option, PER-185) ? Absent/`true` = pas de contrainte de
   * campagne (« Non attribué », fallback historique). Gate le toggle « armes à
   * feu » du wizard et l'autorisation EFFECTIVE (`campaignAllowsFirearms ∧
   * draft.firearmsAllowed`). Optionnel : les sous-panneaux réutilisant `StepProps`
   * (ex. vocation du prêtre) n'ont pas à le fournir.
   */
  campaignAllowsFirearms?: boolean;
}
