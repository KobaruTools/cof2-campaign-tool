'use client';

import { useEffect, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
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
import FormControl from '@mui/material/FormControl';
import GlobalStyles from '@mui/material/GlobalStyles';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, lighten, type Theme } from '@mui/material/styles';
import { classById, families, featureById, pathById, progression } from '@/data';
import { FAMILY_IDS, PRESTIGE_CATEGORIES } from '@/data/schema';
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
  levelUpDieFamily,
  lockedRank12Family,
  maxRetrainings,
  totalFeatureCost,
} from '@/lib/character/levelUp';
import { withGrantedEquipment } from '@/lib/character/grantedEquipment';
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
  priestDivineFeatureId,
  priestDivineSlot,
  pruneFeatureChoices,
  setFeatureChoice,
  type PendingDivine,
} from '@/lib/character/choices';
import { classColor, prestigeCategoryColor } from '@/lib/ui/classColors';
import { prestigeMetalGradient } from '@/lib/ui/prestigeStyle';
import { glassButtonSx } from '@/lib/ui/glassButtonSx';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { AppTooltip } from '@/components/AppTooltip';
import { PathCard } from '@/components/PathCard';
import { SourceRef } from '@/components/SourceRef';
import { groupFeaturesByPath, type FeatureGroup } from '@/components/sheet/FeaturesByPath';
import { LevelUpPathsGrid } from '@/components/sheet/LevelUpPathsGrid';
import { FeaturePathAutocomplete } from '@/components/sheet/FeaturePathAutocomplete';
import { RichInline, FeatureText } from '@/components/sheet/FeatureRichText';
import { FeatureChoiceField } from '@/components/sheet/FeatureChoiceField';
import { FeatureLabel } from '@/components/FeatureLabel';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { DeclinedFeatureName } from '@/components/sheet/FeatureDeclension';
import { ClassIcon } from '@/components/ClassIcon';
import { AncestryIcon } from '@/components/AncestryIcon';
import { DieIcon } from '@/components/DieIcon';
import { MetaPill } from '@/components/MetaPill';

/**
 * Custom property + keyframes pour la bordure animée du cadre des capacités
 * sélectionnées. `@property` (typé `<angle>`) rend le `conic-gradient(from …)`
 * animable de façon fluide : la bordure reste PLEINE, seule sa couleur tourne.
 * Regroupe aussi les keyframes de l'ouverture du wizard (fondu + rebond + étoiles
 * d'entrée, cf. `LevelUpEntranceStars`) et du pulse du badge de niveau (cf.
 * `LevelBadge`). Injecté globalement (dédupliqué par MUI) — impossible à
 * déclarer dans un `sx`.
 */
/** Familles indexées par id — pour retrouver le dé de récupération à lancer (PER-87). */
const familyById = new Map(families.map((f) => [f.id, f]));

