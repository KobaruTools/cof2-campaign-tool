'use client';

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import { cropImageToFile } from '@/lib/image/cropImage';
import { useHasTransparentBackground } from '@/lib/image/useHasTransparentBackground';
import type { PortraitCropRect } from '@/lib/storage/characterPortrait';

export interface PortraitImportDialogProps {
  /** Fichier à prévisualiser, déjà validé (format/taille) par l'appelant. `null` → modale fermée. */
  file: File | null;
  onCancel: () => void;
  /**
   * `file` est TOUJOURS l'image d'origine, jamais recadrée (PER-394 — seule la
   * zone `cropRect` porte le choix du joueur, cf. `characterPortrait.ts`).
   */
  onConfirm: (file: File, cropRect: PortraitCropRect) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

/** Taille des aperçus « Identité » et « En-tête » (PER-394) — ratio 2:3, cf. la
 * vraie taille (200×300) de la vignette en section Identité de la fiche ; ici
 * réduite pour tenir dans la modale à côté des deux aperçus carrés existants. */
const PORTRAIT_PREVIEW_WIDTH = 54;
const PORTRAIT_PREVIEW_HEIGHT = 81;

function toCropRect(area: Area | null): PortraitCropRect {
  if (!area) return { x: 0, y: 0, width: 1, height: 1 };
  return { x: area.x / 100, y: area.y / 100, width: area.width / 100, height: area.height / 100 };
}

/**
 * Modale d'aperçu intercalée entre le choix du fichier et son envoi (PER-390) — le
 * joueur voit l'image avant de la confirmer, avec un rappel du traitement automatique
 * (redimensionnement/compression déjà fait par `characterPortrait.ts`), et peut
 * recadrer l'image sur une zone carrée avant l'envoi (PER-392) — ce recadrage ne sert
 * qu'aux vignettes carrées/rectangulaires (carte, initiative, section Identité, cadre
 * d'en-tête) : l'image envoyée reste toujours l'originale non recadrée (PER-394), le
 * filigrane d'en-tête s'en sert telle quelle quand son fond est transparent.
 */
export function PortraitImportDialog({ file, onCancel, onConfirm }: PortraitImportDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [croppedAreaPercent, setCroppedAreaPercent] = useState<Area | null>(null);
  const [croppedPreviewUrl, setCroppedPreviewUrl] = useState<string | null>(null);

  // Fond réellement transparent (détouré) ou fond plein (photo) — détermine, comme
  // sur la fiche (`HeaderIllustrations`), si l'en-tête affichera un filigrane ou un
  // petit cadre bordé. Calculé sur l'ORIGINALE (`previewUrl`), jamais sur le recadrage.
  const isTransparent = useHasTransparentBackground(previewUrl ?? undefined);

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

  // Aperçus contextuels (PER-393) : reflète le résultat du recadrage aux formats carte
  // d'aperçu perso, bandeau d'initiative et section Identité, mis à jour à chaque geste
  // de recadrage/zoom terminé (même granularité que `croppedAreaPixels`, cf. `onCropComplete`).
  // Uniquement pour l'AFFICHAGE dans cette modale — l'envoi (`handleConfirm`) n'utilise
  // jamais ce fichier recadré, seulement `croppedAreaPercent`.
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
            <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', rowGap: 2 }}>
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
              <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
                <Box
                  component="img"
                  src={croppedPreviewUrl ?? previewUrl}
                  alt=""
                  aria-hidden
                  sx={{
                    width: PORTRAIT_PREVIEW_WIDTH,
                    height: PORTRAIT_PREVIEW_HEIGHT,
                    borderRadius: 1,
                    objectFit: 'cover',
                    objectPosition: 'top',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    bgcolor: 'rgba(255, 255, 255, 0.04)',
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  Identité
                </Typography>
              </Stack>
            </Stack>
          )}
          {previewUrl && (
            <Stack spacing={0.5}>
              {/* Aperçu du haut de la fiche (PER-394 retours) : pas une reproduction fidèle
                  (police, marges…), juste un squelette — texte factice + le VRAI traitement
                  (filigrane ou cadre) — pour que le résultat soit compréhensible quelle que
                  soit l'image, sans avoir à deviner à partir d'une vignette carrée. */}
              <Box
                sx={{
                  position: 'relative',
                  width: '100%',
                  minHeight: 100,
                  borderRadius: 2,
                  overflow: 'hidden',
                  p: 1.5,
                  bgcolor: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <Skeleton variant="text" width="55%" sx={{ fontSize: '1.15rem' }} />
                <Skeleton variant="text" width="35%" sx={{ fontSize: '0.85rem' }} />
                <Skeleton variant="rounded" width={100} height={26} sx={{ mt: 1 }} />
                {isTransparent ? (
                  <Box
                    component="img"
                    src={previewUrl}
                    alt=""
                    aria-hidden
                    sx={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      height: '170%',
                      width: 'auto',
                      opacity: 0.4,
                      pointerEvents: 'none',
                    }}
                  />
                ) : (
                  <Paper
                    variant="outlined"
                    sx={{ position: 'absolute', top: 8, right: 8, bottom: 8, width: 56, overflow: 'hidden' }}
                  >
                    <Box
                      component="img"
                      src={croppedPreviewUrl ?? previewUrl}
                      alt=""
                      aria-hidden
                      sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top' }}
                    />
                  </Paper>
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                En-tête de la fiche (aperçu approximatif)
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
