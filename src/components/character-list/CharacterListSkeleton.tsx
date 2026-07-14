'use client';

/**
 * Squelette de chargement du {@link CharacterList} — reproduit à l'identique la
 * structure du tableau (desktop) et des cartes empilées (mobile), en remplaçant
 * chaque contenu (nom, icône de profil, badge, date, menu « ⋮ ») par un
 * `Skeleton` aux mêmes dimensions et au même emplacement. Objectif : une bascule
 * squelette → contenu réel sans le moindre décalage de mise en page.
 *
 * On partage le fond « verre dépoli » (`LIST_PAPER_SX`) et les largeurs de
 * colonnes figées (`listColWidths`) avec le composant réel, de sorte que les
 * deux restent alignés au pixel près même si ces valeurs évoluent.
 */
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import { LIST_PAPER_SX, listColWidths } from './CharacterList';

/** Animation partagée par tous les squelettes de l'app (sobre, façon MUI). */
const ANIMATION = 'wave' as const;

export interface CharacterListSkeletonProps {
  /** Nombre de lignes/cartes fantômes à afficher (défaut 5). */
  rows?: number;
  /** Reproduit la colonne « Campagne » (accueil). */
  showCampaign?: boolean;
  /**
   * En-têtes de colonnes triables (accueil, vue campagne) : affiche l'icône de tri
   * neutre à côté du libellé, comme une colonne non triée, pour matcher l'état
   * chargé. Sans effet sur les listes non triables (espace joueur).
   */
  sortable?: boolean;
  /** Angles supérieurs carrés (raccord à un bloc au-dessus). */
  attachedTop?: boolean;
}

export function CharacterListSkeleton({
  rows = 5,
  showCampaign = false,
  sortable = false,
  attachedTop = false,
}: CharacterListSkeletonProps) {
  const renderColgroup = () => (
    <colgroup>
      {listColWidths(showCampaign).map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );

  // En-tête d'une colonne : libellé réel (connu immédiatement) + icône de tri
  // neutre si la liste est triable — reproduit l'apparence d'une colonne non triée.
  const header = (label: string, align: 'left' | 'right' = 'left') => (
    <TableCell align={align}>
      {sortable ? (
        <Box
          component="span"
          sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, userSelect: 'none' }}
        >
          {label}
          <UnfoldMoreIcon fontSize="small" sx={{ opacity: 0.4 }} />
        </Box>
      ) : (
        label
      )}
    </TableCell>
  );

  // Une ligne fantôme (desktop) : mêmes cellules, mêmes Stack/espacements que
  // `renderRow`, contenu remplacé par des Skeletons calibrés.
  const skeletonRow = (i: number) => (
    <TableRow
      key={i}
      sx={{ bgcolor: i % 2 ? 'rgba(255, 255, 255, 0.035)' : 'transparent' }}
    >
      <TableCell>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Skeleton animation={ANIMATION} variant="text" width="55%" />
        </Stack>
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
          <Skeleton animation={ANIMATION} variant="circular" width={20} height={20} sx={{ flexShrink: 0 }} />
          <Skeleton animation={ANIMATION} variant="text" width="70%" />
        </Stack>
      </TableCell>
      {showCampaign && (
        <TableCell>
          {/* Badge de campagne : rectangle arrondi ~ dimensions du CampaignBadge. */}
          <Skeleton animation={ANIMATION} variant="rounded" width={84} height={24} />
        </TableCell>
      )}
      <TableCell>
        {/* Date « Modifié » : texte en variante caption (0.75rem). */}
        <Skeleton animation={ANIMATION} variant="text" width={64} sx={{ fontSize: '0.75rem' }} />
      </TableCell>
      <TableCell align="right" sx={{ pr: 2 }}>
        {/* Bouton « ⋮ » (IconButton size small ≈ 30px). */}
        <Skeleton animation={ANIMATION} variant="circular" width={30} height={30} sx={{ ml: 'auto' }} />
      </TableCell>
    </TableRow>
  );

  // Une carte fantôme (mobile) : miroir de `renderCard`.
  const skeletonCard = (i: number) => (
    <Paper key={i} variant="outlined" sx={{ p: 2, ...LIST_PAPER_SX }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            {/* Nom : variante subtitle1 (~1rem). */}
            <Skeleton animation={ANIMATION} variant="text" width="55%" sx={{ fontSize: '1rem' }} />
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Skeleton animation={ANIMATION} variant="circular" width={16} height={16} sx={{ flexShrink: 0 }} />
            <Skeleton animation={ANIMATION} variant="text" width="65%" />
          </Stack>
          {showCampaign && (
            <Box sx={{ mt: 0.5 }}>
              <Skeleton animation={ANIMATION} variant="rounded" width={84} height={24} />
            </Box>
          )}
          <Skeleton
            animation={ANIMATION}
            variant="text"
            width={120}
            sx={{ fontSize: '0.75rem', mt: 0.5 }}
          />
        </Box>
        <Skeleton animation={ANIMATION} variant="circular" width={30} height={30} sx={{ flexShrink: 0 }} />
      </Stack>
    </Paper>
  );

  return (
    <>
      {/* Desktop : tableau, masqué sous md (comme le composant réel). */}
      <TableContainer
        component={Paper}
        variant="outlined"
        aria-hidden
        sx={{
          display: { xs: 'none', md: 'block' },
          ...LIST_PAPER_SX,
          ...(attachedTop && { borderTopLeftRadius: 0, borderTopRightRadius: 0 }),
        }}
      >
        <Table sx={{ tableLayout: 'fixed' }}>
          {renderColgroup()}
          <TableHead>
            <TableRow>
              {header('Nom')}
              {header('Identité')}
              {showCampaign && header('Campagne')}
              {header('Modifié')}
              <TableCell align="right" sx={{ pr: 2 }} />
            </TableRow>
          </TableHead>
          <TableBody>{Array.from({ length: rows }, (_, i) => skeletonRow(i))}</TableBody>
        </Table>
      </TableContainer>

      {/* Mobile : cartes empilées. */}
      <Stack spacing={1.5} aria-hidden sx={{ display: { xs: 'flex', md: 'none' } }}>
        {Array.from({ length: rows }, (_, i) => skeletonCard(i))}
      </Stack>
    </>
  );
}
