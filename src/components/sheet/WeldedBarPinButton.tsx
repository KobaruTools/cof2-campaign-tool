'use client';

import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import IconButton from '@mui/material/IconButton';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';

/** Hauteur commune des boutons `variant="outlined"` (`size="small"`) soudables à un pin. */
export const WELDED_BUTTON_HEIGHT = 30;

export interface WeldedBarPinButtonProps {
  /** Vrai si ce bouton est actuellement épinglé à la barre condensée. */
  pinned: boolean;
  /** Bascule le pin de CE bouton uniquement. */
  onToggle: () => void;
  /** Nom du bouton soudé, pour l'infobulle/aria-label (« Repos court », « Objet personnalisé »…). */
  label: string;
}

/**
 * PIN individuel (retour propriétaire) soudé à la droite d'un bouton `variant="outlined"` — même
 * recette visuelle que la « croix de levée collective » de l'écran de MJ (`ClearStatusButton`,
 * `CombatStatusPalette`) : coins carrés à la jonction, bordures superposées (`ml: '-1px'`), fond
 * teinté — mais avec une épingle à la place d'une croix. Décide si CE bouton apparaît, en icône
 * carrée, dans la barre condensée (`StickySheetStatusBar`) — n'a de sens QUE si la section qui le
 * porte y est elle-même épinglée (les appelants ne le montent qu'à cette condition).
 *
 * Partagé entre les boutons de repos (`PlayerStatusPanel`) et « Objet personnalisé »
 * (`EquipmentList`) — même geste, même style, pas de duplication.
 */
export function WeldedBarPinButton({ pinned, onToggle, label }: WeldedBarPinButtonProps) {
  return (
    <AppTooltip title={pinned ? `Retirer de la barre condensée : ${label}` : `Ajouter à la barre condensée : ${label}`}>
      <IconButton
        size="small"
        onClick={onToggle}
        data-glossary-shot="WeldedBarPinButton"
        aria-label={pinned ? `Retirer de la barre condensée : ${label}` : `Ajouter à la barre condensée : ${label}`}
        sx={(theme) => ({
          width: WELDED_BUTTON_HEIGHT,
          height: WELDED_BUTTON_HEIGHT,
          ml: '-1px',
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius: `${theme.shape.borderRadius}px`,
          borderBottomRightRadius: `${theme.shape.borderRadius}px`,
          color: pinned ? theme.palette.primary.light : theme.palette.text.secondary,
          border: `1px solid ${pinned ? alpha(theme.palette.primary.main, 0.5) : theme.palette.divider}`,
          bgcolor: pinned ? alpha(theme.palette.primary.main, 0.14) : 'transparent',
          '&:hover': { bgcolor: pinned ? alpha(theme.palette.primary.main, 0.28) : 'action.hover' },
        })}
      >
        {pinned ? <PushPinIcon sx={{ fontSize: 16 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 16 }} />}
      </IconButton>
    </AppTooltip>
  );
}
