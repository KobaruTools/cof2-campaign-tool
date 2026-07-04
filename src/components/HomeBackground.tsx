'use client';

import { useEffect, useRef } from 'react';
import Box from '@mui/material/Box';

/**
 * Illustration de couverture (page 1 du livre de base) scindée en deux moitiés
 * qui encadrent la liste des personnages : la moitié gauche est ancrée au bord
 * gauche, la moitié droite au bord droit, chacune sur toute la hauteur de la
 * fenêtre. Un dégradé fond le côté intérieur (vers la liste) dans la couleur de
 * l'app, de sorte que l'illustration profite des marges disponibles sans gêner
 * la lecture.
 *
 * Mouvement (uniquement sur l'image, jamais sur le dégradé qui reste fixe) :
 * - parallaxe au défilement (bornée) ;
 * - léger suivi de la souris.
 *
 * Anti-bord : l'image déborde de sa fenêtre d'une marge (`HOVER`/`VOVER`)
 * dimensionnée à partir du déplacement maximal possible sur chaque axe. Ainsi,
 * même souris et scroll au maximum (en haut comme en bas), aucun bord vide
 * n'apparaît. Tout le mouvement est désactivé si « animations réduites ».
 */

// Réglages du mouvement, en pixels.
const MOUSE_X = 16; // décalage horizontal max au suivi souris
const MOUSE_Y = 8; // décalage vertical max au suivi souris
const SCROLL_FACTOR = 0.05; // fraction du défilement répercutée sur l'image
const SCROLL_MAX = 20; // décalage vertical max dû au scroll (borné)
const SAFETY = 4; // marge de sécurité

// Débordement de l'image au-delà de sa fenêtre, déduit du déplacement maximal
// sur chaque axe → garantit qu'aucun bord ne devient visible.
const HOVER = MOUSE_X + SAFETY; // horizontal : seul le suivi souris joue
const VOVER = MOUSE_Y + SCROLL_MAX + SAFETY; // vertical : souris + scroll

// Décalage de base de chaque moitié vers son bord extérieur (px).
const BASE_SHIFT = 20;

// Fondu intérieur exprimé en `vh` — comme l'image (dimensionnée par la hauteur,
// largeur ≈ 38.8vh) — afin que le dégradé reste ancré au bord intérieur de
// l'image quelle que soit la largeur de l'écran. En `vw`, il dérivait hors de
// l'image sur les écrans larges et devenait invisible.
const FADE_START = 10; // vh : l'image reste pleine jusque-là (côté extérieur)
const FADE_END = 34; // vh : image totalement fondue au-delà (~ son bord intérieur)

// Couleur de fond de l'app (thème sombre) : sert au dégradé de fondu intérieur.
const BG = 'rgb(18, 18, 18)';
const BG0 = 'rgba(18, 18, 18, 0)';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function SidePanel({
  side,
  imageRef,
}: {
  side: 'left' | 'right';
  imageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isLeft = side === 'left';
  return (
    <Box
      sx={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        [isLeft ? 'left' : 'right']: 0,
        width: { xs: 0, md: '42vw' },
        display: { xs: 'none', md: 'block' },
        overflow: 'hidden',
      }}
    >
      {/* Couche image : animée (transform posé en JS), débordant de sa fenêtre. */}
      <Box
        ref={imageRef}
        sx={{
          position: 'absolute',
          top: -VOVER,
          bottom: -VOVER,
          // Ancrée au bord extérieur (qui déborde de HOVER, plus le décalage de
          // base de 20px vers l'extérieur) ; le bord intérieur s'arrête au ras
          // de la fenêtre du panneau.
          left: isLeft ? -(HOVER + BASE_SHIFT) : 0,
          right: isLeft ? 0 : -(HOVER + BASE_SHIFT),
          backgroundImage: `url(${isLeft ? '/cover-left.webp' : '/cover-right.webp'})`,
          // Pleine hauteur, largeur naturelle : on montre un maximum de hauteur.
          backgroundSize: 'auto 100%',
          backgroundPosition: isLeft ? 'left center' : 'right center',
          backgroundRepeat: 'no-repeat',
          opacity: 0.6,
          willChange: 'transform',
        }}
      />
      {/* Dégradé de fondu, FIXE (hors de la couche animée) : transparent côté
          extérieur, opaque (couleur de l'app) côté intérieur vers la liste. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(to ${isLeft ? 'right' : 'left'}, ${BG0} 0, ${BG0} ${FADE_START}vh, ${BG} ${FADE_END}vh)`,
        }}
      />
    </Box>
  );
}

export function HomeBackground() {
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let scroll = 0;

    const onMouseMove = (e: MouseEvent) => {
      // Position normalisée [-1, 1] par rapport au centre de la fenêtre.
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      targetX = nx * MOUSE_X;
      targetY = ny * MOUSE_Y;
    };
    const onScroll = () => {
      scroll = window.scrollY;
    };

    let raf = 0;
    const tick = () => {
      // Interpolation exponentielle : lisse le suivi de la cible.
      currentX += (targetX - currentX) * 0.06;
      currentY += (targetY - currentY) * 0.06;
      const shift = clamp(scroll * SCROLL_FACTOR, 0, SCROLL_MAX);
      const y = currentY + shift;
      const t = `translate3d(${currentX.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      // Même transform sur les deux moitiés : la scène entière suit le mouvement.
      if (leftRef.current) leftRef.current.style.transform = t;
      if (rightRef.current) rightRef.current.style.transform = t;
      raf = requestAnimationFrame(tick);
    };

    if (!reduceMotion) {
      window.addEventListener('mousemove', onMouseMove, { passive: true });
      window.addEventListener('scroll', onScroll, { passive: true });
      raf = requestAnimationFrame(tick);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <Box
      aria-hidden
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
        bgcolor: 'background.default',
      }}
    >
      <SidePanel side="left" imageRef={leftRef} />
      <SidePanel side="right" imageRef={rightRef} />
    </Box>
  );
}
