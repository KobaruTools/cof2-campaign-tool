'use client';

/**
 * Câblage URL du tiroir « Outils du MJ » (PER-199). Séparé du tiroir lui-même pour
 * cantonner la lecture de `?tools=` — qui exige une frontière `Suspense`, comme le
 * `?sheet=` du tiroir de fiche (`GmSheetDrawerHost`).
 *
 * L'ouverture passe par l'URL, en VRAIE ancre (`navigation-real-anchors`) : le bouton
 * Retour du navigateur ferme le tiroir, un lien direct l'ouvre sur le bon onglet, et
 * Ctrl/⌘+Clic sur le bouton d'ouverture ouvre l'écran de MJ déjà déplié dans un onglet.
 */
import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { Campaign } from '@/lib/campaign/types';
import { DEFAULT_GM_TOOL, GmToolsDrawer, isGmToolId, type GmToolId } from './GmToolsDrawer';

/** Nom du paramètre d'URL portant l'onglet d'outil affiché dans le tiroir. */
export const TOOLS_PARAM = 'tools';

export function GmToolsDrawerHost({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(TOOLS_PARAM);
  const valid = isGmToolId(raw);
  // Paramètre présent mais inconnu (onglet renommé/supprimé) : on nettoie sans bruit.
  const invalid = raw !== null && !valid;

  const close = () => {
    // `scroll: false` : fermer le tiroir ne doit pas ramener le MJ en haut de l'écran (le
    // combat en cours peut être bien plus bas). On REMPLACE l'entrée plutôt que de revenir en
    // arrière : un lien direct ne doit pas faire sortir du site.
    router.replace(pathname, { scroll: false });
  };

  useEffect(() => {
    if (invalid) router.replace(pathname, { scroll: false });
  }, [invalid, router, pathname]);

  // Dernier onglet montré, conservé le temps de l'animation de fermeture : sans lui, le contenu
  // se viderait pendant que le tiroir glisse (le paramètre disparaît AVANT la fin de la transition).
  const [lastTab, setLastTab] = useState<GmToolId>(DEFAULT_GM_TOOL);
  useEffect(() => {
    // Synchronisation ponctuelle (pas une boucle) : on ne mémorise que des onglets valides.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (valid) setLastTab(raw);
  }, [valid, raw]);
  const activeTab = valid ? raw : lastTab;

  return (
    <GmToolsDrawer
      campaign={campaign}
      open={valid}
      activeTab={activeTab}
      onTabChange={(tab) =>
        router.replace(`${pathname}?${TOOLS_PARAM}=${tab}`, { scroll: false })
      }
      onClose={close}
    />
  );
}
