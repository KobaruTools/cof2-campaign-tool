'use client';

import { useEffect, useState } from 'react';
import type { SortDir, SortKey, SortState } from './sort';

const DIRS: readonly SortDir[] = ['asc', 'desc'];

/**
 * État de tri persisté dans `localStorage`. Le choix de l'utilisateur survit au
 * rechargement, écrasant `defaultValue`.
 *
 * La valeur sauvegardée est relue APRÈS le montage (et non à l'initialisation)
 * pour ne pas désynchroniser le rendu serveur/client — même précaution que
 * `usePersistedBoolean`. Elle n'est restaurée que si sa clé fait toujours partie
 * de `allowedKeys` (une clé retirée du code retombe sur le défaut).
 *
 * Le setter accepte une valeur ou une fonction `(prev) => next`, comme
 * `useState`, pour rester compatible avec les réducteurs de tri existants.
 */
export function usePersistedSort(
  storageKey: string,
  defaultValue: SortState,
  allowedKeys: readonly SortKey[],
): [SortState, (value: SortState | ((prev: SortState) => SortState)) => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<SortState>;
      if (
        typeof parsed?.key === 'string' &&
        allowedKeys.includes(parsed.key as SortKey) &&
        DIRS.includes(parsed.dir as SortDir)
      ) {
        setValue({ key: parsed.key as SortKey, dir: parsed.dir as SortDir });
      }
    } catch {
      // Valeur corrompue : on garde le défaut.
    }
    // `allowedKeys` est un littéral de module stable : hors dépendances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const set = (next: SortState | ((prev: SortState) => SortState)) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey, JSON.stringify(resolved));
      }
      return resolved;
    });
  };

  return [value, set];
}
