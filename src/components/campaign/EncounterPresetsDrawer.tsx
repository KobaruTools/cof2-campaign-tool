'use client';

/**
 * Tiroir « Combats préparés » de l'écran de MJ (PER-448, retour propriétaire —
 * sorti d'une section toujours visible en haut de page vers un tiroir « Outils
 * du MJ », à l'image de PNJ/Butin). Variante `temporary` (voile, Échap, piège de
 * focus), ancré à droite, plein écran sous `sm`.
 *
 * Largeur reprise de l'extension `GmInventoryPanel` du tiroir Butin (PER-437),
 * MÊME motif que `GmNpcDrawer` : catégories préparées À L'AVANCE, un « stock » de
 * combats classés — pas une liste éphémère. Un seul `Drawer`, une seule réserve
 * (contrairement au tiroir Butin, pas de second panneau accolé).
 */
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import { alpha } from '@mui/material/styles';
import { EncounterPresetsPanel } from './EncounterPresetsPanel';
import { GmDrawerHeader } from './GmDrawerHeader';
import { GM_INVENTORY_PANEL_WIDTH } from './GmInventoryPanel';
import { ENCOUNTER_PRESETS_PARAM } from './gmToolsMenu';
import { SectionIcon } from '@/components/SectionIcon';
import type { Campaign } from '@/lib/campaign/types';
import type { EncounterPreset } from '@/lib/session/encounterPreset';

/** Largeur (px, ≥ `sm`) du tiroir — même gabarit que l'extension « Inventaire du MJ ». */
const WIDTH = GM_INVENTORY_PANEL_WIDTH;

export interface EncounterPresetsDrawerProps {
  /** Campagne courante — porte les catégories de combats préparés. */
  campaign: Campaign;
  /** Le tiroir est-il ouvert ? */
  open: boolean;
  /** Fermeture demandée (croix, Échap, clic dans le voile). */
  onClose: () => void;
  /** Le combat en cours porte-t-il déjà quelque chose ? (confirmation avant écrasement) */
  hasCurrentCombat: boolean;
  /** Peuple le combat en cours depuis un preset lancé. */
  onLaunch: (preset: EncounterPreset) => void;
}

export function EncounterPresetsDrawer({
  campaign,
  open,
  onClose,
  hasCurrentCombat,
  onLaunch,
}: EncounterPresetsDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      keepMounted
      data-glossary-shot="EncounterPresetsDrawerHost"
      slotProps={{
        paper: {
          sx: {
            width: { xs: '100vw', sm: `min(${WIDTH}px, 100vw)` },
            maxWidth: '100vw',
            overflow: 'hidden',
            backgroundImage: 'none',
          },
        },
      }}
    >
      <Box
        data-glossary-shot="EncounterPresetsDrawer"
        sx={(theme) => ({
          height: '100%',
          overflowY: 'auto',
          bgcolor: 'background.paper',
          borderLeft: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          boxShadow: '0 0 24px rgba(0, 0, 0, 0.5)',
        })}
      >
        <GmDrawerHeader
          icon={<SectionIcon name="encounters" size={20} />}
          title="Combats préparés"
          currentParam={ENCOUNTER_PRESETS_PARAM}
          onClose={onClose}
        />

        <Box sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
          <EncounterPresetsPanel campaign={campaign} hasCurrentCombat={hasCurrentCombat} onLaunch={onLaunch} />
        </Box>
      </Box>
    </Drawer>
  );
}
