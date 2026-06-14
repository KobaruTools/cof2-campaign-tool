'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { progression } from '@/data';
import type { Family } from '@/data/schema';
import { featureCost, maxHp } from '@/lib/engine';
import { rulesContext } from '@/lib/character/rulesContext';
import type { Character } from '@/lib/character/types';
import {
  acquirableFeatures,
  applyLevelUp,
  deselectFeature,
  FEATURE_POINTS_PER_LEVEL,
  totalFeatureCost,
} from '@/lib/character/levelUp';
import { classColor } from '@/lib/ui/classColors';
import { groupFeaturesByPath } from '@/components/sheet/FeaturesByPath';
import { FeatureLabel } from '@/components/FeatureLabel';

export interface LevelUpDialogProps {
  open: boolean;
  character: Character;
  /** Famille du profil : sert au calcul du gain de PV (null si profil incomplet). */
  family: Family | undefined;
  onClose: () => void;
  /** Personnage promu à valider (niveau +1, capacités, historique). */
  onConfirm: (updated: Character) => void;
}

/**
 * Mini-wizard bloquant de montée de niveau (PER-49). Applique les gains
 * automatiques (PV ; les attaques et autres stats dérivées sont recalculées
 * par le moteur depuis le niveau) et ne propose que des capacités légales —
 * la légalité par capacité est calculée par `canAcquireFeature` via
 * `acquirableFeatures`, en tenant compte des capacités déjà sélectionnées dans
 * cette même montée de niveau.
 */
export function LevelUpDialog({ open, character, family, onClose, onConfirm }: LevelUpDialogProps) {
  const [picked, setPicked] = useState<string[]>([]);
  const newLevel = character.level + 1;

  // Personnage « de travail » au nouveau niveau, capacités déjà choisies
  // incluses : c'est sur lui qu'on évalue la légalité du prochain choix (prendre
  // un rang 1 débloque le rang 2 si le niveau le permet, etc.).
  const working: Character = {
    ...character,
    level: newLevel,
    featureIds: [...character.featureIds, ...picked],
  };
  const available = acquirableFeatures(working, rulesContext);
  const availableGroups = groupFeaturesByPath(available.map((f) => f.id));
  const pickedGroups = groupFeaturesByPath(picked);

  const hpGain = family ? maxHp(newLevel, family, character.abilities.CON) - maxHp(character.level, family, character.abilities.CON) : null;

  // Budget de points de capacité du niveau (2 par niveau, p. 39). Un rang 1-2
  // coûte 1 point, un rang 3+ en coûte 2. On bloque tout dépassement.
  const budget = FEATURE_POINTS_PER_LEVEL;
  const spent = totalFeatureCost(picked, rulesContext);
  const remaining = budget - spent;

  const add = (featureId: string) => setPicked((prev) => [...prev, featureId]);
  const remove = (featureId: string) => setPicked((prev) => deselectFeature(prev, featureId));

  const close = () => {
    setPicked([]);
    onClose();
  };
  const confirm = () => {
    onConfirm(applyLevelUp(character, picked));
    setPicked([]);
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth>
      <DialogTitle>Montée au niveau {newLevel}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={3}>
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Gains automatiques
            </Typography>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <Chip label={`Niveau ${character.level} → ${newLevel}`} color="primary" size="small" />
              {hpGain !== null && <Chip label={`+${hpGain} PV max`} size="small" variant="outlined" />}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              Les valeurs d’attaque, la défense et les autres statistiques dérivées sont recalculées
              automatiquement à partir du niveau.
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Stack
              direction="row"
              spacing={1}
              sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
            >
              <Typography variant="subtitle2">Nouvelles capacités</Typography>
              <Chip
                label={`Points de capacité : ${remaining} / ${budget}`}
                color={remaining === 0 ? 'success' : 'primary'}
                size="small"
              />
            </Stack>

            {pickedGroups.length > 0 && (
              <Stack spacing={0.5} sx={{ mb: 2 }}>
                {pickedGroups.flatMap((group) =>
                  group.features.map((feature) => (
                    <Stack
                      key={feature.id}
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center' }}
                    >
                      <Chip label={`Rang ${feature.rank}`} size="small" variant="outlined" />
                      <Chip
                        label={`${featureCost(feature, progression)} pt${featureCost(feature, progression) > 1 ? 's' : ''}`}
                        size="small"
                      />
                      <Typography variant="body2" sx={{ flexGrow: 1 }}>
                        <Box component="span" sx={{ color: 'text.secondary' }}>
                          {group.path?.name ?? group.pathId} —{' '}
                        </Box>
                        <FeatureLabel feature={feature} />
                      </Typography>
                      <Tooltip title="Retirer ce choix" arrow>
                        <IconButton size="small" color="error" onClick={() => remove(feature.id)}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  )),
                )}
              </Stack>
            )}

            <Alert severity="info" sx={{ mb: 2 }}>
              Vous gagnez {budget} points de capacité à ce niveau (rang 1-2 : 1 point ; rang 3 et
              plus : 2 points). Seuls les choix légaux et abordables sont proposés.
              {remaining > 0 && spent > 0 && (
                <>
                  {' '}
                  Un point non dépensé peut être échangé contre 1 point de chance, 1 dé de
                  récupération, ou 2 PV/PM (point de capacité orphelin, p. 40).
                </>
              )}
            </Alert>

            {availableGroups.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Aucune capacité supplémentaire disponible à ce niveau.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {availableGroups.map((group) => {
                  const color = group.path?.type === 'class' ? classColor(character.classId) : null;
                  return (
                    <Box key={group.pathId}>
                      <Typography
                        variant="subtitle2"
                        sx={{
                          fontWeight: 600,
                          color: color ?? 'text.primary',
                          borderLeft: 3,
                          borderColor: color ?? 'divider',
                          pl: 1.5,
                          mb: 0.5,
                        }}
                      >
                        {group.path?.name ?? group.pathId}
                      </Typography>
                      <Stack spacing={0.5}>
                        {group.features.map((feature) => {
                          const cost = featureCost(feature, progression);
                          const tooExpensive = cost > remaining;
                          return (
                          <Accordion
                            key={feature.id}
                            disableGutters
                            elevation={0}
                            sx={{
                              border: 1,
                              borderColor: 'divider',
                              bgcolor: color ? alpha(color, 0.06) : 'transparent',
                              '&::before': { display: 'none' },
                            }}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ alignItems: 'center', flexWrap: 'wrap', flexGrow: 1 }}
                              >
                                <Chip
                                  label={`Rang ${feature.rank}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{ fontWeight: 600 }}
                                />
                                <Chip
                                  label={`${cost} point${cost > 1 ? 's' : ''}`}
                                  size="small"
                                  color="default"
                                />
                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                  <FeatureLabel feature={feature} />
                                </Typography>
                              </Stack>
                              <Tooltip
                                title={
                                  tooExpensive
                                    ? `Coût ${cost} points — il vous reste ${remaining} point${remaining > 1 ? 's' : ''}`
                                    : ''
                                }
                                arrow
                              >
                                <Box component="span" sx={{ mr: 1, flexShrink: 0 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    startIcon={<AddIcon />}
                                    component="span"
                                    disabled={tooExpensive}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      add(feature.id);
                                    }}
                                  >
                                    Choisir
                                  </Button>
                                </Box>
                              </Tooltip>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ whiteSpace: 'pre-line' }}
                              >
                                {feature.text}
                              </Typography>
                            </AccordionDetails>
                          </Accordion>
                          );
                        })}
                      </Stack>
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Annuler</Button>
        <Button variant="contained" onClick={confirm}>
          Valider le niveau {newLevel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
