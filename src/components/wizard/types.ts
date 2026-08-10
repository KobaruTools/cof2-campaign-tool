import type { WizardDraft } from '@/lib/character/wizard';
import type { PortraitCropRect } from '@/lib/storage/characterPortrait';

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
  /**
   * Fichier de portrait personnalisé mis en attente (PER-383) — l'envoi réel est
   * différé après la création du personnage (la RLS du bucket exige que la ligne
   * `characters` existe déjà en DB, ce qui n'est vrai qu'après le commit final du
   * wizard). Seule `IdentityStep` s'en sert.
   */
  portraitFile?: File | null;
  /** Zone de recadrage carrée (PER-394) choisie pour `portraitFile`, mise en attente au même titre. */
  portraitCropRect?: PortraitCropRect | null;
  onPortraitFile?: (file: File | null, cropRect?: PortraitCropRect | null) => void;
}
