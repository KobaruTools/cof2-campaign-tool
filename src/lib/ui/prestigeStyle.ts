/**
 * Style « précieux » DÉDIÉ aux voies de PRESTIGE (type `prestige`) — purement UI, aucune règle CO2.
 * Là où les voies de profil/peuple ont une teinte pleine (cf. `classColors.ts`), la voie de prestige
 * (7ᵉ voie, statut à part, chap. 8) reçoit une bordure en dégradé blanc/gris clair « métal précieux »
 * qui tourne lentement dans les puces de breakdown (`CapabilityChip`) et se pose en anneau STATIQUE
 * (sans animation, trop lourde en liste) sur les cartes de rang de la fiche. Source unique du dégradé.
 */
import { darken, lighten } from '@mui/material/styles';

/** Arrêts du dégradé conique du liseré TOURNANT (chip) : blanc franc balayé d'un gris (pas de teinte chaude). */
export const PRESTIGE_GRADIENT_STOPS = '#ffffff, #8c8c8c, #ffffff';

/**
 * Les deux arrêts (clair, sombre) du dégradé « métal précieux ». Par défaut (génériques, `color`
 * absent) : le JAUNE → gris chaud exactement tuné par le proprio. Pour une famille de prestige
 * (`color` fourni) : reflet clair → nuance sombre dérivé de la teinte de famille. Source unique des
 * arrêts — `prestigeMetalGradient` (CSS) et le remplissage en dégradé de l'icône `prestige`
 * (`AncestryIcon`, SVG) s'appuient tous deux dessus.
 */
export function prestigeGemStops(color?: string): [string, string] {
  return color ? [lighten(color, 0.72), darken(color, 0.32)] : ['#fff2c2', '#968f74'];
}

/**
 * Dégradé « métal précieux » utilisé comme REMPLISSAGE (liseré de carte, petits carrés de la
 * mini-grille de progression, titre de voie + ligne d'en-tête). `angle` par défaut 45° (liseré de
 * carte, cartouches) ; passer `180deg` pour un dégradé VERTICAL (ligne d'en-tête, où le sens
 * horizontal du 45° ne se voit pas sur 2-3px de large). Source unique.
 */
export function prestigeMetalGradient(color?: string, angle = '45deg'): string {
  const [light, dark] = prestigeGemStops(color);
  return `linear-gradient(${angle}, ${light}, ${dark})`;
}

/**
 * Anneau de bordure en dégradé (respecte le `border-radius`, contrairement à `border-image`) via la
 * technique mask-composite : un `::before` en pleine surface, masqué pour ne garder que le liseré.
 * STATIQUE (pas d'animation) — pensé pour les cartes de rang de prestige (« Voies & capacités »), où
 * une bordure animée sur chaque carte serait trop coûteuse. À poser sur un conteneur `position:
 * relative` avec le même `borderRadius`.
 *
 * @param thickness épaisseur du liseré, en px (défaut 1.5).
 * @param radius rayon des coins de l'anneau (défaut `inherit` = celui du conteneur).
 */
export function prestigeStaticBorderSx(
  thickness = 1,
  radius: string | number = 'inherit',
  color?: string,
) {
  // Dégradé du liseré : or tuné par défaut, teinté par famille si `color` fourni (cf. helper partagé).
  const metal = prestigeMetalGradient(color);
  return {
    position: 'relative' as const,
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: radius,
      padding: `${thickness}px`,
      // Dégradé LISSÉ (voir `metal` ci-dessus), orienté à 45°.
      background: metal,
      // Ne garder que le liseré : le remplissage (content-box) est soustrait de la surface complète.
      WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude',
      pointerEvents: 'none',
    },
  };
}
