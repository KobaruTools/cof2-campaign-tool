'use client';

/**
 * Tiroir « Butin » de l'écran de MJ (PER-199/200, sorti du tiroir « Outils du MJ » à
 * onglets lors de sa suppression — retour propriétaire : bouton direct par outil, plus
 * d'onglets). Calqué sur les autres tiroirs de l'écran de MJ (variante `temporary` :
 * voile, Échap, piège de focus, ancré à droite, plein écran sous `md`), MAIS le `Paper`
 * s'ÉLARGIT en permanence pour révéler, accolé à SA GAUCHE, le panneau « Inventaire du
 * MJ » (`GmInventoryPanel`) — TOUJOURS montré ici (ce tiroir EST l'onglet Butin d'hier,
 * il n'y a plus d'autre onglet dont l'extension serait absente).
 *
 * Purement présentationnel : l'ouverture est pilotée par l'URL (`?loot=1`, cf.
 * `GmLootDrawerHost`), en vraie ancre — le bouton Retour ferme le tiroir, un lien
 * direct l'ouvre.
 */
import { useState } from 'react';
import DiamondIcon from '@mui/icons-material/Diamond';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import type { Campaign } from '@/lib/campaign/types';
import { GmDrawerHeader } from './GmDrawerHeader';
import { GM_INVENTORY_PANEL_WIDTH, GmInventoryPanel } from './GmInventoryPanel';
import { LOOT_PARAM } from './gmToolsMenu';
import { LootTreasurePanel } from './LootTreasurePanel';

/** Largeur (px, ≥ `md`) de la colonne Butin proprement dite (hors extension). */
const LOOT_WIDTH = 560;

/**
 * Cible d'un dépôt de glisser-déposer EN COURS d'écriture serveur (PER-200) : `update()`
 * n'est pas optimiste (cf. `campaigns.ts`), donc entre le lâcher et la réponse réseau,
 * l'objet reste dans son ANCIENNE réserve le temps de l'aller-retour. `GmLootDrawerHost`
 * pose cette cible dès le `onDragEnd`, le temps de la mutation, pour qu'un squelette
 * s'affiche à l'emplacement visé plutôt que de laisser l'objet paraître figé.
 */
export type PendingDropTarget =
  | { pool: 'random' }
  | { pool: 'permanent'; categoryId: string | null };

export interface GmLootDrawerProps {
  /** Campagne courante — porte la réserve de butin/l'inventaire du MJ et sert de cible de persistance. */
  campaign: Campaign;
  /** Le tiroir est-il ouvert ? */
  open: boolean;
  /** Fermeture demandée (croix, Échap, clic dans le voile). */
  onClose: () => void;
  /** Dépôt en attente de confirmation serveur (glisser-déposer entre les deux réserves). */
  pendingTarget?: PendingDropTarget | null;
}

export function GmLootDrawer({ campaign, open, onClose, pendingTarget }: GmLootDrawerProps) {
  // Sous `md`, l'extension (`GmInventoryPanel`) et la colonne Butin ne peuvent PAS partager
  // l'écran (contrairement au bureau, où elles glissent côte à côte) — ce commutateur, visible
  // seulement sur mobile, bascule laquelle des deux occupe tout l'écran.
  const [mobileView, setMobileView] = useState<'loot' | 'inventory'>('loot');
  const mobileShowInventory = mobileView === 'inventory';
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      data-glossary-shot="GmLootDrawerHost"
      slotProps={{
        paper: {
          sx: {
            // Plein écran sous `md` (une seule colonne visible à la fois). Au-delà, largeur
            // de la colonne Butin + l'extension d'inventaire, toujours révélée.
            width: { xs: '100vw', md: `min(${LOOT_WIDTH + GM_INVENTORY_PANEL_WIDTH}px, 100vw)` },
            maxWidth: '100vw',
            backgroundImage: 'none',
            overflow: 'hidden',
          },
        },
      }}
    >
      {/* Boîte englobante (position relative + pleine hauteur, pour ne rien changer au calage
          ABSOLU des deux colonnes qu'elle contient) : sert d'ancre DOM pour le crop du glossaire
          (PER-443) — le `Paper` du `Drawer` n'accepte pas d'attribut `data-*` inconnu en typage
          strict MUI. */}
      <Box data-glossary-shot="GmLootDrawer" sx={{ position: 'relative', height: '100%' }}>
      {/* Extension révélée à GAUCHE — masquée sous `md` (pas la place pour les deux colonnes
          côte à côte ; ce tiroir y reste utilisable seul, cf. le commutateur mobile). */}
      <Box
        sx={{
          display: { xs: mobileShowInventory ? 'block' : 'none', md: 'block' },
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          // `calc` (pas la constante fixe) : entre `md` et ~1480px de viewport, le `Paper` est
          // plafonné à `100vw` (cf. sa largeur ci-dessus) — sans ce calcul l'extension gardait sa
          // largeur PLEINE et débordait par-dessous la colonne Butin opaque.
          width: { xs: '100vw', md: `calc(100% - ${LOOT_WIDTH}px)` },
          zIndex: 1,
        }}
      >
        <GmInventoryPanel
          campaign={campaign}
          pendingCategoryId={pendingTarget?.pool === 'permanent' ? pendingTarget.categoryId : undefined}
          onBackToTools={() => setMobileView('loot')}
        />
      </Box>

      {/* Colonne Butin, TOUJOURS ancrée à droite (position ABSOLUE, largeur fixe : jamais
          affectée par l'élargissement du `Paper`). Devant l'extension (z-index supérieur) avec
          une ombre portée + une bordure grise à gauche : la sépare visuellement de l'extension. */}
      <Box
        sx={(theme) => ({
          position: 'absolute',
          right: 0,
          top: 0,
          width: { xs: '100vw', md: LOOT_WIDTH },
          maxWidth: '100vw',
          display: { xs: mobileShowInventory ? 'none' : 'block', md: 'block' },
          height: '100%',
          overflowY: 'auto',
          zIndex: 2,
          bgcolor: 'background.paper',
          borderLeft: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          boxShadow: '-16px 0 24px rgba(0, 0, 0, 0.5)',
        })}
      >
        <GmDrawerHeader
          icon={<DiamondIcon fontSize="small" />}
          title="Butin"
          currentParam={LOOT_PARAM}
          onClose={onClose}
          actions={
            <AppTooltip title={mobileView === 'inventory' ? 'Revenir au butin' : 'Voir l’inventaire du MJ'}>
              <IconButton
                size="small"
                onClick={() => setMobileView((v) => (v === 'inventory' ? 'loot' : 'inventory'))}
                aria-label="Basculer entre le butin et l’inventaire du MJ"
                sx={{ display: { xs: 'inline-flex', md: 'none' } }}
              >
                {mobileView === 'inventory' ? <DiamondIcon fontSize="small" /> : <Inventory2Icon fontSize="small" />}
              </IconButton>
            </AppTooltip>
          }
        />

        <Box sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
          <LootTreasurePanel campaign={campaign} pending={pendingTarget?.pool === 'random'} />
        </Box>
      </Box>
      </Box>
    </Drawer>
  );
}
