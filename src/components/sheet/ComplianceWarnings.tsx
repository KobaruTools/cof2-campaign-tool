'use client';

import { useState } from 'react';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppAlert } from '@/components/AppAlert';
import { PageRefText } from '@/components/SourceRef';
import type { Warning } from '@/lib/engine';

export interface ComplianceWarningsProps {
  warnings: Warning[];
  /**
   * Contenu payant « Le Compagnon » (PER-321) encore en cours de chargement. Le temps
   * qu'il arrive (cache disque puis réseau), un peuple/une voie/une capacité payante
   * référencée par le personnage n'est pas encore dans les registres : les écarts
   * `UNKNOWN_FEATURE` qui en résultent sont alors de FAUX écarts, pas de vraies
   * corrections. On les masque et on affiche à la place un loader neutre.
   */
  paidContentPending?: boolean;
}

/** Liste à puces de messages d'avertissement/d'information. */
function WarningList({ warnings }: { warnings: Warning[] }) {
  return (
    <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
      {warnings.map((w, i) => (
        <Typography key={i} component="li" variant="body2">
          {/* Notion globale (PER-207) : « (p. N) » cité dans un message est rendu en puce de source. */}
          <PageRefText>{w.message}</PageRefText>
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
export function ComplianceWarnings({ warnings, paidContentPending = false }: ComplianceWarningsProps) {
  // Masquage ÉPHÉMÈRE des encadrés (croix en haut à droite) : réinitialisé au rechargement
  // de la page (non persisté entre sessions — les écarts reviennent au refresh, volontairement).
  const [hidden, setHidden] = useState({ deviations: false, infos: false });
  const pendingUnknownFeatures =
    paidContentPending && warnings.some((w) => w.code === 'UNKNOWN_FEATURE');
  const visibleWarnings = pendingUnknownFeatures
    ? warnings.filter((w) => w.code !== 'UNKNOWN_FEATURE')
    : warnings;
  if (visibleWarnings.length === 0 && !pendingUnknownFeatures) return null;
  const deviations = visibleWarnings.filter((w) => (w.severity ?? 'warning') === 'warning');
  const infos = visibleWarnings.filter((w) => w.severity === 'info');

  return (
    <Stack spacing={2}>
      {pendingUnknownFeatures && (
        <AppAlert
          severity="info"
          icon={<CircularProgress size={18} thickness={5} sx={{ color: 'text.secondary' }} />}
          sx={(theme) => ({
            bgcolor: alpha(theme.palette.text.primary, 0.06),
            borderColor: alpha(theme.palette.text.primary, 0.24),
            color: 'text.secondary',
          })}
        >
          Chargement en cours du contenu payant…
        </AppAlert>
      )}
      {deviations.length > 0 && !hidden.deviations && (
        <AppAlert
          severity="warning"
          onClose={() => setHidden((h) => ({ ...h, deviations: true }))}
          title={
            deviations.length === 1 ? '1 écart aux règles' : `${deviations.length} écarts aux règles`
          }
        >
          <WarningList warnings={deviations} />
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            Ces écarts n’empêchent pas la sauvegarde : règles maison et corrections sont autorisées.
          </Typography>
        </AppAlert>
      )}
      {infos.length > 0 && !hidden.infos && (
        <AppAlert
          severity="info"
          onClose={() => setHidden((h) => ({ ...h, infos: true }))}
          title={infos.length === 1 ? 'Information' : 'Informations'}
        >
          <WarningList warnings={infos} />
        </AppAlert>
      )}
    </Stack>
  );
}
