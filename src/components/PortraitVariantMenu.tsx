'use client';

import { useRef, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import type { PortraitVariant } from '@/lib/character/types';
import { AppTooltip } from '@/components/AppTooltip';
import { PortraitImportDialog } from '@/components/PortraitImportDialog';
import { PortraitValidationError, validatePortraitFile } from '@/lib/storage/characterPortrait';

export interface PortraitVariantMenuProps {
  /** Variante actuelle, pour cocher (`selected`) le choix courant dans le menu. */
  variant: PortraitVariant;
  onSelectStatic: (variant: 'default' | 'alt') => void;
  /** Fichier CONFIRMÉ par l'utilisateur (après aperçu) — envoi/mise en attente restent à l'appelant. */
  onSelectFile: (file: File) => void;
  /** Grise « Image personnalisée… » (ex. personnage pas encore synchronisé avec le cloud). */
  disabledCustom?: boolean;
  /** Motif affiché en infobulle quand `disabledCustom`. */
  disabledCustomReason?: string;
  /** Remplace l'icône par un spinner pendant un envoi en cours. */
  busy?: boolean;
  /** Erreur de validation (format/taille) — `null` pour l'effacer, ex. avant une nouvelle sélection. */
  onValidationError?: (message: string | null) => void;
}

/**
 * Menu à 3 choix pour l'illustration de profil (PER-383) — UI pure, sans accès
 * réseau. Un fichier choisi est validé (`validatePortraitFile`) puis proposé en
 * aperçu dans `PortraitImportDialog` (PER-390) ; `onSelectFile` n'est appelé
 * qu'à la confirmation, à l'appelant de décider s'il l'envoie immédiatement
 * (fiche) ou le met en attente (wizard, tant que le personnage n'existe pas
 * encore en DB). Réutilisé identique par la fiche et l'étape « Identité » du
 * wizard de création.
 */
export function PortraitVariantMenu({
  variant,
  onSelectStatic,
  onSelectFile,
  disabledCustom,
  disabledCustomReason,
  busy,
  onValidationError,
}: PortraitVariantMenuProps) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const close = () => setAnchor(null);

  const customItem = (
    <MenuItem
      selected={variant === 'custom'}
      disabled={disabledCustom}
      onClick={() => {
        close();
        fileInputRef.current?.click();
      }}
    >
      Image personnalisée…
    </MenuItem>
  );

  return (
    <>
      <AppTooltip title="Changer l’illustration du profil">
        <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)}>
          {busy ? <CircularProgress size={18} /> : <AddPhotoAlternateIcon />}
        </IconButton>
      </AppTooltip>
      <Menu anchorEl={anchor} open={anchor !== null} onClose={close}>
        <MenuItem
          selected={variant === 'default'}
          onClick={() => {
            close();
            onSelectStatic('default');
          }}
        >
          Illustration 1
        </MenuItem>
        <MenuItem
          selected={variant === 'alt'}
          onClick={() => {
            close();
            onSelectStatic('alt');
          }}
        >
          Illustration 2
        </MenuItem>
        {disabledCustom && disabledCustomReason ? (
          <AppTooltip title={disabledCustomReason}>
            <span>{customItem}</span>
          </AppTooltip>
        ) : (
          customItem
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
            validatePortraitFile(file);
          } catch (err) {
            onValidationError?.(
              err instanceof PortraitValidationError ? err.message : 'Fichier refusé.',
            );
            return;
          }
          onValidationError?.(null);
          setPendingFile(file);
        }}
      />
      <PortraitImportDialog
        file={pendingFile}
        onCancel={() => setPendingFile(null)}
        onConfirm={(file) => {
          setPendingFile(null);
          onSelectFile(file);
        }}
      />
    </>
  );
}
