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
}: {
  run: boolean;
  steps: Step[];
  onTourEnd: () => void;
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
        if (data.type === EVENTS.TOUR_END) onTourEnd();
      }}
    />
  );
}
