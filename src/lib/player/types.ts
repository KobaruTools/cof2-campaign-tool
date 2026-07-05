/**
 * Entité « Joueur » (PER-191) — identité légère LOCALE à une campagne, sans
 * compte. Le joueur rejoint via un lien magique (`/join/<joinSecret>`) qui ouvre
 * une session anonyme scopée (cf. `redeemJoinSecret`). Le MJ (propriétaire de la
 * campagne) crée/renomme/supprime ses joueurs et régénère leur lien.
 *
 * Reflet direct de la ligne SQL `public.players` (clés en anglais). Code en
 * anglais, libellés d'UI en français.
 */
export interface Player {
  id: string;
  campaignId: string;
  name: string;
  /** Secret du lien magique (uuid). Régénérable par le MJ → invalide l'ancien lien. */
  joinSecret: string;
  createdAt: string;
}

/** Construit l'URL complète du lien magique d'un joueur pour un `origin` donné. */
export function joinLinkUrl(origin: string, joinSecret: string): string {
  return `${origin}/join/${joinSecret}`;
}
