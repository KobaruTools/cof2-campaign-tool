'use client';

/**
 * Câblage URL du tiroir « PNJ » de l'écran de MJ. Séparé du tiroir lui-même pour
 * cantonner la lecture de `?npc=` — qui exige une frontière `Suspense`, comme les
 * autres tiroirs de l'écran de MJ.
 *
 * L'ouverture passe par l'URL, en VRAIE ancre (`navigation-real-anchors`) : le bouton
 * Retour du navigateur ferme le tiroir, un lien direct l'ouvre, et Ctrl/⌘+Clic sur le
 * bouton d'ouverture ouvre l'écran de MJ déjà déplié dans un nouvel onglet.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { GmNpcDrawer } from './GmNpcDrawer';
import { NPC_PARAM } from './gmToolsMenu';
import type { Campaign } from '@/lib/campaign/types';

/** Nom du paramètre d'URL qui ouvre le tiroir de PNJ (booléen : `?npc=1`) — défini dans
 * `gmToolsMenu.tsx` (source unique), réexporté ici pour ne rien changer à l'API externe. */
export { NPC_PARAM };

export function GmNpcDrawerHost({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = searchParams.get(NPC_PARAM) === '1';

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete(NPC_PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return <GmNpcDrawer campaign={campaign} open={open} onClose={close} />;
}
