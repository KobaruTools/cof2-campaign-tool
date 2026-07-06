'use client';

import { useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WorkspacePremiumOutlinedIcon from '@mui/icons-material/WorkspacePremiumOutlined';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import GlobalStyles from '@mui/material/GlobalStyles';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { classById, featureById, pathById, progression } from '@/data';
import type { Family, Feature } from '@/data/schema';
import { featureCost, maxHp, minLevelForRank } from '@/lib/engine';
import { familyHpGains } from '@/lib/character/hp';
import { rulesContext } from '@/lib/character/rulesContext';
import { effectiveClassPathIds } from '@/lib/character/classDisplay';
import type { Character, FeatureChoiceSelection, OrphanReward } from '@/lib/character/types';
import { ORPHAN_REWARD_LABEL } from '@/lib/character/orphanPoints';
import {
  acquirableFeatures,
  applyLevelUp,
  deselectFeature,
  FEATURE_POINTS_PER_LEVEL,
  forgettableFeatures,
  maxRetrainings,
  totalFeatureCost,
} from '@/lib/character/levelUp';
import {
  pruneEffectInputs,
  pruneEffectToggles,
  pruneUsageCounters,
} from '@/lib/character/effects';
import {
  eligibleDivineHostPaths,
  hasActionableChoice,
  hasUnmadeChoice,
  pendingDivineAcquisition,
  priestDivineSlot,
  pruneFeatureChoices,
  setFeatureChoice,
  type PendingDivine,
} from '@/lib/character/choices';
import { classColor } from '@/lib/ui/classColors';
import { AppTooltip } from '@/components/AppTooltip';
import { SourceRef } from '@/components/SourceRef';
import { groupFeaturesByPath, type FeatureGroup } from '@/components/sheet/FeaturesByPath';
import { FeaturePathAutocomplete } from '@/components/sheet/FeaturePathAutocomplete';
import { RichInline } from '@/components/sheet/FeatureRichText';
import { FeatureChoiceField } from '@/components/sheet/FeatureChoiceField';
import { FeatureLabel } from '@/components/FeatureLabel';
import { ClassIcon } from '@/components/ClassIcon';

/**
 * Custom property + keyframes pour la bordure animée du cadre des capacités
 * sélectionnées. `@property` (typé `<angle>`) rend le `conic-gradient(from …)`
 * animable de façon fluide : la bordure reste PLEINE, seule sa couleur tourne.
 * Injecté globalement (dédupliqué par MUI) — impossible à déclarer dans un `sx`.
 */
const BORDER_ANGLE_STYLES = `
  @property --pathBorderAngle {
    syntax: '<angle>';
    inherits: false;
    initial-value: 0deg;
  }
  @keyframes pathBorderRotate {
    to { --pathBorderAngle: 360deg; }
  }
`;

export interface LevelUpDialogProps {
  open: boolean;
  character: Character;
  /** Famille du profil : sert au calcul du gain de PV (null si profil incomplet). */
  family: Family | undefined;
  /**
   * Autorisation EFFECTIVE des armes à feu (règle campagne ∧ choix perso, PER-185).
   * Distribue la bonne variante d'arquebusier au level-up (explosifs ↔ maître des
   * arbalètes). Défaut = snapshot du personnage (fiche sans campagne résolue).
   */
  firearmsAllowed?: boolean;
  onClose: () => void;
  /** Personnage promu à valider (niveau +1, capacités, historique). */
  onConfirm: (updated: Character) => void;
}

/** Une voie disponible et ses capacités acquérables : en-tête + accordéons. */
/** Rang « sauté » d'une voie : capacité détenue ailleurs (divine) que l'on ne peut
 *  reprendre, affichée grisée à sa place dans l'arbre de la voie. */
interface SkippedRank {
  rank: number;
  feature: Feature;
  /** Nom de la voie d'accueil où la capacité est réellement logée (info-bulle). */
  hostPathName?: string;
}

function AvailablePathGroup({
  group,
  color,
  remaining,
  lockAll,
  skipped,
  onAdd,
}: {
  group: FeatureGroup;
  /** Teinte de la voie (profil), ou null pour une voie neutre (peuple/prestige). */
  color: string | null;
  remaining: number;
  /**
   * Verrou global : tant que la capacité divine prioritaire (rang ≥ 2) n'est pas
   * prise, TOUTES les capacités sont grisées et leur bouton désactivé (priorité
   * absolue, p. 122). La fiche permissive permet ensuite tout ajustement manuel.
   */
  lockAll: boolean;
  /**
   * Rang « sauté » de cette voie (détenu via la capacité divine, logée ailleurs) :
   * affiché grisé à sa place, et le rang juste au-dessus porte une indication de
   * skip. `undefined` = pas de skip dans cette voie.
   */
  skipped?: SkippedRank;
  onAdd: (featureId: string) => void;
}) {
  // Capacités acquérables + le rang sauté (grisé), intercalés dans l'ordre des rangs.
  const rows: { feature: Feature; kind: 'acquirable' | 'skipped' }[] = group.features.map(
    (feature) => ({ feature, kind: 'acquirable' as const }),
  );
  if (skipped && !group.features.some((f) => f.id === skipped.feature.id)) {
    rows.push({ feature: skipped.feature, kind: 'skipped' });
  }
  rows.sort((a, b) => a.feature.rank - b.feature.rank);

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
        {rows.map(({ feature, kind }) => {
          if (kind === 'skipped') {
            return (
              <Box
                key={feature.id}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderStyle: 'dashed',
                  borderRadius: 1,
                  px: 1.5,
                  py: 1,
                  opacity: 0.55,
                  filter: 'grayscale(0.4)',
                }}
              >
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip
                    label={`Rang ${feature.rank}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    <FeatureLabel feature={feature} />
                  </Typography>
                  <AppTooltip
                    page={122}
                    title={
                      skipped?.hostPathName
                        ? `Détenue via la capacité divine (logée dans « ${skipped.hostPathName} ») — rang sauté`
                        : 'Détenue via la capacité divine — rang sauté'
                    }
                  >
                    <Chip label="✦ Détenu (capacité divine) — rang sauté" size="small" />
                  </AppTooltip>
                </Stack>
              </Box>
            );
          }
          const cost = featureCost(feature, progression);
          const tooExpensive = cost > remaining;
          const locked = lockAll;
          const disabled = tooExpensive || locked;
          const afterSkip = !!skipped && feature.rank === skipped.rank + 1;
          return (
            <Accordion
              key={feature.id}
              disableGutters
              elevation={0}
              sx={{
                border: 1,
                borderColor: 'divider',
                bgcolor: color ? alpha(color, 0.06) : (theme) => alpha(theme.palette.text.primary, 0.04),
                opacity: locked ? 0.5 : 1,
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
                  {afterSkip && (
                    <AppTooltip
                      page={122}
                      title={`Rang ${skipped!.rank} détenu via la capacité divine : ce rang est accessible directement (skip)`}
                    >
                      <Chip
                        label={`Après saut du rang ${skipped!.rank}`}
                        size="small"
                        color="secondary"
                        variant="outlined"
                      />
                    </AppTooltip>
                  )}
                </Stack>
                <AppTooltip
                  page={locked ? 122 : undefined}
                  title={
                    locked
                      ? 'Capacité divine à choisir d’abord (priorité absolue)'
                      : tooExpensive
                        ? `Coût ${cost} points — il vous reste ${remaining} point${remaining > 1 ? 's' : ''}`
                        : ''
                  }
                >
                  <Box component="span" sx={{ mr: 1, flexShrink: 0 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      component="span"
                      disabled={disabled}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAdd(feature.id);
                      }}
                    >
                      Choisir
                    </Button>
                  </Box>
                </AppTooltip>
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
 * Carte dédiée d'acquisition de la capacité divine (prêtre spécialiste, divine de
 * rang ≥ 2) au level-up. Affichée en tête des nouvelles capacités, en priorité
 * absolue (p. 122). Le joueur désigne la VOIE D'ACCUEIL (une voie de prêtre dont le
 * rang précédent est acquis et le slot du rang de la divine est libre) ; la divine
 * vient occuper ce slot, la capacité native de ce rang étant « perdue ».
 */
function DivineAcquisitionCard({
  pending,
  hosts,
  host,
  picked,
  remaining,
  onHostChange,
  onAdd,
  onRemove,
}: {
  pending: PendingDivine;
  hosts: { id: string; name: string }[];
  host: string | null;
  picked: boolean;
  remaining: number;
  onHostChange: (pathId: string) => void;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const divine = pending.feature;
  const cost = featureCost(divine, progression);
  const originPath = pathById.get(divine.pathId);
  const originClassId = originPath?.type === 'class' ? originPath.classIds[0] : undefined;
  const originColor = originClassId ? classColor(originClassId) : undefined;
  const originClassName = originClassId ? classById.get(originClassId)?.name : undefined;
  const accent = originColor ?? '#9c27b0';
  const replacedNative = host ? featureById.get(`${host}-r${divine.rank}`) : undefined;
  const tooExpensive = cost > remaining;
  const canAdd = !!host && !tooExpensive;

  return (
    <Box
      sx={{
        position: 'relative',
        border: 2,
        borderColor: accent,
        borderRadius: 1,
        bgcolor: alpha(accent, 0.06),
        p: 1.5,
        mb: 2,
      }}
    >
      <Typography
        variant="overline"
        sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: accent, fontWeight: 700, lineHeight: 1.4 }}
      >
        ✦ Capacité divine — à acquérir en priorité
      </Typography>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 0.5 }}>
        <Chip label={`Rang ${divine.rank}`} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
        <Chip label={`${cost} point${cost > 1 ? 's' : ''}`} size="small" />
        {originClassId && <ClassIcon classId={originClassId} size={20} />}
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          <FeatureLabel feature={divine} />
        </Typography>
        {originClassName && (
          <Typography variant="caption" sx={{ color: originColor ?? 'text.secondary' }}>
            ({originClassName})
          </Typography>
        )}
      </Stack>

      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line', mt: 1 }}>
        {divine.text}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1.5 }}>
        <FormControl size="small" sx={{ minWidth: 220 }} disabled={picked || hosts.length === 0}>
          <InputLabel id="divine-host-label">Voie d’accueil</InputLabel>
          <Select
            labelId="divine-host-label"
            label="Voie d’accueil"
            value={host ?? ''}
            onChange={(e) => onHostChange(e.target.value)}
          >
            {hosts.map((h) => (
              <MenuItem key={h.id} value={h.id}>
                {h.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {!picked ? (
          <AppTooltip
            title={
              hosts.length === 0
                ? 'Aucune voie de prêtre éligible pour accueillir la capacité divine à ce niveau'
                : !host
                  ? 'Choisissez d’abord une voie d’accueil'
                  : tooExpensive
                    ? `Coût ${cost} point${cost > 1 ? 's' : ''} — il vous reste ${remaining}`
                    : ''
            }
          >
            <Box component="span">
              <Button
                size="small"
                variant="contained"
                startIcon={<AddIcon />}
                disabled={!canAdd}
                onClick={onAdd}
                sx={{ bgcolor: accent, '&:hover': { bgcolor: accent } }}
              >
                Choisir
              </Button>
            </Box>
          </AppTooltip>
        ) : (
          <AppTooltip title="Retirer la capacité divine">
            <IconButton size="small" color="error" onClick={onRemove}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        )}
      </Stack>

      {replacedNative && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
          Remplacera : <FeatureLabel feature={replacedNative} /> (rang {divine.rank} de la voie d’accueil)
        </Typography>
      )}
    </Box>
  );
}

/**
 * Solde de points de capacité du niveau, en badge custom (≠ Chip MUI, cf. `DefenseBadge`) :
 * posé dans la barre d'actions pour désencombrer le corps du dialog. Affiche les points
 * DÉPENSÉS sur le budget (« 1 / 2 » = 1 dépensé sur 2) ; le détail des règles passe en
 * infobulle. Vert quand l'obligation de dépense est satisfaite, sinon accent primaire.
 */
function FeaturePointsBadge({
  spent,
  budget,
  satisfied,
}: {
  spent: number;
  budget: number;
  satisfied: boolean;
}) {
  const paletteKey = satisfied ? 'success' : 'primary';
  return (
    <AppTooltip
      title={`Vous gagnez ${budget} points de capacité à ce niveau (rang 1-2 : 1 point ; rang 3 et plus : 2 points). Tous les points doivent être dépensés ; un point qui ne peut plus rien acheter se convertit en bonus permanent (p. 40).`}
    >
      <Box
        sx={(theme) => ({
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.75,
          height: 28,
          px: 1.25,
          borderRadius: 1,
          cursor: 'help',
          fontSize: '0.8rem',
          whiteSpace: 'nowrap',
          fontVariantNumeric: 'tabular-nums',
          color: theme.palette[paletteKey].main,
          bgcolor: alpha(theme.palette[paletteKey].main, 0.12),
          border: `1px solid ${alpha(theme.palette[paletteKey].main, 0.45)}`,
        })}
      >
        <WorkspacePremiumOutlinedIcon sx={{ fontSize: 16 }} />
        <Box component="span" sx={{ opacity: 0.9 }}>Points dépensés</Box>
        <Box component="span" sx={{ fontWeight: 700 }}>
          {spent} / {budget}
        </Box>
      </Box>
    </AppTooltip>
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
export function LevelUpDialog({
  open,
  character,
  family,
  firearmsAllowed = character.firearmsAllowed,
  onClose,
  onConfirm,
}: LevelUpDialogProps) {
  const [picked, setPicked] = useState<string[]>([]);
  // Choix portés par les capacités sélectionnées ce niveau (PER-66/68), à
  // résoudre avant validation (doctrine wizard : bloquant).
  const [pickedChoices, setPickedChoices] = useState<Record<string, FeatureChoiceSelection[]>>({});
  // Affichage des voies hors profil principal (profil hybride, p. 176) : masquées
  // par défaut pour ne pas noyer la montée de niveau classique — l'hybridation
  // est un choix délibéré (accord du MJ, cohérence narrative).
  const [showHybrid, setShowHybrid] = useState(false);
  // Voie d'accueil choisie pour la capacité divine d'un prêtre spécialiste (divine
  // de rang ≥ 2 acquise à ce niveau, p. 122). null tant que non désignée.
  const [divineHost, setDivineHost] = useState<string | null>(null);
  // Conversion du point de capacité orphelin (p. 40). Un seul point peut être
  // orphelin (il l'est quand il reste seul) → un unique choix. '' = laissé non dépensé.
  const [orphanReward, setOrphanReward] = useState<OrphanReward | ''>('');
  // Surcharge manuelle d'ouverture du bloc orphelin (null = suit l'état « point
  // réellement indépensable », qui ouvre le bloc d'office — cf. `forcedOrphan`).
  const [orphanExpanded, setOrphanExpanded] = useState<boolean | null>(null);
  // Changement d'orientation (p. 43) : capacités oubliées ce niveau et leur
  // remplacement (id oublié → id de remplacement). Échange à budget neutre,
  // distinct des points de capacité du niveau ; opt-in via un accordéon replié.
  const [forgotten, setForgotten] = useState<string[]>([]);
  const [retrainReplacement, setRetrainReplacement] = useState<Record<string, string>>({});
  const newLevel = character.level + 1;
  // Ids des remplacements retenus (une capacité reprise par capacité oubliée).
  const replacementIds = forgotten
    .map((id) => retrainReplacement[id])
    .filter((id): id is string => !!id);
  // Voies dont un rang a été oublié ce niveau (changement d'orientation, p. 43) : le
  // joueur s'en éloigne, on ne propose donc plus leur rang suivant — ni comme achat
  // normal, ni comme remplacement. Non verrouillé : reprenable à un niveau ultérieur.
  const forgottenPathIds = new Set(
    forgotten.map((id) => featureById.get(id)?.pathId).filter((p): p is string => !!p),
  );

  // Capacité divine restant à acquérir (prêtre spécialiste, divine de rang ≥ 2) et
  // accessibilité au nouveau niveau. La divine est en priorité absolue (p. 122).
  const pendingDivine = pendingDivineAcquisition(character);
  const divineAccessible =
    !!pendingDivine && newLevel >= minLevelForRank(pendingDivine.rank, family, progression);
  const divinePicked = !!pendingDivine && picked.includes(pendingDivine.feature.id);

  // Personnage « de travail » au nouveau niveau, capacités déjà choisies
  // incluses : c'est sur lui qu'on évalue la légalité du prochain choix (prendre
  // un rang 1 débloque le rang 2 si le niveau le permet, etc.). Quand la divine est
  // prise, on renseigne sa voie d'accueil pour que la progression la rattache au bon
  // slot (la voie d'accueil avance, la voie d'origine n'est pas « entamée »).
  const working: Character = {
    ...character,
    level: newLevel,
    // Capacités oubliées retirées (changement d'orientation, p. 43), puis capacités
    // achetées et remplacements ajoutés : la légalité se recalcule sur cet état.
    featureIds: [
      ...character.featureIds.filter((id) => !forgotten.includes(id)),
      ...picked,
      ...replacementIds,
    ],
    // Choix déjà résolus dans cette montée de niveau, pour la résolution du
    // domaine (ex. `same-family`) et l'état « choix à faire ».
    featureChoices: { ...character.featureChoices, ...pickedChoices },
    priestVocation:
      divinePicked && divineHost && character.priestVocation?.mode === 'specialist'
        ? { ...character.priestVocation, hostPathId: divineHost }
        : character.priestVocation,
  };
  // Capacités acquérables ce niveau, PRIVÉES des voies abandonnées (leur rang suivant
  // ne doit pas être re-sélectionnable après un oubli — sinon on rachèterait ce qu'on
  // vient d'abandonner). L'exclusion vaut aussi pour la liste normale, pas seulement
  // pour les remplacements.
  const available = acquirableFeatures(working, rulesContext, firearmsAllowed).filter(
    (f) => !forgottenPathIds.has(f.pathId),
  );

  // Voies de prêtre éligibles comme voie d'accueil de la divine (rang précédent
  // acquis, slot du rang de la divine libre). Calculé sur `working` (tient compte
  // d'une voie ouverte ce même niveau).
  const divineHosts = pendingDivine
    ? eligibleDivineHostPaths(working, pendingDivine.rank).map((p) => ({ id: p.id, name: p.name }))
    : [];
  // Verrou global : tant que la divine accessible n'est pas prise, on grise TOUS les
  // autres choix (priorité absolue, p. 122) — la fiche reste éditable librement.
  const divineLock = !!pendingDivine && divineAccessible && !divinePicked;

  // Capacité divine DÉJÀ acquise (ce niveau ou un précédent) : son rang natif est
  // « sauté » dans sa voie d'origine (elle est logée dans la voie d'accueil). On
  // l'affiche grisée à sa place et on signale le skip sur le rang juste au-dessus.
  const acquiredSlot = priestDivineSlot(working);
  const divineSkipFeature = acquiredSlot ? featureById.get(acquiredSlot.featureId) : undefined;
  const divineSkipPathId = divineSkipFeature?.pathId;
  const divineSkipHostName = acquiredSlot ? pathById.get(acquiredSlot.hostPathId)?.name : undefined;
  const skippedFor = (g: FeatureGroup): SkippedRank | undefined =>
    acquiredSlot && divineSkipFeature && g.pathId === divineSkipPathId
      ? { rank: acquiredSlot.rank, feature: divineSkipFeature, hostPathName: divineSkipHostName }
      : undefined;

  // Une capacité « hybride à ouvrir » = rang 1 d'une voie de profil qui n'est ni
  // du profil principal ni déjà entamée. On peut toujours poursuivre une voie
  // hybride existante ; seule l'ouverture d'une nouvelle voie est masquable.
  // La capacité divine est EXCLUE : emprunter une capacité d'un autre profil (p. 122)
  // n'est pas de l'hybridation, donc sa voie d'origine n'est « entamée » que si on en
  // a pris le rang 1 NATIF (sinon elle resterait masquée derrière « Voies d'autres
  // profils », comme toute voie hybride non encore ouverte).
  const characterClassForPaths = classById.get(character.classId);
  const mainPathIds = new Set(
    characterClassForPaths
      ? effectiveClassPathIds(characterClassForPaths, firearmsAllowed)
      : [],
  );
  const divineFeatureId = acquiredSlot?.featureId;
  const startedPaths = new Set(
    working.featureIds
      .filter((id) => id !== divineFeatureId)
      .map((id) => featureById.get(id)?.pathId)
      .filter((p): p is string => !!p),
  );
  const isNewHybridFeature = (f: Feature) => {
    const path = pathById.get(f.pathId);
    return !!path && path.type === 'class' && !mainPathIds.has(path.id) && !startedPaths.has(path.id);
  };
  const hasHybridOption = available.some(isNewHybridFeature);
  const visible = showHybrid ? available : available.filter((f) => !isNewHybridFeature(f));
  const availableGroups = groupFeaturesByPath(visible.map((f) => f.id));
  // La divine prise est présentée dans sa carte dédiée, pas dans la liste « choisies ».
  const pickedNonDivine = pendingDivine
    ? picked.filter((id) => id !== pendingDivine.feature.id)
    : picked;
  const pickedGroups = groupFeaturesByPath(pickedNonDivine);

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

  // Voies des catégories 0-2 (peuple, entamées, profil principal), affichées à
  // plat dans l'ordre de priorité.
  const flatGroups = availableGroups
    .filter((g) => groupCategory(g) < 3)
    .sort((a, b) => groupCategory(a) - groupCategory(b) || groupName(a).localeCompare(groupName(b)));

  // Voies de prestige (catégorie 3) réunies dans un accordéon dédié, comme les
  // voies d'autres profils en hybride — un choix délibéré qu'on ne déploie qu'au
  // besoin pour ne pas noyer la montée de niveau classique.
  const prestigeGroups = availableGroups
    .filter((g) => groupCategory(g) === 3)
    .sort((a, b) => groupName(a).localeCompare(groupName(b)));

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
  const hasAnyAvailable =
    flatGroups.length > 0 || prestigeGroups.length > 0 || hybridProfiles.length > 0;

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

  // Point RÉELLEMENT orphelin (cas de base, p. 40) : il reste au moins un point mais
  // aucune capacité acquérable ne coûte assez peu pour être achetée (il ne reste que
  // du rang 3+, à 2 points). Le point ne peut alors pas être dépensé en capacité → on
  // déplie le bloc d'office pour inviter à le convertir. Distinct du choix VOLONTAIRE
  // de ne pas hybrider (règle maison), qui laisse le bloc replié par défaut.
  const forcedOrphan =
    remaining > 0 && !available.some((f) => featureCost(f, progression) <= remaining);
  const orphanOpen = orphanExpanded ?? forcedOrphan;

  // Changement d'orientation (p. 43). Quota : 1 oubli, ou 2 si INT ≥ +2. On calcule
  // les capacités oubliables sur le personnage PRIVÉ des oublis déjà retenus, pour
  // révéler le rang inférieur d'une voie une fois son rang supérieur oublié (LIFO).
  // La capacité divine (empruntée, logée dans une voie d'accueil, p. 122) est exclue :
  // l'oublier casserait le rattachement de vocation.
  const retrainMax = maxRetrainings(character);
  const charAfterForgets: Character = {
    ...character,
    featureIds: character.featureIds.filter((id) => !forgotten.includes(id)),
  };
  const forgettable = forgettableFeatures(charAfterForgets).filter(
    (f) => f.id !== divineFeatureId,
  );
  // La section n'apparaît que hors verrou divin (priorité absolue, p. 122) et s'il y
  // a matière à reconvertir.
  const retrainAvailable = !divineLock && (forgettable.length > 0 || forgotten.length > 0);

  // Remplacements légaux proposés pour une capacité oubliée : capacités acquérables
  // sur le personnage de travail PRIVÉ du remplacement de CE slot (pour que le choix
  // courant reste sélectionnable), les autres remplacements restant pris en compte.
  // On écarte les voies abandonnées ce niveau (`forgottenPathIds`) ; le regroupement/tri
  // par voie est assuré par `FeaturePathAutocomplete`.
  const replacementOptionsFor = (forgottenId: string): string[] => {
    const others = forgotten
      .filter((id) => id !== forgottenId)
      .map((id) => retrainReplacement[id])
      .filter((id): id is string => !!id);
    const slotWorking: Character = {
      ...working,
      featureIds: [
        ...character.featureIds.filter((id) => !forgotten.includes(id)),
        ...picked,
        ...others,
      ],
    };
    return acquirableFeatures(slotWorking, rulesContext, firearmsAllowed)
      .filter((f) => !forgottenPathIds.has(f.pathId))
      .map((f) => f.id);
  };

  const add = (featureId: string) => setPicked((prev) => [...prev, featureId]);
  const addDivine = () => {
    if (!pendingDivine || !divineHost) return;
    setPicked((prev) => (prev.includes(pendingDivine.feature.id) ? prev : [...prev, pendingDivine.feature.id]));
  };
  const removeDivine = () => {
    if (!pendingDivine) return;
    setPicked((prev) => prev.filter((id) => id !== pendingDivine.feature.id));
  };
  const remove = (featureId: string) =>
    setPicked((prev) => {
      const next = deselectFeature(prev, featureId);
      // Élague les choix des capacités désélectionnées (deselectFeature peut en
      // retirer plusieurs : rangs supérieurs de la même voie).
      setPickedChoices((pc) => pruneFeatureChoices(pc, next));
      return next;
    });
  const setChoice = (featureId: string, index: number, value: FeatureChoiceSelection) =>
    setPickedChoices((pc) =>
      setFeatureChoice({ ...working, featureChoices: pc }, featureId, index, value),
    );

  // Oublie une capacité (changement d'orientation, p. 43), sans dépasser le quota.
  // Un remplacement déjà retenu qui poursuivrait la voie désormais abandonnée devient
  // caduc → on le retire (et on élague son choix orphelin).
  const addForget = (featureId: string) => {
    const abandonedPath = featureById.get(featureId)?.pathId;
    setForgotten((prev) =>
      prev.includes(featureId) || prev.length >= retrainMax ? prev : [...prev, featureId],
    );
    if (!abandonedPath) return;
    // Un achat normal de la voie désormais abandonnée n'a plus lieu d'être : on le retire.
    setPicked((prev) => prev.filter((id) => featureById.get(id)?.pathId !== abandonedPath));
    // Idem pour un remplacement déjà retenu qui poursuivrait cette voie.
    setRetrainReplacement((prev) => {
      const next: Record<string, string> = {};
      for (const [slot, repId] of Object.entries(prev)) {
        if (featureById.get(repId)?.pathId !== abandonedPath) next[slot] = repId;
      }
      return next;
    });
    // Élague les choix des capacités retirées ci-dessus (achats + remplacements de la voie).
    setPickedChoices((pc) =>
      pruneFeatureChoices(
        pc,
        Object.keys(pc).filter((id) => featureById.get(id)?.pathId !== abandonedPath),
      ),
    );
  };
  // Annule un oubli : retire aussi son remplacement et élague le choix devenu orphelin.
  const removeForget = (featureId: string) =>
    setForgotten((prev) => {
      const next = prev.filter((id) => id !== featureId);
      setRetrainReplacement((rr) => {
        const rest = { ...rr };
        delete rest[featureId];
        const keep = [...picked, ...next.map((id) => rest[id]).filter(Boolean)] as string[];
        setPickedChoices((pc) => pruneFeatureChoices(pc, keep));
        return rest;
      });
      return next;
    });
  // Désigne le remplacement d'une capacité oubliée ; élague le choix de l'ancien.
  const setReplacement = (forgottenId: string, replacementId: string) =>
    setRetrainReplacement((prev) => {
      const next = { ...prev, [forgottenId]: replacementId };
      const keep = [...picked, ...forgotten.map((id) => next[id]).filter(Boolean)] as string[];
      setPickedChoices((pc) => pruneFeatureChoices(pc, keep));
      return next;
    });

  // Bloquant : toute capacité choisie portant un choix doit l'avoir résolu — capacités
  // achetées comme capacités reprises par changement d'orientation.
  const choicesPending = [...picked, ...replacementIds].some((id) => hasUnmadeChoice(working, id));
  // Bloquant : tous les points de capacité doivent être dépensés. Exception unique — un
  // point RÉELLEMENT indépensable (`forcedOrphan`, p. 40) : plus aucune capacité abordable,
  // il se convertit alors en bonus permanent et ne bloque pas la validation.
  const pointsUnspent = remaining > 0 && !forcedOrphan;

  // Point orphelin effectivement converti (p. 40) : seulement s'il reste au moins un
  // point non dépensé et qu'une récompense a été choisie.
  const orphanRewardsToApply: OrphanReward[] = remaining > 0 && orphanReward ? [orphanReward] : [];

  const resetState = () => {
    setPicked([]);
    setPickedChoices({});
    setDivineHost(null);
    setOrphanReward('');
    setOrphanExpanded(null);
    setForgotten([]);
    setRetrainReplacement({});
  };
  const close = () => {
    resetState();
    onClose();
  };
  const confirm = () => {
    // Capacités acquises ce niveau = achats + remplacements du changement
    // d'orientation ; les oubliées sont retirées par `applyLevelUp` et journalisées.
    const chosen = [...picked, ...replacementIds];
    const leveled = applyLevelUp(character, chosen, orphanRewardsToApply, forgotten);
    // Capacité divine prise ce niveau : on persiste sa voie d'accueil sur la vocation
    // (la progression rattache alors la divine à ce slot, p. 122).
    const withVocation =
      divinePicked && divineHost && leveled.priestVocation?.mode === 'specialist'
        ? { ...leveled, priestVocation: { ...leveled.priestVocation, hostPathId: divineHost } }
        : leveled;
    // Élague tous les états portés par une capacité désormais absente (les oubliées) :
    // choix, interrupteurs, saisies libres et compteurs d'usages.
    onConfirm({
      ...withVocation,
      featureChoices: pruneFeatureChoices(
        { ...withVocation.featureChoices, ...pickedChoices },
        withVocation.featureIds,
      ),
      effectToggles: pruneEffectToggles(withVocation.effectToggles, withVocation.featureIds),
      effectInputs: pruneEffectInputs(withVocation.effectInputs, withVocation.featureIds),
      usageCounters: pruneUsageCounters(withVocation.usageCounters, withVocation.featureIds),
    });
    resetState();
  };

  return (
    <>
      <GlobalStyles styles={BORDER_ANGLE_STYLES} />
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
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Nouvelles capacités
            </Typography>

            {pendingDivine && divineAccessible && (
              <DivineAcquisitionCard
                pending={pendingDivine}
                hosts={divineHosts}
                host={divineHost}
                picked={divinePicked}
                remaining={remaining}
                onHostChange={setDivineHost}
                onAdd={addDivine}
                onRemove={removeDivine}
              />
            )}

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
                    Voies d’autres profils (profil hybride — accord du MJ, <SourceRef page={176} />)
                  </Typography>
                }
              />
            )}

            {pickedGroups.length > 0 && (
              // Cadre mis en avant : bordure PLEINE dont la couleur (dégradé blanc/gris)
              // tourne lentement, sans jamais être coupée. Le dégradé conique remplit
              // toujours toute la bordure (technique padding-box/border-box) ; seule
              // l'orientation `--pathBorderAngle` s'anime → rotation fluide, pas de
              // rotation géométrique (donc pas de coins « vides »).
              <Box
                sx={(theme) => ({
                  mb: 2,
                  p: 1.5,
                  borderRadius: 1.5,
                  border: '2px solid transparent',
                  background: `linear-gradient(${theme.palette.background.paper}, ${theme.palette.background.paper}) padding-box, conic-gradient(from var(--pathBorderAngle), #ffffff, #6b7280, #ffffff) border-box`,
                  animation: 'pathBorderRotate 30s linear infinite',
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                })}
              >
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ display: 'block', lineHeight: 1.4, mb: 0.5 }}
                >
                  Capacités sélectionnées
                </Typography>
                <Stack spacing={1}>
                    {pickedGroups.flatMap((group) => {
                      const color = pathColor(group.path);
                      return group.features.map((feature) => (
                        <Box key={feature.id}>
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                          >
                            <Chip label={`Rang ${feature.rank}`} size="small" variant="outlined" />
                            <Chip
                              label={`${featureCost(feature, progression)} pt${featureCost(feature, progression) > 1 ? 's' : ''}`}
                              size="small"
                            />
                            {/* Capacité retenue mise en avant, teintée de la couleur de sa voie. */}
                            <Box
                              component="span"
                              sx={{
                                flexGrow: 1,
                                display: 'inline-flex',
                                alignItems: 'baseline',
                                gap: 0.5,
                                px: 1,
                                py: 0.375,
                                borderRadius: 1,
                                border: 1,
                                borderColor: color ?? 'divider',
                                bgcolor: color ? alpha(color, 0.14) : 'action.hover',
                              }}
                            >
                              <Box
                                component="span"
                                sx={{ color: 'text.secondary', fontSize: '0.72rem' }}
                              >
                                {group.path?.name ?? group.pathId} —
                              </Box>
                              <Box
                                component="span"
                                sx={{ color: color ?? 'text.primary', fontWeight: 700 }}
                              >
                                <FeatureLabel feature={feature} />
                              </Box>
                            </Box>
                            <AppTooltip title="Retirer ce choix">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => remove(feature.id)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </AppTooltip>
                          </Stack>
                          {/* Choix porté par la capacité : à résoudre (bloquant). Masqué tant
                              qu'aucun choix n'est actionnable (ex. répétable sans palier). */}
                          {hasActionableChoice(working, feature.id) && (
                            <Box sx={{ mt: 1, pl: 1 }}>
                              <FeatureChoiceField
                                character={working}
                                featureId={feature.id}
                                mode="edit"
                                blocking
                                onChange={setChoice}
                              />
                            </Box>
                          )}
                        </Box>
                      ));
                    })}
                  </Stack>
              </Box>
            )}

            <Divider sx={{ my: 2 }} />

            {remaining > 0 && (
              <Accordion
                disableGutters
                elevation={0}
                expanded={orphanOpen}
                onChange={(_, exp) => setOrphanExpanded(exp)}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 2,
                  bgcolor: (t) => alpha(t.palette.warning.main, 0.06),
                  '&::before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Point de capacité orphelin (<SourceRef page={40} />)
                    </Typography>
                    {forcedOrphan && !orphanReward && (
                      <Chip
                        size="small"
                        color="warning"
                        label="Point indépensable — à convertir"
                      />
                    )}
                    {orphanReward && (
                      <Chip
                        size="small"
                        color="warning"
                        variant="outlined"
                        label={ORPHAN_REWARD_LABEL[orphanReward]}
                      />
                    )}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    component="div"
                    sx={{ mb: 1.5, whiteSpace: 'pre-line' }}
                  >
                    <RichInline
                      text="Un point de capacité non dépensé peut être échangé contre +1 point de chance, +1 dé de récupération, +2 PV ou +2 PM (bonus permanent). Laissez « non dépensé » pour le perdre."
                      abilities={character.abilities}
                      level={newLevel}
                      rank={1}
                    />
                  </Typography>
                  <FormControl size="small" fullWidth>
                    <InputLabel id="orphan-reward">Point de capacité orphelin</InputLabel>
                    <Select
                      labelId="orphan-reward"
                      label="Point de capacité orphelin"
                      value={orphanReward}
                      onChange={(e) => setOrphanReward(e.target.value as OrphanReward | '')}
                    >
                      <MenuItem value="">
                        <em>Non dépensé (perdu)</em>
                      </MenuItem>
                      {(Object.keys(ORPHAN_REWARD_LABEL) as OrphanReward[]).map((r) => (
                        <MenuItem key={r} value={r}>
                          {ORPHAN_REWARD_LABEL[r]}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </AccordionDetails>
              </Accordion>
            )}

            {/* Changement d'orientation (p. 43) : option discrète, repliée par défaut, pour
                oublier une capacité et la reprendre autrement. Masquée sous verrou divin. */}
            {retrainAvailable && (
              <Accordion
                disableGutters
                elevation={0}
                sx={{
                  border: 1,
                  borderColor: 'divider',
                  borderRadius: 1,
                  mb: 2,
                  '&::before': { display: 'none' },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <AutorenewIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      Changement d’orientation (<SourceRef page={43} />)
                    </Typography>
                    {forgotten.length > 0 && (
                      <Chip
                        size="small"
                        color="secondary"
                        variant="outlined"
                        label={`Reconversions : ${forgotten.length} / ${retrainMax}`}
                      />
                    )}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    Vous pouvez oublier une capacité déjà acquise pour la remplacer par une autre,
                    en suivant les règles normales de progression — un échange sans coût en points
                    de capacité.
                    {retrainMax > 1
                      ? ' Avec une INT ≥ +2, jusqu’à deux reconversions par niveau.'
                      : ''}
                  </Typography>

                  <Box sx={{ mb: forgotten.length > 0 ? 2 : 0 }}>
                    <FeaturePathAutocomplete
                      label={
                        forgotten.length >= retrainMax
                          ? 'Quota de reconversions atteint'
                          : forgettable.length === 0
                            ? 'Aucune capacité oubliable'
                            : 'Oublier une capacité…'
                      }
                      options={forgettable.map((f) => f.id)}
                      value={null}
                      clearOnSelect
                      disabled={forgotten.length >= retrainMax || forgettable.length === 0}
                      onChange={(id) => id && addForget(id)}
                    />
                  </Box>

                  <Stack spacing={1.5}>
                    {forgotten.map((forgottenId) => {
                      const forgottenFeature = featureById.get(forgottenId);
                      const replacementOptions = replacementOptionsFor(forgottenId);
                      const replacementId = retrainReplacement[forgottenId] ?? '';
                      // Valeur clampée aux options courantes (une reconversion sur une autre
                      // voie a pu rendre caduc un remplacement précédent).
                      const replacementValue = replacementOptions.includes(replacementId)
                        ? replacementId
                        : null;
                      return (
                        <Box
                          key={forgottenId}
                          sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 1.5 }}
                        >
                          <Stack
                            direction="row"
                            spacing={1}
                            sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                          >
                            <Chip size="small" color="secondary" variant="outlined" label="Oubliée" />
                            {forgottenFeature && (
                              <Typography
                                variant="body2"
                                sx={{ flexGrow: 1, color: 'text.secondary' }}
                              >
                                <Box component="span">
                                  {pathById.get(forgottenFeature.pathId)?.name ??
                                    forgottenFeature.pathId}{' '}
                                  —{' '}
                                </Box>
                                <Box component="span" sx={{ textDecoration: 'line-through' }}>
                                  <FeatureLabel feature={forgottenFeature} />
                                </Box>
                              </Typography>
                            )}
                            <AppTooltip title="Annuler cet oubli">
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => removeForget(forgottenId)}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </AppTooltip>
                          </Stack>

                          {/* Liste groupée par voie (couleur + icône de profil), comme l'emprunt (p. 41). */}
                          <FeaturePathAutocomplete
                            sx={{ mt: 1 }}
                            label="Remplacer par…"
                            options={replacementOptions}
                            value={replacementValue}
                            onChange={(id) => setReplacement(forgottenId, id ?? '')}
                          />

                          {/* Choix porté par la capacité reprise, à résoudre (bloquant), comme un achat. */}
                          {replacementValue && hasActionableChoice(working, replacementValue) && (
                            <Box sx={{ mt: 1, pl: 1 }}>
                              <FeatureChoiceField
                                character={working}
                                featureId={replacementValue}
                                mode="edit"
                                blocking
                                onChange={setChoice}
                              />
                            </Box>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                </AccordionDetails>
              </Accordion>
            )}

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
                    lockAll={divineLock}
                    skipped={skippedFor(group)}
                    onAdd={add}
                  />
                ))}

                {prestigeGroups.length > 0 && (
                  <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      '&::before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <WorkspacePremiumOutlinedIcon
                          fontSize="small"
                          sx={{ color: 'text.secondary' }}
                        />
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          Voies de prestige
                        </Typography>
                      </Stack>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Stack spacing={2}>
                        {prestigeGroups.map((group) => (
                          <AvailablePathGroup
                            key={group.pathId}
                            group={group}
                            color={null}
                            remaining={remaining}
                            lockAll={divineLock}
                            skipped={skippedFor(group)}
                            onAdd={add}
                          />
                        ))}
                      </Stack>
                    </AccordionDetails>
                  </Accordion>
                )}

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
                                    lockAll={divineLock}
                                    skipped={skippedFor(group)}
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
      <DialogActions sx={{ justifyContent: 'space-between' }}>
        <FeaturePointsBadge spent={spent} budget={budget} satisfied={!pointsUnspent} />
        <Stack direction="row" spacing={1}>
          <Button onClick={close}>Annuler</Button>
          <AppTooltip
            title={
              choicesPending
                ? 'Résolvez les choix des capacités sélectionnées'
                : pointsUnspent
                  ? `Dépensez vos points de capacité (${remaining} restant${remaining > 1 ? 's' : ''})`
                  : ''
            }
          >
            <Box component="span">
              <Button
                variant="contained"
                onClick={confirm}
                disabled={choicesPending || pointsUnspent}
              >
                Valider le niveau {newLevel}
              </Button>
            </Box>
          </AppTooltip>
        </Stack>
      </DialogActions>
      </Dialog>
    </>
  );
}
