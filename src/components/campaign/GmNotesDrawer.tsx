'use client';

/**
 * Tiroir « Notes de session » de l'écran de MJ (PER-427, sorti du tiroir « Outils du
 * MJ » à onglets lors de sa suppression — retour propriétaire : bouton direct par
 * outil, plus d'onglets). Même ossature que les tiroirs Bestiaire/Aide-mémoire/
 * Historique : variante `temporary` (voile, Échap, piège de focus), ancré à droite,
 * plein écran sous `sm`.
 *
 * Purement présentationnel : l'ouverture est pilotée par l'URL (`?notes=1`, cf.
 * `GmNotesDrawerHost`), en vraie ancre — le bouton Retour ferme le tiroir, un lien
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
import { SessionLiveNotesPanel } from './SessionLiveNotesPanel';

/** Largeur (px, ≥ `sm`) du tiroir — même gabarit que les tiroirs Rumeurs/PNJ. */
const WIDTH = 560;

/** Hauteur (px) de l'en-tête collé — même valeur que les autres tiroirs de l'écran de MJ. */
const HEADER_HEIGHT = 52;

export interface GmNotesDrawerProps {
  /** Campagne courante — la note vit sur SA session active (cf. `SessionLiveNotesPanel`). */
  campaignId: string;
  /** Le tiroir est-il ouvert ? */
  open: boolean;
  /** Fermeture demandée (croix, Échap, clic dans le voile). */
  onClose: () => void;
}

export function GmNotesDrawer({ campaignId, open, onClose }: GmNotesDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      keepMounted
      data-glossary-shot="GmNotesDrawerHost"
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
      {/* Boîte englobante (bloc normal, comme les deux enfants directs qu'elle remplace dans le
          flux) : sert d'ancre DOM pour le crop du glossaire (PER-443) — le `Paper` du `Drawer`
          n'accepte pas d'attribut `data-*` inconnu en typage strict MUI. */}
      <Box data-glossary-shot="GmNotesDrawer">
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
            Notes de session
          </Typography>
          <AppTooltip title="Fermer">
            <IconButton size="small" onClick={onClose} aria-label="Fermer le tiroir">
              <CloseIcon />
            </IconButton>
          </AppTooltip>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        <SessionLiveNotesPanel campaignId={campaignId} />
      </Box>
      </Box>
    </Drawer>
  );
}
