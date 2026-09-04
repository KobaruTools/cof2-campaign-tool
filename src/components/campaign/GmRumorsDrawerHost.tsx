'use client';

/**
 * Câblage URL du tiroir « Rumeurs de taverne » de l'écran de MJ. Séparé du tiroir
 * lui-même pour cantonner la lecture de `?rumors=` — qui exige une frontière
 * `Suspense`, comme les autres tiroirs de l'écran de MJ (`?bestiary=`, `?reference=`…).
 *
 * L'ouverture passe par l'URL, en VRAIE ancre (`navigation-real-anchors`) : le bouton
 * Retour du navigateur ferme le tiroir, un lien direct l'ouvre, et Ctrl/⌘+Clic sur le
 * bouton d'ouverture ouvre l'écran de MJ déjà déplié dans un nouvel onglet.
 */
import { memo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { GmRumorsDrawer } from './GmRumorsDrawer';
import { RUMORS_PARAM } from './gmToolsMenu';
import type { Campaign } from '@/lib/campaign/types';

/** Nom du paramètre d'URL qui ouvre le tiroir de rumeurs (booléen : `?rumors=1`) — défini
 * dans `gmToolsMenu.tsx` (source unique), réexporté ici pour ne rien changer à l'API externe. */
export { RUMORS_PARAM };

/**
 * `memo` (PER-495) : ce câblage (et les 8 autres tiroirs du menu « Outils du MJ ») vivent en
 * enfants DIRECTS de `GmScreenPage`, jamais wrappés — sans ce garde, React rappelait leur fonction
 * (donc tout leur sous-arbre, tiroir fermé compris) à CHAQUE action de combat MJ (tour suivant,
 * état posé…), alors que leurs props (`campaign`, `campaignId`) ne changent quasiment jamais sur
 * ces actions. Mesuré : 9 rendus de tiroir évités par clic « Tour suivant » (cf. handoff PER-495).
 */
export const GmRumorsDrawerHost = memo(function GmRumorsDrawerHost({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = searchParams.get(RUMORS_PARAM) === '1';

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete(RUMORS_PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return <GmRumorsDrawer campaign={campaign} open={open} onClose={close} />;
});
