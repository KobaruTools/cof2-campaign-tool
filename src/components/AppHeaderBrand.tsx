'use client';

import { useState } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';
import { shineBackground, type ShineGradient } from '@/lib/ui/shine';

/** Boîte de vue et tracé du logo de marque (`src/app/icon.svg`). */
const LOGO_VIEWBOX = '0 0 51 50';
const LOGO_PATH =
  'm49.97,16.58c-2.32-.77-4.47-1.38-6.47-1.82v-1.75c0-.66-.32-1.27-.87-1.65L26.63.35c-.68-.47-1.58-.47-2.27,0L8.37,11.35c-.54.37-.87.99-.87,1.65v1.75c-2,.45-4.15,1.05-6.47,1.82l-1.03.34v27.16l1.97-.66c9.27-3.09,15.68-3.43,19.05-1,2,1.44,2.98,3.92,2.98,7.58h3c0-3.65.97-6.13,2.98-7.58,3.37-2.43,9.78-2.09,19.05,1l1.97.66v-27.16l-1.03-.34Zm-23.22,22.14v-16.94l1.05-.53,8.82-4.41,2.87-1.44v14.55l-12.75,8.77Zm-1.25-34.29l12.78,8.79-1.27.63-11.51,5.76-11.51-5.76-1.27-.63,12.78-8.79Zm-14,12.64v-1.67l2.87,1.44,8.82,4.41,1.05.53v16.94l-12.75-8.77v-12.88Zm3.34,20.76c-3.27,0-7.21.71-11.84,2.12v-20.86c1.59-.51,3.09-.93,4.5-1.26v13.17c0,.66.32,1.28.87,1.65l7.58,5.21c-.36-.02-.73-.03-1.1-.03Zm33.16,2.12c-5.17-1.58-9.47-2.27-12.95-2.09l7.58-5.21c.54-.37.87-.99.87-1.65v-13.17c1.41.34,2.91.76,4.5,1.26v20.86Z';

/**
 * Brillance du logo (survol) : dégradé bleu → violet, dans l'esprit de la brillance des
 * jetons de la bourse (`PurseField`) mais aux teintes froides de la marque.
 */
const LOGO_SHINE: ShineGradient = {
  from: 'rgba(120, 160, 255, 0.95)',
  to: 'rgba(180, 120, 255, 0.95)',
};

/**
 * Logo de marque de l'application (`src/app/icon.svg`). Le markup est nettoyé pour
 * MUI : `fill` neutralisé en `currentColor` afin de suivre la couleur du texte de
 * l'en-tête (comme les autres icônes vendues).
 */
function BrandIcon(props: SvgIconProps) {
  return (
    <SvgIcon viewBox={LOGO_VIEWBOX} {...props}>
      <path d={LOGO_PATH} />
    </SvgIcon>
  );
}

/**
 * Logo de marque de l'en-tête (PER-239) : icône seule, à gauche, cliquable → accueil.
 * Rendu en vraie ancre (`component={Link} href="/"`), donc Ctrl/⌘+Clic et clic-molette
 * ouvrent l'accueil dans un nouvel onglet. `aria-label="Accueil"` (l'icône décorative
 * n'a pas de libellé propre). Présent sur TOUTES les pages : remplace l'ancienne flèche
 * de retour comme point d'ancrage vers l'accueil.
 *
 * `condensed` (au défilement) : rétrécit l'icône, en transition douce, pour dégager de
 * la place (surtout sur mobile).
 *
 * Le bouton est **carré** (largeur = hauteur, calées sur la hauteur exacte de la Toolbar
 * selon `condensed`) et **collé au bord gauche** (marge gauche négative annulant la
 * gouttière de la Toolbar) : sa **bordure droite** sert de séparateur vertical avec la
 * nav qui suit, sur toute la hauteur dynamique de l'en-tête.
 *
 * Contrairement aux autres boutons de l'en-tête, le logo N'a PAS de voile blanc au survol :
 * il est remplacé par (1) un léger **fond** en dégradé de gris qui apparaît en fondu, (2)
 * une **brillance** bleu/violet discrète qui balaie le fond une fois, et (3) un léger
 * **zoom** du SVG.
 */
