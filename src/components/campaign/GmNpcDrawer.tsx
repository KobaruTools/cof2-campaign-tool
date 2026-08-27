'use client';

/**
 * Tiroir « PNJ » de l'écran de MJ (PER-428, sorti du tiroir « Outils du MJ » à
 * onglets lors de sa suppression — retour propriétaire : bouton direct par outil,
 * plus d'onglets). Variante `temporary` (voile, Échap, piège de focus), ancré à
 * droite, plein écran sous `sm`.
 *
 * Largeur reprise de l'extension `GmInventoryPanel` du tiroir Butin (PER-437,
 * retour propriétaire de cohérence) — CE panneau est le même genre de « grand
 * tableau » : catégories préparées À L'AVANCE, un « stock » de PNJ classés, pas
 * une liste éphémère comme les tiroirs Rumeurs/Notes (560px, un simple flux de
 * texte). Contrairement au tiroir Butin, PAS de second panneau ACCOLÉ : les PNJ
 * n'ont qu'une seule réserve (pas de mécanique de tirage au hasard équivalente à
 * `LootTreasurePanel`) — un seul `Drawer`, simplement plus large.
 *
 * Purement présentationnel : l'ouverture est pilotée par l'URL (`?npc=1`, cf.
 * `GmNpcDrawerHost`), en vraie ancre — le bouton Retour ferme le tiroir, un lien
 * direct l'ouvre.
 *
 * Contenu posé dans sa propre boîte « carte » (fond + bordure + ombre), même motif
 * que la colonne Butin de `GmLootDrawer.tsx` — PAS peint à plat directement sur le
 * `Paper` du tiroir (retour propriétaire de cohérence, PER-437). Symétrique (pas de
 * décalage horizontal comme le `-16px` de `GmLootDrawer`, qui sert à se détacher de
 * l'extension accolée à sa gauche) : ce tiroir n'a qu'une seule boîte, rien d'autre
 * à côté dont se démarquer.
 */
import GroupsIcon from '@mui/icons-material/Groups';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import { alpha } from '@mui/material/styles';
import { GmDrawerHeader } from './GmDrawerHeader';
import { GM_INVENTORY_PANEL_WIDTH } from './GmInventoryPanel';
import { NPC_PARAM } from './gmToolsMenu';
import { NpcPanel } from './NpcPanel';
import type { Campaign } from '@/lib/campaign/types';

/** Largeur (px, ≥ `sm`) du tiroir — même gabarit que l'extension « Inventaire du MJ ». */
const WIDTH = GM_INVENTORY_PANEL_WIDTH;

export interface GmNpcDrawerProps {
  /** Campagne courante — porte les catégories de PNJ et sert de cible de persistance. */
  campaign: Campaign;
  /** Le tiroir est-il ouvert ? */
  open: boolean;
  /** Fermeture demandée (croix, Échap, clic dans le voile). */
  onClose: () => void;
}

export function GmNpcDrawer({ campaign, open, onClose }: GmNpcDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      keepMounted
      data-glossary-shot="GmNpcDrawerHost"
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
        data-glossary-shot="GmNpcDrawer"
        sx={(theme) => ({
          height: '100%',
          overflowY: 'auto',
          bgcolor: 'background.paper',
          borderLeft: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          boxShadow: '0 0 24px rgba(0, 0, 0, 0.5)',
        })}
      >
        <GmDrawerHeader icon={<GroupsIcon fontSize="small" />} title="PNJ" currentParam={NPC_PARAM} onClose={onClose} />

        <Box sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
          <NpcPanel campaign={campaign} />
        </Box>
      </Box>
    </Drawer>
  );
}
