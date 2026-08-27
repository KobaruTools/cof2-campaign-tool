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
import LocalBarIcon from '@mui/icons-material/LocalBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import { GmDrawerHeader } from './GmDrawerHeader';
import { RUMORS_PARAM } from './gmToolsMenu';
import { TavernRumorsPanel } from './TavernRumorsPanel';
import type { Campaign } from '@/lib/campaign/types';

/** Largeur (px, ≥ `sm`) du tiroir — contenu simple (liste), comme les tiroirs PNJ/Notes. */
const WIDTH = 560;

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
      data-glossary-shot="GmRumorsDrawerHost"
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
      <Box data-glossary-shot="GmRumorsDrawer">
      <GmDrawerHeader
        icon={<LocalBarIcon fontSize="small" />}
        title="Rumeurs de taverne"
        currentParam={RUMORS_PARAM}
        onClose={onClose}
      />

      <Box sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        <TavernRumorsPanel campaign={campaign} />
      </Box>
      </Box>
    </Drawer>
  );
}
