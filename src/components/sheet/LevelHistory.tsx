'use client';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { featureById, pathById } from '@/data';
import type { LevelUpEntry } from '@/lib/character/types';
import { ORPHAN_REWARD_LABEL } from '@/lib/character/orphanPoints';
import { FeatureLabel } from '@/components/FeatureLabel';
import { SourceRef } from '@/components/SourceRef';

export interface LevelHistoryProps {
  history: LevelUpEntry[];
}

/** Une capacité de l'historique : « Voie — Rang N — Nom » (id brut si inconnue). */
function HistoryFeature({ featureId }: { featureId: string }) {
  const feature = featureById.get(featureId);
  if (!feature) {
    return (
      <Typography variant="body2" color="text.secondary">
        {featureId}
      </Typography>
    );
  }
  const pathName = pathById.get(feature.pathId)?.name ?? feature.pathId;
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Chip label={`Rang ${feature.rank}`} size="small" variant="outlined" />
      <Typography variant="body2">
        <Box component="span" sx={{ color: 'text.secondary' }}>
          {pathName} —{' '}
        </Box>
        <FeatureLabel feature={feature} />
      </Typography>
    </Stack>
  );
}

/**
 * Historique des montées de niveau (PER-50) : ce qui a été choisi niveau par
 * niveau (« qu’ai-je pris au niveau 4 ? »), avec annulation du dernier niveau.
 */
export function LevelHistory({ history }: LevelHistoryProps) {
  const entries = [...history].sort((a, b) => a.level - b.level);

  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucune montée de niveau enregistrée.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      {entries.map((entry) => (
        <Box key={entry.level}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Niveau {entry.level}
            {entry.level === 1 && (
              <Typography component="span" variant="caption" color="text.secondary">
                {' '}
                (création)
              </Typography>
            )}
          </Typography>
          {entry.chosenFeatureIds.length === 0 &&
          !entry.orphanRewards?.length &&
          !entry.forgottenFeatureIds?.length &&
          entry.rolledHp === undefined ? (
            <Typography variant="body2" color="text.secondary">
              Aucune capacité acquise à ce niveau.
            </Typography>
          ) : (
            <Stack spacing={0.5} sx={{ pl: 1.5, borderLeft: 3, borderColor: 'divider' }}>
              {entry.chosenFeatureIds.map((id) => (
                <HistoryFeature key={id} featureId={id} />
              ))}
              {/* Capacité(s) oubliée(s) ce niveau via le changement d'orientation (p. 43) :
                  tracées pour expliciter la reconversion (et rendre l'undo transparent). */}
              {entry.forgottenFeatureIds?.map((id) => (
                <Stack
                  key={`forgotten-${id}`}
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center' }}
                >
                  <Chip label="Oubliée" size="small" color="secondary" variant="outlined" />
                  <Box sx={{ textDecoration: 'line-through', color: 'text.secondary' }}>
                    <HistoryFeature featureId={id} />
                  </Box>
                  <SourceRef page={43} />
                </Stack>
              ))}
              {/* Dé de vie lancé ce niveau (règle maison PER-87) : le jet saisi a remplacé
                  les PV fixes de la famille (la CON s'ajoute par-dessus). */}
              {entry.rolledHp !== undefined && (
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip label="Dé de vie" size="small" color="secondary" variant="outlined" />
                  <Typography variant="body2" color="text.secondary">
                    Jet de {entry.rolledHp} PV (règle maison)
                  </Typography>
                </Stack>
              )}
              {/* Point(s) de capacité orphelin(s) convertis ce niveau (p. 40) : tracés ici
                  pour que le bonus permanent soit explicite (et l'undo, transparent). */}
              {entry.orphanRewards?.map((reward, i) => (
                <Stack key={`orphan-${i}`} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                  <Chip label="Point orphelin" size="small" color="warning" variant="outlined" />
                  <Typography variant="body2" color="text.secondary">
                    {ORPHAN_REWARD_LABEL[reward]} <SourceRef page={40} />
                  </Typography>
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      ))}
    </Stack>
  );
}
