/**
 * Détection du canal alpha d'une image (PER-384) : distingue une illustration
 * détourée (fond réellement transparent, ex. les portraits standard `/classes/*.webp`)
 * d'une photo à fond plein (portrait personnalisé uploadé par le joueur). Sert
 * uniquement au filigrane de profil de `HeaderIllustrations` — la vitruve du peuple et
 * les vignettes carrées recadrées (`CharacterPreviewCard`, tracker d'initiative, écran
 * MJ) fonctionnent déjà avec n'importe quelle image et n'ont pas besoin de cette
 * détection.
 */
import { useEffect, useState } from 'react';

// Résolution d'échantillonnage : suffisante pour juger de la transparence des bords,
// coûteuse à peine plus qu'un décodage d'image (pas besoin de la pleine résolution).
const SAMPLE_SIZE = 32;
// Un pixel de bord est jugé transparent en dessous de ce seuil alpha (0-255) — tolère
// un léger anti-aliasing/compression sans basculer à tort en photo « opaque ».
const ALPHA_THRESHOLD = 200;
// Fraction de pixels de bord transparents à partir de laquelle l'image est considérée
// détourée. Une illustration standard a ses coins/côtés presque entièrement vides ; une
// photo à fond plein les couvre presque entièrement.
const TRANSPARENT_RATIO_THRESHOLD = 0.5;

const cache = new Map<string, Promise<boolean>>();

function sampleEdgeTransparency(src: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE_SIZE;
        canvas.height = SAMPLE_SIZE;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(true);
          return;
        }
        ctx.drawImage(img, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        let edgeCount = 0;
        let transparentCount = 0;
        for (let i = 0; i < SAMPLE_SIZE; i++) {
          for (const [x, y] of [
            [i, 0],
            [i, SAMPLE_SIZE - 1],
            [0, i],
            [SAMPLE_SIZE - 1, i],
          ] as const) {
            edgeCount++;
            const alpha = data[(y * SAMPLE_SIZE + x) * 4 + 3];
            if (alpha < ALPHA_THRESHOLD) transparentCount++;
          }
        }
        resolve(transparentCount / edgeCount > TRANSPARENT_RATIO_THRESHOLD);
      } catch {
        // Image « tainted » (CORS) ou toute autre erreur canvas : on ne peut pas
        // juger, on garde le comportement actuel (filigrane) plutôt que de basculer
        // à tort en cadre.
        resolve(true);
      }
    };
    img.onerror = () => resolve(true);
    img.src = src;
  });
}

function detectTransparentBackground(src: string): Promise<boolean> {
  const cached = cache.get(src);
  if (cached) return cached;
  const promise = sampleEdgeTransparency(src);
  cache.set(src, promise);
  return promise;
}

/**
 * `true` par défaut (avant résolution ET en cas d'échec) : préserve le filigrane
 * actuel, le cas le plus fréquent (illustrations standard, déjà détourées).
 */
export function useHasTransparentBackground(src: string | undefined): boolean {
  const [transparent, setTransparent] = useState(true);

  useEffect(() => {
    if (!src) return;
    let active = true;
    detectTransparentBackground(src).then((result) => {
      if (active) setTransparent(result);
    });
    return () => {
      active = false;
    };
  }, [src]);

  return transparent;
}
