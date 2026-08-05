'use client';

/**
 * Tiroir « Outils du MJ » de l'écran de MJ (PER-199) — panneau latéral droit, à
 * ONGLETS, calqué sur le tiroir de fiche (`GmSheetDrawer`) : variante `temporary`
 * (voile, Échap, piège de focus), ancré à droite, plein écran sous `sm`.
 *
 * Il regroupe des outils de table du MJ, un par onglet. Premier onglet : « Rumeurs
 * de taverne » (réserve pré-écrite + tirage au hasard). D'autres viendront s'ajouter
 * (butin, tables aléatoires…), d'où l'ossature à onglets dès maintenant.
 *
 * Purement présentationnel : l'ouverture et l'onglet actif sont pilotés par l'URL
 * (`?tools=`, cf. `GmToolsDrawerHost`), en vraie ancre — le bouton Retour ferme le
 * tiroir, un lien direct l'ouvre sur le bon onglet.
 */
import CloseIcon from '@mui/icons-material/Close';
import DiamondIcon from '@mui/icons-material/Diamond';
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
import { LootTreasurePanel } from './LootTreasurePanel';
import { TavernRumorsPanel } from './TavernRumorsPanel';

/** Identifiants d'onglet du tiroir — servent aussi de valeur au paramètre d'URL `?tools=`. */
export type GmToolId = 'rumors' | 'loot';

/** Onglets déclarés, dans l'ordre d'affichage. Étendre ici pour ajouter un outil. */
const TOOLS: { id: GmToolId; label: string; icon: React.ReactElement }[] = [
  { id: 'rumors', label: 'Rumeurs de taverne', icon: <LocalBarIcon fontSize="small" /> },
  { id: 'loot', label: 'Butin', icon: <DiamondIcon fontSize="small" /> },
];

/** L'onglet par défaut (premier déclaré) — cible du bouton d'ouverture. */
export const DEFAULT_GM_TOOL: GmToolId = TOOLS[0].id;

/** Garde de type : la valeur brute du paramètre d'URL est-elle un onglet connu ? */
export function isGmToolId(value: string | null): value is GmToolId {
  return value !== null && TOOLS.some((t) => t.id === value);
}

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
}

export function GmToolsDrawer({
  campaign,
  open,
  activeTab,
  onTabChange,
  onClose,
}: GmToolsDrawerProps) {
  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            // Contenu surtout textuel : plus étroit que le tiroir de fiche. Plein écran sous `sm`.
            width: { xs: '100vw', sm: 'min(560px, 100vw)' },
            maxWidth: '100vw',
            overflowY: 'auto',
            backgroundImage: 'none',
          },
        },
      }}
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
          <AppTooltip title="Fermer">
            <IconButton size="small" onClick={onClose} aria-label="Fermer le tiroir">
              <CloseIcon />
            </IconButton>
          </AppTooltip>
        </Stack>
        <Tabs
          value={activeTab}
          onChange={(_, value) => onTabChange(value as GmToolId)}
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
        {activeTab === 'loot' && <LootTreasurePanel campaign={campaign} />}
      </Box>
    </Drawer>
  );
}
