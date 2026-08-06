'use client';

/**
 * Tiroir « Aide-mémoire » de l'écran de MJ — panneau latéral droit qui intègre le référentiel de
 * règles CO2 (`/reference`) DIRECTEMENT dans l'écran de MJ, sans quitter la table. Même ossature que
 * le tiroir « Outils du MJ » (`GmToolsDrawer`) : variante `temporary` (voile, Échap, piège de focus),
 * ancré à droite, plein écran sous `sm`.
 *
 * Il ne fait que poser l'en-tête collé (titre + fermeture) et déléguer TOUT le contenu — recherche,
 * onglets de section, sommaire, panneaux — au composant partagé `ReferenceBrowser`, en variante
 * `'drawer'` : navigation LOCALE (aucune écriture de l'URL de la campagne), une seule colonne, barre
 * recherche+onglets collée SOUS cet en-tête. La page `/reference` et ce tiroir restent ainsi une seule
 * et même source de rendu.
 *
 * Purement présentationnel : l'ouverture est pilotée par l'URL (`?reference=1`, cf.
 * `GmReferenceDrawerHost`), en vraie ancre — le bouton Retour ferme le tiroir, un lien direct l'ouvre.
 */
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { ReferenceBrowser } from '@/components/reference/ReferenceBrowser';

/**
 * Hauteur (px) de l'en-tête collé du tiroir. Fixée en dur ET appliquée au conteneur d'en-tête : la
 * barre recherche+onglets de `ReferenceBrowser` vient se coller juste dessous (`stickyTop`), et cette
 * même valeur sert de marge de défilement aux ancres de sous-section.
 */
const HEADER_HEIGHT = 52;

export interface GmReferenceDrawerProps {
  /** Le tiroir est-il ouvert ? */
  open: boolean;
  /** Fermeture demandée (croix, Échap, clic dans le voile). */
  onClose: () => void;
}

export function GmReferenceDrawer({ open, onClose }: GmReferenceDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      // `keepMounted` : le contenu reste monté quand le tiroir est fermé. Le MJ retrouve donc EXACTEMENT
      // où il en était (section, recherche ET défilement) en rouvrant le tiroir dans la même session —
      // la section survit en plus au rechargement, persistée par `ReferenceBrowser` (`reference:section`).
      keepMounted
      slotProps={{
        paper: {
          sx: {
            // Large (le double du tiroir d'outils à 560) pour afficher DEUX colonnes de panneaux à côté
            // du sommaire dès que le viewport le permet. Plein écran sous `sm`, plafonné au viewport.
            width: { xs: '100vw', sm: 'min(1520px, 100vw)' },
            maxWidth: '100vw',
            overflowY: 'auto',
            backgroundImage: 'none',
          },
        },
      }}
    >
      {/* En-tête collé : titre + fermeture, visibles pendant le défilement. Opaque + flou pour masquer
          le contenu qui défile dessous, comme le tiroir d'outils. Hauteur figée = `HEADER_HEIGHT`. */}
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
            Aide-mémoire
          </Typography>
          <AppTooltip title="Fermer">
            <IconButton size="small" onClick={onClose} aria-label="Fermer le tiroir">
              <CloseIcon />
            </IconButton>
          </AppTooltip>
        </Stack>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 3 }}>
        <ReferenceBrowser variant="drawer" stickyTop={HEADER_HEIGHT} />
      </Box>
    </Drawer>
  );
}
