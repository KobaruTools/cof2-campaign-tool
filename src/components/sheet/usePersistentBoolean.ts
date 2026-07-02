'use client';

import { useEffect, useState } from 'react';

/**
 * Booléen persisté dans `localStorage` sous `key`, avec repli sur `defaultValue`.
 * La valeur sauvegardée est relue APRÈS le montage (et non à l'initialisation) pour
 * ne pas désynchroniser le rendu serveur/client — même approche que `SheetSection`.
 * Renvoie la valeur et une bascule. Clé GLOBALE (préférence utilisateur, non liée à
 * un personnage).
 */
export function usePersistentBoolean(key: string, defaultValue: boolean): [boolean, () => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(key);
    // Synchronisation ponctuelle depuis un système externe (localStorage) après le
    // montage, pour ne pas décaler le rendu SSR/CSR — pas une boucle de rendu.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved === 'true' || saved === 'false') setValue(saved === 'true');
  }, [key]);

  const toggle = () => {
    setValue((v) => {
      const next = !v;
      if (typeof window !== 'undefined') window.localStorage.setItem(key, String(next));
      return next;
    });
  };

  return [value, toggle];
}
