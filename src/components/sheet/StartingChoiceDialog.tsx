'use client';

import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { StartingEquipmentChoiceOption } from '@/data/schema';
import { isFirearmChoiceOption } from '@/lib/character/firearms';

export interface StartingChoiceDialogProps {
  open: boolean;
  /** Libellé du choix (texte du livre porté par la ligne placeholder), ex. « Épée ou hache à deux mains (DM 2d6) ». */
  label: string;
  /** Options concrètes résolvables (PER-220). */
  options: StartingEquipmentChoiceOption[];
  /**
   * Autorisation EFFECTIVE des armes à feu du personnage (PER-185). Quand elle est `false` et
   * qu'une option octroie une arme à poudre (arquebusier, PER-234), la modale AVERTIT à la
   * sélection sans bloquer : le joueur partirait avec une arme absente de l'univers.
   */
  firearmsEffective?: boolean;
  onClose: () => void;
  /** Valide le choix : la ligne placeholder est remplacée par l'objet (ou le lot) de l'option retenue. */
  onConfirm: (option: StartingEquipmentChoiceOption) => void;
}

/**
 * Modale de résolution d'un CHOIX d'équipement de départ « X ou Y » (PER-220) : le
 * placeholder du livre (« Épée ou hache à deux mains », etc.) est remplacé par le vrai
 * objet du catalogue — ou le LOT (arme + bouclier du barbare, p. 79) — choisi ici. Le
 * choix reste libre (fiche permissive) ; il matérialise simplement l'option retenue.
 */
export function StartingChoiceDialog({
  open,
  label,
  options,
  firearmsEffective = true,
  onClose,
  onConfirm,
}: StartingChoiceDialogProps) {
  const [selected, setSelected] = useState(0);
  const valid = selected >= 0 && selected < options.length;

  // Avertissement non bloquant (PER-234) : l'option retenue octroie une arme à poudre alors que
  // la poudre est interdite dans cet univers (effectif). Détection data-driven (`isFirearmChoiceOption`).
  const firearmWarning =
    !firearmsEffective && valid && isFirearmChoiceOption(options[selected]);

  const confirm = () => {
    if (!valid) return;
    onConfirm(options[selected]);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Choisir l’équipement</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
          <RadioGroup
            value={selected}
            onChange={(e) => setSelected(Number(e.target.value))}
          >
            {options.map((option, i) => (
              <FormControlLabel
                key={i}
                value={i}
                control={<Radio size="small" />}
                label={option.label}
              />
            ))}
          </RadioGroup>
          {firearmWarning && (
            <Alert severity="warning" sx={{ mt: 0.5 }}>
              Les armes à feu sont interdites dans cet univers : vous partiriez avec une arme à
              poudre inutilisable. L’équivalent arbalète est recommandé.
            </Alert>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button variant="contained" disabled={!valid} onClick={confirm}>
          Obtenir
        </Button>
      </DialogActions>
    </Dialog>
  );
}
