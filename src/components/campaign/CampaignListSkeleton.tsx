'use client';

/**
 * Squelette de chargement de la liste des campagnes (`/campaigns`). Reproduit à
 * l'identique les cartes de campagne (verre dépoli, titre + description + décompte
 * de personnages, deux boutons d'action) en remplaçant chaque contenu par un
 * `Skeleton` de mêmes dimensions — bascule squelette → contenu sans décalage.
 */
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

const ANIMATION = 'wave' as const;

/** Fond « verre dépoli » identique aux cartes de campagne réelles. */
const cardSx = {
  p: 2,
  bgcolor: 'rgba(30, 30, 34, 0.62)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  borderColor: 'rgba(255, 255, 255, 0.10)',
} as const;

export function CampaignListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Stack spacing={1.5} aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <Paper key={i} variant="outlined" sx={cardSx}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
          >
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              {/* Nom de la campagne (variante h6 ≈ 1.25rem). */}
              <Skeleton animation={ANIMATION} variant="text" width="45%" sx={{ fontSize: '1.25rem' }} />
              {/* Description (body2). */}
              <Skeleton animation={ANIMATION} variant="text" width="70%" sx={{ mt: 0.25 }} />
              {/* Décompte de personnages : icône + libellé. */}
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mt: 0.75 }}>
                <Skeleton animation={ANIMATION} variant="circular" width={20} height={20} />
                <Skeleton animation={ANIMATION} variant="text" width={96} />
              </Stack>
            </Box>
            {/* Boutons Réglages + Supprimer (IconButton taille par défaut ≈ 36px,
                accolés comme dans la carte réelle). */}
            <Stack direction="row" sx={{ flexShrink: 0 }}>
              <Skeleton animation={ANIMATION} variant="circular" width={36} height={36} />
              <Skeleton animation={ANIMATION} variant="circular" width={36} height={36} />
            </Stack>
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
