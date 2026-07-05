'use client';

import { useRef } from 'react';
import Box from '@mui/material/Box';
import { MOUSE_PARALLAX_X, MOUSE_PARALLAX_Y, useMouseParallax } from '@/lib/ui/useMouseParallax';

/**
 * Illustration de couverture (page 1 du livre de base) scindée en deux moitiés
 * qui encadrent le contenu : la moitié gauche est ancrée au bord gauche, la moitié
 * droite au bord droit, chacune sur toute la hauteur de la fenêtre. Un dégradé fond
 * le côté intérieur (vers le contenu) dans la couleur de l'app, de sorte que
 * l'illustration profite des marges disponibles sans gêner la lecture.
 *
 * Deux variantes :
 * - `'full'` (défaut) : backdrop plein écran fixe (accueil, wizard).
 * - `'footer'` : ancré EN BAS d'un parent `position: relative` (miroir du haut de la
 *   fiche de personnage). L'image est calée en bas et un fondu VERTICAL masque la
 *   coupure de son bord supérieur. Le fond de l'app transparaît (pas de bgcolor).
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
type HomeBackgroundVariant = 'full' | 'footer';

// Réglages du mouvement, en pixels. Le suivi souris vient de la source partagée
// (`useMouseParallax`) pour un mouvement cohérent avec le reste de l'app.
const MOUSE_X = MOUSE_PARALLAX_X; // décalage horizontal max au suivi souris
const MOUSE_Y = MOUSE_PARALLAX_Y; // décalage vertical max au suivi souris
// Décalage vertical max dû au scroll (borné) : atteint en bas de page, réparti sur
// TOUTE la course de défilement (progression 0→1), pas sur les premiers pixels.
const SCROLL_MAX = 8;
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

// Variante `footer`. Hauteur de référence de l'image (vh) : la largeur en découle
// (`backgroundSize: auto 100%`). > 100 → image plus grande que sur l'accueil.
const FOOTER_IMAGE_HEIGHT = 110; // vh
// La bande fait la MÊME hauteur que l'image : celle-ci s'y inscrit entièrement (plus
// de troncature dure en haut), et le fondu vertical peut la faire disparaître
// progressivement jusqu'à son bord SUPÉRIEUR.
const FOOTER_HEIGHT = `${FOOTER_IMAGE_HEIGHT}vh`;
// Fondu VERTICAL du haut, en % de la bande (= de l'image) : opaque tout en haut (bord
// supérieur de l'image) → transparent plus bas. Plus petit = on voit plus d'image.
const FOOTER_TOP_FADE = 32; // %

// Couleur de fond de l'app (thème sombre) : sert au dégradé de fondu intérieur.
const BG = 'rgb(18, 18, 18)';
const BG0 = 'rgba(18, 18, 18, 0)';

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function SidePanel({
  side,
  variant,
  imageRef,
}: {
  side: 'left' | 'right';
  variant: HomeBackgroundVariant;
  imageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const isLeft = side === 'left';
  const isFooter = variant === 'footer';
  // Le dégradé intérieur s'aligne sur le bord intérieur de l'image, dont la largeur
  // (en vh) est proportionnelle à sa hauteur. Le footer agrandit l'image (100 →
  // FOOTER_IMAGE_HEIGHT vh) : on met les arrêts du fondu à la même échelle pour
  // qu'ils restent alignés (la home, à 100vh, garde ses valeurs de base).
  const fadeScale = isFooter ? FOOTER_IMAGE_HEIGHT / 100 : 1;
  const fadeStart = FADE_START * fadeScale;
  const fadeEnd = FADE_END * fadeScale;
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
          // Plein écran : l'image remplit le panneau (pleine hauteur du viewport).
          // Footer : la bande est plus courte que le viewport, mais on dimensionne
          // quand même l'image sur la HAUTEUR DU VIEWPORT (100vh) pour conserver la
          // MÊME LARGEUR que l'accueil (la largeur découle de la hauteur via
          // `backgroundSize: auto 100%`) ; elle est calée en bas et déborde vers le
          // haut, rognée par le panneau puis masquée par le fondu vertical.
          ...(isFooter
            ? { bottom: -VOVER, height: `calc(${FOOTER_IMAGE_HEIGHT}vh + ${2 * VOVER}px)` }
            : { top: -VOVER, bottom: -VOVER }),
          // Ancrée au bord extérieur (qui déborde de HOVER, plus le décalage de
          // base de 20px vers l'extérieur) ; le bord intérieur s'arrête au ras
          // de la fenêtre du panneau.
          left: isLeft ? -(HOVER + BASE_SHIFT) : 0,
          right: isLeft ? 0 : -(HOVER + BASE_SHIFT),
          backgroundImage: `url(${isLeft ? '/cover-left.webp' : '/cover-right.webp'})`,
          // Pleine hauteur, largeur naturelle : on montre un maximum de hauteur.
          backgroundSize: 'auto 100%',
          // Footer : image calée EN BAS (miroir du haut) ; plein écran : centrée.
          backgroundPosition: `${isLeft ? 'left' : 'right'} ${isFooter ? 'bottom' : 'center'}`,
          backgroundRepeat: 'no-repeat',
          opacity: 0.6,
          willChange: 'transform',
        }}
      />
      {/* Dégradé de fondu intérieur, FIXE (hors de la couche animée) : transparent
          côté extérieur, opaque (couleur de l'app) côté intérieur vers le contenu. */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(to ${isLeft ? 'right' : 'left'}, ${BG0} 0, ${BG0} ${fadeStart}vh, ${BG} ${fadeEnd}vh)`,
        }}
      />
      {/* Footer : fondu VERTICAL supplémentaire — opaque en haut (masque la coupure
          du bord supérieur de l'image) → transparent vers le bas où l'art apparaît. */}
      {isFooter && (
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            background: `linear-gradient(to bottom, ${BG} 0%, ${BG0} ${FOOTER_TOP_FADE}%)`,
          }}
        />
      )}
    </Box>
  );
}

export function HomeBackground({ variant = 'full' }: { variant?: HomeBackgroundVariant } = {}) {
  const isFooter = variant === 'footer';
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);

  useMouseParallax(
    ({ x, y, scrollY }) => {
      // Progression du défilement [0, 1] : le décalage est proportionnel à la course
      // TOTALE (recalculée à chaque frame, la hauteur du document pouvant changer),
      // de sorte que le parallaxe atteint son max (SCROLL_MAX) pile en bas de page.
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = maxScroll > 0 ? clamp(scrollY / maxScroll, 0, 1) : 0;
      const dy = y + progress * SCROLL_MAX;
      const t = `translate3d(${x.toFixed(2)}px, ${dy.toFixed(2)}px, 0)`;
      // Même transform sur les deux moitiés : la scène entière suit le mouvement.
      if (leftRef.current) leftRef.current.style.transform = t;
      if (rightRef.current) rightRef.current.style.transform = t;
    },
    { mouseX: MOUSE_X, mouseY: MOUSE_Y, trackScroll: true },
  );

  return (
    <Box
      aria-hidden
      sx={{
        // Footer : ancré au bas d'un parent `position: relative`, bande de hauteur
        //   fixe, SANS bgcolor (le fond de l'app transparaît autour de l'art).
        // Plein écran : backdrop fixe couvrant tout le viewport, peint dans la
        //   couleur de l'app.
        position: isFooter ? 'absolute' : 'fixed',
        left: 0,
        right: 0,
        ...(isFooter ? { bottom: 0, height: FOOTER_HEIGHT } : { top: 0, bottom: 0, bgcolor: 'background.default' }),
        zIndex: -1,
        pointerEvents: 'none',
      }}
    >
      <SidePanel side="left" variant={variant} imageRef={leftRef} />
      <SidePanel side="right" variant={variant} imageRef={rightRef} />
    </Box>
  );
}
