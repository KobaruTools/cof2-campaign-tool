'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

export interface CoinPouchDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Valide l'ouverture de la bourse : ajoute `silver` pièces d'argent à la fortune et
   * consomme une dose de l'objet. Le montant (2d6) est SAISI par le joueur — les dés se
   * lancent à la vraie table (aucune simulation, cf. règle projet).
   */
  onConfirm: (silver: number) => void;
}

/**
 * Modale « Bourse de 2d6 pa » (p. 31) : à l'usage de l'objet, le joueur lance 2d6 à la
 * table et saisit le total de pièces d'argent (pa) obtenu ; le montant s'ajoute alors
 * automatiquement à la fortune, et la bourse est consommée.
 */
export function CoinPouchDialog({ open, onClose, onConfirm }: CoinPouchDialogProps) {
  const [text, setText] = useState('');
  const parsed = Math.max(0, Math.round(Number.parseInt(text, 10) || 0));
  // 2d6 → total attendu entre 2 et 12 ; borne indicative (on n'empêche pas une autre valeur).
  const inRange = parsed >= 2 && parsed <= 12;
  const valid = parsed > 0;

  const close = () => {
    setText('');
    onClose();
  };
  const confirm = () => {
    if (!valid) return;
    onConfirm(parsed);
    setText('');
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>Ouvrir la bourse</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Lancez <strong>2d6</strong> à la table et saisissez le total de pièces d’argent (pa)
            obtenu. Le montant sera ajouté à votre fortune et la bourse consommée.
          </Typography>
          <TextField
            autoFocus
            type="number"
            size="small"
            label="Pièces d’argent (pa) obtenues"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm();
            }}
            slotProps={{ htmlInput: { min: 2, max: 12 } }}
            helperText={
              valid && !inRange
                ? 'Attendu entre 2 et 12 (2d6) — valeur conservée telle quelle.'
                : 'Total des 2d6 (2 à 12).'
            }
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Annuler</Button>
        <Button variant="contained" disabled={!valid} onClick={confirm}>
          Ajouter {valid ? `${parsed} pa` : 'les pa'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
