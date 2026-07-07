'use client';

/**
 * Interrupteur « Animer le fond à la souris » — réglage d'affichage **par appareil**
 * (localStorage, cf. [[preferences]]), branché sur `usePreferencesStore`. Réutilisé
 * tel quel dans le pied de page global (`AppFooter`, donc disponible **sans compte**)
 * et dans « Réglages du compte » (`/account`) : les deux pilotent la même clé.
 *
 * Garde d'hydratation : tant que le store n'a pas relu localStorage, on affiche l'état
 * par défaut (activé) pour éviter un mismatch SSR ; l'interrupteur reste désactivé
 * (grisé) le temps de l'hydratation.
 */
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import { usePreferencesStore } from '@/stores/preferences';

export function BackgroundMotionToggle() {
  const animateBackground = usePreferencesStore((s) => s.animateBackground);
  const setAnimateBackground = usePreferencesStore((s) => s.setAnimateBackground);
  const hasHydrated = usePreferencesStore((s) => s.hasHydrated);

  return (
    <FormControlLabel
      control={
        <Switch
          size="small"
          checked={animateBackground}
          disabled={!hasHydrated}
          onChange={(e) => setAnimateBackground(e.target.checked)}
        />
      }
      label="Animer le fond à la souris"
      slotProps={{ typography: { variant: 'caption', color: 'text.secondary' } }}
      sx={{ ml: 0, color: 'text.secondary' }}
    />
  );
}
