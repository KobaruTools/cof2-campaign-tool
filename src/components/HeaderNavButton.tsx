'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import { type Theme } from '@mui/material/styles';
import { HEADER_ICON_ONLY_BREAKPOINT } from '@/lib/ui/headerBreakpoints';

/**
 * Style partagé des boutons de navigation globaux de l'en-tête (Bestiaire, Campagnes,
 * Livre des règles…). Le libellé est masqué sous `HEADER_ICON_ONLY_BREAKPOINT` (icône
 * seule EN PERMANENCE — sous le seuil burger, ce bouton n'est de toute façon plus monté,
 * remplacé par `AppHeaderNavDrawer`). Dès ce seuil franchi, le libellé reste TOUJOURS
 * affiché, à taille et padding FIXES : le défilement ne fait plus rien à l'en-tête
 * (hauteur, texte, padding — tout redimensionnement au scroll a été essayé et jugé
 * bizarre visuellement, cf. `AppHeader`).
 *
 * Extrait de `AppHeader` (PER-254) pour être réutilisé par le corps du split-button
 * « Livre des règles » (`RulesBookSplitButton`), qui doit être visuellement identique
 * aux autres boutons de nav.
 */
export function HeaderNavButton({
  href,
  onClick,
  icon,
  label,
}: {
  /** Cible de navigation (bouton-lien interne). Fournir `href` OU `onClick`. */
  href?: string;
  /** Action au clic (bouton d'action, ex. ouvrir le visualiseur PDF). Fournir `href` OU `onClick`. */
  onClick?: () => void;
  icon: ReactNode;
  label: string;
}) {
  const buttonSx = (theme: Theme) => ({
    minWidth: 0,
    px: 1.5,
    py: 0.625,
    flexShrink: 0,
    '& .MuiButton-startIcon': {
      mr: 0,
      [theme.breakpoints.up(HEADER_ICON_ONLY_BREAKPOINT)]: { mr: 0.625 },
      transition: theme.transitions.create('margin', {
        duration: theme.transitions.duration.short,
      }),
    },
  });
  const labelSpan = (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-block',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
        maxWidth: 0,
        opacity: 0,
        [theme.breakpoints.up(HEADER_ICON_ONLY_BREAKPOINT)]: { maxWidth: '18ch', opacity: 1 },
        transition: theme.transitions.create(['max-width', 'opacity'], {
          duration: theme.transitions.duration.short,
        }),
      })}
    >
      {label}
    </Box>
  );
  // Bouton-lien (navigation interne) OU bouton d'action (onClick) selon la prop fournie.
  return href ? (
    <Button
      color="inherit"
      startIcon={icon}
      component={Link}
      href={href}
      sx={buttonSx}
      data-glossary-shot="HeaderNavButton"
    >
      {labelSpan}
    </Button>
  ) : (
    <Button
      color="inherit"
      startIcon={icon}
      onClick={onClick}
      sx={buttonSx}
      data-glossary-shot="HeaderNavButton"
    >
      {labelSpan}
    </Button>
  );
}
