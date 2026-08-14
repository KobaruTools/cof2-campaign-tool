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
import type { PortraitVariant, StaticPortraitVariant } from '@/lib/character/types';
import {
  downloadCharacterPortrait,
  downloadCharacterPortraitCropRect,
  type PortraitCropRect,
} from '@/lib/storage/characterPortrait';

/**
 * Chemin de l'illustration STATIQUE de profil : `default` → pas de suffixe,
 * `alt` → `-2`, `alt3`/`alt4`/… → `-3`/`-4`/… (illustrations supplémentaires,
 * cf. `src/data/classPortraitOptions.ts`).
 */
export function classPortraitPath(
  classId: string,
  variant: StaticPortraitVariant = 'default',
): string {
  if (variant === 'default') return `/classes/${classId}.webp`;
  if (variant === 'alt') return `/classes/${classId}-2.webp`;
  return `/classes/${classId}-${variant.slice(3)}.webp`;
}

// Cache module-level partagé par toutes les instances du hook (fiche, aperçus de
// liste…) : un même personnage n'est téléchargé qu'une fois par session d'onglet.
const cache = new Map<string, string | null>();
const inflight = new Map<string, Promise<void>>();
const listeners = new Map<string, Set<() => void>>();

// Cache jumeau (PER-394) pour la zone de recadrage — même personnage, même cycle
// de vie, mais objet distinct (JSON, pas de blob) donc pas d'URL à révoquer.
const cropRectCache = new Map<string, PortraitCropRect | null>();
const cropRectInflight = new Map<string, Promise<void>>();
const cropRectListeners = new Map<string, Set<() => void>>();

function notify(characterId: string): void {
  listeners.get(characterId)?.forEach((l) => l());
}

function notifyCropRect(characterId: string): void {
  cropRectListeners.get(characterId)?.forEach((l) => l());
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

function ensureCropRectLoading(characterId: string): void {
  if (cropRectCache.has(characterId) || cropRectInflight.has(characterId)) return;
  const promise = downloadCharacterPortraitCropRect(characterId).then((rect) => {
    cropRectCache.set(characterId, rect);
    cropRectInflight.delete(characterId);
    notifyCropRect(characterId);
  });
  cropRectInflight.set(characterId, promise);
}

/**
 * Révoque le portrait personnalisé en cache d'un personnage (image ET zone de
 * recadrage) et relance immédiatement un téléchargement frais — à appeler après
 * tout envoi/retrait réussi (`uploadCharacterPortrait`/`removeCharacterPortrait`)
 * pour que les instances montées des hooks réabsorbent le contenu courant du bucket.
 */
export function invalidateCharacterPortraitCache(characterId: string): void {
  const existing = cache.get(characterId);
  if (existing) URL.revokeObjectURL(existing);
  cache.delete(characterId);
  inflight.delete(characterId);
  notify(characterId);
  ensureLoading(characterId);

  cropRectCache.delete(characterId);
  cropRectInflight.delete(characterId);
  notifyCropRect(characterId);
  ensureCropRectLoading(characterId);
}

export function useCharacterPortraitSrc(
  characterId: string,
  variant: PortraitVariant,
  classId: string,
): string {
  const fallback = classPortraitPath(classId, variant === 'custom' ? 'default' : variant);
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

/**
 * Zone de recadrage carrée du portrait personnalisé (PER-394), ou `null` sans
 * portrait personnalisé / sans zone enregistrée (portrait envoyé avant PER-394 —
 * l'appelant doit alors traiter l'image entière comme déjà cadrée, cf. les
 * anciens envois qui recadraient avant l'upload).
 */
export function useCharacterPortraitCropRect(
  characterId: string,
  variant: PortraitVariant,
): PortraitCropRect | null {
  const [resolved, setResolved] = useState<PortraitCropRect | null>(() =>
    variant === 'custom' ? cropRectCache.get(characterId) ?? null : null,
  );

  useEffect(() => {
    if (variant !== 'custom') return;

    const sync = () => setResolved(cropRectCache.get(characterId) ?? null);
    sync();

    let set = cropRectListeners.get(characterId);
    if (!set) {
      set = new Set();
      cropRectListeners.set(characterId, set);
    }
    set.add(sync);
    ensureCropRectLoading(characterId);

    return () => {
      set?.delete(sync);
    };
  }, [characterId, variant]);

  return variant === 'custom' ? resolved : null;
}
