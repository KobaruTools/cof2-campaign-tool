'use client';

/**
 * Bouton dont le LIBELLÉ se replie sous un point d'arrêt, ne laissant qu'un bouton carré à icône
 * (PER-301). Écrit pour l'en-tête du tracker d'initiative, où quatre boutons à libellé long
 * (« Ouvrir dans une nouvelle fenêtre », « Lien de projection », « Tour précédent », « Tour
 * suivant ») passaient à la ligne dès qu'on descendait sous ~1420 px de fenêtre — la barre y gagnait
 * une deuxième rangée, donc ~40 px de hauteur, sur une barre justement collée en bas de l'écran.
 *
 * Un SEUL nœud DOM, pas deux variantes dont on masque une : le libellé est un `span` que le point
 * d'arrêt escamote, et les marges que MUI réserve autour de l'icône de tête (pour l'écarter du
 * libellé) sont annulées en même temps, sans quoi le bouton replié resterait décentré.
 *
 * `aria-label` porte TOUJOURS le libellé complet : une fois le `span` en `display: none`, son texte
 * ne compte plus dans le nom accessible du bouton, qui se réduirait à rien. `title` reprend le
 * libellé par défaut — c'est la seule façon de le lire quand il est replié — et reste surchargeable
 * pour y ajouter un raccourci clavier. Info-bulle NATIVE et non `AppTooltip` : ces boutons peuvent
 * être désactivés (ordre d'initiative vide), cas où une info-bulle MUI ne s'affiche pas et le
 * signale en console.
 */
import Box from '@mui/material/Box';
import Button, { type ButtonProps } from '@mui/material/Button';
import type { ReactElement } from 'react';

export interface CollapsibleLabelButtonProps extends Omit<ButtonProps, 'startIcon' | 'children'> {
  /** Libellé affiché à partir du point d'arrêt, et nom accessible du bouton en toutes tailles. */
  label: string;
  /** Icône de tête, seul contenu visible sous le point d'arrêt. */
  icon: ReactElement;
}

export function CollapsibleLabelButton({
  label,
  icon,
  title,
  sx,
  ...rest
}: CollapsibleLabelButtonProps) {
  return (
    <Button
      startIcon={icon}
      data-glossary-shot="CollapsibleLabelButton"
      aria-label={label}
      title={title ?? label}
      sx={[
        {
          // Replié : bouton carré. La largeur minimale de MUI (64 px, dimensionnée pour un libellé)
          // et l'écart droit de l'icône de tête tombent tous les deux, sinon l'icône reste collée
          // à gauche d'un bouton trop large.
          minWidth: { xs: 0, xl: 64 },
          px: { xs: 0.75, xl: 1.5 },
          '& .MuiButton-startIcon': { ml: 0, mr: { xs: 0, xl: 1 } },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
      {...rest}
    >
      <Box component="span" sx={{ display: { xs: 'none', xl: 'inline' } }}>
        {label}
      </Box>
    </Button>
  );
}
