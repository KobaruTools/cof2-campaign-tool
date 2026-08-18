'use client';

/**
 * Tiroir « Rumeurs de taverne » de l'écran de MJ (PER-199, sorti du tiroir « Outils du
 * MJ » à onglets lors de sa suppression — retour propriétaire : bouton direct par outil,
 * plus d'onglets). Même ossature que les tiroirs Bestiaire/Aide-mémoire/Historique :
 * variante `temporary` (voile, Échap, piège de focus), ancré à droite, plein écran sous
 * `sm`.
 *
 * Purement présentationnel : l'ouverture est pilotée par l'URL (`?rumors=1`, cf.
 * `GmRumorsDrawerHost`), en vraie ancre — le bouton Retour ferme le tiroir, un lien
 * direct l'ouvre.
 */
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { TavernRumorsPanel } from './TavernRumorsPanel';
import type { Campaign } from '@/lib/campaign/types';

/** Largeur (px, ≥ `sm`) du tiroir — contenu simple (liste), comme les tiroirs PNJ/Notes. */
const WIDTH = 560;

/** Hauteur (px) de l'en-tête collé — même valeur que les autres tiroirs de l'écran de MJ. */
const HEADER_HEIGHT = 52;

export interface GmRumorsDrawerProps {
  /** Campagne courante — porte la réserve de rumeurs et sert de cible de persistance. */
  campaign: Campaign;
  /** Le tiroir est-il ouvert ? */
  open: boolean;
  /** Fermeture demandée (croix, Échap, clic dans le voile). */
  onClose: () => void;
}

export function GmRumorsDrawer({ campaign, open, onClose }: GmRumorsDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      keepMounted
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100vw', sm: `min(${WIDTH}px, 100vw)` },
            maxWidth: '100vw',
            overflowY: 'auto',
            backgroundImage: 'none',
          },
        },
      }}
    >
      <Box
        sx={(theme) => ({
          position: 'sticky',
          top: 0,
          zIndex: 4,
          height: HEADER_HEIGHT,
          display: 'flex',
          alignItems: 'center',
          px: { xs: 2, sm: 3 },
          bgcolor: alpha(theme.palette.background.paper, 0.94),
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        })}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
          <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
            Rumeurs de taverne
          </Typography>
          <AppTooltip title="Fermer">
            <IconButton size="small" onClick={onClose} aria-label="Fermer le tiroir">
              <CloseIcon />
            </IconButton>
          </AppTooltip>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        <TavernRumorsPanel campaign={campaign} />
      </Box>
    </Drawer>
  );
}
