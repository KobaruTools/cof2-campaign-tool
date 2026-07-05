/**
 * Providers OAuth retenus pour l'authentification (PER-188) : Google et Discord.
 * Facebook a été abandonné (2026-07-05 : App Review trop lourde + email pas
 * garanti → liaison auto impossible). Le magic-link email est traité à part
 * (méthode sans tiers). Les `id` sont les identifiants Supabase (`Provider`) —
 * ne pas traduire.
 */
export type OAuthProviderId = 'google' | 'discord';

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
] as const;