const BORDER_ANGLE_STYLES = `
  @property --pathBorderAngle {
    syntax: '<angle>';
    inherits: false;
    initial-value: 0deg;
  }
  @keyframes pathBorderRotate {
    to { --pathBorderAngle: 360deg; }
  }
  @keyframes levelUpDialogFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes levelUpDialogPop {
    from { transform: translateY(120px) scale(0.9); }
    to { transform: translateY(0) scale(1); }
  }
  @keyframes levelUpStarPop {
    0% { transform: scale(0) rotate(0deg); opacity: 0; }
    35% { opacity: 1; }
    60% { transform: scale(1.15) rotate(140deg); opacity: 1; }
    100% { transform: scale(0.4) rotate(200deg); opacity: 0; }
  }
  @keyframes levelBadgePulseRing {
    0% { transform: scale(1); opacity: 0.65; }
    100% { transform: scale(1.8); opacity: 0; }
  }
  @keyframes levelBadgeStarTwinkle {
    0% { transform: scale(0) rotate(0deg); opacity: 0; }
    30% { opacity: 1; }
    50% { transform: scale(1) rotate(120deg); opacity: 1; }
    100% { transform: scale(0) rotate(200deg); opacity: 0; }
  }
  @keyframes selectedFrameGrow {
    from { opacity: 0; transform: scaleY(0.85); }
    to { opacity: 1; transform: scaleY(1); }
  }
  @keyframes selectedTitleFadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes selectedRowFadeUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes flipDigitOut {
    from { transform: translateY(0); }
    to { transform: translateY(100%); }
  }
  @keyframes flipDigitIn {
    from { transform: translateY(-100%); }
    to { transform: translateY(0); }
  }
  @keyframes levelUpPathStagger {
    from { opacity: 0; transform: translateX(-25%); }
    to { opacity: 1; transform: translateX(0); }
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
  /**
   * Règle maison de campagne `hitDieOnLevelUp` (PER-87) : quand elle est active, le
   * joueur peut CHOISIR à cette montée entre les PV fixes et lancer son dé de vie
   * (résultat saisi librement). Défaut `false` (PV fixes, comportement historique).
   */
  hitDieOnLevelUp?: boolean;
  onClose: () => void;
  /** Personnage promu à valider (niveau +1, capacités, historique). */
  onConfirm: (updated: Character) => void;
}

/** Décalage entre deux voies successives de l'entrée en stagger du mode liste. */
const PATH_STAGGER_STEP_MS = 22;

/**
 * Style d'entrée en stagger d'un bloc de voie du mode liste (fondu + translation depuis
 * la gauche, décalée par index) — rejoué à chaque montage du bloc, donc aussi bien au
 * passage colonne → liste qu'à l'ouverture du wizard directement en mode liste (choix
 * persisté). `overflow: hidden` masque le départ à -25 % de la largeur du bloc sans
 * élargir le conteneur ni faire apparaître de scrollbar horizontale. Courbe à léger
 * dépassement (même famille que `levelUpDialogPop`) : la translation file jusqu'à
 * dépasser 0 avant de revenir se caler, petit rebond plus enjoué qu'un simple `ease-out`.
 */
function pathStaggerSx(index: number) {
  return {
    overflow: 'hidden',
    animation: `levelUpPathStagger 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * PATH_STAGGER_STEP_MS}ms both`,
    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
  } as const;
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
  abilities,
  level,
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
  /** Caractéristiques + niveau du personnage : pour l'enrichissement des descriptions (dés/formules). */
  abilities: Character['abilities'];
  level: number;
}) {
  // Habillage « précieux » des blocs de voie de PRESTIGE (liseré + fond en dégradé, teinté
  // par famille — vert/rouge/bleu/violet — or tuné par défaut pour les génériques). Reprend
  // exactement la teinte/le dégradé de la carte de rang en lecture seule (`FeaturesByPath`).
  const isPrestigePath = group.path?.type === 'prestige';
  const prestigeTint =
    group.path?.type === 'prestige' && group.path.category !== 'generic'
      ? prestigeCategoryColor(group.path.category)
      : undefined;
  // Titre de la voie : même teinte que les blocs (famille, or pour les génériques) — `prestigeTint`
  // reste `undefined` pour les génériques (repli sur le dégradé or TUNÉ des blocs, cf. ci-dessus),
  // mais le titre veut une couleur PLEINE même générique : `prestigeCategoryColor` la fournit déjà.
  const titleColor = group.path?.type === 'prestige' ? prestigeCategoryColor(group.path.category) : color;
  // Prestige : titre et ligne d'en-tête en DÉGRADÉ (comme les blocs de rang), pas en teinte pleine —
  // 45° pour le texte (`background-clip: text`), 180° (vertical) pour la ligne, où le sens du 45°
  // ne se verrait pas sur 2-3px de large.
  const titleTextGradient = isPrestigePath ? prestigeMetalGradient(prestigeTint) : undefined;
  const titleBarGradient = isPrestigePath ? prestigeMetalGradient(prestigeTint, '180deg') : undefined;

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
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: 'center',
          borderLeft: 3,
          borderColor: titleBarGradient ? 'transparent' : (titleColor ?? 'divider'),
          ...(titleBarGradient && { borderImage: `${titleBarGradient} 1` }),
          pl: 1.5,
          mb: 0.5,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            ...(titleTextGradient
              ? {
                  backgroundImage: titleTextGradient,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  color: 'transparent',
                  WebkitTextFillColor: 'transparent',
                }
              : { color: titleColor ?? 'text.primary' }),
          }}
        >
          {group.path?.name ?? group.pathId}
        </Typography>
        {group.path && (
          <AppTooltip
            title={
              <Box sx={{ maxWidth: 320 }}>
                {group.path.note && (
                  <Box sx={{ whiteSpace: 'pre-line', mb: 0.75 }}>{group.path.note}</Box>
                )}
                <SourceRef page={group.path.sourcePage} />
              </Box>
            }
          >
            <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', cursor: 'help', flexShrink: 0 }} />
          </AppTooltip>
        )}
      </Stack>
      <Stack spacing={0.5}>
        {rows.map(({ feature, kind }) => {
          if (kind === 'skipped') {
            return (
              <PathCard
                key={feature.id}
                name={<DeclinedFeatureName feature={feature} />}
                nameAdornment={
                  <FeatureMarkerHexes feature={feature} color={color ?? undefined} pathRank={feature.rank} size={18} />
                }
                term={feature.name}
                color={color ?? undefined}
                prestige={isPrestigePath}
                prestigeTint={prestigeTint}
                checked={false}
                selectable={false}
                repeatFeatureName={false}
                rankLabel={`Rang ${feature.rank} — détenu via la capacité divine`}
                note={
                  skipped?.hostPathName
                    ? `Détenue via la capacité divine (logée dans « ${skipped.hostPathName} ») — rang sauté.`
                    : 'Détenue via la capacité divine — rang sauté.'
                }
                feature={feature}
                abilities={abilities}
                level={level}
              />
            );
          }
          const cost = featureCost(feature, progression);
          const tooExpensive = cost > remaining;
          const locked = lockAll;
          const disabled = tooExpensive || locked;
          const afterSkip = !!skipped && feature.rank === skipped.rank + 1;
          const disabledReason = locked
            ? 'Capacité divine à choisir d’abord (priorité absolue)'
            : tooExpensive
              ? `Coût ${cost} points — il vous reste ${remaining} point${remaining > 1 ? 's' : ''}`
              : '';
          return (
            <AppTooltip key={feature.id} page={locked ? 122 : undefined} title={disabledReason}>
              <Box>
                <PathCard
                  name={<DeclinedFeatureName feature={feature} />}
                  nameAdornment={
                    <FeatureMarkerHexes feature={feature} color={color ?? undefined} pathRank={feature.rank} size={18} />
                  }
                  term={feature.name}
                  color={color ?? undefined}
                  prestige={isPrestigePath}
                  prestigeTint={prestigeTint}
                  checked={false}
                  disabled={disabled}
                  repeatFeatureName={false}
                  rankLabel={`Rang ${feature.rank} — ${cost} point${cost > 1 ? 's' : ''}`}
                  note={
                    afterSkip
                      ? `Après saut du rang ${skipped!.rank} : ce rang est accessible directement.`
                      : undefined
                  }
                  feature={feature}
                  abilities={abilities}
                  level={level}
                  onToggle={() => onAdd(feature.id)}
                />
              </Box>
            </AppTooltip>
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
  abilities,
  level,
}: {
  pending: PendingDivine;
  hosts: { id: string; name: string }[];
  host: string | null;
  picked: boolean;
  remaining: number;
  onHostChange: (pathId: string) => void;
  onAdd: () => void;
  onRemove: () => void;
  /** Caractéristiques + niveau du personnage : pour l'enrichissement de la description (dés/formules). */
  abilities: Character['abilities'];
  level: number;
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
          <DeclinedFeatureName feature={divine} />
        </Typography>
        <FeatureMarkerHexes feature={divine} color={accent} size={18} pathRank={divine.rank} />
        {originClassName && (
          <Typography variant="caption" sx={{ color: originColor ?? 'text.secondary' }}>
            ({originClassName})
          </Typography>
        )}
      </Stack>

      <Box sx={{ mt: 1 }}>
        <FeatureText feature={divine} abilities={abilities} level={level} pathRank={divine.rank} />
        <Box sx={{ mt: 1 }}>
          <SourceRef page={divine.sourcePage} term={divine.name} />
        </Box>
      </Box>

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', mt: 1.5 }}>
        <FormControl
          size="small"
          // Fluide (PER-231) : occupe la largeur dispo et peut rétrécir sous 220px dans
          // une modale plein cadre mobile, au lieu d'une largeur mini dure qui débordait.
          sx={{ flex: '1 1 220px', minWidth: 0 }}
          disabled={picked || hosts.length === 0}
        >
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
                variant="outlined"
                startIcon={<AddIcon />}
                disabled={!canAdd}
                onClick={onAdd}
                sx={(theme) => glassButtonSx(theme, 'info')}
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
 * Bascule mode simplifié (graphe des voies, `LevelUpPathsGrid`) / mode avancé (liste
 * détaillée `AvailablePathGroup`) — même patron que `FeaturesLayoutToggle` (voies &
 * capacités de la fiche), mais ORDRE INVERSÉ : simplifié (colonnes) en premier ici,
 * puisque c'est le mode PAR DÉFAUT (contre lignes en premier côté fiche). Le profil
 * hybride est maintenant géré PAR le graphe (nouvelles voies hybrides incluses dans
 * `newPathOptions` quand `showHybrid` est coché) : plus de forçage vers la liste ni
 * de grisage de ce bouton.
 */
function LevelUpViewToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (simplified: boolean) => void;
}) {
  return (
    <ToggleButtonGroup
      value={value ? 'simplified' : 'advanced'}
      exclusive
      size="small"
      onChange={(_, next) => {
        if (next) onChange(next === 'simplified');
      }}
    >
      <ToggleButton value="simplified" aria-label="Mode simplifié">
        <AppTooltip title="Mode simplifié — graphe des voies">
          <ViewColumnIcon fontSize="small" />
        </AppTooltip>
      </ToggleButton>
      <ToggleButton value="advanced" aria-label="Mode avancé">
        <AppTooltip title="Mode avancé — liste détaillée">
          <ViewStreamIcon fontSize="small" />
        </AppTooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

/**
 * Étoile décorative à 4 branches (même forme que le scintillement des jetons de
 * la bourse, `PurseField`) : apparaît, tourne, s'estompe. `iterationCount` fixe
 * sa durée totale — utilisée aussi bien pour le « pop » d'entrée du wizard (une
 * fois) que pour le pulse du badge de niveau (5 fois, cf. `LevelBadge`).
 */
function DecorativeStar({
  top,
  left,
  size,
  color,
  delay,
  duration,
  animationName,
  iterationCount = 1,
}: {
  top: string | number;
  left: string | number;
  size: number;
  color: string;
  delay: string;
  duration: string;
  animationName: string;
  iterationCount?: number | 'infinite';
}) {
  return (
    <Box
      sx={{
        position: 'absolute',
        top,
        left,
        width: size,
        height: size,
        pointerEvents: 'none',
        opacity: 0,
        zIndex: 1,
        background: `radial-gradient(circle, ${lighten(color, 0.55)} 0%, ${color} 55%, transparent 74%)`,
        filter: `drop-shadow(0 0 2px ${color})`,
        clipPath:
          'polygon(50% 0%, 61% 39%, 100% 50%, 61% 61%, 50% 100%, 39% 61%, 0% 50%, 39% 39%)',
        animationName,
        animationDuration: duration,
        animationDelay: delay,
        animationTimingFunction: 'ease-out',
        animationIterationCount: iterationCount,
        animationFillMode: 'forwards',
        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
      }}
    />
  );
}

/** Position des étoiles qui « pop » autour de l'en-tête à l'ouverture du wizard (une seule fois). */
const ENTRANCE_STAR_POSITIONS: readonly { top: string; left: string; size: number; delay: string }[] = [
  { top: '-10px', left: '6%', size: 12, delay: '0.05s' },
  { top: '-6px', left: '46%', size: 9, delay: '0.22s' },
  { top: '2px', left: '92%', size: 13, delay: '0.1s' },
  { top: '28px', left: '-8px', size: 10, delay: '0.3s' },
  { top: '30px', left: '102%', size: 11, delay: '0.16s' },
  { top: '-8px', left: '70%', size: 8, delay: '0.38s' },
];

/** Étoiles d'entrée du wizard (fondu + rebond, cf. `levelUpDialogPop` sur le `Paper`). */
function LevelUpEntranceStars() {
  return (
    <>
      {ENTRANCE_STAR_POSITIONS.map((s, i) => (
        <DecorativeStar
          key={i}
          top={s.top}
          left={s.left}
          size={s.size}
          color="#ffd75e"
          delay={s.delay}
          duration="0.75s"
          animationName="levelUpStarPop"
        />
      ))}
    </>
  );
}

/** Étoiles autour du badge carré de niveau, calées sur les 5 pulses (5 × 1 s). */
const BADGE_STAR_POSITIONS: readonly { top: string; left: string; size: number; delay: string }[] = [
  { top: '-8px', left: '-6px', size: 8, delay: '0s' },
  { top: '-10px', left: '60%', size: 7, delay: '0.25s' },
  { top: '55%', left: '104%', size: 8, delay: '0.5s' },
  { top: '100%', left: '55%', size: 7, delay: '0.75s' },
  { top: '40%', left: '-14px', size: 6, delay: '0.4s' },
];

/**
 * Badge carré du niveau ATTEINT (custom, ≠ Chip MUI). À l'ouverture du wizard :
 * anneau de pulsation + étoiles pendant 5 s (5 cycles d'1 s), puis fige (fill
 * mode `forwards`) — pas de boucle infinie.
 */
function LevelBadge({ level, color }: { level: number; color: string }) {
  return (
    <Box sx={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          borderRadius: 1,
          border: `2px solid ${color}`,
          animation: 'levelBadgePulseRing 1s ease-out 5 forwards',
          '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
        }}
      />
      <Box
        sx={(theme) => ({
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 32,
          height: 32,
          borderRadius: 1,
          fontSize: '1.05rem',
          fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: theme.palette.getContrastText(color),
          bgcolor: color,
          boxShadow: `0 0 0 1px ${alpha(color, 0.6)}`,
        })}
      >
        {level}
      </Box>
      {BADGE_STAR_POSITIONS.map((s, i) => (
        <DecorativeStar
          key={i}
          top={s.top}
          left={s.left}
          size={s.size}
          color="#fff3c4"
          delay={s.delay}
          duration="1s"
          animationName="levelBadgeStarTwinkle"
          iterationCount={5}
        />
      ))}
    </Box>
  );
}

/**
 * Compte de 0 jusqu'à `target`, un pas par valeur entière espacé de `stepMs` (chaque
 * pas déclenche le flip d'un chiffre, cf. `FlipDigit`) — rythme fixe et rapide, pas
 * de courbe : les gains de PV restent petits, ça n'a pas besoin d'accélérer/ralentir.
 * Démarre après `delay` (500ms par défaut : le temps que l'entrée du wizard —
 * `levelUpDialogPop`, 0.5s — se termine), rejoué à chaque changement de cible
 * (recalcul du gain de PV — famille, dé de vie lancé…) ou de `resetKey` (ex. le
 * mode PV fixes/dé de vie : rebasculer sur PV fixes doit rejouer l'animation même
 * si la valeur numérique retombe sur le même gain). `stepMs` doit rester ⩾ à la
 * durée du flip (`FlipDigit`, 0.22s) : plus court, chaque flip est interrompu par
 * le suivant avant d'avoir pu se jouer, et tout le décompte se voit comme un bond
 * instantané au lieu d'un défilement. `null` = rien à afficher (profil incomplet).
 * Respecte `prefers-reduced-motion`.
 *
 * Le wizard reste monté entre deux ouvertures (seule la prop `open` de `Dialog`
 * change) : sans `open` en dépendance, l'animation ne rejouerait qu'une fois. On la
 * remet à 0 à la fermeture pour qu'elle se rejoue en entier à la prochaine ouverture.
 */
function useCountUp(
  target: number | null,
  open: boolean,
  resetKey: unknown,
  { stepMs = 240, delay = 500 }: { stepMs?: number; delay?: number } = {},
): number | null {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const [display, setDisplay] = useState<number | null>(target === null ? null : 0);
  // Fermeture (ou changement de `resetKey`) : remet à 0 pour repartir de zéro,
  // plutôt que de garder la valeur figée précédente. Ajustement pendant le rendu
  // (pas d'effet), pattern recommandé par React — cf. `CoinInput` dans `PurseField`.
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (!open) setDisplay(target === null ? null : 0);
  }
  const [lastResetKey, setLastResetKey] = useState(resetKey);
  if (resetKey !== lastResetKey) {
    setLastResetKey(resetKey);
    setDisplay(target === null ? null : 0);
  }
  useEffect(() => {
    // Rien à animer (fermé, pas de gain, ou mouvement réduit) : pas de setState ici,
    // la valeur instantanée est directement retournée plus bas.
    if (!open || target === null || reducedMotion) return;
    let i = 0;
    const tick = () => {
      setDisplay(i);
      if (i >= target) return;
      i += 1;
      timeoutId = setTimeout(tick, stepMs);
    };
    let timeoutId: ReturnType<typeof setTimeout>;
    const startTimeoutId = setTimeout(tick, delay);
    return () => {
      clearTimeout(startTimeoutId);
      clearTimeout(timeoutId);
    };
  }, [open, target, resetKey, stepMs, delay, reducedMotion]);
  return !open || target === null || reducedMotion ? target : display;
}

/**
 * Chiffre d'un compteur façon tableau d'aéroport / horloge à volets : quand `char`
 * change, l'ancien chiffre glisse vers le bas et sort du cadre (`overflow: hidden`),
 * le nouveau vient du haut et prend sa place. Ajustement pendant le rendu (pas
 * d'effet) pour détecter le changement, comme `useCountUp` ci-dessus.
 */
function FlipDigit({ char }: { char: string }) {
  const [current, setCurrent] = useState(char);
  const [exiting, setExiting] = useState<string | null>(null);
  if (char !== current) {
    setExiting(current);
    setCurrent(char);
  }
  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-block',
        verticalAlign: 'middle',
        width: '0.65em',
        height: '1em',
        overflow: 'hidden',
      }}
    >
      {exiting !== null && (
        <Box
          key={`out-${exiting}`}
          onAnimationEnd={() => setExiting(null)}
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'flipDigitOut 0.22s ease-in both',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          {exiting}
        </Box>
      )}
      <Box
        key={`in-${current}`}
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...(exiting !== null && {
            animation: 'flipDigitIn 0.22s ease-out both',
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }),
        }}
      >
        {current}
      </Box>
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
export function LevelUpDialog({
  open,
  character,
  family,
  firearmsAllowed = character.firearmsAllowed,
  hitDieOnLevelUp = false,
  onClose,
  onConfirm,
}: LevelUpDialogProps) {
  // Plein écran sur mobile (PER-231) : le flux de montée de niveau est long et
  // multi-étapes — une petite boîte centrée y est inconfortable. Sur grand écran on
  // garde la modale « sm » centrée.
  const fullScreen = useMediaQuery((theme: Theme) => theme.breakpoints.down('sm'));
  const [picked, setPicked] = useState<string[]>([]);
  // Règle maison « dé de vie » (PER-87) : mode de gain de PV de CE niveau et, si
  // « dé de vie », le résultat saisi librement (le dé est lancé à la vraie table).
  const [hpMode, setHpMode] = useState<'fixed' | 'rolled'>('fixed');
  const [rolledValue, setRolledValue] = useState('');
  // Choix portés par les capacités sélectionnées ce niveau (PER-66/68), à
  // résoudre avant validation (doctrine wizard : bloquant).
  const [pickedChoices, setPickedChoices] = useState<Record<string, FeatureChoiceSelection[]>>({});
  // Affichage des voies hors profil principal (profil hybride, p. 176) : masquées
  // par défaut pour ne pas noyer la montée de niveau classique — l'hybridation
  // est un choix délibéré (accord du MJ, cohérence narrative).
  const [showHybrid, setShowHybrid] = useState(false);
  // Mode d'affichage des capacités acquérables : graphe des voies (simplifié, défaut)
  // ou liste détaillée (avancé) — persisté (choix qui survit à la fermeture du wizard).
  const [simplifiedView, setSimplifiedView] = usePersistedBoolean('level-up:simplified-view', true);
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
  // Règle maison « dé de vie » (PER-87). La capacité divine est empruntée mais
  // rattachée à sa voie d'accueil (p. 122) → exclue de la détection de famille.
  const divineIdForHp = priestDivineFeatureId(working);
  // Famille dont on lancerait le DR ce niveau (celle des voies montées) + son dé.
  const dieFamilyId = family
    ? levelUpDieFamily(picked, family.id, rulesContext, divineIdForHp)
    : undefined;
  const hitDie = dieFamilyId ? familyById.get(dieFamilyId)?.recoveryDie : undefined;
  // Contrainte anti-ambiguïté : quand la règle est ON, les rangs 1-2 d'une même montée
  // doivent relever d'une seule famille (sinon le DR à lancer serait indéterminé). La
  // famille est « verrouillée » dès qu'un rang 1-2 est choisi.
  const lockedFamily =
    hitDieOnLevelUp && family
      ? lockedRank12Family(picked, family.id, rulesContext, divineIdForHp)
      : null;
  const violatesFamilyLock = (f: Feature): boolean =>
    lockedFamily != null &&
    f.rank <= 2 &&
    !!family &&
    levelUpDieFamily([f.id], family.id, rulesContext, divineIdForHp) !== lockedFamily;

  // Capacités acquérables ce niveau, PRIVÉES des voies abandonnées (leur rang suivant
  // ne doit pas être re-sélectionnable après un oubli — sinon on rachèterait ce qu'on
  // vient d'abandonner). L'exclusion vaut aussi pour la liste normale, pas seulement
  // pour les remplacements. Sous la règle « dé de vie » ON, on écarte aussi les rangs
  // 1-2 d'une autre famille que celle déjà engagée ce niveau (contrainte ci-dessus).
  const available = acquirableFeatures(working, rulesContext, firearmsAllowed).filter(
    (f) => !forgottenPathIds.has(f.pathId) && !violatesFamilyLock(f),
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

  // L'hybridation (p. 176) se raisonne par PROFIL ENGAGÉ, pas par voie entamée
  // (PER-186). Un profil est « engagé » dès qu'une de ses voies a un rang acquis
  // (état perso + picks du niveau). Une fois un profil engagé, TOUTES ses voies
  // s'affichent en liste normale (on peut y ajouter d'autres voies directement) ;
  // l'accordéon « Voies d'autres profils » ne sert plus qu'à ENTRER dans un profil
  // encore vierge. La capacité divine est EXCLUE : emprunter une capacité d'un autre
  // profil (p. 122) ne rend pas ce profil « engagé » (sinon sa voie d'origine
  // sortirait de l'accordéon sans qu'on l'ait vraiment ouverte).
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
  // Profils (classId) ENGAGÉS hors profil principal : au moins une de leurs voies
  // entamée. Le profil principal est traité à part (ses voies sont toujours à plat).
  const engagedOtherProfiles = new Set<string>();
  for (const pathId of startedPaths) {
    const path = pathById.get(pathId);
    if (!path || path.type !== 'class' || mainPathIds.has(path.id)) continue;
    const classId = path.classIds[0];
    if (classId) engagedOtherProfiles.add(classId);
  }
  // Une voie de profil « autre profil engagé » : de type class, hors profil principal,
  // dont le profil (classId) compte déjà une voie entamée.
  const isEngagedOtherPath = (path: NonNullable<ReturnType<typeof pathById.get>>) =>
    path.type === 'class' &&
    !mainPathIds.has(path.id) &&
    engagedOtherProfiles.has(path.classIds[0]);
  // Une capacité « hybride à ouvrir » (masquable derrière l'accordéon) = voie d'un
  // profil encore VIERGE (ni principal, ni déjà engagé). Poursuivre/ouvrir une voie
  // d'un profil déjà engagé n'est plus masqué (il passe en liste normale).
  const isNewHybridFeature = (f: Feature) => {
    const path = pathById.get(f.pathId);
    return (
      !!path && path.type === 'class' && !mainPathIds.has(path.id) && !isEngagedOtherPath(path)
    );
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

  // Ordre d'affichage des voies (PER-186) :
  //  0 voie de peuple · 1 profil principal (toutes ses voies) · 2 autres profils
  //  déjà engagés (toutes leurs voies) · 3 voies de prestige · 4 profils non
  //  engagés (accordéon d'hybridation).
  const groupCategory = (group: FeatureGroup): number => {
    const path = group.path;
    if (!path) return 4;
    if (path.type === 'ancestry' || path.type === 'mage') return 0;
    if (path.type === 'class' && mainPathIds.has(path.id)) return 1;
    if (isEngagedOtherPath(path)) return 2;
    if (path.type === 'prestige') return 3;
    return 4;
  };
  const groupName = (g: FeatureGroup) => g.path?.name ?? g.pathId;
  // Au sein d'un même bucket, les voies déjà entamées passent d'abord (nicety UX
  // historique, évite tout réordonnancement en mono-profil).
  const startedFirst = (g: FeatureGroup) => (g.path && startedPaths.has(g.path.id) ? 0 : 1);

  // Voies des catégories 0-2 (peuple, profil principal, autres profils engagés),
  // affichées à plat dans l'ordre de priorité.
  const flatGroups = availableGroups
    .filter((g) => groupCategory(g) < 3)
    .sort(
      (a, b) =>
        groupCategory(a) - groupCategory(b) ||
        startedFirst(a) - startedFirst(b) ||
        groupName(a).localeCompare(groupName(b)),
    );

  // Rangs 1 des voies de profil pas encore entamées, parmi les catégories affichées
  // À PLAT (profil principal + profils déjà engagés) — candidates du popover « nouvelle
  // voie » de la grille (`LevelUpPathsGrid`). Profil hybride coché : les voies de profils
  // encore vierges (catégorie 4) rejoignent la liste, pour pouvoir en démarrer une depuis
  // le graphe sans repasser en liste — hybridation gérée PAR le graphe désormais.
  const newPathOptions = [
    ...flatGroups
      .filter((g) => g.path?.type === 'class' && !startedPaths.has(g.path.id))
      .flatMap((g) => g.features.filter((f) => f.rank === 1).map((f) => f.id)),
    ...(showHybrid
      ? availableGroups
          .filter((g) => groupCategory(g) === 4 && g.path?.type === 'class')
          .flatMap((g) => g.features.filter((f) => f.rank === 1).map((f) => f.id))
      : []),
  ];

  // Ordre de la liste « nouvelle voie de profil » (popover, `LevelUpPathsGrid`) : même
  // priorité que la liste avancée (PER-186) — profil principal, puis profils déjà
  // engagés, puis (profil hybride coché) profils vierges par ordre de FAMILLE
  // (aventuriers, combattants, mages, mystiques, p. 30-31) — PROFIL groupé (toutes ses
  // voies contiguës) avant l'alphabétique sur le nom de la voie : un profil hybride
  // vierge propose souvent plusieurs voies (rangs 1 pas encore entamés), qui doivent
  // rester ensemble pour que la ligne d'en-tête « profil » du sélecteur ait un sens.
  const classIdOf = (g: FeatureGroup) => (g.path?.type === 'class' ? g.path.classIds[0] : undefined);
  const profileNameOf = (g: FeatureGroup) => {
    const classId = classIdOf(g);
    return classId ? (classById.get(classId)?.name ?? classId) : '';
  };
  const newPathOrder = [
    ...flatGroups,
    ...(showHybrid ? availableGroups.filter((g) => groupCategory(g) === 4) : []),
  ]
    .filter((g) => g.path?.type === 'class')
    .sort((a, b) => {
      const catA = groupCategory(a);
      const catB = groupCategory(b);
      if (catA !== catB) return catA - catB;
      if (catA === 4) {
        const familyIndex = (g: FeatureGroup) => {
          const classId = classIdOf(g);
          const familyId = classId ? classById.get(classId)?.familyId : undefined;
          const idx = familyId ? FAMILY_IDS.indexOf(familyId) : -1;
          return idx === -1 ? FAMILY_IDS.length : idx;
        };
        const diff = familyIndex(a) - familyIndex(b);
        if (diff !== 0) return diff;
      }
      return profileNameOf(a).localeCompare(profileNameOf(b)) || groupName(a).localeCompare(groupName(b));
    })
    .map((g) => g.pathId);

  // Voies de prestige (catégorie 3) réunies dans un accordéon dédié, comme les
  // voies d'autres profils en hybride — un choix délibéré qu'on ne déploie qu'au
  // besoin pour ne pas noyer la montée de niveau classique. Ordre du livre (table
  // récapitulative p. 128) : générique, aventurier, combattant, mage, mystique,
  // puis alphabétique au sein d'une même catégorie.
  const prestigeCategoryOrder = (g: FeatureGroup) => {
    const category = g.path?.type === 'prestige' ? g.path.category : undefined;
    return category ? PRESTIGE_CATEGORIES.indexOf(category) : PRESTIGE_CATEGORIES.length;
  };
  // Alphabétique sur le nom SIGNIFICATIF de la voie : l'article de tête (« Voie de/du/des/de
  // l'/de la ») est ignoré, sans quoi le tri se ferait sur cet article commun à toutes plutôt
  // que sur ce qui les distingue (ex. « Voie du colosse » devant « Voie de l'écorcheur »,
  // proprio confirmé — vérifié que le tableau récapitulatif p. 128 n'est PAS un ordre
  // alphabétique strict à reproduire à l'identique, ex. « l'ours » y précède « combat du mal »).
  const voieSortKey = (name: string) => name.replace(/^Voie (de l['’]|de la |du |des |d['’])/i, '').trim();
  const prestigeGroups = availableGroups
    .filter((g) => groupCategory(g) === 3)
    .sort(
      (a, b) =>
        prestigeCategoryOrder(a) - prestigeCategoryOrder(b) ||
        voieSortKey(groupName(a)).localeCompare(voieSortKey(groupName(b)), 'fr'),
    );
  // Couleur du badge de niveau : toujours celle du profil d'origine (pas de
  // surcharge voie de prestige — retour propriétaire).
  const levelBadgeColor = classColor(character.classId);

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
  // Ordre du livre pour l'hybridation : famille (aventuriers, combattants, mages,
  // mystiques, p. 30-31) puis alphabétique au sein d'une même famille.
  const hybridProfiles = [...hybridByProfile.values()].sort((a, b) => {
    const orderOf = (classId: string) => {
      const familyId = classById.get(classId)?.familyId;
      return familyId ? FAMILY_IDS.indexOf(familyId) : FAMILY_IDS.length;
    };
    return orderOf(a.classId) - orderOf(b.classId) || a.name.localeCompare(b.name);
  });
  const hasAnyAvailable =
    flatGroups.length > 0 || prestigeGroups.length > 0 || hybridProfiles.length > 0 || hasHybridOption;

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

  // Règle maison « dé de vie » (PER-87) : résultat saisi + gain effectivement appliqué.
  const con = character.abilities.CON;
  const rolledNum = Number.parseInt(rolledValue, 10);
  const rolledValid = Number.isInteger(rolledNum) && rolledNum >= 1;
  const dieMax = hitDie ? Number.parseInt(hitDie.slice(1), 10) : undefined;
  const rolledOutOfRange = rolledValid && dieMax !== undefined && rolledNum > dieMax;
  const rolling = hitDieOnLevelUp && hpMode === 'rolled';
  // Le jet remplace la part « famille » ; la CON s'ajoute par-dessus (Option A, cf. ticket).
  const shownGain = rolling && rolledValid ? rolledNum + con : hpGain;
  // Effet « roulette » (0 → gain) rejoué à chaque recalcul du gain affiché.
  const animatedGain = useCountUp(shownGain, open, hpMode);
  // Bloquant : « dé de vie » choisi sans résultat valide saisi.
  const rolledPending = rolling && !rolledValid;

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
    setHpMode('fixed');
    setRolledValue('');
  };
  const close = () => {
    resetState();
    onClose();
  };
  const confirm = () => {
    // Capacités acquises ce niveau = achats + remplacements du changement
    // d'orientation ; les oubliées sont retirées par `applyLevelUp` et journalisées.
    const chosen = [...picked, ...replacementIds];
    // Dé de vie lancé ce niveau (règle maison PER-87) : le résultat saisi devient la
    // composante « famille » du gain de PV ; sinon PV fixes (rolledHp absent).
    const rolledHpToApply = rolling && rolledValid ? rolledNum : undefined;
    const leveled = applyLevelUp(character, chosen, orphanRewardsToApply, forgotten, rolledHpToApply);
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
      // PER-286 : une capacité qui OCTROIE un objet le fait entrer dans l'inventaire avec le rang
      // (Couleuvrine, p. 63 : « L'arquebusier obtient une couleuvrine »), en respectant la
      // substitution sans poudre (baliste, p. 62). Aucun ajout si l'objet y est déjà.
      equipment: withGrantedEquipment(withVocation, firearmsAllowed),
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
      <Dialog
        open={open}
        onClose={close}
        maxWidth="sm"
        fullWidth
        fullScreen={fullScreen}
        slotProps={{
          paper: {
            sx: {
              animation:
                'levelUpDialogFadeIn 0.3s ease-out both, ' +
                'levelUpDialogPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
              '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
            },
          },
        }}
      >
        <DialogTitle component="div">
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: 'wrap', alignItems: 'center' }}>
            <Box
              sx={(theme) => ({
                position: 'relative',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                height: 36,
                pl: 1.75,
                pr: 1,
                borderRadius: 1.5,
                fontSize: '1rem',
                fontWeight: 700,
                whiteSpace: 'nowrap',
                color: theme.palette.common.white,
              })}
            >
              Niveau {character.level} →
              <LevelBadge level={newLevel} color={levelBadgeColor} />
              {/* Positionnées ici (et non sur toute la largeur de l'en-tête) : les
                  pourcentages de `LevelUpEntranceStars` restent relatifs à ce petit
                  pilule, pas à toute la largeur de la modale (sinon débord = scrollbar
                  horizontale parasite). */}
              <LevelUpEntranceStars />
            </Box>
            {shownGain !== null && (
              // Sélection du dé de vie : le bloc « +X PV max » (qui ne vaut que pour le
              // mode PV fixes) s'efface plutôt que de disparaître d'un coup — fondu +
              // glissement vers la droite, réversible (retour sur PV fixes = même
              // transition à l'envers, pilotée par `rolling`).
              <Box
                sx={(theme) => {
                  const tone =
                    rolling && rolledValid
                      ? theme.palette.secondary.main
                      : theme.palette.text.secondary;
                  return {
                    display: 'inline-flex',
                    alignItems: 'center',
                    height: 36,
                    px: 1.75,
                    borderRadius: 1.5,
                    fontSize: '1rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                    fontVariantNumeric: 'tabular-nums',
                    color: tone,
                    bgcolor: alpha(tone, 0.12),
                    border: `1px solid ${alpha(tone, 0.4)}`,
                    transition: 'opacity .25s ease, transform .25s ease',
                    opacity: rolling ? 0 : 1,
                    transform: rolling ? 'translateX(16px)' : 'translateX(0)',
                    pointerEvents: rolling ? 'none' : 'auto',
                  };
                }}
              >
                +
                {String(animatedGain ?? 0)
                  .split('')
                  .map((c, i) => (
                    <FlipDigit key={i} char={c} />
                  ))}
                {' PV max'}
              </Box>
            )}
          </Stack>
        </DialogTitle>
      <DialogContent dividers sx={{ overflowX: 'hidden' }}>
        <Stack spacing={3}>
          {/* Règle maison « dé de vie » (PER-87) : choix PV fixes / lancer le DR, avec
              la saisie du jet À DROITE du choix pour gagner de la place. Bascule mode
              simplifié/avancé sur la MÊME ligne, poussée à droite (`ml: auto`) — cette
              ligne existe TOUJOURS (même sans la règle maison) pour lui servir d'ancrage. */}
          <Box>
              <Stack
                direction="row"
                // `minHeight` fixe (= hauteur du `TextField` small, seul élément plus
                // haut que le `ToggleButtonGroup`) : sans ça, la rangée grandissait de
                // 1-2px quand le TextField apparaissait (mode « Dé de vie »), décalant
                // tout le contenu en dessous. `gap` (pas `spacing`, qui pousse une marge
                // sur TOUS les enfants y compris le dernier) pour laisser le `ml: auto`
                // du groupe simplifié/avancé pousser réellement vers la droite. `nowrap` :
                // le champ « Résultat du dX » est FLEXIBLE (rétrécit sur mobile) pour que
                // la bascule simplifié/avancé ne soit jamais poussée à la ligne suivante.
                sx={{ alignItems: 'center', flexWrap: 'nowrap', minHeight: 40, width: '100%', gap: 1.5 }}
              >
                {hitDieOnLevelUp && family && hitDie && (
                  <>
                    <ToggleButtonGroup
                      size="small"
                      exclusive
                      value={hpMode}
                      onChange={(_, v) => v && setHpMode(v)}
                      aria-label="Mode de gain de PV à ce niveau"
                      sx={{ flexShrink: 0 }}
                    >
                      <ToggleButton value="fixed">
                        PV fixes{hpGain !== null ? ` (+${hpGain})` : ''}
                      </ToggleButton>
                      <ToggleButton
                        value="rolled"
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                      >
                        Dé de vie <DieIcon die={hitDie} size={18} noTooltip />
                        <AppTooltip
                          title={
                            'Règle maison : lancez votre dé de récupération à la table et saisissez le ' +
                            'résultat ; la Constitution s’ajoute au jet. Les valeurs d’attaque, la défense ' +
                            'et les autres statistiques dérivées sont recalculées automatiquement à partir ' +
                            'du niveau.'
                          }
                        >
                          <InfoOutlinedIcon
                            sx={{ fontSize: 18, color: 'text.secondary', cursor: 'help', flexShrink: 0 }}
                          />
                        </AppTooltip>
                      </ToggleButton>
                    </ToggleButtonGroup>
                    {rolling && (
                      <TextField
                        size="small"
                        type="number"
                        label={`Résultat du ${hitDie}`}
                        value={rolledValue}
                        onChange={(e) => setRolledValue(e.target.value)}
                        slotProps={{
                          htmlInput: {
                            min: 1,
                            max: dieMax,
                            inputMode: 'numeric',
                            'aria-label': 'Résultat du dé de vie',
                          },
                        }}
                        // Flexible plutôt que largeur fixe : rétrécit sur mobile (jusqu'à
                        // `minWidth`) pour ne jamais forcer la bascule simplifié/avancé à
                        // passer à la ligne — `maxWidth` garde la largeur d'origine ailleurs.
                        sx={{ flex: '1 1 80px', minWidth: 80, maxWidth: 150 }}
                      />
                    )}
                  </>
                )}
                <Box sx={{ ml: 'auto', flexShrink: 0 }}>
                  <LevelUpViewToggle value={simplifiedView} onChange={setSimplifiedView} />
                </Box>
              </Stack>

              {/* Hors-plage : affiché UNIQUEMENT en mode « Dé de vie » — le rappel de la
                  règle maison est passé en info-bulle (icône « i » ci-dessus). */}
              {rolling && rolledOutOfRange && (
                <Typography
                  variant="caption"
                  component="div"
                  color="warning.main"
                  sx={{ mt: 1 }}
                >
                  Un {hitDie} ne dépasse pas {dieMax} — valeur conservée telle quelle (les dés
                  se lancent à la table).
                </Typography>
              )}
            </Box>

          <Box>
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
                abilities={character.abilities}
                level={newLevel}
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
                  transformOrigin: 'top',
                  animation:
                    'selectedFrameGrow 0.35s ease-out both, pathBorderRotate 30s linear infinite',
                  '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                })}
              >
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{
                    display: 'block',
                    lineHeight: 1.4,
                    mb: 0.5,
                    animation: 'selectedTitleFadeIn 0.3s ease-out 0.15s both',
                    '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                  }}
                >
                  Capacités sélectionnées
                </Typography>
                <Stack spacing={1.5}>
                    {pickedGroups.map((group) => {
                      const color = pathColor(group.path);
                      const isPrestigePath = group.path?.type === 'prestige';
                      const titleColor =
                        group.path?.type === 'prestige' ? prestigeCategoryColor(group.path.category) : color;
                      // Icône de profil/peuple de la voie du groupe — même repli que
                      // `FeaturesByPath` (mage → clé 'mage', prestige → clé 'prestige').
                      const classId =
                        group.path?.type === 'class'
                          ? mainPathIds.has(group.path.id)
                            ? character.classId
                            : group.path.classIds[0]
                          : undefined;
                      const rawAncestryId = group.path?.type === 'ancestry' ? group.path.id : undefined;
                      const ancestryId =
                        rawAncestryId ?? (isPrestigePath ? 'prestige' : group.path?.type === 'mage' ? 'mage' : undefined);
                      const pathName = group.path?.name ?? group.pathId;
                      const reducedMotionOff = {
                        '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
                      } as const;
                      return (
                        <Box key={group.pathId}>
                          {/* En-tête de voie UNIQUE pour tout le groupe (harmonisé avec
                              `AvailablePathGroup`, la vue liste détaillée) — pas répété
                              par capacité, même si plusieurs rangs de la même voie sont
                              sélectionnés ce niveau. */}
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{
                              alignItems: 'center',
                              borderLeft: 3,
                              borderColor: titleColor ?? 'divider',
                              pl: 1.5,
                              mb: 0.75,
                            }}
                          >
                            {classId && (
                              <ClassIcon classId={classId} size={18} sx={{ color: titleColor ?? undefined, flexShrink: 0 }} />
                            )}
                            {!classId && ancestryId && (
                              <AncestryIcon ancestryId={ancestryId} size={18} sx={{ color: 'text.secondary', flexShrink: 0 }} />
                            )}
                            <Typography
                              variant="subtitle2"
                              sx={{ fontWeight: 600, color: titleColor ?? 'text.primary' }}
                            >
                              {pathName}
                            </Typography>
                          </Stack>
                          <Stack spacing="4px">
                            {group.features.map((feature) => {
                              const cost = featureCost(feature, progression);
                              return (
                                <Box key={feature.id}>
                                  <Stack direction="row" spacing="4px" sx={{ alignItems: 'stretch' }}>
                                    {/* Même patron de carte que les capacités acquérables
                                        (`AvailablePathGroup`) — sans case à cocher : la
                                        sélection est déjà acquise ici. Hexagones collés au
                                        nom, comme dans la liste détaillée. */}
                                    <Box
                                      sx={{
                                        flexGrow: 1,
                                        minWidth: 0,
                                        animation: 'selectedRowFadeUp 0.3s ease-out 0.2s both',
                                        ...reducedMotionOff,
                                      }}
                                    >
                                      <PathCard
                                        name={
                                          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                            <DeclinedFeatureName feature={feature} />
                                            <FeatureMarkerHexes
                                              feature={feature}
                                              color={color ?? undefined}
                                              pathRank={feature.rank}
                                              size={18}
                                            />
                                          </Stack>
                                        }
                                        term={feature.name}
                                        color={color ?? undefined}
                                        checked
                                        selectable={false}
                                        repeatFeatureName={false}
                                        rankLabel=""
                                        borderWidth={1}
                                        feature={feature}
                                        abilities={character.abilities}
                                        level={newLevel}
                                      />
                                    </Box>
                                    {/* Coût + corbeille : EN DEHORS du bloc de la carte, sur la droite —
                                        collés l'un à l'autre (4px d'écart), en haut, taille fixe. */}
                                    <Stack spacing="4px" sx={{ alignItems: 'stretch', flexShrink: 0 }}>
                                      <MetaPill>{`${cost} pt${cost > 1 ? 's' : ''}`}</MetaPill>
                                      <AppTooltip title="Retirer ce choix">
                                        <Box
                                          component="button"
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            remove(feature.id);
                                          }}
                                          sx={(theme) => ({
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            flexShrink: 0,
                                            px: 1,
                                            py: 0.25,
                                            borderRadius: 1,
                                            border: `1px solid ${alpha(theme.palette.error.main, 0.5)}`,
                                            bgcolor: alpha(theme.palette.error.main, 0.08),
                                            color: 'error.main',
                                            cursor: 'pointer',
                                            '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.16) },
                                          })}
                                        >
                                          <DeleteOutlineIcon fontSize="small" />
                                        </Box>
                                      </AppTooltip>
                                    </Stack>
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
                              );
                            })}
                          </Stack>
                        </Box>
                      );
                    })}
                  </Stack>
              </Box>
            )}

            {/* Mode simplifié : le bloc ne s'affiche QUE si le point est réellement
                indépensable (`forcedOrphan`) — pas en libre choix d'hybridation, ce
                que le graphe ne montre de toute façon jamais (cf. `LevelUpPathsGrid`).
                Mode avancé : comportement inchangé, dès qu'un point reste à dépenser. */}
            {remaining > 0 && (!simplifiedView || forcedOrphan) && (
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
                      Point de capacité orphelin <SourceRef page={40} />
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

            {simplifiedView ? (
              <LevelUpPathsGrid
                character={working}
                available={available}
                remaining={remaining}
                locked={divineLock}
                newPathOptions={newPathOptions}
                newPathOrder={newPathOrder}
                onSelect={add}
              />
            ) : !hasAnyAvailable ? (
              <Typography variant="body2" color="text.secondary">
                Aucune capacité supplémentaire disponible à ce niveau.
              </Typography>
            ) : (
              <Stack spacing={2}>
                {flatGroups.map((group, index) => (
                  <Box key={group.pathId} sx={pathStaggerSx(index)}>
                    <AvailablePathGroup
                      group={group}
                      color={pathColor(group.path)}
                      remaining={remaining}
                      lockAll={divineLock}
                      skipped={skippedFor(group)}
                      onAdd={add}
                      abilities={character.abilities}
                      level={newLevel}
                    />
                  </Box>
                ))}

                {prestigeGroups.length > 0 && (
                  <Box sx={pathStaggerSx(flatGroups.length)}>
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
                              abilities={character.abilities}
                              level={newLevel}
                            />
                          ))}
                        </Stack>
                      </AccordionDetails>
                    </Accordion>
                  </Box>
                )}

                {/* Bascule « Profil hybride » déplacée dans la 2ᵉ barre du footer
                    (voir `DialogActions`) : ne reste ici que la liste qu'elle révèle. */}
                {hybridProfiles.length > 0 && (
                  <Box sx={pathStaggerSx(flatGroups.length + (prestigeGroups.length > 0 ? 1 : 0))}>
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
                                {(() => {
                                  const sourcePage = classById.get(profile.classId)?.sourcePage;
                                  return sourcePage != null ? (
                                    <SourceRef page={sourcePage} term={profile.name} />
                                  ) : null;
                                })()}
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
                                    abilities={character.abilities}
                                    level={newLevel}
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
      <DialogActions sx={{ flexDirection: 'column', alignItems: 'stretch', gap: 1 }}>
        {/* 2ᵉ barre du footer : bascule « Profil hybride », déplacée hors de la liste
            avancée pour rester accessible quel que soit le mode d'affichage choisi
            (simplifié ou avancé) — elle ne pilote que la visibilité de la section
            « Autres profils » de la liste, mais son état survit au changement de mode. */}
        {hasHybridOption && (
          <PathCard
            name="Profil hybride"
            checked={showHybrid}
            sourcePage={176}
            nameAdornment={
              <AppTooltip title="Nécessite l’accord du MJ à la table.">
                <WarningAmberOutlinedIcon
                  sx={{ fontSize: 18, color: 'warning.main', cursor: 'help', flexShrink: 0 }}
                />
              </AppTooltip>
            }
            onToggle={() => setShowHybrid((v) => !v)}
          />
        )}
        <Stack
          direction="row"
          sx={{
            alignItems: 'center',
            justifyContent: 'space-between',
            ...(hasHybridOption && { pt: 1, borderTop: 1, borderColor: 'divider' }),
          }}
        >
          <FeaturePointsBadge spent={spent} budget={budget} satisfied={!pointsUnspent} />
          <Stack direction="row" spacing={1}>
            <AppTooltip title={fullScreen ? 'Annuler' : ''}>
              <Button onClick={close} sx={fullScreen ? { minWidth: 0, px: 1 } : undefined}>
                {fullScreen ? <CloseIcon fontSize="small" /> : 'Annuler'}
              </Button>
            </AppTooltip>
            <AppTooltip
              title={
                choicesPending
                  ? 'Résolvez les choix des capacités sélectionnées'
                  : pointsUnspent
                    ? `Dépensez vos points de capacité (${remaining} restant${remaining > 1 ? 's' : ''})`
                    : rolledPending
                      ? 'Saisissez le résultat du dé de vie'
                      : fullScreen
                        ? `Valider le niveau ${newLevel}`
                        : ''
              }
            >
              <Box component="span">
                <Button
                  variant="contained"
                  onClick={confirm}
                  disabled={choicesPending || pointsUnspent || rolledPending}
                  sx={fullScreen ? { minWidth: 0, px: 1 } : undefined}
                >
                  {fullScreen ? <CheckIcon fontSize="small" /> : `Valider le niveau ${newLevel}`}
                </Button>
              </Box>
            </AppTooltip>
          </Stack>
        </Stack>
      </DialogActions>
      </Dialog>
    </>
  );
}
