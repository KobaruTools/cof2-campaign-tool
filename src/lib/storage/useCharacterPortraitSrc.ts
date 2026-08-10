/**
 * Résolution d'affichage du portrait de profil (PER-383) : à partir d'un
 * personnage (`characterId`, `PortraitVariant`, `classId`), retourne TOUJOURS un
 * `src` utilisable immédiatement — jamais d'image cassée, jamais de flash.
 *
 * L'illustration standard/alternative est un chemin statique connu d'avance.
 * Le portrait personnalisé (`custom`) est téléchargé depuis le bucket privé
 * (`characterPortrait.ts`) et mis en cache en mémoire (`objectURL`) — avec repli
 * sur l'illustration standard tant que le téléchargement n'a pas résolu OU si le
 * bucket ne contient rien (upload jamais abouti, ex. wizard où l'envoi réel est
 * différé après la création du personnage, cf. PER-383).
 */
import { useEffect, useState } from 'react';
import type { PortraitVariant } from '@/lib/character/types';
import { downloadCharacterPortrait } from '@/lib/storage/characterPortrait';

/** Chemin de l'illustration STATIQUE de profil (standard ou alternative « -2 »). */
export function classPortraitPath(classId: string, variant: 'default' | 'alt' = 'default'): string {
  return `/classes/${classId}${variant === 'alt' ? '-2' : ''}.webp`;
}

// Cache module-level partagé par toutes les instances du hook (fiche, aperçus de
// liste…) : un même personnage n'est téléchargé qu'une fois par session d'onglet.
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<() => void>>();

function notify(characterId: string): void {
  listeners.get(characterId)?.forEach((l) => l());
}

function ensureLoading(characterId: string): void {
  if (cache.has(characterId) || inflight.has(characterId)) return;
  const promise = downloadCharacterPortrait(characterId).then((blob) => {
    cache.set(characterId, blob ? URL.createObjectURL(blob) : null);
    inflight.delete(characterId);
    notify(characterId);
  });
  inflight.set(characterId, promise);
}

/**
 * Révoque le portrait personnalisé en cache d'un personnage et relance
 * immédiatement un téléchargement frais — à appeler après tout envoi/retrait
 * réussi (`uploadCharacterPortrait`/`removeCharacterPortrait`) pour que les
 * instances montées du hook réabsorbent le fichier courant du bucket.
 */
export function invalidateCharacterPortraitCache(characterId: string): void {
  const existing = cache.get(characterId);
  if (existing) URL.revokeObjectURL(existing);
  cache.delete(characterId);
  inflight.delete(characterId);
  notify(characterId);
  ensureLoading(characterId);
}

export function useCharacterPortraitSrc(
  characterId: string,
  variant: PortraitVariant,
  classId: string,
): string {
  const fallback = classPortraitPath(classId, variant === 'alt' ? 'alt' : 'default');
  const [resolved, setResolved] = useState<string | null>(() =>
    variant === 'custom' ? cache.get(characterId) ?? null : null,
  );

  useEffect(() => {
    if (variant !== 'custom') return;

    const sync = () => setResolved(cache.get(characterId) ?? null);
    sync();

    let set = listeners.get(characterId);
    if (!set) {
      set = new Set();
      listeners.set(characterId, set);
    }
    set.add(sync);
    ensureLoading(characterId);

    return () => {
      set?.delete(sync);
    };
  }, [characterId, variant]);

  return variant === 'custom' && resolved ? resolved : fallback;
}
