'use client';

/**
 * Squelette de chargement de la fiche de personnage (`/character/[id]`).
 *
 * La fiche fait plusieurs milliers de lignes et son contenu est entièrement
 * dérivé d'un unique blob (elle s'affiche d'un bloc une fois le personnage
 * chargé) : un squelette littéralement pixel-perfect n'y serait pas maintenable.
 * On en reproduit donc l'**échafaudage** — `AppHeader` (nav + fil d'Ariane, pour
 * que la barre collée en haut de page ne surgisse pas d'un coup à l'hydratation),
 * en-tête de fiche (nom + peuple · profil · niveau + bouton de montée), puis
 * quelques sections cadrées (`SheetSection`) avec leurs grilles/lignes ET leurs
 * épingles (`PinSectionButton`) — pour préfigurer la mise en page et éviter un
 * saut visuel.
 */
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import { alpha } from '@mui/material/styles';
import { useHeaderContent } from '@/stores/headerContent';

const ANIMATION = 'wave' as const;

/**
 * Cadre d'une section, aligné sur le verre dépoli de `SheetSection`. `pinned` reproduit
 * la place de la ou des icônes carrées alignées à droite du titre (`PinSectionButton` +
 * crayon d'édition) sur les sections qui en portent (Caractéristiques, Statistiques
 * dérivées, État du personnage) — sinon la ligne de titre resterait plus courte que la
 * réalité et se décalerait à l'hydratation.
 */
function SectionCardSkeleton({
  pinned = 0,
  children,
}: {
  pinned?: number;
  children: React.ReactNode;
}) {
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
      {/* Ligne de titre : icône de section (22px) + titre (h6) à gauche, épingle(s)/crayon (30px) à droite. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Skeleton animation={ANIMATION} variant="rounded" width={22} height={22} />
          <Skeleton animation={ANIMATION} variant="text" width={180} sx={{ fontSize: '1.25rem' }} />
        </Stack>
        {pinned > 0 && (
          <Stack direction="row" spacing={0.5}>
            {Array.from({ length: pinned }, (_, i) => (
              <Skeleton key={i} animation={ANIMATION} variant="circular" width={30} height={30} />
            ))}
          </Stack>
        )}
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
  // Sous-header de l'en-tête global (nav/logo/compte restent, eux, montés en permanence par
  // `layout.tsx`) : fil d'Ariane et bouton « Modifier » réduits à des blocs neutres — leur
  // contenu réel (nom du personnage, lecture seule ou non) n'est connu qu'une fois le
  // personnage chargé. Sans ce push, le sous-header disparaîtrait pendant le chargement
  // (aucun `breadcrumbs`/`action`) et sauterait à l'hydratation. Ni sous-titre ni 3ᵉ étage
  // (barre condensée) : absents tant que le personnage n'est pas là, donc pas de risque de
  // saut sur ces zones.
  useHeaderContent({
    breadcrumbs: [
      { label: <Skeleton animation={ANIMATION} variant="text" width={140} sx={{ fontSize: '0.8rem' }} /> },
    ],
    action: <Skeleton animation={ANIMATION} variant="rounded" width={84} height={28} sx={{ borderRadius: 1 }} />,
  });
  return (
    <>
      <Container maxWidth="md" sx={{ py: 4 }} aria-hidden>
        <Stack spacing={3}>
          {/* En-tête de fiche : campagne, nom, peuple · profil · niveau, bouton de montée. */}
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

          {/* Caractéristiques : 7 tuiles + épingle/crayon. */}
          <SectionCardSkeleton pinned={2}>
            <TileGridSkeleton count={7} minWidth={90} height={76} />
          </SectionCardSkeleton>

          {/* Statistiques dérivées : grille de tuiles compactes + épingle/crayon. */}
          <SectionCardSkeleton pinned={2}>
            <TileGridSkeleton count={8} minWidth={120} height={64} />
          </SectionCardSkeleton>

          {/* État du personnage : jauges (PV/mana/chance) + boutons de repos + épingle seule. */}
          <SectionCardSkeleton pinned={1}>
            <Stack spacing={1}>
              {Array.from({ length: 2 }, (_, i) => (
                <Skeleton key={i} animation={ANIMATION} variant="rounded" height={28} sx={{ borderRadius: 1 }} />
              ))}
            </Stack>
            <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
              <Skeleton animation={ANIMATION} variant="rounded" width={120} height={32} sx={{ borderRadius: 1 }} />
              <Skeleton animation={ANIMATION} variant="rounded" width={120} height={32} sx={{ borderRadius: 1 }} />
            </Stack>
          </SectionCardSkeleton>

          {/* Voies & capacités : quelques lignes. */}
          <SectionCardSkeleton>
            <Stack spacing={1.5}>
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} animation={ANIMATION} variant="rounded" height={56} sx={{ borderRadius: 1 }} />
              ))}
            </Stack>
          </SectionCardSkeleton>

          {/* Inventaire : quelques lignes + épingle. */}
          <SectionCardSkeleton pinned={1}>
            <Stack spacing={1}>
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} animation={ANIMATION} variant="rounded" height={40} sx={{ borderRadius: 1 }} />
              ))}
            </Stack>
          </SectionCardSkeleton>
        </Stack>
      </Container>
    </>
  );
}
