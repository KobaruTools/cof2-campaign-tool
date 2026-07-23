'use client';

import Link from 'next/link';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import SvgIcon, { type SvgIconProps } from '@mui/material/SvgIcon';
import { AppTooltip } from '@/components/AppTooltip';
import { shineBackground, type ShineGradient } from '@/lib/ui/shine';

/** Boîte de vue et tracé du logo de marque (`src/app/icon.svg`). */
const LOGO_VIEWBOX = '0 0 51 50';
const LOGO_PATH =
  'm49.97,16.58c-2.32-.77-4.47-1.38-6.47-1.82v-1.75c0-.66-.32-1.27-.87-1.65L26.63.35c-.68-.47-1.58-.47-2.27,0L8.37,11.35c-.54.37-.87.99-.87,1.65v1.75c-2,.45-4.15,1.05-6.47,1.82l-1.03.34v27.16l1.97-.66c9.27-3.09,15.68-3.43,19.05-1,2,1.44,2.98,3.92,2.98,7.58h3c0-3.65.97-6.13,2.98-7.58,3.37-2.43,9.78-2.09,19.05,1l1.97.66v-27.16l-1.03-.34Zm-23.22,22.14v-16.94l1.05-.53,8.82-4.41,2.87-1.44v14.55l-12.75,8.77Zm-1.25-34.29l12.78,8.79-1.27.63-11.51,5.76-11.51-5.76-1.27-.63,12.78-8.79Zm-14,12.64v-1.67l2.87,1.44,8.82,4.41,1.05.53v16.94l-12.75-8.77v-12.88Zm3.34,20.76c-3.27,0-7.21.71-11.84,2.12v-20.86c1.59-.51,3.09-.93,4.5-1.26v13.17c0,.66.32,1.28.87,1.65l7.58,5.21c-.36-.02-.73-.03-1.1-.03Zm33.16,2.12c-5.17-1.58-9.47-2.27-12.95-2.09l7.58-5.21c.54-.37.87-.99.87-1.65v-13.17c1.41.34,2.91.76,4.5,1.26v20.86Z';

/**
 * Silhouette du logo réutilisée en **masque CSS** (data-URI) : réutilise le MÊME tracé
 * que l'icône (pas de duplication) pour cantonner la brillance à la forme du logo.
 * Le masque exploite le canal alpha : le tracé plein (opaque) laisse voir la brillance,
 * le reste (transparent) la cache.
 */
const LOGO_MASK = `url("data:image/svg+xml,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${LOGO_VIEWBOX}'><path fill='%23fff' d='${LOGO_PATH}'/></svg>`,
)}")`;

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
 * `condensed` (au défilement) : rétrécit l'icône et resserre le bouton, en transition
 * douce, pour dégager de la place (surtout sur mobile).
 *
 * Contrairement aux autres boutons de l'en-tête, le logo N'a PAS de fond blanc au survol :
 * il est remplacé par une **brillance** dégradé bleu/violet qui balaie la silhouette de
 * l'icône (une passe, comme les jetons de la bourse), via un calque masqué au tracé du logo.
 */
export function AppHeaderBrand({ condensed = false }: { condensed?: boolean }) {
  const iconSize = condensed ? 22 : 28;
  return (
    <AppTooltip title="Accueil">
      <IconButton
        edge="start"
        color="inherit"
        component={Link}
        href="/"
        aria-label="Accueil"
        sx={(theme) => ({
          mr: 0.5,
          p: condensed ? 0.5 : 1,
          transition: theme.transitions.create('padding', {
            duration: theme.transitions.duration.short,
          }),
          // Pas de voile blanc au survol/focus (remplacé par la brillance ci-dessous).
          '&:hover, &.Mui-focusVisible': { backgroundColor: 'transparent' },
          // Balayage de la brillance au survol du bouton (une seule passe).
          '@keyframes brandShineSweep': {
            '0%': { backgroundPosition: '160% 0', opacity: 0 },
            '18%': { opacity: 1 },
            '82%': { opacity: 1 },
            '100%': { backgroundPosition: '-60% 0', opacity: 0 },
          },
          '&:hover .brand-shine': {
            animationName: 'brandShineSweep',
            animationDuration: '0.9s',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 1,
          },
        })}
      >
        {/* Enveloppe carrée à la taille de l'icône : porte l'icône de base (couleur du
            texte) + le calque de brillance masqué à sa silhouette, superposés. */}
        <Box
          sx={(theme) => ({
            position: 'relative',
            display: 'inline-flex',
            width: iconSize,
            height: iconSize,
            transition: theme.transitions.create(['width', 'height'], {
              duration: theme.transitions.duration.short,
            }),
          })}
        >
          <BrandIcon sx={{ width: '100%', height: '100%', display: 'block' }} />
          {/* Calque de brillance : dégradé bleu/violet clippé à la forme du logo (masque
              CSS), invisible au repos (opacité 0) ; le survol du bouton le fait balayer. */}
          <Box
            className="brand-shine"
            aria-hidden
            sx={{
              position: 'absolute',
              inset: 0,
              opacity: 0,
              pointerEvents: 'none',
              backgroundImage: shineBackground(LOGO_SHINE),
              backgroundRepeat: 'no-repeat',
              backgroundSize: '300% 100%',
              filter: 'drop-shadow(0 0 3px rgba(150, 150, 255, 0.55))',
              WebkitMaskImage: LOGO_MASK,
              maskImage: LOGO_MASK,
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
            }}
          />
        </Box>
      </IconButton>
    </AppTooltip>
  );
}
