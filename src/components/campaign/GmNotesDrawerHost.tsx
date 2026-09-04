'use client';

/**
 * Câblage URL du tiroir « Notes de session » de l'écran de MJ. Séparé du tiroir
 * lui-même pour cantonner la lecture de `?notes=` — qui exige une frontière
 * `Suspense`, comme les autres tiroirs de l'écran de MJ.
 *
 * L'ouverture passe par l'URL, en VRAIE ancre (`navigation-real-anchors`) : le bouton
 * Retour du navigateur ferme le tiroir, un lien direct l'ouvre, et Ctrl/⌘+Clic sur le
 * bouton d'ouverture ouvre l'écran de MJ déjà déplié dans un nouvel onglet.
 */
import { memo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { GmNotesDrawer } from './GmNotesDrawer';
import { NOTES_PARAM } from './gmToolsMenu';

/** Nom du paramètre d'URL qui ouvre le tiroir de notes (booléen : `?notes=1`) — défini dans
 * `gmToolsMenu.tsx` (source unique), réexporté ici pour ne rien changer à l'API externe. */
export { NOTES_PARAM };

/** `memo` (PER-495, même motif que `GmRumorsDrawerHost`) : évite un rendu inutile de ce tiroir
 * à chaque action de combat MJ, sans rapport avec les notes. */
export const GmNotesDrawerHost = memo(function GmNotesDrawerHost({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = searchParams.get(NOTES_PARAM) === '1';

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete(NOTES_PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return <GmNotesDrawer campaignId={campaignId} open={open} onClose={close} />;
});
