'use client';

import { useEffect, useRef } from 'react';

// Amplitude par défaut du suivi souris (px), source unique partagée par tous les
// effets de parallaxe pour un mouvement cohérent d'un écran à l'autre. Volontairement
// discrète : l'effet doit rester à peine perceptible.
export const MOUSE_PARALLAX_X = 3;
export const MOUSE_PARALLAX_Y = 3;

export interface MouseParallaxState {
  /** Décalage horizontal lissé issu du suivi souris (px). */
  x: number;
  /** Décalage vertical lissé issu du suivi souris (px). */
  y: number;
  /** Défilement vertical courant de la fenêtre (px) ; 0 si `trackScroll` est faux. */
  scrollY: number;
}

export interface MouseParallaxOptions {
  /** Amplitude horizontale max du suivi souris (px). */
  mouseX?: number;
  /** Amplitude verticale max du suivi souris (px). */
  mouseY?: number;
  /** Suivre aussi le défilement (fournit `scrollY` à `render`). Défaut : faux. */
  trackScroll?: boolean;
  /** Facteur d'interpolation exponentielle vers la cible [0, 1]. Défaut : 0.06. */
  smoothing?: number;
  /** Dépendances : la boucle est recréée quand l'une d'elles change. */
  deps?: React.DependencyList;
}

/**
 * Boucle `requestAnimationFrame` partagée qui suit la souris (et, en option, le
 * défilement) et appelle `render` à chaque frame avec les valeurs lissées — à charge
 * de l'appelant de poser le `transform` voulu sur ses éléments (écriture directe sur
 * le DOM, aucun state React, donc pas de re-render par pixel).
 *
 * Entièrement neutralisée si « animations réduites » (`prefers-reduced-motion`) :
 * `render` n'est jamais appelé, les styles de base des éléments sont conservés.
 *
 * `render` est référencé via une ref : l'appelant peut passer une fonction inline
 * sans la mémoïser ; la boucle n'est réinitialisée que par `deps`.
 */
export function useMouseParallax(
  render: (state: MouseParallaxState) => void,
  {
    mouseX = MOUSE_PARALLAX_X,
    mouseY = MOUSE_PARALLAX_Y,
    trackScroll = false,
    smoothing = 0.06,
    deps = [],
  }: MouseParallaxOptions = {},
) {
  const renderRef = useRef(render);
  // Toujours pointer sur le dernier `render` sans réinitialiser la boucle rAF :
  // l'appelant peut passer une fonction inline non mémoïsée.
  useEffect(() => {
    renderRef.current = render;
  });

  useEffect(() => {
    // Animations réduites : on laisse les transforms de base (aucun mouvement).
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let scroll = 0;

    const onMouseMove = (e: MouseEvent) => {
      // Position normalisée [-1, 1] par rapport au centre de la fenêtre.
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetX = nx * mouseX;
      targetY = ny * mouseY;
    };
    const onScroll = () => {
      scroll = window.scrollY;
    };

    let raf = 0;
    const tick = () => {
      // Interpolation exponentielle : lisse le suivi de la cible.
      currentX += (targetX - currentX) * smoothing;
      currentY += (targetY - currentY) * smoothing;
      renderRef.current({ x: currentX, y: currentY, scrollY: scroll });
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    if (trackScroll) window.addEventListener('scroll', onScroll, { passive: true });
    raf = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      if (trackScroll) window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
