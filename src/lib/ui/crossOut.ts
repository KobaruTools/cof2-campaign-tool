/**
 * Effet visuel « BARRÉ » (deux barres diagonales en croix) — part PURE et PARTAGÉE, pour ne pas
 * redupliquer la recette du dégradé partout où l'app raye un bloc :
 *  - capacité de voie inutilisable avec l'armure portée (PER-86, `FeaturesByPath`) : croix légère
 *    dérivée de la couleur de texte courante ;
 *  - carte d'une créature VAINCUE (0 PV) du tracker projeté : croix ROUGE épaisse, sous une tête
 *    de mort.
 *
 * La croix est dessinée en DÉGRADÉS CSS (aucun SVG, aucun pseudo-élément imposé) : deux
 * `linear-gradient` diagonaux, l'un montant, l'autre descendant, qui ne peignent qu'une fine bande
 * au milieu de leur course.
 *
 * Les bords du trait sont FEUTRÉS : une rampe de ~0.75px `transparent → couleur` de chaque côté (au
 * lieu d'un arrêt net à la même position) laisse le navigateur anti-aliaser la diagonale. Sans ça,
 * l'arête franche du gradient « marche » pixel par pixel et crénelle fortement, surtout sur un bloc
 * large et bas (diagonale très inclinée).
 */

/**
 * Couleur par DÉFAUT de la croix : la couleur de texte courante à 45 % d'opacité (via `color-mix`),
 * donc automatiquement adaptée au thème clair/sombre et au contexte où la croix est posée.
 */
export const CROSS_OUT_CURRENT_COLOR = 'color-mix(in srgb, currentColor 45%, transparent)';

/** Largeur de la rampe de feutrage de chaque côté du trait (px). */
const FEATHER = 0.75;

export interface CrossOutOptions {
  /** Couleur du trait. Défaut : `CROSS_OUT_CURRENT_COLOR`. */
  color?: string;
  /** Épaisseur du cœur du trait, en px (le feutrage s'ajoute de part et d'autre). Défaut 1. */
  thickness?: number;
}

/**
 * Valeur `background-image` des deux barres en croix, à poser sur l'élément (ou son pseudo-élément)
 * qu'on veut barrer. Ne fixe rien d'autre : c'est à l'appelant de dimensionner/positionner la
 * surface peinte.
 */
export function crossOutBackgroundImage({ color = CROSS_OUT_CURRENT_COLOR, thickness = 1 }: CrossOutOptions = {}): string {
  const half = thickness / 2;
  const edge = half + FEATHER;
  const stops =
    `transparent calc(50% - ${edge}px), ${color} calc(50% - ${half}px), ` +
    `${color} calc(50% + ${half}px), transparent calc(50% + ${edge}px)`;
  return `linear-gradient(to top right, ${stops}), linear-gradient(to bottom right, ${stops})`;
}

/**
 * Fragment `sx` prêt à étaler qui barre un bloc via son pseudo-élément `::after` — l'usage courant :
 * la croix se superpose au contenu sans l'altérer et sans intercepter le pointeur, et suit l'arrondi
 * du bloc. Le conteneur doit être `position: relative` (et ne pas déjà utiliser son `::after`).
 */
export function crossOutAfterSx(options: CrossOutOptions = {}) {
  return {
    '&::after': {
      content: '""',
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      borderRadius: 'inherit',
      backgroundImage: crossOutBackgroundImage(options),
    },
  } as const;
}
