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
import { progression } from '@/data';
import type { DamageDie } from '@/data/schema';
import { scalingDie } from '@/lib/engine';
import { diceRange } from '@/lib/character/coinPouch';
import { RESTORABLE_RESOURCE_LABEL, type RestorableResourceKind } from '@/lib/character/restorableResources';

export interface PotionInfo {
  resource: RestorableResourceKind;
  die: DamageDie;
  /** Nombre de dés (« 2d6 »…) ; absent = 1 (potion courante « 1dX »). */
  count?: number;
  /**
   * Dé ÉVOLUTIF (« d4° », table p. 43, RÈGLE MAISON) : `die` n'est qu'un placeholder, la face
   * réelle se résout au niveau du personnage (`scalingDie`) — donc dynamiquement, sans re-saisie
   * à chaque montée de niveau.
   */
  evolving?: true;
  /** Bonus plat ajouté au résultat des dés (« 1d6+4 ») ; absent/0 = aucun bonus. */
  modifier?: number;
}

export interface PotionDialogProps {
  open: boolean;
  /** Potion ouverte — détermine la ressource visée et le dé annoncé (PER-XXX). */
  potion: PotionInfo | null;
  /** Niveau du personnage, pour résoudre la face d'un dé ÉVOLUTIF (table p. 43). */
  level: number;
  onClose: () => void;
  /**
   * Valide l'usage de la potion : restaure le montant à la ressource visée et consomme une
   * dose de l'objet. Le montant est SAISI par le joueur — les dés se lancent à la vraie table
   * (aucune simulation, cf. règle projet).
   */
  onConfirm: (amount: number) => void;
}

/**
 * Modale « Potion de [ressource] » (PER-XXX, sur le modèle de `CoinPouchDialog`) : à l'usage de
 * l'objet, le joueur lance le dé annoncé par la potion (1dX, ou la face COURANTE d'un dé
 * évolutif « d4° » résolue au niveau du personnage) et saisit le résultat obtenu ; le montant
 * s'ajoute alors automatiquement à la ressource visée, et la potion est consommée.
 */
export function PotionDialog({ open, potion, level, onClose, onConfirm }: PotionDialogProps) {
  const evolving = potion?.evolving === true;
  const die = evolving ? scalingDie(level, progression) : (potion?.die ?? 'd6');
  const resource = potion?.resource ?? 'hp';
  const count = potion?.count ?? 1;
  const modifier = potion?.modifier ?? 0;
  const dice = `${count}${die}`;
  // Notation AFFICHÉE (« 1d6+4 ») — le joueur additionne le bonus plat lui-même à la table,
  // comme pour la bourse de pièces : le champ de saisie porte directement le TOTAL restauré.
  const diceLabel = modifier ? `${dice}${modifier > 0 ? '+' : ''}${modifier}` : dice;
  const rawRange = diceRange(dice);
  const range = rawRange ? { min: rawRange.min + modifier, max: rawRange.max + modifier } : null;
  const label = RESTORABLE_RESOURCE_LABEL[resource];
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
      <DialogTitle>Boire la potion</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            Lancez <strong>{diceLabel}</strong>
            {evolving ? ` (dé évolutif d4°, niveau ${level})` : ''} à la table et saisissez le
            résultat obtenu. Le montant sera ajouté à vos {label} et la potion consommée.
          </Typography>
          <TextField
            autoFocus
            type="number"
            size="small"
            label={`${label.charAt(0).toUpperCase()}${label.slice(1)} restaurés`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm();
            }}
            slotProps={range ? { htmlInput: { min: range.min, max: range.max } } : undefined}
            helperText={
              range
                ? valid && !inRange
                  ? `Attendu entre ${range.min} et ${range.max} (${diceLabel}) — valeur conservée telle quelle.`
                  : `Résultat du ${diceLabel} (${range.min} à ${range.max}).`
                : `Résultat du ${diceLabel}.`
            }
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Annuler</Button>
        <Button variant="contained" disabled={!valid} onClick={confirm}>
          Restaurer {valid ? parsed : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
