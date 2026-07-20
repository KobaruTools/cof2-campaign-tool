'use client';

import { useRef } from 'react';
import Box from '@mui/material/Box';
import { useMouseParallax } from '@/lib/ui/useMouseParallax';

// Fraction du défilement répercutée sur l'image (parallaxe vertical). Volontairement
// faible : l'effet doit rester à peine perceptible.
const SCROLL_FACTOR = 0.08;

interface HeaderIllustrationsProps {
  /** Peuple : illustration « vitruve », ancrée au bord GAUCHE de l'écran. Absent = rien. */
  ancestryId?: string;
  /** Profil : portrait, ancré au bord DROIT de l'écran. Absent = rien. */
  classId?: string;
  /** Variante du portrait de profil (image alternative « -2 »). */
  portraitVariant?: 'default' | 'alt';
  /**
   * Position verticale de la vitruve. Relative au parent (`position: relative`) si
   * exprimée en % — défaut `'75%'`, calibré pour l'en-tête compact de la fiche ; on
   * passe une valeur px pour un ancrage en fond (parent haut, ex. wizard).
   */
  ancestryTop?: number | string;
  /** Hauteur de la vitruve. Défaut `'300%'` (proportionnel à l'en-tête de la fiche). */
  ancestryHeight?: number | string;
}

/**
 * Illustrations d'arrière-plan encadrant le contenu : la « vitruve » du peuple collée
 * au bord gauche de l'écran, le portrait du profil au bord droit, en filigrane
 * semi-transparent (zIndex -1, pointerEvents none) avec un léger parallaxe au scroll
 * et un suivi de la souris (désactivés si « animations réduites »).
 *
 * Doit être rendu dans un ancêtre `position: relative` dont le centre horizontal
 * coïncide avec celui du viewport (typiquement un enfant pleine largeur d'un
 * `Container` centré). L'ancrage aux bords de l'écran repose sur ce centrage : on
 * part du centre du bloc (`left`/`right: 50%`) puis on translate d'un demi-viewport
 * (`±50vw`). Partagé par la fiche de personnage et le wizard de création.
 */
export function HeaderIllustrations({
  ancestryId,
  classId,
  portraitVariant = 'default',
  ancestryTop = '75%',
  ancestryHeight = '300%',
}: HeaderIllustrationsProps) {
  // Mouvement écrit directement sur le DOM (pas de state React → pas de re-render à
  // chaque pixel), dans une boucle rAF continue : parallaxe au défilement + léger
  // suivi de la souris lissé (interpolation exponentielle vers la cible).
  const ancestryImgRef = useRef<HTMLImageElement>(null);
  const classImgRef = useRef<HTMLImageElement>(null);
  useMouseParallax(
    ({ x, y, scrollY }) => {
      const mx = x.toFixed(2);
      const dy = (scrollY * SCROLL_FACTOR + y).toFixed(2);
      // On conserve les transforms de base (ancrage aux bords via ±50vw, +50px de
      // décalage vertical sur la vitruve) et on y ajoute scroll + suivi souris.
      if (ancestryImgRef.current) {
        ancestryImgRef.current.style.transform = `translateX(calc(-50vw + ${mx}px)) translateY(calc(-50% + 50px + ${dy}px))`;
      }
      if (classImgRef.current) {
        classImgRef.current.style.transform = `translateX(calc(50vw + ${mx}px)) translateY(${dy}px)`;
      }
    },
    { trackScroll: true, deps: [ancestryId, classId, portraitVariant] },
  );

  return (
    <>
      {ancestryId && (
        <Box
          component="img"
          ref={ancestryImgRef}
          src={`/ancestries/${ancestryId}-vitruve.webp`}
          alt=""
          aria-hidden
          sx={{
            // Masquées sur mobile (< md) — PER-228. Sur petit écran, ces filigranes
            // ancrés aux bords de l'écran (±50vw) passaient derrière le texte de
            // l'en-tête sans contraste garanti et nuisaient à sa lisibilité. On calque
            // le comportement propre de HomeBackground (fonds d'accueil masqués < md).
            display: { xs: 'none', md: 'block' },
            position: 'absolute',
            top: ancestryTop,
            // Ancré au bord GAUCHE de l'écran : le centre du bloc = centre du viewport,
            // on part de là (left 50 %) puis on ramène le bord gauche de l'image sur le
            // bord gauche de l'écran (translateX -50vw). +50px : démarre un peu plus bas.
            left: '50%',
            transform: 'translateX(-50vw) translateY(calc(-50% + 50px))',
            willChange: 'transform',
            height: ancestryHeight,
            width: 'auto',
            opacity: 0.4,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      )}
      {classId && (
        <Box
          component="img"
          ref={classImgRef}
          src={`/classes/${classId}${portraitVariant === 'alt' ? '-2' : ''}.webp`}
          alt=""
          aria-hidden
          sx={{
            // Masqué sur mobile (< md) — PER-228, cf. la vitruve du peuple ci-dessus.
            display: { xs: 'none', md: 'block' },
            position: 'absolute',
            top: 0,
            // Ancré au bord DROIT de l'écran (symétrique de la vitruve) : right 50 %
            // place le bord droit de l'image au centre du viewport, translateX 50vw le
            // ramène sur le bord droit de l'écran.
            right: '50%',
            transform: 'translateX(50vw)',
            willChange: 'transform',
            height: 600,
            width: 'auto',
            opacity: 0.4,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      )}
    </>
  );
}
