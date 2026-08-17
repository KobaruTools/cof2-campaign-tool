'use client';

import { EVENTS, Joyride, type EventData, type Step } from 'react-joyride';
import { TourTooltip } from './TourTooltip';

/** Libellés FR des boutons (le CODE reste en anglais, cf. CLAUDE.md — ces valeurs sont du TEXTE
 * affiché au joueur). */
const LOCALE = {
  back: 'Précédent',
  close: 'Fermer',
  last: 'Terminer',
  next: 'Suivant',
  skip: 'Passer',
};

/**
 * Instance react-joyride générique (PER-423) : bulle custom MUI (`TourTooltip`), français, et
 * remontée de la fin de tour (terminé OU passé — les deux ferment le tour pour de bon, cf.
 * `useGuidedTour`). `zIndex` élevé pour rester au-dessus d'une `Dialog` MUI (1300).
 */
export function GuidedTour({
  run,
  steps,
  onTourEnd,
  onStepBefore,
}: {
  run: boolean;
  steps: Step[];
  onTourEnd: () => void;
  /**
   * Appelé juste avant l'affichage de chaque étape, avec la définition de cette étape.
   * Sert à déplier une section (accordéon) dont la cible dépend d'un état contrôlé par le
   * composant hôte plutôt que par le tour lui-même (ex. `Enchantement` dans `ItemDialog`,
   * PER-424bis) — le tour ne connaît pas cet état, seul l'hôte peut le faire. Purement
   * informatif (fire-and-forget) : pour une cible qui doit être ATTENDUE (pas seulement
   * révélée) avant que le tour ne se positionne dessus, préférer le hook natif `Step.before`
   * (Promise), que `react-joyride` attend nativement — cf. PER-426 sur la fiche de personnage,
   * où un mécanisme maison équivalent à celui-ci (avancée différée bricolée à la main) s'est
   * révélé fragile (blocage si l'utilisateur cliquait pendant la transition).
   */
  onStepBefore?: (step: Step) => void;
}) {
  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      scrollToFirstStep
      locale={LOCALE}
      tooltipComponent={TourTooltip}
      // `skipBeacon` : la bulle s'affiche directement, sans exiger un premier clic sur un
      // beacon — un tour déclenché automatiquement doit se montrer sans étape cachée.
      options={{ zIndex: 1400, skipBeacon: true }}
      onEvent={(data: EventData) => {
        if (data.type === EVENTS.STEP_BEFORE) onStepBefore?.(data.step);
        if (data.type === EVENTS.TOUR_END) onTourEnd();
      }}
    />
  );
}
