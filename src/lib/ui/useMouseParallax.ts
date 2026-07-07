'use client';

import { useEffect, useRef } from 'react';
import { usePreferencesStore } from '@/stores/preferences';

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
 * Entièrement neutralisée dans deux cas : « animations réduites » de l'OS
 * (`prefers-reduced-motion`) OU le réglage manuel par appareil `animateBackground`
 * désactivé (cf. [[preferences]]). Dans ces cas la boucle n'est pas montée et `render`
 * est appelé une dernière fois à (0, 0) pour remettre les éléments à leur position de
 * base (utile si l'utilisateur bascule le réglage en cours de mouvement).
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

  // Réglage manuel par appareil (localStorage) : désactive le suivi souris du fond.
  const animateBackground = usePreferencesStore((s) => s.animateBackground);

  useEffect(() => {
    // Aucun mouvement si l'OS demande de réduire les animations OU si le réglage
    // manuel est désactivé : on remet les éléments à leur position de base (0, 0)
    // — indispensable quand l'utilisateur bascule le réglage alors qu'un décalage
    // souris est déjà appliqué (l'effet se rejoue via `deps`/`animateBackground`).
    if (!animateBackground || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      renderRef.current({ x: 0, y: 0, scrollY: 0 });
      return;
    }

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
    // `animateBackground` en dépendance : basculer le réglage remonte (ou démonte)
    // la boucle immédiatement, sans rechargement.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, animateBackground]);
}
