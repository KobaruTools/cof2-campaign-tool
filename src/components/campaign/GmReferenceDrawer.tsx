'use client';

/**
 * Tiroir « Aide-mémoire » de l'écran de MJ — panneau latéral droit qui intègre le référentiel de
 * règles CO2 (`/reference`) DIRECTEMENT dans l'écran de MJ, sans quitter la table. Même ossature que
 * les autres tiroirs de l'écran de MJ : variante `temporary` (voile, Échap, piège de focus), ancré
 * à droite, plein écran sous `sm`.
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
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import { ReferenceBrowser } from '@/components/reference/ReferenceBrowser';
import { GM_DRAWER_HEADER_HEIGHT, GmDrawerHeader } from './GmDrawerHeader';
import { REFERENCE_PARAM } from './gmToolsMenu';

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
      data-glossary-shot="GmReferenceDrawerHost"
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
      {/* Boîte englobante (bloc normal, comme les deux enfants directs qu'elle remplace dans le
          flux) : sert d'ancre DOM pour le crop du glossaire (PER-443) — le `Paper` du `Drawer`
          n'accepte pas d'attribut `data-*` inconnu en typage strict MUI. */}
      <Box data-glossary-shot="GmReferenceDrawer">
      <GmDrawerHeader
        icon={<MenuBookOutlinedIcon fontSize="small" />}
        title="Aide-mémoire"
        currentParam={REFERENCE_PARAM}
        onClose={onClose}
      />

      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 3 }}>
        <ReferenceBrowser variant="drawer" stickyTop={GM_DRAWER_HEADER_HEIGHT} />
      </Box>
      </Box>
    </Drawer>
  );
}
