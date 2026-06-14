'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { Warning } from '@/lib/engine';

export interface ComplianceWarningsProps {
  warnings: Warning[];
}

/** Liste à puces de messages d'avertissement/d'information. */
function WarningList({ warnings }: { warnings: Warning[] }) {
  return (
    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
      {warnings.map((w, i) => (
        <Typography key={i} component="li" variant="body2">
          {w.message}
        </Typography>
      ))}
    </Box>
  );
}

/**
 * Encadré d'avertissements de conformité (PER-47). Signale les écarts aux règles
 * officielles de façon visible mais NON bloquante : la fiche reste permissive
 * (règles maison, corrections). Les informations sur des choix pourtant légaux
 * (ex. profil hybride) sont présentées à part. Rien ne s'affiche quand tout est
 * conforme et sans information.
 */
export function ComplianceWarnings({ warnings }: ComplianceWarningsProps) {
  if (warnings.length === 0) return null;
  const deviations = warnings.filter((w) => (w.severity ?? 'warning') === 'warning');
  const infos = warnings.filter((w) => w.severity === 'info');

  return (
    <Stack spacing={2}>
      {deviations.length > 0 && (
        <Alert severity="warning" variant="outlined">
          <AlertTitle>
            {deviations.length === 1 ? '1 écart aux règles' : `${deviations.length} écarts aux règles`}
          </AlertTitle>
          <WarningList warnings={deviations} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Ces écarts n’empêchent pas la sauvegarde : règles maison et corrections sont autorisées.
          </Typography>
        </Alert>
      )}
      {infos.length > 0 && (
        <Alert severity="info" variant="outlined">
          <AlertTitle>{infos.length === 1 ? 'Information' : 'Informations'}</AlertTitle>
          <WarningList warnings={infos} />
        </Alert>
      )}
    </Stack>
  );
}