export function AppHeaderBrand({ condensed = false }: { condensed?: boolean }) {
  const iconSize = condensed ? 22 : 28;
  // Le balayage de brillance est lancé au `mouseEnter` et joue jusqu'au bout, même si la
  // souris quitte le bouton avant la fin (pas d'arrêt brutal). Il se réarme tout seul à la
  // fin (`onAnimationEnd`) pour pouvoir rejouer au survol suivant. `false` = pas
  // d'animation au montage (aucun flash).
  const [shining, setShining] = useState(false);
  // Taille carrée calée sur la min-height exacte de la Toolbar (cf. AppHeader), pour que
  // le carré remplisse toute la hauteur de l'étage 1 et que sa bordure droite serve de
  // séparateur pleine hauteur. Suit la condensation au défilement.
  const size = condensed ? { xs: 44, sm: 48 } : { xs: 56, sm: 64 };
  return (
    <IconButton
      color="inherit"
      component={Link}
      href="/"
      aria-label="Accueil"
      onMouseEnter={() => setShining(true)}
      sx={(theme) => ({
        position: 'relative',
        overflow: 'hidden',
        // Carré plein hauteur, collé au bord gauche (marge négative = gouttière Toolbar).
        width: size,
        height: size,
        ml: { xs: -2, sm: -3 },
        mr: { xs: 1, sm: 1.5 },
        borderRadius: 0,
        borderRight: '1px solid rgba(255, 255, 255, 0.18)',
        transition: theme.transitions.create(['width', 'height'], {
          duration: theme.transitions.duration.short,
        }),
        // Pas de voile blanc au survol/focus (remplacé par le fond dégradé + brillance).
        '&:hover, &.Mui-focusVisible': { backgroundColor: 'transparent' },
        // Fondu du fond dégradé de gris au survol (opacité < 1 : reste léger).
        '&:hover .brand-hover-bg': { opacity: 0.8 },
        // Balayage de la brillance de FOND (une seule passe) : haut-gauche → bas-droite,
        // opacité en cloche à fondus lents (0→40 % / 60→100 %), courbe douce proche du
        // linéaire. Lancé au survol, il joue jusqu'au bout même si on quitte le bouton.
        '@keyframes brandShineSweep': {
          '0%': { backgroundPosition: '160% 160%', opacity: 0 },
          '40%': { opacity: 0.4 },
          '60%': { opacity: 0.4 },
          '100%': { backgroundPosition: '-60% -60%', opacity: 0 },
        },
        // Léger zoom du SVG au survol. Le SVG est vectoriel (pas de pixelisation), et
        // on promeut le calque sur le GPU (`translateZ` + `will-change` +
        // `backfaceVisibility`) pour un rendu net et sans scintillement.
        '&:hover .brand-logo': { transform: 'translateZ(0) scale(1.12)' },
      })}
    >
      {/* Fond dégradé de gris révélé au survol, VERTICAL (bas → haut) : gris clair en bas
          → quasiment la couleur du fond de l'en-tête (rgb 20,20,23) en haut, pour un delta
          de nuance marqué. Apparition en fondu d'opacité. */}
      <Box
        className="brand-hover-bg"
        aria-hidden
        sx={(theme) => ({
          position: 'absolute',
          inset: 0,
          opacity: 0,
          pointerEvents: 'none',
          backgroundImage: 'linear-gradient(to top, rgb(60, 60, 70), rgb(24, 24, 28))',
          transition: theme.transitions.create('opacity', {
            duration: theme.transitions.duration.short,
          }),
        })}
      />
      {/* Calque de brillance PLEIN FOND (plus de masque au tracé) : dégradé bleu/violet
          discret balayant tout le carré en diagonale à 45° exacts (haut-gauche → bas-
          droite), invisible au repos ; le survol l'anime. Fond CARRÉ (même % en X et Y)
          pour que la diagonale reste à 45° visuels, et un peu agrandi pour se voir mieux. */}
      <Box
        className="brand-shine"
        aria-hidden
        onAnimationEnd={() => setShining(false)}
        sx={{
          position: 'absolute',
          inset: 0,
          opacity: 0,
          pointerEvents: 'none',
          backgroundImage: shineBackground(LOGO_SHINE, 135),
          backgroundRepeat: 'no-repeat',
          backgroundSize: '340% 340%',
          animation: shining ? 'brandShineSweep 1.3s cubic-bezier(0.5, 0, 0.5, 1) 1' : 'none',
        }}
      />
      {/* Icône de base (couleur du texte), au-dessus de la brillance. Zoom au survol. */}
      <BrandIcon
        className="brand-logo"
        sx={(theme) => ({
          position: 'relative',
          width: iconSize,
          height: iconSize,
          display: 'block',
          transformOrigin: 'center',
          willChange: 'transform',
          backfaceVisibility: 'hidden',
          transition: theme.transitions.create(['width', 'height', 'transform'], {
            duration: theme.transitions.duration.short,
          }),
        })}
      />
    </IconButton>
  );
}
