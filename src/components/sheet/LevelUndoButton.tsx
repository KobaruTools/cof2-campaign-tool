'use client';

import { useState } from 'react';
import UndoIcon from '@mui/icons-material/Undo';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';

export interface LevelUndoButtonProps {
  /** Niveau courant, celui qui sera annulé (le personnage redescend à level - 1). */
  level: number;
  /** Annule le dernier niveau. */
  onUndo: () => void;
}

/**
 * Bouton « Annuler le niveau N » + confirmation, affiché dans l'en-tête du bloc
 * « Historique des niveaux ». Sorti de `LevelHistory` pour vivre sur la ligne de
 * titre (comme les crayons d'édition des autres blocs).
 */
export function LevelUndoButton({ level, onUndo }: LevelUndoButtonProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const confirmUndo = () => {
    setConfirmOpen(false);
    onUndo();
  };

  return (
    <>
      <Button
        color="error"
        variant="outlined"
        size="small"
        startIcon={<UndoIcon />}
        onClick={() => setConfirmOpen(true)}
      >
        Annuler le niveau {level}
      </Button>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Annuler le niveau {level} ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Les capacités acquises au niveau {level} seront retirées et le personnage
            redescendra au niveau {level - 1}. Cette action est réversible en remontant de niveau.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Conserver</Button>
          <Button color="error" variant="contained" onClick={confirmUndo}>
            Annuler le niveau
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
