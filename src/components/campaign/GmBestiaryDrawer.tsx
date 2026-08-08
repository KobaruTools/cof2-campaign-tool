'use client';

/**
 * Tiroir « Bestiaire » de l'écran de MJ — panneau latéral droit qui intègre le navigateur du
 * bestiaire (`/bestiary`) DIRECTEMENT dans l'écran de MJ, sans quitter la table. Même ossature que
 * le tiroir « Aide-mémoire » (`GmReferenceDrawer`) : variante `temporary` (voile, Échap, piège de
 * focus), ancré à droite, plein écran sous `sm`.
 *
 * Il ne fait que poser l'en-tête collé (titre + fermeture) et déléguer TOUT le contenu — recherche,
 * filtres, liste maître-détail, bloc de stats — au composant partagé `BestiaryBrowser`, en variante
 * `'drawer'` : sélection LOCALE (aucune écriture de l'URL de la campagne). La page `/bestiary` et ce
 * tiroir restent ainsi une seule et même source de rendu.
 *
 * Purement présentationnel : l'ouverture est pilotée par l'URL (`?bestiary=1`, cf.
 * `GmBestiaryDrawerHost`), en vraie ancre — le bouton Retour ferme le tiroir, un lien direct l'ouvre.
 */
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { BestiaryBrowser } from '@/components/bestiary/BestiaryBrowser';

/**
 * Hauteur (px) de l'en-tête collé du tiroir. Fixée en dur ET appliquée au conteneur d'en-tête :
 * la sidebar (tri + liste) de `BestiaryBrowser` se cale juste dessous (`stickyTop`) — même
 * mécanique que `GmReferenceDrawer`.
 */
const HEADER_HEIGHT = 52;

export interface GmBestiaryDrawerProps {
  /** Le tiroir est-il ouvert ? */
  open: boolean;
  /** Fermeture demandée (croix, Échap, clic dans le voile). */
  onClose: () => void;
}

export function GmBestiaryDrawer({ open, onClose }: GmBestiaryDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      // `keepMounted` : le contenu reste monté quand le tiroir est fermé. Le MJ retrouve donc
      // EXACTEMENT où il en était (filtres, sélection, défilement) en rouvrant le tiroir dans la
      // même session — comme le tiroir d'aide-mémoire.
      keepMounted
      slotProps={{
        paper: {
          sx: {
            // Large : la disposition maître-détail (liste + bloc de stats) a besoin de place —
            // même largeur que le tiroir d'aide-mémoire.
            width: { xs: '100vw', sm: 'min(1520px, 100vw)' },
            maxWidth: '100vw',
            overflowY: 'auto',
            backgroundImage: 'none',
          },
        },
      }}
    >
      {/* En-tête collé : titre + fermeture, visibles pendant le défilement. Opaque + flou pour
          masquer le contenu qui défile dessous, comme les autres tiroirs. Hauteur figée =
          `HEADER_HEIGHT`. */}
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
            Bestiaire
          </Typography>
          <AppTooltip title="Fermer">
            <IconButton size="small" onClick={onClose} aria-label="Fermer le tiroir">
              <CloseIcon />
            </IconButton>
          </AppTooltip>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 3 }}>
        <BestiaryBrowser variant="drawer" stickyTop={HEADER_HEIGHT} />
      </Box>
    </Drawer>
  );
}
