/**
 * Résolution d'affichage de l'illustration de PNJ (PER-437) : à partir d'un
 * `npcId`, retourne un `src` (objectURL) une fois le téléchargement résolu, ou
 * `null` tant qu'il n'y a pas d'illustration personnalisée — CONTRAIREMENT au
 * portrait de personnage (`useCharacterPortraitSrc`), un PNJ n'a AUCUNE
 * illustration standard de repli (pas de `PortraitVariant`/profil) : `null`
 * signifie simplement « pas d'image, ne rien afficher ».
 */
import { useEffect, useState } from 'react';
import {
  downloadNpcPortrait,
  downloadNpcPortraitCropRect,
} from '@/lib/storage/npcPortrait';
import type { PortraitCropRect } from '@/lib/storage/characterPortrait';

// Cache module-level partagé par toutes les instances du hook — même motif que
// `useCharacterPortraitSrc.ts`.
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<() => void>>();

const cropRectCache = new Map<string, PortraitCropRect | null>();
const cropRectInflight = new Map<string, Promise<void>>();
const cropRectListeners = new Map<string, Set<() => void>>();

function notify(npcId: string): void {
  listeners.get(npcId)?.forEach((l) => l());
}

function notifyCropRect(npcId: string): void {
  cropRectListeners.get(npcId)?.forEach((l) => l());
}

function ensureLoading(npcId: string): void {
  if (cache.has(npcId) || inflight.has(npcId)) return;
  const promise = downloadNpcPortrait(npcId).then((blob) => {
    cache.set(npcId, blob ? URL.createObjectURL(blob) : null);
    inflight.delete(npcId);
    notify(npcId);
  });
  inflight.set(npcId, promise);
}

function ensureCropRectLoading(npcId: string): void {
  if (cropRectCache.has(npcId) || cropRectInflight.has(npcId)) return;
  const promise = downloadNpcPortraitCropRect(npcId).then((rect) => {
    cropRectCache.set(npcId, rect);
    cropRectInflight.delete(npcId);
    notifyCropRect(npcId);
  });
  cropRectInflight.set(npcId, promise);
}

/**
 * Révoque l'illustration en cache d'un PNJ (image ET zone de recadrage) et
 * relance immédiatement un téléchargement frais — à appeler après tout
 * envoi/retrait réussi (`uploadNpcPortrait`/`removeNpcPortrait`).
 */
export function invalidateNpcPortraitCache(npcId: string): void {
  const existing = cache.get(npcId);
  if (existing) URL.revokeObjectURL(existing);
  cache.delete(npcId);
  inflight.delete(npcId);
  notify(npcId);
  ensureLoading(npcId);

  cropRectCache.delete(npcId);
  cropRectInflight.delete(npcId);
  notifyCropRect(npcId);
  ensureCropRectLoading(npcId);
}

export function useNpcPortraitSrc(npcId: string | undefined): string | null {
  const [resolved, setResolved] = useState<string | null>(() =>
    npcId ? cache.get(npcId) ?? null : null,
  );

  useEffect(() => {
    if (!npcId) return;

    const sync = () => setResolved(cache.get(npcId) ?? null);
    sync();

    let set = listeners.get(npcId);
    if (!set) {
      set = new Set();
      listeners.set(npcId, set);
    }
    set.add(sync);
    ensureLoading(npcId);

    return () => {
      set?.delete(sync);
    };
  }, [npcId]);

  return npcId ? resolved : null;
}

/** Zone de recadrage carrée de l'illustration de PNJ, ou `null` sans illustration/zone enregistrée. */
export function useNpcPortraitCropRect(npcId: string | undefined): PortraitCropRect | null {
  const [resolved, setResolved] = useState<PortraitCropRect | null>(() =>
    npcId ? cropRectCache.get(npcId) ?? null : null,
  );

  useEffect(() => {
    if (!npcId) return;

    const sync = () => setResolved(cropRectCache.get(npcId) ?? null);
    sync();

    let set = cropRectListeners.get(npcId);
    if (!set) {
      set = new Set();
      cropRectListeners.set(npcId, set);
    }
    set.add(sync);
    ensureCropRectLoading(npcId);

    return () => {
      set?.delete(sync);
    };
  }, [npcId]);

  return npcId ? resolved : null;
}
