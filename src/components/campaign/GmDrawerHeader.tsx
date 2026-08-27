'use client';

/**
 * En-tête collé COMMUN aux tiroirs « Outils du MJ » (PER-448, retour propriétaire) —
 * extrait des 8 tiroirs (Butin, PNJ, Combats préparés, Rumeurs, Notes, Historique,
 * Aide-mémoire, Bestiaire), qui dupliquaient tous la MÊME Box sticky + `Typography h6` +
 * croix de fermeture. Deux ajouts par rapport à l'ancien en-tête dupliqué :
 *  - l'ICÔNE du menu « Outils du MJ », désormais affichée devant le titre (même élément
 *    que `GM_TOOLS_MENU`, passé tel quel par l'appelant) ;
 *  - `GmToolSwitcher`, pour sauter directement vers un autre tiroir.
 *
 * `actions` (optionnel) insère des contrôles propres à UN tiroir entre le titre et le
 * changeur d'outil — seul `GmLootDrawer` s'en sert aujourd'hui (bascule mobile butin/
 * inventaire).
 */
import type { ReactElement, ReactNode } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { GmToolSwitcher } from './GmToolSwitcher';

/** Hauteur (px) de l'en-tête collé — même valeur pour tous les tiroirs de l'écran de MJ. */
export const GM_DRAWER_HEADER_HEIGHT = 52;

export interface GmDrawerHeaderProps {
  /** Icône du tiroir — MÊME élément que son entrée dans `GM_TOOLS_MENU`. */
  icon: ReactElement;
  title: string;
  /** Paramètre d'URL de CE tiroir (cf. `*_PARAM` de `gmToolsMenu.tsx`) — pour `GmToolSwitcher`. */
  currentParam: string;
  onClose: () => void;
  /** Contrôles propres à ce tiroir, entre le titre et le changeur d'outil. */
  actions?: ReactNode;
}

export function GmDrawerHeader({ icon, title, currentParam, onClose, actions }: GmDrawerHeaderProps) {
  return (
    <Box
      data-glossary-shot="GmDrawerHeader"
      sx={(theme) => ({
        position: 'sticky',
        top: 0,
        zIndex: 4,
        height: GM_DRAWER_HEADER_HEIGHT,
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
        <Box sx={{ display: 'flex', flexShrink: 0, color: 'text.secondary' }}>{icon}</Box>
        <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold', flexGrow: 1 }}>
          {title}
        </Typography>
        {actions}
        <GmToolSwitcher currentParam={currentParam} />
        <AppTooltip title="Fermer">
          <IconButton size="small" onClick={onClose} aria-label="Fermer le tiroir">
            <CloseIcon />
          </IconButton>
        </AppTooltip>
      </Stack>
    </Box>
  );
}
