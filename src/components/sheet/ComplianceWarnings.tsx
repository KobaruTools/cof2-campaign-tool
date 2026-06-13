'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { Warning } from '@/lib/engine';

export interface ComplianceWarningsProps {
  warnings: Warning[];
}

/**
 * Encadré d'avertissements de conformité (PER-47). Signale les écarts aux règles
 * officielles de façon visible mais NON bloquante : la fiche reste permissive
 * (règles maison, corrections). Rien ne s'affiche quand tout est conforme.
 */
export function ComplianceWarnings({ warnings }: ComplianceWarningsProps) {
  if (warnings.length === 0) return null;
  return (
    <Alert severity="warning" variant="outlined">
      <AlertTitle>
        {warnings.length === 1
          ? '1 écart aux règles'
          : `${warnings.length} écarts aux règles`}
      </AlertTitle>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {warnings.map((w, i) => (
          <Typography key={i} component="li" variant="body2">
            {w.message}
          </Typography>
        ))}
      </Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
        Ces écarts n’empêchent pas la sauvegarde : règles maison et corrections sont autorisées.
      </Typography>
    </Alert>
  );
}
