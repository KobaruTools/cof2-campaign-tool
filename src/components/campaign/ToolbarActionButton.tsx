'use client';

/**
 * Bouton de barre d'outils des panneaux du tiroir MJ (inventaire, butin, PNJ…) —
 * plein (icône + texte) à partir de `xl` (~1536px, le palier MUI le plus proche
 * de 1400px demandé par le propriétaire), icône seule en dessous : entre `md` et
 * `xl`, ces panneaux sont souvent plus étroits que leur largeur préférée et les
 * boutons pleins débordaient/se faisaient recouvrir (retour propriétaire,
 * capture d'écran à ~906px sur `GmInventoryPanel`). Extrait de `GmInventoryPanel.tsx`
 * (PER-200) pour être réutilisé identique par les autres panneaux du tiroir MJ —
 * la cohérence visuelle ENTRE panneaux est le but même de l'extraction, pas une
 * factorisation de logique métier.
 */
import type { MouseEvent, ReactElement } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import { AppTooltip } from '@/components/AppTooltip';

export interface ToolbarActionButtonProps {
  icon: ReactElement;
  label: string;
  onClick: (e: MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  color?: 'secondary';
  /** `true` sous `xl` (cf. `useMediaQuery(theme.breakpoints.down('xl'))` chez l'appelant). */
  iconOnly: boolean;
}

export function ToolbarActionButton({ icon, label, onClick, disabled, color, iconOnly }: ToolbarActionButtonProps) {
  if (iconOnly) {
    return (
      <AppTooltip title={label}>
        <IconButton
          size="small"
          color={color}
          onClick={onClick}
          disabled={disabled}
          sx={{ border: 1, borderColor: 'divider' }}
        >
          {icon}
        </IconButton>
      </AppTooltip>
    );
  }
  return (
    <Button variant="outlined" size="small" color={color} startIcon={icon} onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  );
}
