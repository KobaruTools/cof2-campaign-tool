'use client';

import { useRef } from 'react';
import Box from '@mui/material/Box';
import { useMouseParallax } from '@/lib/ui/useMouseParallax';

/**
 * Fond bleu texturé (test visuel, PER-432) — la mosaïque « kaléidoscope » posée à
 * 45°, avec un léger parallaxe au DÉFILEMENT SEULEMENT (pas de suivi souris,
 * volontairement — `mouseX`/`mouseY` à 0). Vitesse relative au scroll : le fond se
 * déplace plus lentement que le contenu, pour un effet de profondeur discret.
 *
 * Rendu en vrai élément (pas un `body::before` en CSS pur) : il faut un `ref` DOM
 * pour poser le `transform` à chaque frame — un pseudo-élément ne peut pas en recevoir.
 * `backgroundRepeat` tuile à l'infini : contrairement aux illustrations de couverture
 * (`HomeBackground`), aucun bord à border ni de bornage de course nécessaire.
 *
 * Ordre du `transform` : `translateY(...) rotate(45deg)` et PAS l'inverse. Les
 * transforms s'appliquent de droite à gauche ; `rotate` d'abord ferait tourner le
 * VECTEUR de déplacement de 45° (la texture semble alors dériver en diagonale au
 * scroll, contre-intuitif) — en le mettant en dernier, la translation reste
 * verticale à l'écran, et seule la tuile (déjà tournée avant) apparaît penchée.
 */
const SCROLL_FACTOR = 0.008;

export function TextureBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useMouseParallax(
    ({ scrollY }) => {
      if (ref.current) {
        const dy = -scrollY * SCROLL_FACTOR;
        ref.current.style.transform = `translateY(${dy.toFixed(2)}px) rotate(45deg)`;
      }
    },
    // `ignorePreference` : le réglage compte `animateBackground` ne vise que le
    // suivi SOURIS (cf. sa doc, préférences.ts) ; notre effet est scroll-only, comme
    // l'exception déjà faite pour `HeroScene`. `prefers-reduced-motion` (OS) reste
    // respecté quoi qu'il arrive — jamais outrepassé, lui.
    { mouseX: 0, mouseY: 0, trackScroll: true, ignorePreference: true },
  );

  return (
    <Box
      ref={ref}
      aria-hidden
      data-glossary-shot="TextureBackground"
      sx={{
        position: 'fixed',
        // Surdimensionné + centré (au lieu d'un simple `inset: 0`) : la rotation à
        // 45° ferait apparaître des coins vides aux angles du viewport sinon.
        top: '-50%',
        left: '-50%',
        width: '200%',
        height: '200%',
        transform: 'rotate(45deg)',
        zIndex: -1,
        pointerEvents: 'none',
        opacity: 0.75,
        backgroundImage: 'url(/ornaments/texture-nuit-mirror.svg)',
        backgroundRepeat: 'repeat',
        filter: 'saturate(0.1)',
        willChange: 'transform',
      }}
    />
  );
}
