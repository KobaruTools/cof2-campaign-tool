/**
 * Recadrage d'affichage (PER-394) : reproduit, à partir de l'image ORIGINALE et
 * d'une `PortraitCropRect` (fractions 0-1 de la largeur/hauteur naturelles),
 * l'image carrée choisie par le joueur — sans jamais toucher au fichier stocké
 * (qui reste l'illustration complète, cf. `characterPortrait.ts`). Même
 * mécanique canvas que `cropImageToFile`, mais en entrée un `src` déjà résolu
 * (objectURL/chemin statique) plutôt qu'un `File`, et en fractions plutôt qu'en
 * pixels — la zone a été enregistrée indépendamment de toute résolution.
 */
import { useEffect, useState } from 'react';
import type { PortraitCropRect } from '@/lib/storage/characterPortrait';

const cache = new Map<string, Promise<string>>();

function cacheKey(src: string, rect: PortraitCropRect): string {
  return `${src}|${rect.x}|${rect.y}|${rect.width}|${rect.height}`;
}

function cropToObjectUrl(src: string, rect: PortraitCropRect): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const sx = rect.x * img.naturalWidth;
      const sy = rect.y * img.naturalHeight;
      const sw = rect.width * img.naturalWidth;
      const sh = rect.height * img.naturalHeight;
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(sw));
      canvas.height = Math.max(1, Math.round(sh));
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Contexte canvas indisponible pour le recadrage.'));
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Échec de l'encodage de l'image recadrée."));
          return;
        }
        resolve(URL.createObjectURL(blob));
      });
    };
    img.onerror = () => reject(new Error("Échec du chargement de l'image à recadrer."));
    img.src = src;
  });
}

/**
 * `undefined` tant que le recadrage n'a pas résolu, ou en l'absence de `rect`
 * (l'appelant retombe alors sur `src` tel quel — image déjà pertinente en
 * entier, ou portrait envoyé avant PER-394 sans zone enregistrée).
 */
export function useCroppedImageSrc(
  src: string | undefined,
  rect: PortraitCropRect | null | undefined,
): string | undefined {
  const [resolved, setResolved] = useState<string | undefined>(undefined);

  useEffect(() => {
    // Pas de reset synchrone ici (`rect`/`src` absents) : le retour public
    // ci-dessous force déjà `undefined` dans ce cas, cf. `return rect ? … `.
    if (!src || !rect) return;
    let active = true;
    const key = cacheKey(src, rect);
    let promise = cache.get(key);
    if (!promise) {
      promise = cropToObjectUrl(src, rect);
      cache.set(key, promise);
    }
    promise.then(
      (url) => {
        if (active) setResolved(url);
      },
      () => {
        if (active) setResolved(undefined);
      },
    );
    return () => {
      active = false;
    };
  }, [src, rect]);

  return rect ? resolved : undefined;
}
