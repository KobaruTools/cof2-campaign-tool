'use client';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, type Theme } from '@mui/material/styles';
import type { Warning } from '@/lib/engine';

export interface ComplianceWarningsProps {
  warnings: Warning[];
}

/**
 * Verre dépoli teinté pour les encadrés d'alerte : fond dérivé de la couleur dédiée
 * à la sévérité (plus foncé, semi-transparent) + flou de l'arrière-plan, même idiome
 * que les sections de la fiche et les infobulles. La bordure et le texte colorés du
 * variant `outlined` restent visibles par-dessus.
 */
const frostedAlertSx = (severity: 'warning' | 'info') => (theme: Theme) => ({
  bgcolor: alpha(theme.palette[severity].dark, 0.22),
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  // Cadre moins criard : on remplace la bordure vive (`main`) par la variante
  // plus sombre de la sévérité, adoucie.
  borderColor: alpha(theme.palette[severity].dark, 0.6),
});

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
        <Alert severity="warning" variant="outlined" sx={frostedAlertSx('warning')}>
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
        <Alert severity="info" variant="outlined" sx={frostedAlertSx('info')}>
          <AlertTitle>{infos.length === 1 ? 'Information' : 'Informations'}</AlertTitle>
          <WarningList warnings={infos} />
        </Alert>
      )}
    </Stack>
  );
}
