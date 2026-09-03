'use client';

/**
 * Toast global de patch notes (PER-460), calqué sur le patron de
 * `CharacterSyncNotifier` (Snackbar + AppAlert). Compare le dernier id de
 * `src/data/patchnotes.json` à la dernière entrée vue en `localStorage` : si
 * une entrée plus récente existe, affiche un toast longue durée renvoyant
 * vers `/patchnotes` pour l'historique complet.
 */
import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import { AppAlert } from '@/components/AppAlert';
import { getLatestPatchnoteId, patchnotes } from '@/lib/patchnotes';
import { storageKeys } from '@/lib/storage/keys';

export function PatchnotesNotifier() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const latestId = getLatestPatchnoteId();
    if (latestId === 0) return;
    const seenRaw = window.localStorage.getItem(storageKeys.patchnotes.lastSeenId);
    const seenId = seenRaw ? Number(seenRaw) : 0;
    if (latestId > seenId) setOpen(true);
  }, []);

  const handleClose = () => {
    setOpen(false);
    window.localStorage.setItem(storageKeys.patchnotes.lastSeenId, String(getLatestPatchnoteId()));
  };

  if (patchnotes.length === 0) return null;
  const latest = patchnotes[patchnotes.length - 1];

  return (
    <Snackbar
      data-glossary-shot="PatchnotesNotifier"
      open={open}
      autoHideDuration={15000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <AppAlert
        severity="info"
        variant="filled"
        onClose={handleClose}
        action={
          <Button color="inherit" size="small" href="/patchnotes">
            Voir tout
          </Button>
        }
        sx={{ width: '100%' }}
      >
        Nouveautés : {latest.items[0]}
        {latest.items.length > 1 ? '…' : ''}
      </AppAlert>
    </Snackbar>
  );
}
