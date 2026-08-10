'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { AppAlert } from '@/components/AppAlert';
import { cropImageToFile } from '@/lib/image/cropImage';

export interface PortraitImportDialogProps {
  /** Fichier à prévisualiser, déjà validé (format/taille) par l'appelant. `null` → modale fermée. */
  file: File | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/**
 * Modale d'aperçu intercalée entre le choix du fichier et son envoi (PER-390) — le
 * joueur voit l'image avant de la confirmer, avec un rappel du traitement automatique
 * (redimensionnement/compression déjà fait par `characterPortrait.ts`), et peut
 * recadrer l'image sur une zone carrée avant l'envoi (PER-392).
 */
export function PortraitImportDialog({ file, onCancel, onConfirm }: PortraitImportDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Aperçus contextuels (PER-393) : reflète le résultat du recadrage au format carte
  // d'aperçu perso et au format bandeau d'initiative, mis à jour à chaque geste de
  // recadrage/zoom terminé (même granularité que `croppedAreaPixels`, cf. `onCropComplete`).
  useEffect(() => {
    if (!file || !croppedAreaPixels) {
      setCroppedPreviewUrl(null);
      return;
    }
    let url: string | null = null;
    let cancelled = false;
    cropImageToFile(file, croppedAreaPixels).then((cropped) => {
      if (cancelled) return;
      url = URL.createObjectURL(cropped);
      setCroppedPreviewUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [file, croppedAreaPixels]);

  const handleConfirm = async () => {
    if (!file) return;
    if (!croppedAreaPixels) {
      onConfirm(file);
      return;
    }
    const cropped = await cropImageToFile(file, croppedAreaPixels);
    onConfirm(cropped);
  };

  return (
    <Dialog open={file !== null} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>Importer une image personnalisée</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {previewUrl && (
            <Box
              sx={{
                position: 'relative',
                width: '100%',
                height: 280,
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <Cropper
                image={previewUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                restrictPosition
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, areaPixels) => setCroppedAreaPixels(areaPixels)}
              />
            </Box>
          )}
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ZoomInIcon fontSize="small" color="action" />
            <Slider
              value={zoom}
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              onChange={(_event, value) => setZoom(Array.isArray(value) ? value[0] : value)}
              aria-label="Zoom du recadrage"
            />
          </Stack>
          {previewUrl && (
            <Stack direction="row" spacing={3}>
              <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                <Box
                  component="img"
                  src={croppedPreviewUrl ?? previewUrl}
                  alt=""
                  aria-hidden
                  sx={{
                    width: 72,
                    height: 72,
                    borderRadius: 2,
                    objectFit: 'cover',
                    objectPosition: 'top',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Carte
                </Typography>
              </Stack>
              <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                <Box
                  component="img"
                  src={croppedPreviewUrl ?? previewUrl}
                  alt=""
                  aria-hidden
                  sx={{
                    width: 44,
                    height: 44,
                    borderTopLeftRadius: 6,
                    borderTopRightRadius: 6,
                    objectFit: 'cover',
                    objectPosition: 'top',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Ordre d&apos;initiative
                </Typography>
              </Stack>
            </Stack>
          )}
          <Typography variant="body2" color="text.secondary">
            Déplacez et zoomez pour cadrer l'image sur la zone carrée — elle sera ensuite
            automatiquement redimensionnée et compressée avant l'envoi.
          </Typography>
          <AppAlert severity="info">
            Les fonds transparents (images détourées) ne sont pas encore détectés automatiquement :
            une image avec un fond plein s'affichera avec ce fond sur la fiche et l'écran de MJ.
          </AppAlert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Annuler</Button>
        <Button variant="contained" onClick={handleConfirm}>
          Confirmer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
