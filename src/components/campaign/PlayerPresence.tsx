'use client';

/**
 * Marqueur de présence d'un joueur côté MJ (PER-195). Bloc custom (pas de `Chip`
 * MUI, règle projet) : une pastille colorée + un libellé bref indiquant si le
 * joueur a activé son lien et sa dernière activité.
 *
 *   - jamais connecté  → point atténué + « Jamais connecté » (italique) ;
 *   - en ligne         → point vert + « En ligne » ;
 *   - déjà venu        → point neutre + « Actif <il y a X> ».
 *
 * Calculé au rendu (client) : la vue campagne est un instantané au chargement
 * (modèle sans temps réel du projet) — le temps relatif se rafraîchit au prochain
 * chargement du roster.
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { AppTooltip } from '@/components/AppTooltip';
import type { Player } from '@/lib/player/types';
import { presenceState } from '@/lib/player/presenceStatus';
import { formatRelativeTime } from '@/lib/ui/relativeTime';

export function PlayerPresence({
  player,
}: {
  player: Pick<Player, 'firstJoinedAt' | 'lastSeenAt'>;
}) {
  const state = presenceState(player);

  const dotColor =
    state === 'online'
      ? 'rgb(102, 187, 106)' // vert (actif)
      : state === 'seen'
        ? 'rgba(255, 255, 255, 0.45)' // neutre (déjà venu, inactif)
        : 'rgba(255, 255, 255, 0.20)'; // atténué (jamais connecté)

  const label =
    state === 'online'
      ? 'En ligne'
      : state === 'seen'
        ? `Actif ${formatRelativeTime(player.lastSeenAt ?? player.firstJoinedAt!)}`
        : 'Jamais connecté';

  const tooltip =
    state === 'never'
      ? "Ce joueur n'a pas encore ouvert son lien magique."
      : `A rejoint la campagne ${formatRelativeTime(player.firstJoinedAt!)}.`;

  return (
    <AppTooltip title={tooltip}>
      <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
        <Box
          component="span"
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            flexShrink: 0,
            bgcolor: dotColor,
            boxShadow: state === 'online' ? '0 0 0 3px rgba(102, 187, 106, 0.20)' : 'none',
          }}
        />
        <Typography
          variant="caption"
          sx={{ color: 'text.secondary', fontStyle: state === 'never' ? 'italic' : 'normal' }}
        >
          {label}
        </Typography>
      </Box>
    </AppTooltip>
  );
}
