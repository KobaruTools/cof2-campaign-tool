'use client';

import { useEffect, useState } from 'react';

/**
 * Ensemble de chaînes persisté dans `localStorage` (variante `Set` de
 * `usePersistedBoolean`). Relu APRÈS le montage, même précaution anti-désync
 * serveur/client. `storageKey` NUL (contexte sans identifiant stable, ex. wizard) →
 * l'état reste local à la session, sans toucher `localStorage`.
 */
export function usePersistedStringSet(
  storageKey: string | null,
): [Set<string>, (value: string) => void] {
  const [value, setValue] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) return;
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) setValue(new Set(parsed.filter((v) => typeof v === 'string')));
    } catch {
      // Valeur corrompue : ignorée, on repart de l'ensemble vide.
    }
  }, [storageKey]);

  const toggle = (key: string) => {
    setValue((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      if (typeof window !== 'undefined' && storageKey) {
        window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      }
      return next;
    });
  };

  return [value, toggle];
}
