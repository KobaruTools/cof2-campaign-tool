/**
 * Brillance en dégradé : deux teintes balayées le long d'une barre (bord → bord).
 * Alternative à une brillance monochrome (couleur unique). Partagé entre les jetons
 * de la bourse (`PurseField`) et le logo de l'en-tête (`AppHeaderBrand`).
 */
export interface ShineGradient {
  from: string;
  to: string;
}

/** Brillance : soit une couleur unie (barre monochrome), soit un dégradé bord → bord. */
export type Shine = string | ShineGradient;

/**
 * Construit le fond d'une barre de brillance qui balaie : monochrome (couleur unique,
 * transparente aux bords → bande claire au centre) ou en dégradé (deux teintes au centre).
 * La bande reste transparente aux extrémités pour un fondu propre pendant le balayage.
 */
export function shineBackground(shine: Shine | undefined): string {
  if (shine && typeof shine === 'object') {
    return `linear-gradient(120deg, transparent 0%, ${shine.from} 38%, ${shine.to} 62%, transparent 100%)`;
  }
  const color = shine ?? 'rgba(255,255,255,0.85)';
  return `linear-gradient(120deg, transparent 0%, ${color} 50%, transparent 100%)`;
}
