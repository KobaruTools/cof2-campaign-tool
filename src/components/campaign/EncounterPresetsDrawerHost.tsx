'use client';

/**
 * Câblage URL du tiroir « Combats préparés » de l'écran de MJ (PER-448). Séparé du
 * tiroir lui-même pour cantonner la lecture de `?combats=`, qui exige une frontière
 * `Suspense`, comme les autres tiroirs de l'écran de MJ.
 *
 * L'ouverture passe par l'URL, en VRAIE ancre (`navigation-real-anchors`) : le bouton
 * Retour du navigateur ferme le tiroir, un lien direct l'ouvre.
 */
import { memo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { EncounterPresetsDrawer } from './EncounterPresetsDrawer';
import { ENCOUNTER_PRESETS_PARAM } from './gmToolsMenu';
import type { Campaign } from '@/lib/campaign/types';
import type { EncounterPreset } from '@/lib/session/encounterPreset';

/** Nom du paramètre d'URL qui ouvre le tiroir de combats préparés (booléen : `?combats=1`)
 * — défini dans `gmToolsMenu.tsx` (source unique), réexporté ici pour ne rien changer à
 * l'API externe. */
export { ENCOUNTER_PRESETS_PARAM };

export interface EncounterPresetsDrawerHostProps {
  campaign: Campaign;
  hasCurrentCombat: boolean;
  onLaunch: (preset: EncounterPreset) => void;
}

/** `memo` (PER-495, même motif que `GmRumorsDrawerHost`) : évite un rendu inutile de ce tiroir
 * à chaque action de combat MJ — ses props (`campaign`, `hasCurrentCombat`, `onLaunch`) ne
 * changent que quand le roster passe vide/non-vide, jamais sur un simple tour/état posé. */
export const EncounterPresetsDrawerHost = memo(function EncounterPresetsDrawerHost({
  campaign,
  hasCurrentCombat,
  onLaunch,
}: EncounterPresetsDrawerHostProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = searchParams.get(ENCOUNTER_PRESETS_PARAM) === '1';

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete(ENCOUNTER_PRESETS_PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <EncounterPresetsDrawer
      campaign={campaign}
      open={open}
      onClose={close}
      hasCurrentCombat={hasCurrentCombat}
      onLaunch={onLaunch}
    />
  );
});
