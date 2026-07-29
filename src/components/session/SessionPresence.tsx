'use client';

/**
 * Liste « qui est connecté » (PER-265) — pastilles vivantes des présents sur la
 * session (MJ + joueurs). Purement PRÉSENTATIONNEL : reçoit la liste dérivée du
 * canal Realtime (`useSessionChannel`), n'ouvre rien lui-même. Reflète les join/leave
 * en direct (la liste change à chaque `sync`).
 *
 * Blocs custom (pas de `Chip` MUI, règle projet) : chaque présent = une pastille avec
 * une puce d'accent (or pour le MJ, neutre pour un joueur) et son nom. Le client
 * courant (`selfKey`) est discrètement marqué « (vous) ». La fenêtre projetée n'est
 * jamais dans cette liste (exclue en amont).
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

import type { SessionPresenceEntry } from '@/lib/session/presence';

export interface SessionPresenceProps {
  /** Présents dérivés du canal (MJ + joueurs ; projection déjà exclue). */
  present: SessionPresenceEntry[];
  /** Clé de présence de CE client, pour marquer « (vous) ». */
  selfKey?: string;
}

/** Accent de la puce selon le rôle : or discret pour le MJ, neutre pour un joueur. */
function dotColor(kind: SessionPresenceEntry['kind']): string {
  return kind === 'gm' ? 'rgb(214, 179, 106)' : 'rgb(129, 199, 132)';
}

export function SessionPresence({ present, selfKey }: SessionPresenceProps) {
  // Tant que la présence n'est pas synchronisée (aucun présent), on n'affiche rien :
  // discret, et évite un « personne connecté » trompeur au tout premier instant.
  if (present.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', rowGap: 0.75 }}>
      <Typography
        variant="caption"
        sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        Connectés
      </Typography>
      {present.map((p) => {
        const isSelf = selfKey !== undefined && p.key === selfKey;
        return (
          <Box
            key={p.key}
            component="span"
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 0.625,
              px: 0.875,
              py: 0.25,
              borderRadius: 999,
              fontSize: '0.8125rem',
              lineHeight: 1.4,
              fontWeight: 600,
              border: '1px solid rgba(255, 255, 255, 0.14)',
              bgcolor: 'rgba(255, 255, 255, 0.05)',
              color: 'text.primary',
            }}
          >
            <Box
              component="span"
              sx={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                flexShrink: 0,
                bgcolor: dotColor(p.kind),
              }}
            />
            {p.kind === 'gm' ? 'MJ' : p.name}
            {isSelf && (
              <Box component="span" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                (vous)
              </Box>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
