'use client';

/**
 * Badge « Session en cours » (PER-264) — indicateur LECTURE SEULE, affiché sur les
 * pages où un joueur/MJ est présent (fiche, `/play`) pour signaler qu'une session de
 * table synchronisée est active. C'est le socle visuel sur lequel les tickets suivants
 * (PER-265+) accrocheront la présence et la synchro temps réel.
 *
 * Bloc custom (pas de `Chip` MUI, règle projet — cf. mémoire des badges). N'affiche
 * RIEN hors session (retour `null`) : discret par nature. Le hook `useActiveSession`
 * (avec battement) découvre la session par poll léger sans socket permanent, et garde
 * la session vivante tant que la page reste ouverte.
 */
import { useActiveSession } from '@/lib/session/useActiveSession';
import { SessionActiveBadge } from './SessionActiveBadge';

export interface SessionStatusBadgeProps {
  /** Campagne de la page ; `null`/`undefined` (fiche non rattachée) → rien à surveiller. */
  campaignId: string | null | undefined;
}

export function SessionStatusBadge({ campaignId }: SessionStatusBadgeProps) {
  const { isActive } = useActiveSession(campaignId, { heartbeat: true });

  // Discret : hors session (ou tant que non résolu), on n'affiche rien.
  if (!isActive) return null;

  return <SessionActiveBadge />;
}
