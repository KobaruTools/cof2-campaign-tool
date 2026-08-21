'use client';

import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { featureById } from '@/data';
import type { Character, FeatureChoiceSelection } from '@/lib/character/types';
import { FeatureChoiceField } from './FeatureChoiceField';

export interface AncestryChoicesDialogProps {
  open: boolean;
  onClose: () => void;
  character: Character;
  /** Capacités « choix d'identité » du peuple (`Ancestry.identityChoiceFeatureIds`). */
  featureIds: string[];
  /** Persiste un choix (même signature que la section « Voie »). */
  onChange: (featureId: string, index: number, value: FeatureChoiceSelection) => void;
}

/**
 * Modale d'édition RÉTROACTIVE des choix d'identité de peuple (PER-401) — type option : ex. le type de
 * souffle du drakonide (PER-326). Ces choix sont posés à la création (étape « Peuple » de l'assistant)
 * et repris ici depuis le mode édition de la section « Identité ». Ils ne sont PAS des rangs de voie ;
 * on réutilise `FeatureChoiceField` (mode `edit`) et le même chemin de persistance que la section
 * « Voie » (`setFeatureChoice` via `onChange`), la fiche recalculant en direct.
 */
export function AncestryChoicesDialog({
  open,
  onClose,
  character,
  featureIds,
  onChange,
}: AncestryChoicesDialogProps) {
  const known = featureIds.filter((id) => featureById.has(id));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth data-glossary-shot="AncestryChoicesDialog">
      <DialogTitle>Choix du peuple</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {known.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Ce peuple n’a aucun choix d’identité à régler.
            </Typography>
          ) : (
            known.map((id) => (
              <FeatureChoiceField
                key={id}
                character={character}
                featureId={id}
                mode="edit"
                onChange={onChange}
              />
            ))
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
