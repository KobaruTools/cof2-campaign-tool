'use client';

/**
 * Squelette de chargement de la fiche de personnage (`/character/[id]`).
 *
 * La fiche fait plusieurs milliers de lignes et son contenu est entièrement
 * dérivé d'un unique blob (elle s'affiche d'un bloc une fois le personnage
 * chargé) : un squelette littéralement pixel-perfect n'y serait pas maintenable.
 * On en reproduit donc l'**échafaudage** — en-tête (nom + peuple · profil · niveau
 * + bouton de montée), puis quelques sections cadrées (`SheetSection`) avec leurs
 * grilles/lignes — pour préfigurer la mise en page et éviter un saut visuel.
 */
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';

const ANIMATION = 'wave' as const;

/** Cadre d'une section, aligné sur le verre dépoli de `SheetSection`. */
function SectionCardSkeleton({ children }: { children: React.ReactNode }) {
  return (
    <Paper
      variant="outlined"
      sx={(theme) => ({
        p: { xs: 2, sm: 3 },
        bgcolor: alpha(theme.palette.background.paper, 0.72),
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
      })}
    >
      {/* Ligne de titre : icône de section (22px) + titre (h6). */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Skeleton animation={ANIMATION} variant="rounded" width={22} height={22} />
        <Skeleton animation={ANIMATION} variant="text" width={180} sx={{ fontSize: '1.25rem' }} />
      </Stack>
      <Box sx={{ pt: 2 }}>{children}</Box>
    </Paper>
  );
}

/** Grille de N tuiles carrées/rectangulaires (caracs, stats dérivées). */
function TileGridSkeleton({ count, minWidth, height }: { count: number; minWidth: number; height: number }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minWidth}px, 1fr))`,
        gap: 1,
      }}
    >
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} animation={ANIMATION} variant="rounded" height={height} sx={{ borderRadius: 1 }} />
      ))}
    </Box>
  );
}

export function CharacterSheetSkeleton() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }} aria-hidden>
      <Stack spacing={3}>
        {/* En-tête : campagne, nom, peuple · profil · niveau, bouton de montée. */}
        <Box>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mb: 0.5 }}>
            <Skeleton animation={ANIMATION} variant="text" width={80} />
            <Skeleton animation={ANIMATION} variant="rounded" width={110} height={24} />
          </Stack>
          {/* Nom (h4). */}
          <Skeleton animation={ANIMATION} variant="text" width={280} sx={{ fontSize: '2.125rem' }} />
          {/* Peuple · profil · niveau. */}
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Skeleton animation={ANIMATION} variant="text" width={100} />
            <Skeleton animation={ANIMATION} variant="circular" width={20} height={20} />
            <Skeleton animation={ANIMATION} variant="text" width={90} />
            <Skeleton animation={ANIMATION} variant="text" width={70} />
          </Stack>
          {/* Bouton « Monter au niveau suivant ». */}
          <Skeleton animation={ANIMATION} variant="rounded" width={240} height={36} sx={{ mt: 1.5, borderRadius: 1 }} />
        </Box>

        {/* Caractéristiques : 7 tuiles. */}
        <SectionCardSkeleton>
          <TileGridSkeleton count={7} minWidth={90} height={76} />
        </SectionCardSkeleton>

        {/* Statistiques dérivées : grille de tuiles compactes. */}
        <SectionCardSkeleton>
          <TileGridSkeleton count={8} minWidth={120} height={64} />
        </SectionCardSkeleton>

        {/* Voies & capacités : quelques lignes. */}
        <SectionCardSkeleton>
          <Stack spacing={1.5}>
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} animation={ANIMATION} variant="rounded" height={56} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        </SectionCardSkeleton>

        {/* Équipement : quelques lignes. */}
        <SectionCardSkeleton>
          <Stack spacing={1}>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} animation={ANIMATION} variant="rounded" height={40} sx={{ borderRadius: 1 }} />
            ))}
          </Stack>
        </SectionCardSkeleton>
      </Stack>
    </Container>
  );
}
