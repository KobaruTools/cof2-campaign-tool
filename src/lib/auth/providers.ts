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
  /**
   * Paramètres supplémentaires ajoutés à l'URL d'autorisation du provider
   * (transmis tels quels par `signInWithOAuth`/`linkIdentity` via `queryParams`).
   *
   * Discord : `prompt=none` évite de ré-afficher l'écran de consentement à
   * CHAQUE connexion (son défaut est `prompt=consent`). La 1ʳᵉ autorisation
   * s'affiche quand même ; ensuite c'est silencieux tant que les scopes ne
   * changent pas. Discord n'a pas de `prompt=none` « strict » → s'il ne peut pas
   * autoriser en silence, il ré-affiche l'écran (pas d'erreur), donc c'est sûr.
   *
   * À NE PAS mettre sur Google : lui supporte le mode strict (erreur
   * `login_required` sans session active) et ne re-prompte de toute façon pas.
   */
  authQueryParams?: Record<string, string>;
}

export const OAUTH_PROVIDERS: readonly OAuthProviderMeta[] = [
  { id: 'google', label: 'Google', brand: '#4285F4' },
  { id: 'discord', label: 'Discord', brand: '#5865F2', authQueryParams: { prompt: 'none' } },
] as const;
