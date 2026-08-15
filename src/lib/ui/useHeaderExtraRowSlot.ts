'use client';

import { useEffect, useState } from 'react';

/** Ancre DOM du 3ᵉ étage de l'en-tête (`AppHeaderShell`), toujours rendue (même vide). */
export const HEADER_EXTRA_ROW_SLOT_ID = 'app-header-extra-row-slot';

/**
 * Nœud DOM du 3ᵉ étage de l'en-tête, pour y **porter** (`createPortal`) du contenu dont la
 * dérivation dépend de données lourdes disponibles seulement APRÈS les retours anticipés
 * d'une page (garde React, ex. fiche personnage : `masterDerived`/`display` n'existent
 * qu'une fois `character`/`game` garantis non nuls) — donc trop tard pour transiter par
 * `useHeaderContent`, un Hook, qui doit s'appeler AVANT ces retours. Un portail, lui, est
 * un simple appel de rendu : appelable n'importe où, y compris après une garde.
 */
export function useHeaderExtraRowSlot(): HTMLElement | null {
  const [node, setNode] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // Synchronisation ponctuelle d'un système externe (le DOM, monté par le layout AVANT
    // cette page) vers l'état local : pas une boucle de rendu (dépendances vides, un seul tir).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNode(document.getElementById(HEADER_EXTRA_ROW_SLOT_ID));
  }, []);
  return node;
}
