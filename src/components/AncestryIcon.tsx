import { forwardRef, useId } from 'react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';
import { ANCESTRY_ICON_PATHS } from '@/lib/ui/ancestryIcons';

export interface AncestryIconProps {
  /** Id de la voie de peuple (ex. `'nain'`) — clé dans `ANCESTRY_ICON_PATHS`. */
  ancestryId: string;
  /** Taille en pixels (carré). Défaut 24. */
  size?: number;
  /**
   * Couleur de l'icône (chaîne CSS). Les voies de peuple n'ont pas de teinte de
   * profil : par défaut l'icône hérite de la couleur du texte (`currentColor`).
   */
  color?: string;
  /**
   * Remplissage en DÉGRADÉ (deux arrêts CSS clair→sombre, ex. `prestigeGemStops`) — prioritaire sur
   * `color`. Injecté comme `<linearGradient>` SVG (diagonal, coin haut-gauche → bas-droit) puisqu'un
   * simple `fill: linear-gradient(...)` n'existe pas en CSS pour un SVG.
   */
  gradientStops?: readonly [string, string];
  /**
   * Vecteur du dégradé en fractions `objectBoundingBox` (coin haut-gauche `x1,y1` → bas-droit `x2,y2`
   * de l'icône elle-même) — peut sortir de 0..1 pour ne montrer que le SEGMENT de dégradé qui
   * correspond à la position de l'icône dans un dégradé plus large partagé avec des voisins (ex.
   * l'en-tête continu barre→titre→icône de `PathBlock`). Défaut : diagonal (0,0)→(1,1), le dégradé
   * complet sur l'icône seule.
   */
  gradientVector?: { x1: number; y1: number; x2: number; y2: number };
  /** Texte alternatif accessible ; si absent, l'icône est décorative (aria-hidden). */
  title?: string;
  sx?: SxProps<Theme>;
}

/**
 * Icône d'illustration d'un peuple (game-icons.net, cf. ancestryIcons.ts). Le jeu
 * héberge aussi deux clés hors-peuple pour les voies sans profil : `mage` (chapeau)
 * et `prestige` (étoile). Rendue en SVG inline pour être recolorée via `currentColor`.
 * Ne rend rien si l'id est inconnu.
 */
export const AncestryIcon = forwardRef<SVGSVGElement, AncestryIconProps>(function AncestryIcon(
  { ancestryId, size = 24, color, gradientStops, gradientVector, title, sx },
  ref,
) {
  const gradientId = useId();
  const markup = ANCESTRY_ICON_PATHS[ancestryId];
  if (!markup) return null;
  const vec = gradientVector ?? { x1: 0, y1: 0, x2: 1, y2: 1 };
  // `gradientVector` fourni = l'icône montre un SEGMENT d'un dégradé plus large partagé avec des
  // voisins (ex. l'en-tête continu barre→titre→icône, potentiellement animé) : arrêts SYMÉTRIQUES
  // clair→sombre→clair (triangle) + `spreadMethod="repeat"`, pour qu'un décalage (glissement animé)
  // continue de tuiler sans à-coup au lieu de clamper à la couleur de fin. Sans vecteur (icône seule,
  // cas historique) : simple diagonal 2 arrêts, inchangé.
  const stops = gradientVector
    ? `<stop offset="0%" stop-color="${gradientStops?.[0]}" /><stop offset="50%" stop-color="${gradientStops?.[1]}" /><stop offset="100%" stop-color="${gradientStops?.[0]}" />`
    : `<stop offset="0%" stop-color="${gradientStops?.[0]}" /><stop offset="100%" stop-color="${gradientStops?.[1]}" />`;
  const spreadMethod = gradientVector ? 'repeat' : 'pad';
  const defs = gradientStops
    ? `<defs><linearGradient id="${gradientId}" x1="${vec.x1}" y1="${vec.y1}" x2="${vec.x2}" y2="${vec.y2}" spreadMethod="${spreadMethod}">${stops}</linearGradient></defs>`
    : '';
  return (
    <Box
      ref={ref}
      component="svg"
      viewBox="0 0 512 512"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      sx={{
        display: 'inline-block',
        flexShrink: 0,
        width: size,
        height: size,
        fill: gradientStops ? `url(#${gradientId})` : (color ?? 'currentColor'),
        ...sx,
      }}
      dangerouslySetInnerHTML={{ __html: defs + markup }}
    />
  );
});
