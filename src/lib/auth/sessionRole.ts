/**
 * Rôle de la session courante, dérivé des **claims** posés dans `app_metadata`
 * (non falsifiables : écrits par la clé secrète côté serveur, cf. `joinLink.ts`
 * pour le joueur et le redeem de projection pour la TV).
 *
 * Un seul endroit lit ces claims, pour que le gating (proxy), l'en-tête et les
 * pages parlent tous du même vocabulaire :
 * - `anonymous` : aucune session (visiteur de la vitrine publique) ;
 * - `player` : joueur invité par le lien de son MJ (utilisateur anonyme Supabase
 *   portant `player_id` + `campaign_id`, PER-191) ;
 * - `projection` : observateur lecture seule d'un lien de projection (PER-271),
 *   SANS `player_id` — d'où sa résolution AVANT le joueur ;
 * - `owner` : compte réel (MJ / propriétaire de personnages).
 */
export type SessionRole = 'anonymous' | 'player' | 'projection' | 'owner';

/**
 * Claims applicatifs attendus dans `app_metadata` (tous optionnels).
 *
 * L'index de secours accueille les clés posées par Supabase lui-même (`provider`,
 * `providers`…) : sans lui, le type serait « faible » (toutes propriétés optionnelles)
 * et TypeScript refuserait le `app_metadata` d'un `User`, avec lequel il n'a aucune
 * propriété déclarée en commun.
 */
export interface SessionAppMetadata {
  player_id?: string;
  campaign_id?: string;
  projection?: boolean;
  [key: string]: unknown;
}

/** Forme minimale d'un utilisateur Supabase, suffisante pour dériver le rôle. */
export interface SessionUserLike {
  app_metadata?: SessionAppMetadata | null;
}

/**
 * Dérive le rôle de session d'un utilisateur Supabase (ou de son absence).
 *
 * Ordre volontaire : la **projection** est testée en premier car elle n'a pas de
 * `player_id` et serait sinon prise pour un propriétaire.
 */
export function roleOfUser(user: SessionUserLike | null | undefined): SessionRole {
  if (!user) return 'anonymous';
  const metadata = user.app_metadata ?? {};
  if (metadata.projection) return 'projection';
  if (metadata.player_id) return 'player';
  return 'owner';
}
