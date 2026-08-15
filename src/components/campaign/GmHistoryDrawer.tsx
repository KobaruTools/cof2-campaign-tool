'use client';

/**
 * Tiroir « Historique des parties » de l'écran de MJ — panneau latéral droit qui intègre
 * l'historique des sessions closes (PER-270/407, `SessionHistoryList`) DIRECTEMENT dans l'écran de
 * MJ, sans quitter la table. Même ossature que les tiroirs « Aide-mémoire »/« Bestiaire » : variante
 * `temporary` (voile, Échap, piège de focus), ancré à droite, plein écran sous `sm`.
 *
 * Contenu simple (liste, pas de maître-détail) : largeur alignée sur le tiroir « Outils du MJ »,
 * plus étroite que les tiroirs Aide-mémoire/Bestiaire.
 *
 * Le bloc « Présences » de chaque carte est replié PAR DÉFAUT ici (`participantsDefaultOpen={false}`)
 * — contrairement aux pages dédiées `/campaign/[cid]/history` et `/play/history` où il reste ouvert :
 * ce tiroir a vocation à grandir (reprise de partie, recap MJ partagé — PER-413), la liste des
 * présences n'est qu'un détail secondaire ici.
 *
 * Purement présentationnel : l'ouverture est pilotée par l'URL (`?history=1`, cf.
 * `GmHistoryDrawerHost`), en vraie ancre — le bouton Retour ferme le tiroir, un lien direct l'ouvre.
 */
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { SessionHistoryList } from '@/components/session/SessionHistoryList';

/** Largeur (px, ≥ `sm`) du tiroir — même gabarit que le tiroir « Outils du MJ » (contenu simple). */
const HISTORY_WIDTH = 560;

/** Hauteur (px) de l'en-tête collé du tiroir — même valeur que les autres tiroirs de l'écran de MJ. */
const HEADER_HEIGHT = 52;

export interface GmHistoryDrawerProps {
  /** Campagne dont on affiche l'historique des parties. */
  campaignId: string;
  /** Le tiroir est-il ouvert ? */
  open: boolean;
  /** Fermeture demandée (croix, Échap, clic dans le voile). */
  onClose: () => void;
}

export function GmHistoryDrawer({ campaignId, open, onClose }: GmHistoryDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      // `keepMounted` : le contenu reste monté quand le tiroir est fermé, comme les autres tiroirs
      // de l'écran de MJ (état des cartes repliées/dépliées conservé le temps de la session).
      keepMounted
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100vw', sm: `min(${HISTORY_WIDTH}px, 100vw)` },
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
            Historique des parties
          </Typography>
          <AppTooltip title="Fermer">
            <IconButton size="small" onClick={onClose} aria-label="Fermer le tiroir">
              <CloseIcon />
            </IconButton>
          </AppTooltip>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 3 }}>
        <SessionHistoryList campaignId={campaignId} participantsDefaultOpen={false} />
      </Box>
    </Drawer>
  );
}
