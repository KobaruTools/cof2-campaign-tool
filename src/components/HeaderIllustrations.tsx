'use client';

import { useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { useMouseParallax } from '@/lib/ui/useMouseParallax';
import { useHasTransparentBackground } from '@/lib/image/useHasTransparentBackground';
import { useCroppedImageSrc } from '@/lib/image/useCroppedImageSrc';
import type { PortraitCropRect } from '@/lib/storage/characterPortrait';

// Largeur du cadre de repli (PER-384) quand le portrait de profil n'est pas
// détouré (photo personnalisée à fond plein). Exportée : la fiche s'en sert pour
// réserver la même largeur au champ de nom en mode édition (PER-394 retours),
// sans quoi son soulignement plein-largeur passe SOUS le cadre. Sa hauteur, elle,
// n'est PAS fixe : elle s'étire (`top`/`bottom: 0`) sur toute la hauteur du bloc
// titre, quelle que soit sa taille réelle (nom sur 1 ou 2 lignes…).
export const FALLBACK_FRAME_WIDTH = 130;

// Fraction du défilement répercutée sur l'image (parallaxe vertical). Volontairement
// faible : l'effet doit rester à peine perceptible.
const SCROLL_FACTOR = 0.08;

interface HeaderIllustrationsProps {
  /** Peuple : illustration « vitruve », ancrée au bord GAUCHE de l'écran. Absent = rien. */
  ancestryId?: string;
  /** Profil : portrait, ancré au bord DROIT de l'écran. Absent = rien. */
  classId?: string;
  /**
   * Src déjà résolu du portrait de profil (illustration standard/alt statique,
   * ou objectURL d'un portrait personnalisé — cf. `useCharacterPortraitSrc`,
   * PER-383). Le composant n'a plus à connaître les variantes, juste à afficher
   * l'image reçue. Défaut : illustration standard du profil (`classId`).
   */
  classPortraitSrc?: string;
  /**
   * Zone de recadrage carrée (PER-394) du portrait personnalisé — appliquée
   * UNIQUEMENT au cadre de repli (fond plein) ci-dessous, jamais au filigrane
   * (fond transparent), qui ignore volontairement le recadrage : il affiche
   * toujours l'illustration complète.
   */
  portraitCropRect?: PortraitCropRect | null;
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
  classPortraitSrc,
  portraitCropRect,
  ancestryTop = '75%',
  ancestryHeight = '300%',
}: HeaderIllustrationsProps) {
  // Mouvement écrit directement sur le DOM (pas de state React → pas de re-render à
  // chaque pixel), dans une boucle rAF continue : parallaxe au défilement + léger
  // suivi de la souris lissé (interpolation exponentielle vers la cible).
  const ancestryImgRef = useRef<HTMLImageElement>(null);
  const classImgRef = useRef<HTMLImageElement>(null);
  const classSrc = classId ? classPortraitSrc ?? `/classes/${classId}.webp` : undefined;
  // PER-384 : une photo personnalisée à fond plein casserait le filigrane (rectangle
  // disgracieux) — on bascule alors sur un petit cadre bordé, cf. plus bas.
  const classHasTransparentBackground = useHasTransparentBackground(classSrc);
  // PER-394 : le cadre de repli reproduit le recadrage carré choisi par le joueur
  // (la même vignette que la carte/l'initiative/la section Identité) — le
  // filigrane, lui, ignore `portraitCropRect` et garde l'illustration complète.
  const croppedClassSrc = useCroppedImageSrc(classSrc, portraitCropRect);
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
    { trackScroll: true, deps: [ancestryId, classId, classPortraitSrc] },
  );

  return (
    <>
      {ancestryId && (
        <Box
          component="img"
          ref={ancestryImgRef}
          data-glossary-shot="HeaderIllustrations"
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
      {classId && classHasTransparentBackground && (
        <Box
          component="img"
          ref={classImgRef}
          data-glossary-shot="HeaderIllustrations"
          src={classSrc}
          alt=""
          aria-hidden
          sx={{
            display: 'block',
            position: 'absolute',
            // Sur mobile, décalée un peu plus haut et vers la gauche (top négatif,
            // right > 50 % rapproche le bord droit du centre avant le translateX).
            top: { xs: -24, md: 0 },
            // Ancré au bord DROIT de l'écran (symétrique de la vitruve) : right 50 %
            // place le bord droit de l'image au centre du viewport, translateX 50vw le
            // ramène sur le bord droit de l'écran.
            right: { xs: '58%', md: '50%' },
            transform: 'translateX(50vw)',
            willChange: 'transform',
            // Hauteur réduite de moitié sur mobile (< md) — reste visible mais moins envahissante.
            height: { xs: 300, md: 600 },
            width: 'auto',
            opacity: 0.4,
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      )}
      {classId && !classHasTransparentBackground && (
        // PER-384 : portrait personnalisé à fond plein — le filigrane bord-à-bord
        // ferait apparaître son rectangle de fond, donc repli en petit cadre bordé
        // « même style que les sections » (Paper outlined), ancré dans le coin
        // haut-droit du bloc d'en-tête (pas de la vitruve, pas de suivi souris/scroll :
        // ce n'est plus un filigrane d'arrière-plan). Recadré au carré choisi par le
        // joueur (PER-394, cf. `croppedClassSrc`).
        <Paper
          variant="outlined"
          data-glossary-shot="HeaderIllustrations"
          sx={{
            display: 'block',
            position: 'absolute',
            // Sur mobile (< md), cadre limité à la moitié inférieure du bloc titre
            // (hauteur -50%) au lieu de s'étirer sur toute sa hauteur.
            top: { xs: '50%', md: 0 },
            bottom: 0,
            right: 0,
            width: FALLBACK_FRAME_WIDTH,
            overflow: 'hidden',
            zIndex: 1,
          }}
        >
          <Box
            component="img"
            src={croppedClassSrc ?? classSrc}
            alt=""
            aria-hidden
            sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
          />
        </Paper>
      )}
    </>
  );
}
