'use client';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

/**
 * Modificateur constant signé (« +2 DEF », « −2 Init. »), même style d'encadré que l'« encadré
 * signé » d'une formule constante en texte enrichi de capacité (`FormulaTotal` de
 * `FeatureRichText.tsx`, patron Voies & Capacités) — en version plate, sans icône de stat : pour
 * une valeur déjà fixe et connue, sans formule à résoudre (catalogues hors personnage : Codex
 * montures/bardes, familiers fantastiques…).
 */
export function StatModifierTag({ value, label }: { value: number; label: string }) {
  return (
    <Box
      component="span"
      sx={(theme) => ({
        display: 'inline-flex',
        alignItems: 'center',
        minHeight: '22px',
        px: 0.6,
        lineHeight: 1,
        borderRadius: 1,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        bgcolor: alpha(theme.palette.primary.main, 0.1),
        border: 1,
        borderColor: alpha(theme.palette.primary.main, 0.35),
      })}
    >
      {value >= 0 ? '+' : '−'}
      {Math.abs(value)} {label}
    </Box>
  );
}
