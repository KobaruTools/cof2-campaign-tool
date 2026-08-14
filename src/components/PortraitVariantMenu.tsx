'use client';

import { useRef, useState } from 'react';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import type { PortraitVariant, StaticPortraitVariant } from '@/lib/character/types';
import { classPortraitExtras } from '@/data/classPortraitOptions';
import { AppTooltip } from '@/components/AppTooltip';
import { PortraitImportDialog } from '@/components/PortraitImportDialog';
import {
  PortraitValidationError,
  validatePortraitFile,
  type PortraitCropRect,
} from '@/lib/storage/characterPortrait';

export interface PortraitVariantMenuProps {
  /** Variante actuelle, pour cocher (`selected`) le choix courant dans le menu. */
  variant: PortraitVariant;
  /** Profil du personnage — détermine les illustrations supplémentaires disponibles (au-delà d'Illustration 1/2). */
  classId: string;
  onSelectStatic: (variant: StaticPortraitVariant) => void;
  /**
   * Fichier CONFIRMÉ par l'utilisateur (après aperçu) — envoi/mise en attente restent à
   * l'appelant. `file` est TOUJOURS l'image d'origine (PER-394) ; `cropRect` porte le
   * choix de recadrage carré du joueur.
   */
  onSelectFile: (file: File, cropRect: PortraitCropRect) => void;
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
 * Menu de l'illustration de profil (PER-383) — « Image personnalisée » en tête
 * (mise en avant), puis Illustration 1/2 (toujours présentes) et les
 * illustrations supplémentaires du profil s'il y en a (`classPortraitExtras`,
 * variable selon le profil — 0 à 4 de plus). UI pure, sans accès réseau. Un
 * fichier choisi est validé (`validatePortraitFile`) puis proposé en aperçu
 * dans `PortraitImportDialog` (PER-390) ; `onSelectFile` n'est appelé
 * qu'à la confirmation, à l'appelant de décider s'il l'envoie immédiatement
 * (fiche) ou le met en attente (wizard, tant que le personnage n'existe pas
 * encore en DB). Réutilisé identique par la fiche et l'étape « Identité » du
 * wizard de création.
 */
export function PortraitVariantMenu({
  variant,
  classId,
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
  const extras = classPortraitExtras(classId);

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
        {disabledCustom && disabledCustomReason ? (
          <AppTooltip title={disabledCustomReason}>
            <span>{customItem}</span>
          </AppTooltip>
        ) : (
          customItem
        )}
        <Divider />
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
        {extras.map((extra, i) => (
          <MenuItem
            key={extra.variant}
            selected={variant === extra.variant}
            onClick={() => {
              close();
              onSelectStatic(extra.variant);
            }}
          >
            {extra.name ?? `Illustration ${i + 3}`}
          </MenuItem>
        ))}
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
        onConfirm={(file, cropRect) => {
          setPendingFile(null);
          onSelectFile(file, cropRect);
        }}
      />
    </>
  );
}
