'use client';

import RestoreIcon from '@mui/icons-material/Restore';
import Button from '@mui/material/Button';

export interface LevelRedoButtonProps {
  /** Niveau qui sera rétabli (celui qui vient d'être annulé). */
  level: number;
  /** Rétablit le dernier niveau annulé. */
  onRedo: () => void;
}

/**
 * Bouton « Rétablir le niveau N », filet de sécurité contre un clic accidentel sur
 * « Annuler le niveau N » (PER-497) : visible uniquement tant qu'un niveau annulé est en
 * attente de rétablissement (`canRedoLevelUp`). Pas de confirmation ici — contrairement à
 * `LevelUndoButton`, ce bouton répare une erreur plutôt que d'en créer une.
 */
export function LevelRedoButton({ level, onRedo }: LevelRedoButtonProps) {
  return (
    <Button
      color="warning"
      variant="outlined"
      size="small"
      startIcon={<RestoreIcon />}
      onClick={onRedo}
      data-glossary-shot="LevelRedoButton"
    >
      Rétablir le niveau {level}
    </Button>
  );
}
