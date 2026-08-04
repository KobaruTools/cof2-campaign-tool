/**
 * Entité « Lien de projection » (PER-271) — un lien réutilisable par campagne qui
 * ouvre une session d'OBSERVATEUR en lecture seule (voir `src/lib/auth/projectionLink.ts`).
 * Côté MJ uniquement : généré, copié, régénéré ou révoqué depuis l'écran de MJ.
 */
export interface ProjectionLink {
  campaignId: string;
  secret: string;
  createdAt: string;
}

/**
 * URL partageable du lien de projection : à ouvrir sur une TV / un second ordinateur.
 * Le redeem `/project/[secret]` ouvre la session observateur puis redirige vers `/project`.
 */
export function projectionLinkUrl(origin: string, secret: string): string {
  return `${origin}/project/${secret}`;
}
