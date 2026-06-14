'use client';

import { useState } from 'react';
import UndoIcon from '@mui/icons-material/Undo';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { featureById, pathById } from '@/data';
import type { LevelUpEntry } from '@/lib/character/types';
import { FeatureLabel } from '@/components/FeatureLabel';

export interface LevelHistoryProps {
  history: LevelUpEntry[];
  /** Vrai si le dernier niveau peut être annulé (jamais la création). */
  canUndo: boolean;
  /** Annule le dernier niveau. */
  onUndo: () => void;
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
export function LevelHistory({ history, canUndo, onUndo }: LevelHistoryProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const entries = [...history].sort((a, b) => a.level - b.level);
  const lastLevel = entries[entries.length - 1]?.level;

  if (entries.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucune montée de niveau enregistrée.
      </Typography>
    );
  }

  const confirmUndo = () => {
    setConfirmOpen(false);
    onUndo();
  };

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
          {entry.chosenFeatureIds.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aucune capacité acquise à ce niveau.
            </Typography>
          ) : (
            <Stack spacing={0.5} sx={{ pl: 1.5, borderLeft: 3, borderColor: 'divider' }}>
              {entry.chosenFeatureIds.map((id) => (
                <HistoryFeature key={id} featureId={id} />
              ))}
            </Stack>
          )}
        </Box>
      ))}

      {canUndo && (
        <Box>
          <Button
            color="error"
            variant="outlined"
            size="small"
            startIcon={<UndoIcon />}
            onClick={() => setConfirmOpen(true)}
          >
            Annuler le niveau {lastLevel}
          </Button>
        </Box>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Annuler le niveau {lastLevel} ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Les capacités acquises au niveau {lastLevel} seront retirées et le personnage
            redescendra au niveau {lastLevel !== undefined ? lastLevel - 1 : ''}. Cette action est
            réversible en remontant de niveau.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Conserver</Button>
          <Button color="error" variant="contained" onClick={confirmUndo}>
            Annuler le niveau
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
