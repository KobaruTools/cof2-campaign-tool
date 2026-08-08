'use client';

/**
 * Modale de CRÉATION d'une bourse de pièces (extension PER-200, Outils du MJ) — distincte de
 * `CoinPouchDialog` (qui gère l'USAGE d'une bourse déjà possédée, côté fiche). Le MJ choisit
 * la monnaie, la notation de dés et le nombre d'exemplaires à préparer d'un coup (plusieurs
 * bourses identiques pour plusieurs joueurs) ; chaque exemplaire est une CARTE DISTINCTE,
 * reconnue à l'usage par son nom (« Bourse de NdM {pp|po|pa|pc} », cf. `parseCoinPouchName`).
 */
import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { CURRENCY_ABBREV, CURRENCY_LABEL, coinPouchItemName, diceRange, type CoinCurrency } from '@/lib/character/coinPouch';

const CURRENCIES: CoinCurrency[] = ['platinum', 'gold', 'silver', 'copper'];
/** Notations de dés les plus courantes du livre (démarrage p. 31, trésors p. 245…). */
const DICE_PRESETS = ['1d4', '1d6', '2d6', '3d6', '2d8'];

export interface CoinPouchCreateDialogProps {
  open: boolean;
  onClose: () => void;
  /** Valide : `count` bourses IDENTIQUES à créer, chacune sa propre carte. */
  onConfirm: (name: string, count: number) => void;
}

export function CoinPouchCreateDialog({ open, onClose, onConfirm }: CoinPouchCreateDialogProps) {
  const [currency, setCurrency] = useState<CoinCurrency>('gold');
  const [dice, setDice] = useState('2d6');
  const [count, setCount] = useState(1);

  const range = diceRange(dice);
  const valid = range !== null && count >= 1;

  const close = () => {
    setCurrency('gold');
    setDice('2d6');
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
          <TextField
            select
            size="small"
            label="Dés"
            value={DICE_PRESETS.includes(dice) ? dice : 'custom'}
            onChange={(e) => setDice(e.target.value === 'custom' ? '' : e.target.value)}
            fullWidth
          >
            {DICE_PRESETS.map((d) => (
              <MenuItem key={d} value={d}>
                {d}
              </MenuItem>
            ))}
            <MenuItem value="custom">Personnalisé…</MenuItem>
          </TextField>
          {!DICE_PRESETS.includes(dice) && (
            <TextField
              size="small"
              label="Notation personnalisée"
              placeholder="ex. 4d6"
              value={dice}
              onChange={(e) => setDice(e.target.value)}
              error={dice.trim() !== '' && range === null}
              helperText={dice.trim() !== '' && range === null ? 'Notation attendue : NdM (ex. 4d6).' : undefined}
              fullWidth
            />
          )}
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
