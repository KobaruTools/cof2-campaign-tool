'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';

export interface PortraitImportDialogProps {
  /** Fichier à prévisualiser, déjà validé (format/taille) par l'appelant. `null` → modale fermée. */
  file: File | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

/**
 * Modale d'aperçu intercalée entre le choix du fichier et son envoi (PER-390) — le
 * joueur voit l'image avant de la confirmer, avec un rappel du traitement automatique
 * (redimensionnement/compression déjà fait par `characterPortrait.ts`).
 */
export function PortraitImportDialog({ file, onCancel, onConfirm }: PortraitImportDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  return (
    <Dialog open={file !== null} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Importer une image personnalisée</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {previewUrl && (
            <Box
              component="img"
              src={previewUrl}
              alt="Aperçu de l'image importée"
              sx={{
                width: '100%',
                maxHeight: 320,
                objectFit: 'contain',
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            />
          )}
          <Typography variant="body2" color="text.secondary">
            L'image sera automatiquement redimensionnée et compressée avant l'envoi — inutile de la
            préparer vous-même.
          </Typography>
          <AppAlert severity="info">
            Les fonds transparents (images détourées) ne sont pas encore détectés automatiquement :
            une image avec un fond plein s'affichera avec ce fond sur la fiche et l'écran de MJ.
          </AppAlert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Annuler</Button>
        <Button variant="contained" onClick={() => file && onConfirm(file)}>
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
