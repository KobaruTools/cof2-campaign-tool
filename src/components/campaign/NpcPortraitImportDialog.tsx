'use client';

/**
 * Modale d'aperçu + recadrage de l'illustration de PNJ (PER-437) — variante
 * ALLÉGÉE de `PortraitImportDialog.tsx` (portrait de personnage) : un seul
 * aperçu contextuel (la carte PNJ du tiroir MJ), pas les trois contextes
 * fiche personnage (carte/initiative/identité/en-tête) qui n'existent pas
 * pour un PNJ — aucun écran joueur n'affiche encore les PNJ (hors périmètre
 * de ce ticket).
 */
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
import { cropImageToFile } from '@/lib/image/cropImage';
import type { PortraitCropRect } from '@/lib/storage/characterPortrait';

export interface NpcPortraitImportDialogProps {
  /** Fichier à prévisualiser, déjà validé (format/taille) par l'appelant. `null` → modale fermée. */
  file: File | null;
  onCancel: () => void;
  /** `file` est TOUJOURS l'image d'origine, jamais recadrée — seule `cropRect` porte le choix du MJ. */
  onConfirm: (file: File, cropRect: PortraitCropRect) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function toCropRect(area: Area | null): PortraitCropRect {
  if (!area) return { x: 0, y: 0, width: 1, height: 1 };
  return { x: area.x / 100, y: area.y / 100, width: area.width / 100, height: area.height / 100 };
}

export function NpcPortraitImportDialog({ file, onCancel, onConfirm }: NpcPortraitImportDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<Area | null>(null);
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
    setCroppedAreaPercent(null);
    return () => URL.revokeObjectURL(url);
  }, [file]);

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

  const handleConfirm = () => {
    if (!file) return;
    onConfirm(file, toCropRect(croppedAreaPercent));
  };

  return (
    <Dialog
      open={file !== null}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      data-glossary-shot="NpcPortraitImportDialog"
    >
      <DialogTitle>Importer une illustration de PNJ</DialogTitle>
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
                onCropComplete={(area, areaPixels) => {
                  setCroppedAreaPixels(areaPixels);
                  setCroppedAreaPercent(area);
                }}
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
                Carte PNJ
              </Typography>
            </Stack>
          )}
          <Typography variant="body2" color="text.secondary">
            Déplacez et zoomez pour cadrer l'image sur la zone carrée — elle sera ensuite
            automatiquement redimensionnée et compressée avant l'envoi.
          </Typography>
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
