'use client';

import { useEffect, useState } from 'react';

/**
 * État booléen persisté dans `localStorage`. Le choix de l'utilisateur survit au
 * rechargement, écrasant `defaultValue`.
 *
 * La valeur sauvegardée est relue APRÈS le montage (et non à l'initialisation) pour ne
 * pas désynchroniser le rendu serveur/client — même précaution que `SheetSection`.
 */
export function usePersistedBoolean(
  storageKey: string,
  defaultValue: boolean,
): [boolean, (value: boolean) => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved === 'true' || saved === 'false') setValue(saved === 'true');
  }, [storageKey]);

  const set = (next: boolean) => {
    setValue(next);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(storageKey, String(next));
    }
  };

  return [value, set];
}
