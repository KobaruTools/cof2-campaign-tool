'use client';

/**
 * POSE d'un EFFET SITUATIONNEL À DURÉE CALCULÉE sur l'écran de MJ (PER-446).
 *
 * Un effet situationnel qui déclare `durationFrom` au catalogue (ex. Nuée de criquets, vermines r5
 * p. 175 : « [5 + CHA] rounds ») dure « une base + une caractéristique DU LANCEUR », pas de la victime
 * sur qui il vient d'être déposé. Le dépôt (`@dnd-kit`) ne connaît que la VICTIME visée ; cette fenêtre
 * ne s'ouvre qu'à la place de la pose directe pour demander QUI l'a lancé, parmi les personnages
 * réclamés qui possèdent la capacité — et PRÉ-REMPLIT la durée en tours d'après sa caractéristique,
 * jamais un calcul imposé : le MJ garde toujours la main pour la corriger ou l'effacer.
 *
 * Sans candidat (créature ou PNJ porteur, personne à la table ne possède la capacité), cette fenêtre
 * ne s'ouvre pas : l'effet se pose directement comme avant PER-446, durée tapée à la main via le badge
 * (`adjustStatusDuration`).
 */
import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { SourceRef } from '@/components/SourceRef';
import { statusEntry, situationalDurationRounds, STATUS_DURATION_MAX } from '@/lib/character/statusEffects';
import { statusLabel } from '@/lib/ui/statusPalette';
import type { SituationalEffectCaster } from '@/lib/character/situationalCasters';
import type { SituationalEffectId } from '@/data/schema';

export interface SituationalDurationDialogProps {
  open: boolean;
  onClose: () => void;
  /** Effet à poser (entrée de `SITUATIONAL_EFFECTS`). `null` = fenêtre fermée / rien à poser. */
  effectId: SituationalEffectId | null;
  /** Étiquette de la victime déjà visée par le dépôt (affichage seul, la cible n'est plus en jeu ici). */
  targetLabel: string;
  /** Personnages réclamés qui possèdent la capacité conférant cet effet. */
  candidates: readonly SituationalEffectCaster[];
  /** Pose effective : `rounds` pré-rempli mais modifiable, `castBy` = nom du lanceur choisi. */
  onApply: (options: { rounds?: number; castBy?: string }) => void;
}

export function SituationalDurationDialog({
  open,
  onClose,
  effectId,
  ...rest
}: SituationalDurationDialogProps) {
  return (
    <Dialog open={open && effectId !== null} onClose={onClose} fullWidth maxWidth="xs">
      {effectId !== null && <SituationalDurationForm effectId={effectId} onClose={onClose} {...rest} />}
    </Dialog>
  );
}

function SituationalDurationForm({
  onClose,
  effectId,
  targetLabel,
  candidates,
  onApply,
}: Omit<SituationalDurationDialogProps, 'open' | 'effectId'> & { effectId: SituationalEffectId }) {
  // Un seul candidat : pas d'ambiguïté, on le retient d'office (la durée se pré-remplit aussitôt).
  // Plusieurs : rien de présélectionné, au MJ de dire qui a lancé (même parti pris que la cible unique
  // d'un buff de groupe, `GroupBuffDialog`).
  const [casterId, setCasterId] = useState<string | undefined>(
    candidates.length === 1 ? candidates[0].id : undefined,
  );
  const [rounds, setRounds] = useState(() => {
    const caster = candidates.length === 1 ? candidates[0] : undefined;
    const prefilled = caster ? situationalDurationRounds(effectId, caster.abilities) : undefined;
    return prefilled === undefined ? '' : String(prefilled);
  });

  const entry = statusEntry(effectId);
  const label = statusLabel(effectId);
  const parsedRounds = Number.parseInt(rounds, 10);
  const validRounds = Number.isFinite(parsedRounds) && parsedRounds >= 1 ? parsedRounds : undefined;

  const selectCaster = (id: string) => {
    setCasterId(id);
    const caster = candidates.find((c) => c.id === id);
    const prefilled = caster ? situationalDurationRounds(effectId, caster.abilities) : undefined;
    setRounds(prefilled === undefined ? '' : String(prefilled));
  };

  const apply = () => {
    const castBy = candidates.find((c) => c.id === casterId)?.name;
    onApply({ ...(validRounds !== undefined ? { rounds: validRounds } : {}), ...(castBy ? { castBy } : {}) });
    onClose();
  };

  return (
    <>
      <DialogTitle sx={{ pb: 1 }}>{label}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {/* Verbatim du livre + renvoi de page : jamais de règle affichée sans sa source. */}
          {entry && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {entry.effect}
              </Typography>
              <SourceRef page={entry.sourcePage} term={label} />
            </Box>
          )}

          <Typography variant="body2" color="text.secondary">
            Sur {targetLabel}.
          </Typography>

          {candidates.length > 1 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Qui a lancé ?
              </Typography>
              <RadioGroup value={casterId ?? ''} onChange={(e) => selectCaster(e.target.value)}>
                {candidates.map((c) => (
                  <FormControlLabel
                    key={c.id}
                    value={c.id}
                    control={<Radio size="small" color="success" />}
                    label={<Typography variant="body2">{c.name}</Typography>}
                  />
                ))}
              </RadioGroup>
            </Box>
          )}

          <TextField
            label="Durée (tours)"
            type="number"
            size="small"
            value={rounds}
            onChange={(e) => setRounds(e.target.value)}
            slotProps={{ htmlInput: { min: 1, max: STATUS_DURATION_MAX } }}
            helperText="Pré-remplie d'après la caractéristique du lanceur ; à corriger ou effacer au besoin."
            sx={{ maxWidth: 220 }}
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          color="success"
          onClick={apply}
          disabled={candidates.length > 1 && casterId === undefined}
        >
          Appliquer
        </Button>
      </DialogActions>
    </>
  );
}
