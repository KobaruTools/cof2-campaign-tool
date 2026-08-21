'use client';

/**
 * Voyant PUR du signal 3 états de connexion de session (PER-269) — **connecté /
 * reconnexion… / hors ligne**. Purement présentationnel : reçoit le verdict déjà
 * calculé (`sessionConnectionState`), n'ouvre aucun canal, ne consulte pas le réseau.
 *
 * Bloc custom (pas de `Chip` MUI, règle projet — cf. mémoire des badges) :
 *  - **connecté** : point vert qui « respire » (reprend la pulsation de `SessionActiveBadge`) ;
 *  - **reconnexion…** : point ambre pulsant (le socket tente de rejoindre) ;
 *  - **hors ligne** : point gris éteint (l'appareil n'a pas de réseau).
 *
 * `showLabel` : affiche le libellé à côté du point (barres /play + écran MJ) ; sans lui,
 * point seul (en-tête compact de la fiche, le détail vit dans le popover au survol).
 */
import Box from '@mui/material/Box';

import {
  sessionConnectionLabel,
  type SessionConnectionState,
} from '@/lib/session/connectionState';

/** Couleur d'accent du point par état. */
const DOT_COLOR: Record<SessionConnectionState, string> = {
  connected: 'rgb(129, 199, 132)',
  reconnecting: 'rgb(214, 179, 106)',
  offline: 'rgba(255, 255, 255, 0.35)',
};

/** Halo de départ de la pulsation (même teinte que le point, semi-transparente). */
const PULSE_HALO: Record<SessionConnectionState, string> = {
  connected: 'rgba(129, 199, 132, 0.6)',
  reconnecting: 'rgba(214, 179, 106, 0.6)',
  offline: 'rgba(0, 0, 0, 0)',
};

/** Teinte de la bordure/fond du bloc par état (accord discret au point). */
const ACCENT: Record<SessionConnectionState, { border: string; bg: string }> = {
  connected: { border: 'rgba(129, 199, 132, 0.35)', bg: 'rgba(129, 199, 132, 0.10)' },
  reconnecting: { border: 'rgba(214, 179, 106, 0.40)', bg: 'rgba(214, 179, 106, 0.12)' },
  offline: { border: 'rgba(255, 255, 255, 0.14)', bg: 'rgba(255, 255, 255, 0.05)' },
};

/** Pulsation partagée « qui respire » (désactivée si `prefers-reduced-motion`). */
function pulseSx(color: string) {
  return {
    animation: 'sessionConnPulse 2s ease-out infinite',
    '@keyframes sessionConnPulse': {
      '0%': { boxShadow: `0 0 0 0 ${color}` },
      '70%': { boxShadow: '0 0 0 5px rgba(0, 0, 0, 0)' },
      '100%': { boxShadow: '0 0 0 0 rgba(0, 0, 0, 0)' },
    },
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  } as const;
}

export interface SessionConnectionBadgeProps {
  state: SessionConnectionState;
  /** Affiche le libellé texte à côté du point (défaut : point seul). */
  showLabel?: boolean;
}

export function SessionConnectionBadge({ state, showLabel = false }: SessionConnectionBadgeProps) {
  const label = sessionConnectionLabel(state);
  const accent = ACCENT[state];
  // Le point respire tant qu'on n'est pas franchement hors ligne (connecté = vie,
  // reconnexion = tentative) ; éteint (fixe) hors ligne.
  const breathes = state !== 'offline';

  return (
    <Box
      component="span"
      role="status"
      aria-label={`Session : ${label}`}
      data-glossary-shot="SessionConnectionBadge"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.75,
        px: showLabel ? 1 : 0.5,
        py: 0.25,
        borderRadius: showLabel ? 1 : 999,
        fontSize: '0.8125rem',
        lineHeight: 1.4,
        fontWeight: 600,
        border: `1px solid ${accent.border}`,
        bgcolor: accent.bg,
        color: 'text.primary',
      }}
    >
      <Box
        component="span"
        sx={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          flexShrink: 0,
          bgcolor: DOT_COLOR[state],
          ...(breathes ? pulseSx(PULSE_HALO[state]) : {}),
        }}
      />
      {showLabel && label}
    </Box>
  );
}
