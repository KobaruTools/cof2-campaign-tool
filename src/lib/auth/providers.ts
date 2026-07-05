/**
 * Providers OAuth retenus pour l'authentification (PER-188) : Google, Discord,
 * Facebook (pas GitHub). Le magic-link email est traité à part (méthode sans
 * tiers). Les `id` sont les identifiants Supabase (`Provider`) — ne pas traduire.
 */
export type OAuthProviderId = 'google' | 'discord' | 'facebook';

export interface OAuthProviderMeta {
  id: OAuthProviderId;
  /** Libellé affiché (français / nom de marque). */
  label: string;
  /** Couleur de marque, pour l'accent du bouton. */
  brand: string;
}

export const OAUTH_PROVIDERS: readonly OAuthProviderMeta[] = [
  { id: 'google', label: 'Google', brand: '#4285F4' },
  { id: 'discord', label: 'Discord', brand: '#5865F2' },
  { id: 'facebook', label: 'Facebook', brand: '#1877F2' },
] as const;
