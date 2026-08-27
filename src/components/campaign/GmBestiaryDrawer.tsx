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
import PetsOutlinedIcon from '@mui/icons-material/PetsOutlined';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import { BestiaryBrowser } from '@/components/bestiary/BestiaryBrowser';
import { GM_DRAWER_HEADER_HEIGHT, GmDrawerHeader } from './GmDrawerHeader';
import { BESTIARY_PARAM } from './gmToolsMenu';

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
      data-glossary-shot="GmBestiaryDrawerHost"
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
      <Box data-glossary-shot="GmBestiaryDrawer">
      <GmDrawerHeader
        icon={<PetsOutlinedIcon fontSize="small" />}
        title="Bestiaire"
        currentParam={BESTIARY_PARAM}
        onClose={onClose}
      />

      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 3 }}>
        <BestiaryBrowser variant="drawer" stickyTop={GM_DRAWER_HEADER_HEIGHT} />
      </Box>
      </Box>
    </Drawer>
  );
}
