'use client';

/**
 * Interrupteur « Afficher les notifications de nouveautés » (PER-494) — réglage
 * par appareil (localStorage, cf. [[usePatchnotesPrefsStore]]), sur le même
 * patron que [[BackgroundMotionToggle]]. Réutilisé dans « Réglages du compte »
 * (`/account`) ; pilote la même clé que la modale de premier close du toast
 * `PatchnotesNotifier`, dans les deux sens.
 */
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { usePatchnotesPrefsStore } from '@/stores/patchnotesPrefs';

export function PatchnotesNotificationsToggle() {
  const enabled = usePatchnotesPrefsStore((s) => s.enabled);
  const setEnabled = usePatchnotesPrefsStore((s) => s.setEnabled);
  const hasHydrated = usePatchnotesPrefsStore((s) => s.hasHydrated);

  return (
    <FormControlLabel
      data-glossary-shot="PatchnotesNotificationsToggle"
      control={
        <Switch
          size="small"
          checked={enabled}
          disabled={!hasHydrated}
          onChange={(e) => setEnabled(e.target.checked)}
        />
      }
      label="Afficher les notifications de nouveautés"
      slotProps={{ typography: { variant: 'caption', color: 'text.secondary' } }}
      sx={{ ml: 0, color: 'text.secondary' }}
    />
  );
}
