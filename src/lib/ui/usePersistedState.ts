"use client";

import { useEffect, useState } from "react";

/**
 * État quelconque (sérialisable en JSON) persisté dans `localStorage`. Le choix de
 * l'utilisateur survit au rechargement, écrasant `defaultValue`.
 *
 * La valeur sauvegardée est relue APRÈS le montage (et non à l'initialisation) pour ne
 * pas désynchroniser le rendu serveur/client — même précaution que `usePersistedBoolean`
 * et `usePersistedSort`.
 *
 * `revive` valide/normalise la valeur brute relue : elle renvoie la valeur à restaurer,
 * ou `undefined` pour garder le défaut (clé corrompue, forme périmée, borne hors plage…).
 * Sans `revive`, la valeur relue est restaurée telle quelle.
 *
 * Le setter accepte une valeur ou une fonction `(prev) => next`, comme `useState`.
 */
export function usePersistedState<T>(
  storageKey: string,
  defaultValue: T,
  revive?: (raw: unknown) => T | undefined,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState(defaultValue);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(storageKey);
    if (saved == null) return;
    try {
      const parsed = JSON.parse(saved) as unknown;
      const revived = revive ? revive(parsed) : (parsed as T);
      // Lecture volontairement différée au montage (SSR-safe) : ce setState initial est le
      // but du hook, pas une cascade de rendu accidentelle.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (revived !== undefined) setValue(revived);
    } catch {
      // Valeur corrompue : on garde le défaut.
    }
    // `storageKey` et `revive` sont stables sur la durée de vie du composant : hors dépendances.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  const set = (next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved =
        typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      if (typeof window !== "undefined") {
        window.localStorage.setItem(storageKey, JSON.stringify(resolved));
      }
      return resolved;
    });
  };

  return [value, set];
}
