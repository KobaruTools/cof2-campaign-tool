import type { OAuthProviderId } from './providers';
import { storageKeys } from '@/lib/storage/keys';

/**
 * Indice UX « dernière méthode d'auth utilisée » (PER-188), mémorisé en
 * `localStorage`. Non-autoritatif : sert juste à mettre en avant, sur l'écran de
 * connexion, la méthode du dernier login réussi. Aucune donnée sensible.
 */
export type LastAuthMethod = OAuthProviderId | 'magic-link';

const STORAGE_KEY = storageKeys.auth.lastMethod;

const VALID: readonly LastAuthMethod[] = ['google', 'discord', 'magic-link'];

/** Lit la dernière méthode utilisée, ou `null` (SSR, absente ou invalide). */
export function readLastAuthMethod(): LastAuthMethod | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw && (VALID as string[]).includes(raw) ? (raw as LastAuthMethod) : null;
}

/** Mémorise la méthode qui vient d'être déclenchée. Silencieux si indisponible. */
export function rememberLastAuthMethod(method: LastAuthMethod): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, method);
  } catch {
    // Stockage indisponible (mode privé, quota) : l'indice est optionnel.
  }
}
