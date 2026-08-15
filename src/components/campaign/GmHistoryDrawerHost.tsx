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
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { GmHistoryDrawer } from './GmHistoryDrawer';

/** Nom du paramètre d'URL qui ouvre le tiroir d'historique (booléen : `?history=1`). */
export const HISTORY_PARAM = 'history';

export function GmHistoryDrawerHost({ campaignId }: { campaignId: string }) {
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
}
