'use client';

import { createContext, useContext, type ReactNode } from 'react';

/**
 * Callback déclenché par un clic sur une PUCE DE CAPACITÉ (`CapabilityChip`, n'importe où sur la
 * fiche — tooltip d'un badge, texte enrichi d'une autre capacité…) : ramène la vue sur la section
 * « Voies & capacités » (bascule l'onglet loin de « Manœuvres » s'il y était, puis défile jusqu'à la
 * section). `null` = aucun scroll disponible (récapitulatif du wizard, écran de MJ, fiche imprimée…).
 */
type ScrollToCapability = () => void;

const CapabilityScrollContext = createContext<ScrollToCapability | null>(null);

export function CapabilityScrollProvider({
  onScroll,
  children,
}: {
  onScroll: ScrollToCapability | null;
  children: ReactNode;
}) {
  return <CapabilityScrollContext.Provider value={onScroll}>{children}</CapabilityScrollContext.Provider>;
}

export function useCapabilityScroll(): ScrollToCapability | null {
  return useContext(CapabilityScrollContext);
}
