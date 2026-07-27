/**
 * Style « précieux » DÉDIÉ aux voies de PRESTIGE (type `prestige`) — purement UI, aucune règle CO2.
 * Là où les voies de profil/peuple ont une teinte pleine (cf. `classColors.ts`), la voie de prestige
 * (7ᵉ voie, statut à part, chap. 8) reçoit une bordure en dégradé blanc/gris clair « métal précieux »
 * qui tourne lentement dans les puces de breakdown (`CapabilityChip`) et se pose en anneau STATIQUE
 * (sans animation, trop lourde en liste) sur les cartes de rang de la fiche. Source unique du dégradé.
 */

/** Arrêts du dégradé conique du liseré TOURNANT (chip) : blanc franc balayé d'un gris (pas de teinte chaude). */
export const PRESTIGE_GRADIENT_STOPS = '#ffffff, #8c8c8c, #ffffff';

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
export function prestigeStaticBorderSx(thickness = 1, radius: string | number = 'inherit') {
  return {
    position: 'relative' as const,
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      borderRadius: radius,
      padding: `${thickness}px`,
      // 50/50 blanc/gris orienté à 45° (retour proprio) : moitié blanche, moitié grise en diagonale.
      background: 'linear-gradient(45deg, #ffffff 0%, #ffffff 50%, #8c8c8c 50%, #8c8c8c 100%)',
      // Ne garder que le liseré : le remplissage (content-box) est soustrait de la surface complète.
      WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
      WebkitMaskComposite: 'xor',
      maskComposite: 'exclude',
      pointerEvents: 'none',
    },
  };
}
