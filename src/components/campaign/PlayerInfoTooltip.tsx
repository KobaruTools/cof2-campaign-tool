'use client';

/**
 * Infobulle de survol PARTAGÉE pour un joueur (réservée aux vues du MJ) : dernière
 * connexion + lien cliquable qui COPIE IMMÉDIATEMENT le lien magique du joueur dans
 * le presse-papier. Factorise le contenu entre `PlayerBadgeTooltip` (badge de la
 * grille de l'écran de MJ / du panneau latéral de fiche) et `SessionPresence` (chip
 * « connecté » de la session en cours), qui l'utilisent tous deux pour habiller un
 * déclencheur différent (`children`).
 */
import { useState, type ReactElement } from 'react';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppTooltip } from '@/components/AppTooltip';
import { useToast } from '@/components/toast/ToastProvider';
import { presenceState } from '@/lib/player/presenceStatus';
import { formatRelativeTime } from '@/lib/ui/relativeTime';
import { joinLinkUrl, type Player } from '@/lib/player/types';

export interface PlayerInfoTooltipProps {
  /** Joueur dont on affiche la présence + le lien magique au survol. */
  player: Player;
  /** Déclencheur survolé (badge, nom…) — élément unique, comme l'exige le `Tooltip` MUI. */
  children: ReactElement;
}

export function PlayerInfoTooltip({ player, children }: PlayerInfoTooltipProps) {
  const { showToast } = useToast();
  // Origine lue à l'init (client) sans effet, comme `PlayersSection` : au premier
  // rendu serveur/hydratation le lien n'est pas encore survolé, donc pas de divergence.
  const [origin] = useState(() => (typeof window !== 'undefined' ? window.location.origin : ''));

  const state = presenceState(player);
  const lastSeenLabel =
    state === 'online'
      ? 'En ligne'
      : state === 'seen'
        ? `Dernière connexion ${formatRelativeTime(player.lastSeenAt ?? player.firstJoinedAt!)}`
        : "Jamais connecté — n'a pas encore ouvert son lien";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinLinkUrl(origin, player.joinSecret));
      showToast('Lien magique copié.', 'success');
    } catch {
      showToast('Impossible de copier le lien.', 'error');
    }
  };

  const detail = (
    <Stack spacing={0.75} sx={{ py: 0.25 }}>
      <Typography variant="body2">{lastSeenLabel}</Typography>
      <Link
        component="button"
        type="button"
        variant="body2"
        underline="hover"
        onClick={() => void handleCopy()}
        sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, textAlign: 'left' }}
      >
        <ContentCopyIcon fontSize="inherit" />
        Copier son lien magique
      </Link>
    </Stack>
  );

  return <AppTooltip title={detail}>{children}</AppTooltip>;
}
