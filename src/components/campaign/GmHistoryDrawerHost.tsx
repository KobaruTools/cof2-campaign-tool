'use client';

/**
 * Câblage URL du tiroir « Historique des parties » de l'écran de MJ. Séparé du tiroir lui-même
 * pour cantonner la lecture de `?history=` — qui exige une frontière `Suspense`, comme le
 * `?reference=` du tiroir d'aide-mémoire (`GmReferenceDrawerHost`) et le `?bestiary=` du tiroir de
 * bestiaire.
 *
 * L'ouverture passe par l'URL, en VRAIE ancre (`navigation-real-anchors`) : le bouton Retour du
 * navigateur ferme le tiroir, un lien direct l'ouvre, et Ctrl/⌘+Clic sur le bouton d'ouverture ouvre
 * l'écran de MJ déjà déplié dans un nouvel onglet.
 */
import { memo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { GmHistoryDrawer } from './GmHistoryDrawer';
import { HISTORY_PARAM } from './gmToolsMenu';

/** Nom du paramètre d'URL qui ouvre le tiroir d'historique (booléen : `?history=1`) —
 * défini dans `gmToolsMenu.tsx` (source unique), réexporté ici pour ne rien changer à
 * l'API externe. */
export { HISTORY_PARAM };

/** `memo` (PER-495, même motif que `GmRumorsDrawerHost`) : évite un rendu inutile de ce tiroir
 * à chaque action de combat MJ, sans rapport avec l'historique. */
export const GmHistoryDrawerHost = memo(function GmHistoryDrawerHost({ campaignId }: { campaignId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = searchParams.get(HISTORY_PARAM) === '1';

  const close = () => {
    // `scroll: false` : fermer le tiroir ne doit pas ramener le MJ en haut de l'écran (le combat en
    // cours peut être bien plus bas). On REMPLACE l'entrée plutôt que de revenir en arrière, pour
    // qu'un lien direct ne fasse pas sortir du site.
    const next = new URLSearchParams(searchParams);
    next.delete(HISTORY_PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return <GmHistoryDrawer campaignId={campaignId} open={open} onClose={close} />;
});
