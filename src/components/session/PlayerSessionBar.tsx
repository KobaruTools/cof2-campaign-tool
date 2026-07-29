'use client';

/**
 * Barre « session en cours » côté JOUEUR (PER-265) — pour l'espace `/play`. Fine
 * enveloppe de `SessionLiveBar` qui résout l'identité de présence du joueur courant
 * (roster). N'affiche RIEN hors session.
 */
import { SessionLiveBar } from '@/components/session/SessionLiveBar';

export interface PlayerSessionBarProps {
  campaignId: string;
  /** Id du joueur courant (claim de session) — son identité de présence. */
  playerId: string;
  /** Nom d'affichage du joueur (roster). Peut arriver après coup → ré-annoncé. */
  playerName: string;
}

export function PlayerSessionBar({ campaignId, playerId, playerName }: PlayerSessionBarProps) {
  return (
    <SessionLiveBar
      campaignId={campaignId}
      identity={{ kind: 'player', playerId, name: playerName }}
    />
  );
}
