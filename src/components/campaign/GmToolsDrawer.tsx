'use client';

/**
 * Tiroir « Outils du MJ » de l'écran de MJ (PER-199) — panneau latéral droit, à
 * ONGLETS, calqué sur le tiroir de fiche (`GmSheetDrawer`) : variante `temporary`
 * (voile, Échap, piège de focus), ancré à droite, plein écran sous `md`.
 *
 * Il regroupe des outils de table du MJ, un par onglet. Premier onglet : « Rumeurs
 * de taverne » (réserve pré-écrite + tirage au hasard). D'autres viendront s'ajouter
 * (butin, tables aléatoires…), d'où l'ossature à onglets dès maintenant.
 *
 * Onglet Butin (extension PER-200) : le `Paper` s'ÉLARGIT et révèle, accolé à SA
 * GAUCHE, le panneau « Inventaire du MJ » (`GmInventoryPanel`) — pas un second
 * tiroir, une simple extension visuelle du MÊME tiroir (même voile, même fermeture,
 * ce tiroir reste ancré à droite exactement comme sur les autres onglets).
 *
 * Purement présentationnel : l'ouverture et l'onglet actif sont pilotés par l'URL
 * (`?tools=`, cf. `GmToolsDrawerHost`), en vraie ancre — le bouton Retour ferme le
 * tiroir, un lien direct l'ouvre sur le bon onglet.
 */
import { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import DiamondIcon from '@mui/icons-material/Diamond';
import EditNoteIcon from '@mui/icons-material/EditNote';
import GroupsIcon from '@mui/icons-material/Groups';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import type { Campaign } from '@/lib/campaign/types';
import { GM_INVENTORY_PANEL_WIDTH, GmInventoryPanel } from './GmInventoryPanel';
import { LootTreasurePanel } from './LootTreasurePanel';
import { NpcPanel } from './NpcPanel';
import { SessionLiveNotesPanel } from './SessionLiveNotesPanel';
import { TavernRumorsPanel } from './TavernRumorsPanel';

/** Largeur (px, ≥ `sm`) du tiroir sur ses onglets normaux (sans extension). */
const TOOLS_WIDTH = 560;

/** Identifiants d'onglet du tiroir — servent aussi de valeur au paramètre d'URL `?tools=`. */
export type GmToolId = 'rumors' | 'loot' | 'npc' | 'notes';

/** Onglets déclarés, dans l'ordre d'affichage. Étendre ici pour ajouter un outil. */
const TOOLS: { id: GmToolId; label: string; icon: React.ReactElement }[] = [
  { id: 'rumors', label: 'Rumeurs de taverne', icon: <LocalBarIcon fontSize="small" /> },
  { id: 'loot', label: 'Butin', icon: <DiamondIcon fontSize="small" /> },
  { id: 'npc', label: 'PNJ', icon: <GroupsIcon fontSize="small" /> },
  { id: 'notes', label: 'Notes de session', icon: <EditNoteIcon fontSize="small" /> },
];

/** L'onglet par défaut (premier déclaré) — cible du bouton d'ouverture. */
export const DEFAULT_GM_TOOL: GmToolId = TOOLS[0].id;

/** Garde de type : la valeur brute du paramètre d'URL est-elle un onglet connu ? */
export function isGmToolId(value: string | null): value is GmToolId {
  return value !== null && TOOLS.some((t) => t.id === value);
}

/**
 * Cible d'un dépôt de glisser-déposer EN COURS d'écriture serveur (PER-200) : `update()`
 * n'est pas optimiste (cf. `campaigns.ts`), donc entre le lâcher et la réponse réseau,
 * l'objet reste dans son ANCIENNE réserve le temps de l'aller-retour. `GmToolsDrawerHost`
 * pose cette cible dès le `onDragEnd`, le temps de la mutation, pour qu'un squelette
 * s'affiche à l'emplacement visé plutôt que de laisser l'objet paraître figé.
 */
export type PendingDropTarget =
  | { pool: 'random' }
  | { pool: 'permanent'; categoryId: string | null };

export interface GmToolsDrawerProps {
  /** Campagne courante — porte la réserve de rumeurs et sert de cible de persistance. */
  campaign: Campaign;
  /** Le tiroir est-il ouvert ? */
  open: boolean;
  /** Onglet actif. */
  activeTab: GmToolId;
  /** Changement d'onglet demandé (clic sur un onglet). */
  onTabChange: (tab: GmToolId) => void;
  /** Fermeture demandée (croix, Échap, clic dans le voile). */
  onClose: () => void;
  /** Dépôt en attente de confirmation serveur (extension PER-200) — cf. `PendingDropTarget`. */
  pendingTarget?: PendingDropTarget | null;
}

export function GmToolsDrawer({
  campaign,
  open,
  activeTab,
  onTabChange,
  onClose,
  pendingTarget,
}: GmToolsDrawerProps) {
  const extended = activeTab === 'loot';
  // Sous `sm`, l'extension (`GmInventoryPanel`) et la colonne normale ne peuvent PAS
  // partager l'écran (contrairement au bureau, où elles glissent côte à côte) — ce
  // commutateur, visible seulement sur mobile et seulement sur l'onglet Butin, bascule
  // laquelle des deux occupe tout l'écran. Réinitialisé au changement d'onglet (pas en
  // effet sur `extended` : ce n'est pas une synchronisation, juste une remise à zéro
  // au moment précis où l'utilisateur agit) pour ne pas rouvrir l'inventaire par surprise.
  const [mobileView, setMobileView] = useState<'tools' | 'inventory'>('tools');
  const mobileShowInventory = extended && mobileView === 'inventory';
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: (theme) => ({
            // Plein écran sous `md` (une seule colonne visible à la fois, cf. `GmInventoryPanel`
            // masqué en dessous de `md` — les deux colonnes réunies dépassent 1480px, `sm` (600px)
            // était bien trop tôt pour les faire cohabiter). Au-delà, largeur normale — élargie de
            // `GM_INVENTORY_PANEL_WIDTH` sur l'onglet Butin pour révéler l'extension à gauche.
            width: {
              xs: '100vw',
              md: `min(${extended ? TOOLS_WIDTH + GM_INVENTORY_PANEL_WIDTH : TOOLS_WIDTH}px, 100vw)`,
            },
            maxWidth: '100vw',
            backgroundImage: 'none',
            // `Paper` (position `fixed`, posée par `Drawer`) sert de repère aux deux colonnes
            // ABSOLUMENT positionnées ci-dessous — nécessaire pour que l'extension puisse glisser
            // par-dessous la colonne normale (`transform`) sans perturber sa largeur à elle.
            overflow: 'hidden',
            transition: theme.transitions.create('width', {
              duration: theme.transitions.duration.standard,
            }),
          }),
        },
      }}
    >
      {/* Extension révélée à GAUCHE sur l'onglet Butin, glissée depuis la DROITE — masquée sous
          `md` (pas la place pour les deux colonnes côte à côte ; l'onglet Butin y reste utilisable
          seul, cf. le commutateur mobile). TOUJOURS montée (jamais `{extended && …}`) : un montage/
          démontage brut ne s'anime pas. Positionnement ABSOLU (pas flex) : au repos elle est décalée
          pile sous la colonne normale (`translateX` = sa propre largeur) donc invisible ET sans effet
          sur la largeur de celle-ci ; en s'ouvrant elle glisse jusqu'à `translateX(0)`, comme si elle
          sortait de DERRIÈRE le tiroir « Outils du MJ », depuis la droite de l'écran. */}
      <Box
        sx={(theme) => ({
          // Sous `md`, révélée seulement quand le commutateur mobile la vise — sinon la colonne
          // normale (`LootTreasurePanel`/`TavernRumorsPanel`) occupe tout l'écran, cf. `mobileView`.
          display: { xs: mobileShowInventory ? 'block' : 'none', md: 'block' },
          position: 'absolute',
          left: 0,
          top: 0,
          height: '100%',
          // `calc` (pas la constante fixe) : entre `md` et ~1480px de viewport, le `Paper` est
          // plafonné à `100vw` (cf. sa largeur ci-dessus) — sans ce calcul l'extension gardait sa
          // largeur PLEINE et débordait, purement RECOUVERTE (donc invisible/coupée) par la colonne
          // normale opaque plutôt que rétrécie. `100%` ici = la largeur RÉELLE du `Paper` (ancêtre
          // positionné le plus proche), donc ce qui reste une fois la colonne normale retirée.
          width: { xs: '100vw', md: `calc(100% - ${TOOLS_WIDTH}px)` },
          // Sous la colonne normale (voir son propre z-index plus haut, juste en dessous) : elle
          // glisse par-DESSOUS, jamais par-dessus.
          zIndex: 1,
          transform: extended ? 'translateX(0)' : `translateX(${GM_INVENTORY_PANEL_WIDTH}px)`,
          // Fondu couplé au glissement — dans les deux sens (apparition ET disparition) : rend la
          // sortie franchement visible même si le rétrécissement du `Paper` (transition séparée,
          // sur `width`) n'est pas exactement synchronisé image par image avec ce `transform`.
          opacity: extended ? 1 : 0,
          transition: theme.transitions.create(['transform', 'opacity'], {
            duration: theme.transitions.duration.standard,
          }),
        })}
      >
        <GmInventoryPanel
          campaign={campaign}
          pendingCategoryId={pendingTarget?.pool === 'permanent' ? pendingTarget.categoryId : undefined}
          onBackToTools={() => setMobileView('tools')}
        />
      </Box>

      {/* Colonne normale du tiroir, TOUJOURS ancrée à droite (position ABSOLUE, largeur fixe :
          jamais affectée par l'élargissement du `Paper` ni le glissement de l'extension). Devant
          l'extension (z-index supérieur) avec une ombre portée + une bordure grise à gauche : la
          sépare visuellement de l'extension qui glisse dessous, comme une carte posée par-dessus. */}
      <Box
        sx={(theme) => ({
          position: 'absolute',
          right: 0,
          top: 0,
          // `100vw` sous `md` : reflète la largeur du `Paper` plein écran sur mobile (l'extension y
          // reste masquée sauf commutateur, cf. ci-dessus — pas de conflit de largeur à cette étage).
          width: { xs: '100vw', md: TOOLS_WIDTH },
          maxWidth: '100vw',
          // Cède tout l'écran à l'extension quand le commutateur mobile la vise (cf. `mobileView`)
          // — sur `md` et plus, toujours visible : les deux colonnes cohabitent côte à côte.
          display: { xs: mobileShowInventory ? 'none' : 'block', md: 'block' },
          height: '100%',
          overflowY: 'auto',
          zIndex: 2,
          // Fond OPAQUE indispensable : le z-index ordonne seulement l'ORDRE de peinture, pas
          // l'occlusion — sans lui, le contenu de l'extension (dessous) reste peint dans le vide
          // entre les éléments de cette colonne (elle n'a par défaut pas de fond propre en dehors
          // de son en-tête collé) et « passe à travers » pendant le glissement, quand les deux
          // colonnes se chevauchent géométriquement (l'extension, plus large, balaie brièvement
          // toute la largeur de celle-ci en cours d'animation).
          bgcolor: 'background.paper',
          borderLeft: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
          boxShadow: '-16px 0 24px rgba(0, 0, 0, 0.5)',
        })}
      >
        {/* En-tête collé : titre + onglets + fermeture, visibles pendant le défilement. */}
        <Box
          sx={(theme) => ({
            position: 'sticky',
            top: 0,
            zIndex: 2,
            px: { xs: 2, sm: 3 },
            pt: 1.5,
            bgcolor: alpha(theme.palette.background.paper, 0.94),
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
          })}
        >
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
              Outils du MJ
            </Typography>
            {extended && (
              <AppTooltip title={mobileView === 'inventory' ? 'Revenir au butin' : 'Voir l’inventaire du MJ'}>
                <IconButton
                  size="small"
                  onClick={() => setMobileView((v) => (v === 'inventory' ? 'tools' : 'inventory'))}
                  aria-label="Basculer entre le butin et l’inventaire du MJ"
                  sx={{ display: { xs: 'inline-flex', md: 'none' } }}
                >
                  {mobileView === 'inventory' ? <DiamondIcon fontSize="small" /> : <Inventory2Icon fontSize="small" />}
                </IconButton>
              </AppTooltip>
            )}
            <AppTooltip title="Fermer">
              <IconButton size="small" onClick={onClose} aria-label="Fermer le tiroir">
                <CloseIcon />
              </IconButton>
            </AppTooltip>
          </Stack>
          <Tabs
            value={activeTab}
            onChange={(_, value) => {
              setMobileView('tools');
              onTabChange(value as GmToolId);
            }}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: 0, mt: 0.5 }}
          >
            {TOOLS.map((t) => (
              <Tab
                key={t.id}
                value={t.id}
                icon={t.icon}
                iconPosition="start"
                label={t.label}
                sx={{ minHeight: 48, textTransform: 'none' }}
              />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
          {activeTab === 'rumors' && <TavernRumorsPanel campaign={campaign} />}
          {activeTab === 'loot' && (
            <LootTreasurePanel campaign={campaign} pending={pendingTarget?.pool === 'random'} />
          )}
          {activeTab === 'npc' && <NpcPanel campaign={campaign} />}
          {activeTab === 'notes' && <SessionLiveNotesPanel campaignId={campaign.id} />}
        </Box>
      </Box>
    </Drawer>
  );
}
