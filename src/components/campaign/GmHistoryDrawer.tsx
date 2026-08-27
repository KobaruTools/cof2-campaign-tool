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
import HistoryIcon from '@mui/icons-material/History';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import { GmDrawerHeader } from './GmDrawerHeader';
import { HISTORY_PARAM } from './gmToolsMenu';
import { SessionHistoryList } from '@/components/session/SessionHistoryList';

/** Largeur (px, ≥ `sm`) du tiroir — même gabarit que le tiroir « Outils du MJ » (contenu simple). */
const HISTORY_WIDTH = 1120;

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
      data-glossary-shot="GmHistoryDrawerHost"
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
      {/* Boîte englobante (bloc normal, comme les deux enfants directs qu'elle remplace dans le
          flux) : sert d'ancre DOM pour le crop du glossaire (PER-443) — le `Paper` du `Drawer`
          n'accepte pas d'attribut `data-*` inconnu en typage strict MUI. */}
      <Box data-glossary-shot="GmHistoryDrawer">
      <GmDrawerHeader
        icon={<HistoryIcon fontSize="small" />}
        title="Historique des parties"
        currentParam={HISTORY_PARAM}
        onClose={onClose}
      />

      <Box sx={{ px: { xs: 2, sm: 3 }, pt: 2, pb: 3 }}>
        <SessionHistoryList
          campaignId={campaignId}
          participantsDefaultOpen={false}
          highlightMostRecent
          isGm
        />
      </Box>
      </Box>
    </Drawer>
  );
}
