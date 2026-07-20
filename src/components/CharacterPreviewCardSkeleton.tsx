'use client';

/**
 * Squelette de chargement de {@link CharacterPreviewCard} — reproduit sa structure
 * exacte (portrait 72×72, bloc identité, micro-grille des voies 7×5, puis les 7
 * badges de caractéristiques en grille) en substituant des `Skeleton` calibrés à
 * chaque contenu. Utilisé par l'écran de MJ pendant le chargement.
 */
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

const ANIMATION = 'wave' as const;

/** 7 colonnes de voies possibles, 5 rangs — cf. CharacterPreviewCard. */
const PATH_COLUMN_COUNT = 7;
const PATH_RANK_COUNT = 5;
const PATH_CELL_SIZE = 6;

export function CharacterPreviewCardSkeleton() {
  return (
    <Stack spacing={2} sx={{ minWidth: { xs: 0, sm: 264 } }} aria-hidden>
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start' }}>
        {/* Portrait 72×72 (borderRadius 2). */}
        <Skeleton
          animation={ANIMATION}
          variant="rounded"
          width={72}
          height={72}
          sx={{ flexShrink: 0, borderRadius: 2 }}
        />
        <Box sx={{ minWidth: 0, flexGrow: 1 }}>
          {/* Nom (h6). */}
          <Skeleton animation={ANIMATION} variant="text" width={130} sx={{ fontSize: '1.25rem' }} />
          {/* Profil : icône + libellé. */}
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.25 }}>
            <Skeleton animation={ANIMATION} variant="circular" width={18} height={18} sx={{ flexShrink: 0 }} />
            <Skeleton animation={ANIMATION} variant="text" width={110} />
          </Stack>
          {/* Peuple (body2). */}
          <Skeleton animation={ANIMATION} variant="text" width={80} />
        </Box>

        {/* Micro-grille des voies (7 colonnes × 5 cellules de 6px, gap 2px). */}
        <Box sx={{ flexShrink: 0, display: 'flex', gap: '2px' }}>
          {Array.from({ length: PATH_COLUMN_COUNT }, (_, c) => (
            <Box key={c} sx={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {Array.from({ length: PATH_RANK_COUNT }, (_, r) => (
                <Skeleton
                  key={r}
                  animation={ANIMATION}
                  variant="rounded"
                  width={PATH_CELL_SIZE}
                  height={PATH_CELL_SIZE}
                  sx={{ borderRadius: '1px' }}
                />
              ))}
            </Box>
          ))}
        </Box>
      </Stack>

      {/* Les 7 badges de caractéristiques, même grille que le composant réel. */}
      <Box
        sx={{
          display: 'grid',
          width: '100%',
          gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
          alignItems: 'start',
          gap: 0.75,
        }}
      >
        {Array.from({ length: 7 }, (_, i) => (
          <Skeleton
            key={i}
            animation={ANIMATION}
            variant="rounded"
            height={44}
            sx={{ borderRadius: 1, width: '100%' }}
          />
        ))}
      </Box>
    </Stack>
  );
}
