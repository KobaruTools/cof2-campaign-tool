'use client';

/**
 * Badge de joueur ENRICHI pour les vues du MJ (écran de MJ + panneau latéral de
 * fiche) : au survol du badge (`PlayerBadge`), l'infobulle partagée `PlayerInfoTooltip`
 * affiche sa dernière connexion et un lien qui COPIE IMMÉDIATEMENT son lien magique
 * dans le presse-papier, pour le renvoyer sans quitter l'écran de MJ (lien perdu,
 * appareil changé…).
 *
 * Réservé au MJ : sans objet côté joueur (`PlayClient`, fiche seule), qui utilise
 * `PlayerBadge` nu.
 */
import Box from '@mui/material/Box';
import { PlayerBadge } from '@/components/home/PlayerBadge';
import { PlayerInfoTooltip } from '@/components/campaign/PlayerInfoTooltip';
import type { Player } from '@/lib/player/types';

export interface PlayerBadgeTooltipProps {
  /** Joueur qui incarne le personnage, ou `null` si aucun n'est attribué. */
  player: Player | null;
}

export function PlayerBadgeTooltip({ player }: PlayerBadgeTooltipProps) {
  // Aucun joueur attribué : badge nu, rien à survoler.
  if (!player)
    return (
      <Box component="span" data-glossary-shot="PlayerBadgeTooltip" sx={{ display: 'inline-flex' }}>
        <PlayerBadge name={null} />
      </Box>
    );

  return (
    <PlayerInfoTooltip player={player}>
      {/* Box porteur de ref/handlers pour le Tooltip (le badge est un composant simple). */}
      <Box component="span" data-glossary-shot="PlayerBadgeTooltip" sx={{ display: 'inline-flex' }}>
        <PlayerBadge name={player.name} />
      </Box>
    </PlayerInfoTooltip>
  );
}
