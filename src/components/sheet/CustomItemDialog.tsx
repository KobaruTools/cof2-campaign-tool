'use client';

import { useState } from 'react';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

export interface CustomItemDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Valeurs initiales : présentes en mode ÉDITION (réécriture d'un objet existant),
   * absentes en mode CRÉATION. Le composant est remonté (via `key`) à chaque
   * ouverture par l'appelant, si bien que ces valeurs servent d'état initial.
   */
  initialName?: string;
  initialDetails?: string;
  /**
   * Valide l'ajout / la réécriture : `name` (obligatoire) + description libre `details`
   * facultative (DM, DEF, propriétés, notes…). Le reste de la ligne (quantité, port…)
   * est conservé par l'appelant en mode édition.
   */
  onConfirm: (name: string, details: string | undefined) => void;
}

/**
 * Modale de création / réécriture d'un objet PERSONNALISÉ hors catalogue (fiche
 * permissive) : nom obligatoire + description libre facultative (multi-lignes).
 * Sert à la fois à l'ajout (bouton « Objet personnalisé ») et à l'édition à la volée
 * (bouton crayon sur une ligne custom). Le champ `CustomItem.details` n'était
 * jusqu'ici éditable nulle part.
 */
export function CustomItemDialog({
  open,
  onClose,
  initialName = '',
  initialDetails = '',
  onConfirm,
}: CustomItemDialogProps) {
  const [name, setName] = useState(initialName);
  const [details, setDetails] = useState(initialDetails);
  const trimmedName = name.trim();
  const valid = trimmedName.length > 0;
  const editing = initialName.length > 0;

  const confirm = () => {
    if (!valid) return;
    const trimmedDetails = details.trim();
    onConfirm(trimmedName, trimmedDetails || undefined);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editing ? 'Modifier l’objet' : 'Ajouter un objet personnalisé'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            autoFocus
            size="small"
            label="Nom de l’objet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm();
            }}
            required
            fullWidth
          />
          <TextField
            size="small"
            label="Description"
            placeholder="DM, DEF, propriétés, notes libres…"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            multiline
            minRows={3}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" disabled={!valid} onClick={confirm}>
          {editing ? 'Enregistrer' : 'Ajouter'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
