'use client';

/**
 * Câblage URL du tiroir « Aide-mémoire » de l'écran de MJ. Séparé du tiroir lui-même pour cantonner
 * la lecture de `?reference=` — qui exige une frontière `Suspense`, comme les autres tiroirs de
 * l'écran de MJ et le `?sheet=` du tiroir de fiche.
 *
 * L'ouverture passe par l'URL, en VRAIE ancre (`navigation-real-anchors`) : le bouton Retour du
 * navigateur ferme le tiroir, un lien direct l'ouvre, et Ctrl/⌘+Clic sur le bouton d'ouverture ouvre
 * l'écran de MJ déjà déplié dans un nouvel onglet.
 */
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { GmReferenceDrawer } from './GmReferenceDrawer';
import { REFERENCE_PARAM } from './gmToolsMenu';

/** Nom du paramètre d'URL qui ouvre le tiroir d'aide-mémoire (booléen : `?reference=1`) —
 * défini dans `gmToolsMenu.tsx` (source unique), réexporté ici pour ne rien changer à
 * l'API externe. */
export { REFERENCE_PARAM };

export function GmReferenceDrawerHost() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const open = searchParams.get(REFERENCE_PARAM) === '1';

  const close = () => {
    // `scroll: false` : fermer le tiroir ne doit pas ramener le MJ en haut de l'écran (le combat en
    // cours peut être bien plus bas). On REMPLACE l'entrée plutôt que de revenir en arrière, pour
    // qu'un lien direct ne fasse pas sortir du site.
    const next = new URLSearchParams(searchParams);
    next.delete(REFERENCE_PARAM);
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return <GmReferenceDrawer open={open} onClose={close} />;
}
