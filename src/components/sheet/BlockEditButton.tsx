'use client';

import DoneIcon from '@mui/icons-material/Done';
import EditIcon from '@mui/icons-material/Edit';
import IconButton from '@mui/material/IconButton';
import { AppTooltip } from '@/components/AppTooltip';

export interface BlockEditButtonProps {
  /** Vrai si ce bloc est actuellement en édition. */
  editing: boolean;
  /** Bascule l'édition de ce bloc uniquement. */
  onToggle: () => void;
  /** Nom du bloc, pour l'infobulle (« Modifier — équipement »). */
  label: string;
}

/**
 * Crayon d'édition ciblé sur un seul bloc de la fiche (identité, équipement…).
 * Complète le bouton « Modifier » global du bandeau : il n'active/désactive que
 * le scope de son bloc. Affiche une coche quand ce bloc est déjà en édition.
 */
export function BlockEditButton({ editing, onToggle, label }: BlockEditButtonProps) {
  return (
    <AppTooltip title={editing ? `Terminer — ${label}` : `Modifier — ${label}`}>
      <IconButton
        size="small"
        color={editing ? 'primary' : 'default'}
        onClick={onToggle}
        aria-label={editing ? `Terminer la modification : ${label}` : `Modifier : ${label}`}
      >
        {editing ? <DoneIcon fontSize="small" /> : <EditIcon fontSize="small" />}
      </IconButton>
    </AppTooltip>
  );
}
