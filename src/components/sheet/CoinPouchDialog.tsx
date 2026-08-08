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
import { diceRange, type CoinPouchInfo } from '@/lib/character/coinPouch';

/** Bourse d'origine (p. 31), pour le cas défensif où `info` serait absent au rendu. */
const DEFAULT_INFO: CoinPouchInfo = { currency: 'silver', abbrev: 'pa', label: 'pièces d’argent (pa)', dice: '2d6' };

export interface CoinPouchDialogProps {
  open: boolean;
  /** Bourse ouverte — détermine la monnaie et la notation de dés annoncées (généralisation PER-200). */
  info: CoinPouchInfo | null;
  onClose: () => void;
  /**
   * Valide l'ouverture de la bourse : ajoute le montant à la monnaie de la bourse et
   * consomme une dose de l'objet. Le montant est SAISI par le joueur — les dés se lancent
   * à la vraie table (aucune simulation, cf. règle projet).
   */
  onConfirm: (amount: number) => void;
}

/**
 * Modale « Bourse de NdM {pièces} » (p. 31, généralisée PER-200) : à l'usage de l'objet, le
 * joueur lance les dés annoncés par le nom de la bourse à la table et saisit le total
 * obtenu ; le montant s'ajoute alors automatiquement à la monnaie concernée, et la bourse
 * est consommée.
 */
export function CoinPouchDialog({ open, info, onClose, onConfirm }: CoinPouchDialogProps) {
  const { dice, label } = info ?? DEFAULT_INFO;
  const range = diceRange(dice);
  const [text, setText] = useState('');
  const parsed = Math.max(0, Math.round(Number.parseInt(text, 10) || 0));
  const inRange = range ? parsed >= range.min && parsed <= range.max : true;
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
            Lancez <strong>{dice}</strong> à la table et saisissez le total de {label} obtenu. Le
            montant sera ajouté à votre fortune et la bourse consommée.
          </Typography>
          <TextField
            autoFocus
            type="number"
            size="small"
            label={`${label.charAt(0).toUpperCase()}${label.slice(1)} obtenues`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm();
            }}
            slotProps={range ? { htmlInput: { min: range.min, max: range.max } } : undefined}
            helperText={
              range
                ? valid && !inRange
                  ? `Attendu entre ${range.min} et ${range.max} (${dice}) — valeur conservée telle quelle.`
                  : `Total des ${dice} (${range.min} à ${range.max}).`
                : `Total des ${dice}.`
            }
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Annuler</Button>
        <Button variant="contained" disabled={!valid} onClick={confirm}>
          Ajouter {valid ? `${parsed} ${info?.abbrev ?? DEFAULT_INFO.abbrev}` : 'les pièces'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
