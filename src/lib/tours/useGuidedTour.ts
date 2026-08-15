'use client';

import { useState } from 'react';
import { useToursStore } from '@/stores/tours';
import { TOUR_REGISTRY, type TourId } from './registry';

interface UseGuidedTourOptions {
  /**
   * Contenu du tour réellement monté (ex. formulaire d'objet affiché) — tant que faux, le tour
   * ne se lance pas même s'il n'a jamais été vu (les cibles n'existent pas encore).
   */
  ready: boolean;
  /** Tour désactivé sous mobile/tactile (mises en page desktop/mobile trop divergentes, PER-423). */
  enabled: boolean;
}

/**
 * Pilote le déclenchement d'un tour du registre central (`TOUR_REGISTRY`). `run` est un état
 * DÉRIVÉ (pas d'effet) : vrai dès que le contenu est prêt et que le tour n'a jamais été vu/passé
 * à la version courante, ou que la relance manuelle (icône d'aide) l'a demandé. Fermer la
 * fenêtre hôte avant la fin du tour ne le marque pas vu — il repart à la prochaine ouverture.
 */
export function useGuidedTour(tourId: TourId, { ready, enabled }: UseGuidedTourOptions) {
  const version = TOUR_REGISTRY[tourId].version;
  const completedVersion = useToursStore((s) => s.completedVersions[tourId]);
  const hasHydrated = useToursStore((s) => s.hasHydrated);
  const markTourDone = useToursStore((s) => s.markTourDone);
  const [manualRun, setManualRun] = useState(false);

  const notSeenYet = hasHydrated && completedVersion !== version;
  const run = enabled && ready && (notSeenYet || manualRun);

  return {
    run,
    /** Relance manuelle (icône d'aide) — possible même si déjà vu/passé. */
    replay: () => setManualRun(true),
    /** À appeler quand react-joyride signale la fin du tour (terminé OU passé). */
    onTourEnd: () => {
      setManualRun(false);
      markTourDone(tourId, version);
    },
    /** L'icône d'aide n'a de sens que si le tour est activé pour ce format d'écran. */
    helpVisible: enabled,
  };
}
