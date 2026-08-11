'use client';

/**
 * Modale de CRÉATION d'une bourse de pièces (extension PER-200, Outils du MJ) — distincte de
 * `CoinPouchDialog` (qui gère l'USAGE d'une bourse déjà possédée, côté fiche). Le MJ choisit
 * la monnaie, la notation de dés et le nombre d'exemplaires à préparer d'un coup (plusieurs
 * bourses identiques pour plusieurs joueurs) ; chaque exemplaire est une CARTE DISTINCTE,
 * reconnue à l'usage par son nom (« Bourse de NdM {pp|po|pa|pc} », cf. `parseCoinPouchName`).
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DICE, type Die } from '@/data/schema';
import { DieIcon } from '@/components/DieIcon';
import { CURRENCY_ABBREV, CURRENCY_LABEL, coinPouchItemName, diceRange, type CoinCurrency } from '@/lib/character/coinPouch';

const CURRENCIES: CoinCurrency[] = ['platinum', 'gold', 'silver', 'copper'];

export interface CoinPouchCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Valide : `count` bourses IDENTIQUES à créer, chacune sa propre carte. */
  onConfirm: (name: string, count: number) => void;
}

export function CoinPouchCreateDialog({ open, onClose, onConfirm }: CoinPouchCreateDialogProps) {
  const [currency, setCurrency] = useState<CoinCurrency>('gold');
  const [diceCount, setDiceCount] = useState('2');
  const [die, setDie] = useState<Die>('d6');
  const [count, setCount] = useState(1);

  const dice = `${diceCount}${die}`;
  const range = diceRange(dice);
  const valid = range !== null && count >= 1;

  const close = () => {
    setCurrency('gold');
    setDiceCount('2');
    setDie('d6');
    setCount(1);
    onClose();
  };
  const confirm = () => {
    if (!valid) return;
    onConfirm(coinPouchItemName(dice, currency), count);
    close();
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="xs" fullWidth>
      <DialogTitle>Créer une bourse de pièces</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            À l’usage, le joueur lance les dés à la table et saisit le montant obtenu — comme la
            « Bourse de 2d6 pa » du sac de départ (p. 31).
          </Typography>
          <TextField
            select
            size="small"
            label="Monnaie"
            value={currency}
            onChange={(e) => setCurrency(e.target.value as CoinCurrency)}
            fullWidth
          >
            {CURRENCIES.map((c) => (
              <MenuItem key={c} value={c}>
                {CURRENCY_LABEL[c]}
              </MenuItem>
            ))}
          </TextField>
          <Stack direction="row" spacing={1}>
            <TextField
              type="number"
              size="small"
              label="Nombre de dés"
              value={diceCount}
              onChange={(e) => setDiceCount(e.target.value)}
              slotProps={{ htmlInput: { min: 1 } }}
              sx={{ flex: '1 1 50%' }}
            />
            <TextField
              select
              size="small"
              label="Dé"
              value={die}
              onChange={(e) => setDie(e.target.value as Die)}
              sx={{ flex: '1 1 50%' }}
            >
              {DICE.map((d) => (
                <MenuItem key={d} value={d}>
                  <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <DieIcon die={d} size={18} noTooltip />
                    {d}
                  </Box>
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TextField
            type="number"
            size="small"
            label="Nombre de bourses"
            value={count}
            onChange={(e) => setCount(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
            slotProps={{ htmlInput: { min: 1, max: 50 } }}
            helperText="Crée plusieurs bourses identiques d’un coup (une carte par bourse)."
            fullWidth
          />
          {range && (
            <Typography variant="caption" color="text.secondary">
              Aperçu : « {coinPouchItemName(dice, currency)} » — {range.min} à {range.max}{' '}
              {CURRENCY_ABBREV[currency]}.
            </Typography>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Annuler</Button>
        <Button variant="contained" disabled={!valid} onClick={confirm}>
          Créer {count > 1 ? `${count} bourses` : 'la bourse'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
