'use client';

import Box from '@mui/material/Box';

/**
 * Modificateur constant signé (« +2 DEF », « −2 Init. ») pour une valeur déjà fixe et connue, sans
 * formule à résoudre (catalogues hors personnage : Codex montures/bardes, familiers fantastiques…).
 * Le NOMBRE reste en texte normal ; seul le LIBELLÉ de la stat (« DEF », « Init. ») est teinté en
 * ambre — même convention que la puce de stat dérivée du texte enrichi (`RefChip`, tone !== 'ability',
 * `FeatureRichText.tsx` : DEF/PV/jet d'attaque en ambre, distinct du bleu des formules).
 */
export function StatModifierTag({ value, label }: { value: number; label: string }) {
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'baseline',
        gap: 0.35,
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      <Box component="span" sx={{ color: 'text.primary' }}>
        {value >= 0 ? '+' : '−'}
        {Math.abs(value)}
      </Box>
      <Box component="span" sx={{ color: 'warning.main', fontWeight: 700 }}>
        {label}
      </Box>
    </Box>
  );
}
