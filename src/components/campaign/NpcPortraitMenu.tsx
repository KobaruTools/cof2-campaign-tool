'use client';

/**
 * Menu d'illustration du PNJ (PER-437) — variante ALLÉGÉE de
 * `PortraitVariantMenu.tsx` : un PNJ n'a pas de profil/classe donc aucune
 * illustration statique de repli, seulement « Importer une image… » et
 * « Retirer l'image » (si une illustration existe déjà).
 */
import { useRef, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { AppTooltip } from '@/components/AppTooltip';
import { NpcPortraitImportDialog } from '@/components/campaign/NpcPortraitImportDialog';
import { NpcPortraitValidationError, validateNpcPortraitFile } from '@/lib/storage/npcPortrait';
import type { PortraitCropRect } from '@/lib/storage/characterPortrait';

export interface NpcPortraitMenuProps {
  /** `true` si le PNJ a déjà une illustration — affiche « Retirer l'image ». */
  hasPortrait: boolean;
  onSelectFile: (file: File, cropRect: PortraitCropRect) => void;
  onRemove: () => void;
  /** Grise tout le menu (PNJ pas encore créé — pas d'`id` à cibler dans le bucket). */
  disabled?: boolean;
  disabledReason?: string;
  /** Remplace l'icône par un spinner pendant un envoi/retrait en cours. */
  busy?: boolean;
  onValidationError?: (message: string | null) => void;
}

export function NpcPortraitMenu({
  hasPortrait,
  onSelectFile,
  onRemove,
  disabled,
  disabledReason,
  busy,
  onValidationError,
}: NpcPortraitMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const close = () => setAnchor(null);

  const button = (
    <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} disabled={disabled}>
      {busy ? <CircularProgress size={18} /> : <AddPhotoAlternateIcon />}
    </IconButton>
  );

  return (
    <>
      <AppTooltip title={disabled && disabledReason ? disabledReason : "Changer l'illustration du PNJ"}>
        <span data-glossary-shot="NpcPortraitMenu">{button}</span>
      </AppTooltip>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={close}>
        <MenuItem
          onClick={() => {
            close();
            fileInputRef.current?.click();
          }}
        >
          Importer une image…
        </MenuItem>
        {hasPortrait && (
          <MenuItem
            onClick={() => {
              close();
              onRemove();
            }}
          >
            Retirer l'image
          </MenuItem>
        )}
      </Menu>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            validateNpcPortraitFile(file);
          } catch (err) {
            onValidationError?.(
              err instanceof NpcPortraitValidationError ? err.message : 'Fichier refusé.',
            );
            return;
          }
          onValidationError?.(null);
          setPendingFile(file);
        }}
      />
      <NpcPortraitImportDialog
        file={pendingFile}
        onCancel={() => setPendingFile(null)}
        onConfirm={(file, cropRect) => {
          setPendingFile(null);
          onSelectFile(file, cropRect);
        }}
      />
    </>
  );
}
