'use client';

import { useEffect, useState, type ReactNode } from 'react';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Collapse from '@mui/material/Collapse';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { SxProps, Theme } from '@mui/material/styles';

export interface SheetSectionProps {
  /** Titre de la section (h2). */
  title: string;
  /** Élément optionnel aligné à droite du titre (bouton, badge…). */
  action?: ReactNode;
  /** Styles supplémentaires fusionnés sur le cadre Paper. */
  sx?: SxProps<Theme>;
  /** Si vrai, le titre devient cliquable (chevron) pour replier/déplier le contenu. */
  collapsible?: boolean;
  /** État initial replié (n'a d'effet que si `collapsible`). */
  defaultCollapsed?: boolean;
  /**
   * Clé de persistance de l'état replié/déplié dans `localStorage` (n'a d'effet que si
   * `collapsible`). Le choix de l'utilisateur survit alors au rechargement, écrasant
   * `defaultCollapsed`.
   */
  persistKey?: string;
  children: ReactNode;
}

const storageKey = (key: string) => `sheet-section-collapsed:${key}`;

/**
 * Cadre titré commun aux sections de la fiche de personnage (identité,
 * caractéristiques, stats, voies, équipement). Centralise l'espacement et la
 * ligne de titre pour un rendu uniforme. Optionnellement repliable (`collapsible`).
 */
export function SheetSection({
  title,
  action,
  sx,
  collapsible = false,
  defaultCollapsed = false,
  persistKey,
  children,
}: SheetSectionProps) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const isCollapsed = collapsible && collapsed;

  // Persistance optionnelle : on relit le choix sauvegardé APRÈS le montage (et non à
  // l'initialisation) pour ne pas désynchroniser le rendu serveur/client. Écrase `defaultCollapsed`.
  useEffect(() => {
    if (!collapsible || !persistKey || typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(storageKey(persistKey));
    if (saved === 'true' || saved === 'false') setCollapsed(saved === 'true');
  }, [collapsible, persistKey]);

  const toggle = () => {
    setCollapsed((c) => {
      const next = !c;
      if (persistKey && typeof window !== 'undefined') {
        window.localStorage.setItem(storageKey(persistKey), String(next));
      }
      return next;
    });
  };

  return (
    <Paper variant="outlined" sx={[{ p: { xs: 2, sm: 3 } }, ...(Array.isArray(sx) ? sx : [sx])]}>
      <Stack
        direction="row"
        spacing={1}
        onClick={collapsible ? toggle : undefined}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: isCollapsed ? 0 : 2,
          cursor: collapsible ? 'pointer' : undefined,
          userSelect: collapsible ? 'none' : undefined,
        }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          {collapsible && (
            <IconButton
              size="small"
              aria-label={isCollapsed ? 'Déplier' : 'Replier'}
              sx={{ ml: -0.5 }}
              // Le clic est déjà géré par la ligne entière ; ce bouton n'est qu'un repère visuel.
              tabIndex={-1}
            >
              <ExpandMoreIcon
                fontSize="small"
                sx={{ transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }}
              />
            </IconButton>
          )}
          <Typography variant="h6" component="h2" noWrap>
            {title}
          </Typography>
        </Stack>
        {action && (
          // Empêche un clic sur l'action (bouton, etc.) de replier la section.
          <Stack direction="row" onClick={(e) => e.stopPropagation()}>
            {action}
          </Stack>
        )}
      </Stack>
      {collapsible ? <Collapse in={!collapsed}>{children}</Collapse> : children}
    </Paper>
  );
}
