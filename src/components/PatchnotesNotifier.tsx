'use client';

/**
 * Toast global de patch notes (PER-460), calqué sur le patron de
 * `CharacterSyncNotifier` (Snackbar + AppAlert). Compare le dernier id de
 * `src/data/patchnotes.json` à la dernière entrée vue en `localStorage` : si
 * une entrée plus récente existe, affiche un toast longue durée renvoyant
 * vers `/patchnotes` pour l'historique complet.
 *
 * PER-494 : au tout premier close (croix, « Voir tout » ou disparition auto),
 * une modale bloquante demande si l'utilisateur veut garder ces toasts ou ne
 * plus jamais les voir — choix mémorisé en localStorage
 * ([[usePatchnotesPrefsStore]]), sans repasser par la modale ensuite. Le même
 * réglage est exposé dans `/account` ([[PatchnotesNotificationsToggle]]).
 */
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import CloseIcon from '@mui/icons-material/Close';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import { AppAlert } from '@/components/AppAlert';
import { getLatestPatchnoteId, patchnotes } from '@/lib/patchnotes';
import { storageKeys } from '@/lib/storage/keys';
import { usePatchnotesPrefsStore } from '@/stores/patchnotesPrefs';

export function PatchnotesNotifier() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [choiceDialogOpen, setChoiceDialogOpen] = useState(false);

  const enabled = usePatchnotesPrefsStore((s) => s.enabled);
  const choiceMade = usePatchnotesPrefsStore((s) => s.choiceMade);
  const hasHydrated = usePatchnotesPrefsStore((s) => s.hasHydrated);
  const setEnabled = usePatchnotesPrefsStore((s) => s.setEnabled);

  useEffect(() => {
    // Attend la réhydratation pour ne jamais flasher le toast à quelqu'un qui
    // l'a désactivé sur cet appareil.
    if (!hasHydrated || !enabled) return;
    const latestId = getLatestPatchnoteId();
    if (latestId === 0) return;
    const seenRaw = window.localStorage.getItem(storageKeys.patchnotes.lastSeenId);
    const seenId = seenRaw ? Number(seenRaw) : 0;
    if (latestId > seenId) setOpen(true);
  }, [hasHydrated, enabled]);

  // Désactivé pendant que le toast est affiché (ex. via le switch du compte
  // ouvert dans un autre onglet) : on le referme immédiatement.
  useEffect(() => {
    if (!enabled) setOpen(false);
  }, [enabled]);

  const finalizeClose = useCallback(() => {
    setOpen(false);
    window.localStorage.setItem(storageKeys.patchnotes.lastSeenId, String(getLatestPatchnoteId()));
    if (!choiceMade) setChoiceDialogOpen(true);
  }, [choiceMade]);

  const handleSnackbarClose = useCallback(
    (_event: unknown, reason?: string) => {
      if (reason === 'clickaway') return;
      finalizeClose();
    },
    [finalizeClose],
  );

  const handleViewAll = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      finalizeClose();
      router.push('/patchnotes');
    },
    [finalizeClose, router],
  );

  if (patchnotes.length === 0) return null;
  const latest = patchnotes[patchnotes.length - 1];

  return (
    <>
      <Snackbar
        data-glossary-shot="PatchnotesNotifier"
        open={open}
        autoHideDuration={15000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <AppAlert
          severity="info"
          variant="filled"
          action={
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Button
                color="inherit"
                size="small"
                variant="outlined"
                onClick={handleViewAll}
                sx={{ whiteSpace: 'nowrap', borderColor: 'currentColor' }}
              >
                Voir tout
              </Button>
              <IconButton
                color="inherit"
                size="small"
                aria-label="Fermer"
                onClick={finalizeClose}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>
          }
          sx={{ width: '100%' }}
        >
          Nouveautés : {latest.items[0].text}
          {latest.items.length > 1 ? '…' : ''}
        </AppAlert>
      </Snackbar>

      {/* Choix forcé (PER-494) : pas d'`onClose`, donc ni backdrop ni Echap ne
          referment la modale — seuls les deux boutons ci-dessous le font. */}
      <Dialog open={choiceDialogOpen} maxWidth="xs" fullWidth>
        <DialogTitle>Garder les notifications de nouveautés ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tu peux continuer à voir un toast à chaque nouvelle mise à jour, ou ne plus
            jamais les voir. Tu pourras changer d’avis à tout moment dans les réglages du
            compte.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            color="inherit"
            onClick={() => {
              setEnabled(false);
              setChoiceDialogOpen(false);
            }}
          >
            Ne plus jamais les afficher
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              setEnabled(true);
              setChoiceDialogOpen(false);
            }}
          >
            Garder les annonces
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
