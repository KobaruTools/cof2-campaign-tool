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
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { classById, featureById, pathById, progression } from '@/data';
import type { Family, Feature } from '@/data/schema';
import { featureCost, maxHp } from '@/lib/engine';
import { familyHpGains } from '@/lib/character/hp';
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
import { groupFeaturesByPath, type FeatureGroup } from '@/components/sheet/FeaturesByPath';
import { FeatureLabel } from '@/components/FeatureLabel';
import { ClassIcon } from '@/components/ClassIcon';

export interface LevelUpDialogProps {
  open: boolean;
  character: Character;
  /** Famille du profil : sert au calcul du gain de PV (null si profil incomplet). */
  family: Family | undefined;
  onClose: () => void;
  /** Personnage promu à valider (niveau +1, capacités, historique). */
  onConfirm: (updated: Character) => void;
}

/** Une voie disponible et ses capacités acquérables : en-tête + accordéons. */
function AvailablePathGroup({
  group,
  color,
  remaining,
  onAdd,
}: {
  group: FeatureGroup;
  /** Teinte de la voie (profil), ou null pour une voie neutre (peuple/prestige). */
  color: string | null;
  remaining: number;
  onAdd: (featureId: string) => void;
}) {
  return (
    <Box>
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
                  <Chip label={`${cost} point${cost > 1 ? 's' : ''}`} size="small" color="default" />
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
                        onAdd(feature.id);
                      }}
                    >
                      Choisir
                    </Button>
                  </Box>
                </Tooltip>
              </AccordionSummary>
              <AccordionDetails>
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                  {feature.text}
                </Typography>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Box>
  );
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
  // Affichage des voies hors profil principal (profil hybride, p. 176) : masquées
  // par défaut pour ne pas noyer la montée de niveau classique — l'hybridation
  // est un choix délibéré (accord du MJ, cohérence narrative).
  const [showHybrid, setShowHybrid] = useState(false);
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

  // Une capacité « hybride à ouvrir » = rang 1 d'une voie de profil qui n'est ni
  // du profil principal ni déjà entamée. On peut toujours poursuivre une voie
  // hybride existante ; seule l'ouverture d'une nouvelle voie est masquable.
  const mainPathIds = new Set(classById.get(character.classId)?.pathIds ?? []);
  const startedPaths = new Set(
    working.featureIds.map((id) => featureById.get(id)?.pathId).filter((p): p is string => !!p),
  );
  const isNewHybridFeature = (f: Feature) => {
    const path = pathById.get(f.pathId);
    return !!path && path.type === 'class' && !mainPathIds.has(path.id) && !startedPaths.has(path.id);
  };
  const hasHybridOption = available.some(isNewHybridFeature);
  const visible = showHybrid ? available : available.filter((f) => !isNewHybridFeature(f));
  const availableGroups = groupFeaturesByPath(visible.map((f) => f.id));
  const pickedGroups = groupFeaturesByPath(picked);

  // Teinte d'une voie = couleur de SON profil (pas du profil principal) ;
  // neutre pour la voie de peuple et les voies de prestige.
  const pathColor = (path: FeatureGroup['path']): string | null => {
    if (!path || path.type !== 'class') return null;
    return classColor(mainPathIds.has(path.id) ? character.classId : path.classIds[0]);
  };

  // Ordre d'affichage des voies (priorités UX) :
  //  0 voie de peuple · 1 voies déjà entamées · 2 voies restantes du profil
  //  principal · 3 voies de prestige · 4 voies d'un autre profil (hybride).
  const groupCategory = (group: FeatureGroup): number => {
    const path = group.path;
    if (!path) return 4;
    if (path.type === 'ancestry' || path.type === 'mage') return 0;
    if (startedPaths.has(path.id)) return 1;
    if (path.type === 'class' && mainPathIds.has(path.id)) return 2;
    if (path.type === 'prestige') return 3;
    return 4;
  };
  const groupName = (g: FeatureGroup) => g.path?.name ?? g.pathId;

  // Voies des catégories 0-3, affichées à plat dans l'ordre de priorité.
  const flatGroups = availableGroups
    .filter((g) => groupCategory(g) < 4)
    .sort((a, b) => groupCategory(a) - groupCategory(b) || groupName(a).localeCompare(groupName(b)));

  // Voies hybrides (catégorie 4) regroupées par profil, pour les accordéons.
  const hybridByProfile = new Map<string, { classId: string; name: string; groups: FeatureGroup[] }>();
  for (const g of availableGroups) {
    if (groupCategory(g) !== 4 || g.path?.type !== 'class') continue;
    const classId = g.path.classIds[0];
    const entry = hybridByProfile.get(classId) ?? {
      classId,
      name: classById.get(classId)?.name ?? classId,
      groups: [],
    };
    entry.groups.push(g);
    hybridByProfile.set(classId, entry);
  }
  const hybridProfiles = [...hybridByProfile.values()].sort((a, b) => a.name.localeCompare(b.name));
  const hasAnyAvailable = flatGroups.length > 0 || hybridProfiles.length > 0;

  // Gain de PV du niveau : pour un profil hybride, il dépend de la famille des
  // capacités choisies ce niveau (moyenne des familles, p. 177). On simule
  // l'entrée d'historique du niveau en cours pour le calcul.
  const gainsBefore = familyHpGains(character, rulesContext);
  const gainsAfter = familyHpGains(
    {
      ...character,
      level: newLevel,
      levelUpHistory: [...character.levelUpHistory, { level: newLevel, chosenFeatureIds: picked }],
    },
    rulesContext,
  );
  const hpGain = family
    ? maxHp(newLevel, family, character.abilities.CON, {}, gainsAfter) -
      maxHp(character.level, family, character.abilities.CON, {}, gainsBefore)
    : null;

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

            {hasHybridOption && (
              <FormControlLabel
                sx={{ mb: 1 }}
                control={
                  <Switch
                    size="small"
                    checked={showHybrid}
                    onChange={(e) => setShowHybrid(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" color="text.secondary">
                    Voies d’autres profils (profil hybride — accord du MJ, p. 176)
                  </Typography>
                }
              />
            )}

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

            {!hasAnyAvailable ? (
              <Typography variant="body2" color="text.secondary">
                Aucune capacité supplémentaire disponible à ce niveau.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {flatGroups.map((group) => (
                  <AvailablePathGroup
                    key={group.pathId}
                    group={group}
                    color={pathColor(group.path)}
                    remaining={remaining}
                    onAdd={add}
                  />
                ))}

                {hybridProfiles.length > 0 && (
                  <Box>
                    <Typography variant="overline" color="text.secondary">
                      Autres profils (profil hybride)
                    </Typography>
                    <Stack spacing={1}>
                      {hybridProfiles.map((profile) => {
                        const color = classColor(profile.classId);
                        return (
                          <Accordion
                            key={profile.classId}
                            disableGutters
                            elevation={0}
                            sx={{
                              border: 1,
                              borderColor: 'divider',
                              borderLeft: 3,
                              borderLeftColor: color,
                              '&::before': { display: 'none' },
                            }}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <ClassIcon classId={profile.classId} size={20} />
                                <Typography variant="subtitle2" sx={{ fontWeight: 600, color }}>
                                  {profile.name}
                                </Typography>
                              </Stack>
                            </AccordionSummary>
                            <AccordionDetails>
                              <Stack spacing={2}>
                                {profile.groups.map((group) => (
                                  <AvailablePathGroup
                                    key={group.pathId}
                                    group={group}
                                    color={color}
                                    remaining={remaining}
                                    onAdd={add}
                                  />
                                ))}
                              </Stack>
                            </AccordionDetails>
                          </Accordion>
                        );
                      })}
                    </Stack>
                  </Box>
                )}
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
