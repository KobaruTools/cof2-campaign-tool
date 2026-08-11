'use client';

import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import IconButton from '@mui/material/IconButton';
import { AppTooltip } from '@/components/AppTooltip';

export interface PinSectionButtonProps {
  /** Vrai si ce bloc est actuellement épinglé en haut d'écran. */
  pinned: boolean;
  /** Bascule l'épinglage de ce bloc uniquement. */
  onToggle: () => void;
  /** Nom du bloc, pour l'infobulle (« Épingler — caractéristiques »). */
  label: string;
}

/**
 * Épingle un bloc de la fiche (Caractéristiques, Statistiques dérivées, État du personnage) dans la
 * barre condensée collée à l'en-tête (`StickySheetStatusBar`, 3ᵉ étage d'`AppHeader`) : épinglé, son
 * condensé y reste affiché EN PERMANENCE, quel que soit le défilement ; non épinglé, il n'y apparaît
 * jamais (retour propriétaire — plus de détection de défilement automatique). Un bloc à la fois n'a
 * pas de sens : chaque section porte SON propre pin, indépendant des deux autres.
 */
export function PinSectionButton({ pinned, onToggle, label }: PinSectionButtonProps) {
  return (
    <AppTooltip title={pinned ? `Désépingler — ${label}` : `Épingler en haut d'écran — ${label}`}>
      <IconButton
        size="small"
        color={pinned ? 'primary' : 'default'}
        onClick={onToggle}
        aria-label={pinned ? `Désépingler : ${label}` : `Épingler en haut d'écran : ${label}`}
      >
        {pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
      </IconButton>
    </AppTooltip>
  );
}
