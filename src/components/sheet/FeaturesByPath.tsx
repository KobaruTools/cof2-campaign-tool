'use client';

import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PushPinIcon from '@mui/icons-material/PushPin';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Autocomplete from '@mui/material/Autocomplete';
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
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useState } from 'react';
import { features as featureCatalog, featureById, pathById } from '@/data';
import type { Feature, Path } from '@/data/schema';
import type { Abilities, DerivedStats } from '@/lib/engine';
import type { Character, FeatureChoiceSelection } from '@/lib/character/types';
import { featureChoiceDefs, hasUnmadeChoice } from '@/lib/character/choices';
import {
  conditionalEffectsOf,
  creatureBonusDiceForPath,
  disabledFeatureIds,
} from '@/lib/character/effects';
import { classColor } from '@/lib/ui/classColors';
import { FeatureLabel } from '@/components/FeatureLabel';
import { FeatureMarkerHexes } from '@/components/FeatureMarkerHex';
import { SpellManaBadge } from '@/components/SpellManaBadge';
import { ClassIcon } from '@/components/ClassIcon';
import { FeatureText } from '@/components/sheet/FeatureRichText';
import { CreatureStatBlock } from '@/components/sheet/CreatureStatBlock';
import { FeatureChoiceField } from '@/components/sheet/FeatureChoiceField';
import { FeatureEffectToggles } from '@/components/sheet/FeatureEffectToggles';

/**
 * Ordre d'affichage des voies par type, de gauche à droite sur la fiche :
 * la voie du peuple (ou du mage, qui la remplace) à gauche, les voies de
 * profil au milieu, la voie de prestige tout à droite.
 */
const PATH_TYPE_ORDER: Record<Path['type'], number> = {
  ancestry: 0,
  mage: 0,
  class: 1,
  prestige: 2,
};

/** Nombre de colonnes affichées (6 voies maximum, cf. règles CO2). */
const PATH_COLUMN_COUNT = 6;

/** Nombre de rangs (lignes de capacités) par voie. */
const PATH_RANK_COUNT = 5;

export interface FeatureGroup {
  path: Path | undefined;
  pathId: string;
  features: Feature[];
}

/**
 * Regroupe les capacités d'un personnage par voie, triées par rang croissant.
 * Les groupes sont ordonnés par type de voie (voie de peuple à gauche, voies de
 * profil au milieu, voie de prestige à droite) puis, à l'intérieur d'un même
 * type, dans l'**ordre d'acquisition** (première capacité acquise de la voie),
 * et non par ordre alphabétique. Les ids inconnus sont ignorés ici (signalés par
 * les avertissements de conformité, PER-47).
 */
export function groupFeaturesByPath(featureIds: string[]): FeatureGroup[] {
  const byPath = new Map<string, Feature[]>();
  const acquisitionOrder: string[] = [];
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    if (!byPath.has(feature.pathId)) acquisitionOrder.push(feature.pathId);
    const list = byPath.get(feature.pathId) ?? [];
    list.push(feature);
    byPath.set(feature.pathId, list);
  }
  const acquisitionIndex = new Map(acquisitionOrder.map((pathId, i) => [pathId, i]));
  const groups: FeatureGroup[] = [...byPath.entries()].map(([pathId, features]) => ({
    pathId,
    path: pathById.get(pathId),
    features: features.slice().sort((a, b) => a.rank - b.rank),
  }));
  groups.sort((a, b) => {
    const ta = a.path ? PATH_TYPE_ORDER[a.path.type] : 99;
    const tb = b.path ? PATH_TYPE_ORDER[b.path.type] : 99;
    if (ta !== tb) return ta - tb;
    return (acquisitionIndex.get(a.pathId) ?? 0) - (acquisitionIndex.get(b.pathId) ?? 0);
  });
  return groups;
}

/** Libellé d'une capacité dans le sélecteur d'ajout : voie — rang — nom. */
function featureOptionLabel(feature: Feature): string {
  const pathName = pathById.get(feature.pathId)?.name ?? feature.pathId;
  return `${pathName} — Rang ${feature.rank} — ${feature.name}${feature.isSpell ? '*' : ''}`;
}

/** Disposition des voies : empilées (« Lignes ») ou en grille (« Tableau »). */
export type FeaturesLayout = 'rows' | 'columns';

export interface FeaturesByPathProps {
  featureIds: string[];
  /** Profil du personnage : sert à teinter les voies de profil. */
  classId: string;
  /** Disposition d'affichage (contrôlée par le parent). */
  layout: FeaturesLayout;
  /**
   * Concentration accrue active (état de jeu, p. 228) : affiche pour les sorts
   * éligibles (lancés en (A)) leur coût réduit de 2 PM et leur passage en (L).
   */
  concentration?: boolean;
  /**
   * Caractéristiques et niveau du personnage : permettent le rendu ENRICHI des
   * rangs (dés, dé évolutif au niveau courant, formules calculées — PER-64).
   * Absents → on retombe sur le texte verbatim de chaque capacité.
   */
  abilities?: Abilities;
  level?: number;
  /**
   * Stats dérivées du MAÎTRE — pour les mini-fiches de compagnons dont l'Init./attaque
   * recopient le total du personnage (golem, familier, démon…). Absent → libellé de repli.
   */
  masterDerived?: DerivedStats;
  /** Édition en place : si fourni, suppression et ajout de capacités. */
  onChange?: (featureIds: string[]) => void;
  /**
   * Capacités ajoutées manuellement sur la fiche (hors wizard) : affichées avec
   * une épingle pour garder une trace de la saisie manuelle (PER-53).
   */
  manualFeatureIds?: Set<string>;
  /**
   * Personnage complet : requis pour afficher et résoudre les choix portés par
   * les capacités (PER-66/68 — domaine des capacités empruntables, sélection
   * retenue). Absent → les choix ne sont pas affichés.
   */
  character?: Character;
  /**
   * Édition d'un choix porté par une capacité (fiche permissive). Si fourni
   * (avec `character`), les choix deviennent modifiables en place ; sinon ils
   * sont affichés en lecture seule sous la description.
   */
  onChoiceChange?: (featureId: string, index: number, value: FeatureChoiceSelection) => void;
  /**
   * Bascule d'un interrupteur d'effet conditionnel (PER-67). État de jeu
   * transitoire, activable à tout moment (même hors mode édition). Absent (sans
   * `character`) → interrupteurs désactivés.
   */
  onToggleEffect?: (featureId: string, index: number, active: boolean) => void;
}

/**
 * Épingle : capacité ajoutée manuellement sur la fiche, hors wizard (PER-53).
 * `inline` la place dans le flux (vue lignes, à côté du rang) plutôt qu'en
 * absolu dans un coin de la carte (vue colonnes). En absolu, elle est ancrée en
 * HAUT à DROITE, pivotée vers ce coin et superposée à la goutte de coût en mana
 * qui occupe le même coin (`SpellManaBadge`, PER-65) — l'épingle passe au-dessus.
 */
function ManualPin({ inline = false }: { inline?: boolean }) {
  return (
    <Tooltip title="Ajoutée manuellement sur la fiche (hors wizard)" arrow>
      <PushPinIcon
        color="warning"
        sx={{
          fontSize: 16,
          ...(inline
            ? { flexShrink: 0 }
            : {
                position: 'absolute',
                // Centrée verticalement, collée au bord droit ; pivotée à 45°.
                // zIndex 2 : passe AU-DESSUS de la goutte de mana (zIndex 1).
                top: '50%',
                right: -5,
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 2,
              }),
        }}
      />
    </Tooltip>
  );
}

/** Bascule lignes / tableau, à placer dans l'en-tête de la section. */
export function FeaturesLayoutToggle({
  value,
  onChange,
}: {
  value: FeaturesLayout;
  onChange: (value: FeaturesLayout) => void;
}) {
  return (
    <ToggleButtonGroup
      value={value}
      exclusive
      size="small"
      onChange={(_, next) => {
        if (next) onChange(next);
      }}
    >
      <ToggleButton value="rows" aria-label="Affichage en lignes">
        <Tooltip title="Affichage en lignes" arrow>
          <ViewStreamIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
      <ToggleButton value="columns" aria-label="Affichage en colonnes">
        <Tooltip title="Affichage en colonnes" arrow>
          <ViewColumnIcon fontSize="small" />
        </Tooltip>
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

/**
 * Interrupteur « Concentration accrue » (p. 228), à placer dans l'en-tête de la
 * section à côté de la bascule d'affichage. État de jeu transitoire : quand il
 * est actif, les sorts lancés en action d'attaque (A) affichent leur coût réduit
 * de 2 PM (plancher 0) et passent en action limitée (L). Sans effet sur les sorts
 * déjà en (L), (M) ou (G), qui ne peuvent pas en bénéficier.
 */
export function ConcentrationToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <ToggleButton
      value="concentration"
      selected={value}
      size="small"
      aria-label="Concentration accrue"
      aria-pressed={value}
      onChange={() => onChange(!value)}
      sx={
        // Actif : halo bleu mana diffus, rappel visuel des marqueurs de concentration
        // (goutte de PM réduite, hexagone (L)).
        value
          ? { boxShadow: (theme) => `0 0 6px ${theme.palette.info.main}`, color: 'info.main' }
          : undefined
      }
    >
      <Tooltip
        title="Concentration accrue : les sorts en (A) coûtent 2 PM de moins (plancher 0) et deviennent une action limitée (L) (p. 228)"
        arrow
      >
        <SelfImprovementIcon fontSize="small" />
      </Tooltip>
    </ToggleButton>
  );
}

/**
 * Capacité de peuple de rang 1 conservée par un mage, affichée à l'intérieur du
 * bloc de rang 1 de la voie du mage (« Capacité de peuple + occultisme », p. 60).
 */
function RetainedAncestryCapacity({
  feature,
  pathName,
  abilities,
  level,
}: {
  feature: Feature;
  pathName?: string;
  abilities?: Abilities;
  level?: number;
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        Capacité de peuple conservée{pathName ? ` — ${pathName}` : ''}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 0.25 }}>
        <FeatureLabel feature={feature} />
      </Typography>
      <Box sx={{ mt: 0.25 }}>
        {/* Capacité de peuple isolée : sa voie se réduit à son rang 1 conservé. */}
        <FeatureText feature={feature} abilities={abilities} level={level} pathRank={feature.rank} />
      </Box>
    </Box>
  );
}

/** Une voie et ses capacités acquises, chaque capacité dépliable (texte complet). */
function PathBlock({
  group,
  classId,
  onRemove,
  manualFeatureIds,
  abilities,
  level,
  masterDerived,
  compact = false,
  gridColumn,
  retainedFeature,
  retainedPathName,
  character,
  onChoiceChange,
  onToggleEffect,
  disabledIds,
  concentration = false,
}: {
  group: FeatureGroup;
  classId: string;
  onRemove?: (featureId: string) => void;
  /** Capacités ajoutées manuellement (épingle). */
  manualFeatureIds?: Set<string>;
  /** Contexte du personnage pour le rendu enrichi (PER-64). */
  abilities?: Abilities;
  level?: number;
  /** Stats dérivées du maître (mini-fiches de compagnons : Init./attaque recopiées). */
  masterDerived?: DerivedStats;
  /** Vue colonne : masque le rang de chaque capacité, le résume dans l'en-tête. */
  compact?: boolean;
  /** Vue colonne : index de colonne (1-based) dans la grille subgrid. */
  gridColumn?: number;
  /** Voie du mage : capacité de peuple de rang 1 conservée, fusionnée au rang 1. */
  retainedFeature?: Feature;
  /** Nom de la voie de peuple dont la capacité de rang 1 est conservée. */
  retainedPathName?: string;
  /** Personnage : nécessaire pour afficher/résoudre les choix (PER-66/68). */
  character?: Character;
  /** Édition d'un choix porté par une capacité (fiche permissive). */
  onChoiceChange?: (featureId: string, index: number, value: FeatureChoiceSelection) => void;
  /** Bascule d'un interrupteur d'effet conditionnel (fiche permissive, PER-67). */
  onToggleEffect?: (featureId: string, index: number, active: boolean) => void;
  /**
   * Capacités désactivées par exclusion mutuelle (un interrupteur actif les grise) :
   * rendues semi-transparentes + grisées, interrupteur non-interactif, détail conservé.
   */
  disabledIds?: Set<string>;
  /** Concentration accrue active (p. 228) : coût réduit + (A)→(L) pour les sorts éligibles. */
  concentration?: boolean;
}) {
  const { path, features } = group;
  // Rang ATTEINT dans la voie = plus haut rang acquis parmi ses capacités. Sert à
  // résoudre le terme « rang » des textes enrichis (« son rang » = rang de la voie
  // courante, dynamique), partagé par toutes les capacités du bloc.
  const pathRank = features.reduce((max, f) => Math.max(max, f.rank), 0);
  // Profil dont la voie est issue : le profil principal si la voie lui appartient
  // (cas courant), sinon le profil d'origine de la voie (hybridation). Sert à la
  // teinte ET à l'icône, pour distinguer les voies hybrides du profil principal.
  const ownerClassId =
    path?.type === 'class'
      ? path.classIds.includes(classId)
        ? classId
        : path.classIds[0]
      : null;
  const color = ownerClassId ? classColor(ownerClassId) : null;
  // Progression dans la voie : capacités acquises sur le total de la voie.
  const total = path?.featureIds.length;
  // Vue colonne : la capacité ouverte dans la modale de détail (null = fermée).
  const [openFeature, setOpenFeature] = useState<Feature | null>(null);
  // Vue colonne : capacité dont on édite le choix dans une modale dédiée (le bloc
  // est trop petit pour héberger un sélecteur — un bouton crayon l'ouvre, PER-68).
  const [choiceEditFeature, setChoiceEditFeature] = useState<Feature | null>(null);

  // Choix portés par une capacité (PER-66/68), en LECTURE SEULE : affichés sous
  // la description (modale / bloc déployé) et en compact dans le bloc colonne.
  // L'édition passe toujours par un sélecteur dédié (accordéon en vue liste,
  // modale crayon en vue colonne), jamais inline dans le petit bloc.
  const renderChoiceDisplay = (feature: Feature, opts: { compact?: boolean } = {}) => {
    if (!character || featureChoiceDefs(feature.id).length === 0) return null;
    return (
      <FeatureChoiceField
        character={character}
        featureId={feature.id}
        mode="display"
        compact={opts.compact}
      />
    );
  };

  /** Sélecteur éditable des choix (mode édition uniquement). */
  const renderChoiceEditor = (feature: Feature) =>
    character && onChoiceChange ? (
      <FeatureChoiceField
        character={character}
        featureId={feature.id}
        mode="edit"
        onChange={onChoiceChange}
      />
    ) : null;

  /** Vrai si la capacité porte un choix résoluble (pour les affordances d'UI). */
  const hasChoices = (feature: Feature) =>
    !!character && featureChoiceDefs(feature.id).length > 0;

  /** Vrai si la capacité porte un effet conditionnel/temporaire (PER-67). */
  const hasEffectToggles = (feature: Feature) =>
    !!character && conditionalEffectsOf(feature.id).length > 0;

  /** Vrai si la capacité est désactivée par exclusion mutuelle (grisage + interrupteur figé). */
  const isDisabled = (feature: Feature) => disabledIds?.has(feature.id) ?? false;

  /** Style « capacité désactivée » : semi-transparente + grisée (le clic reste). */
  const disabledSx = (feature: Feature) =>
    isDisabled(feature) ? { opacity: 0.5, filter: 'grayscale(1)' } : null;

  /**
   * Interrupteurs des effets conditionnels (PER-67). Toujours basculables (état de
   * jeu transitoire, même hors mode édition). `compact` rend l'interrupteur seul
   * (vue colonne), le libellé complet passant en infobulle. Désactivés (non
   * interactifs) si la capacité est exclue par une autre active.
   */
  const renderEffectToggles = (feature: Feature, opts: { compact?: boolean } = {}) => {
    if (!character || conditionalEffectsOf(feature.id).length === 0) return null;
    return (
      <FeatureEffectToggles
        character={character}
        featureId={feature.id}
        compact={opts.compact}
        onToggle={onToggleEffect}
        disabled={isDisabled(feature)}
      />
    );
  };

  const header = (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{
        alignItems: compact ? 'flex-start' : 'center',
        mb: compact ? 0 : 1,
        pl: compact ? 1 : 1.5,
        borderLeft: 3,
        borderColor: color ?? 'divider',
      }}
    >
      <Typography
        variant={compact ? 'body2' : 'subtitle1'}
        sx={{
          fontWeight: 600,
          color: color ?? 'text.primary',
          minWidth: 0,
          lineHeight: 1.2,
          wordBreak: 'break-word',
        }}
      >
        {path?.name ?? group.pathId}
      </Typography>
      {compact ? (
        // Vue colonne : icône de profil au-dessus du compteur de rangs.
        <Stack spacing={0.25} sx={{ ml: 'auto', flexShrink: 0, alignItems: 'flex-end' }}>
          {ownerClassId && <ClassIcon classId={ownerClassId} size={18} />}
          {total != null && (
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {features.length}/{total}
            </Typography>
          )}
        </Stack>
      ) : (
        // Vue liste : icône de profil juste à droite du titre.
        ownerClassId && <ClassIcon classId={ownerClassId} size={18} sx={{ ml: 0.5 }} />
      )}
    </Stack>
  );

  // Vue colonne : la colonne est une subgrid → toutes les colonnes partagent
  // les mêmes lignes (en-tête + rangs). En-têtes et blocs s'alignent donc
  // automatiquement, même si un titre tient sur trois lignes ou plus.
  if (compact) {
    const ghostCount = total != null ? Math.max(0, total - features.length) : 0;
    return (
      <Box
        sx={{
          gridColumn,
          gridRow: `1 / span ${PATH_RANK_COUNT + 1}`,
          display: 'grid',
          gridTemplateRows: 'subgrid',
        }}
      >
        {header}
        {features.map((feature) => (
          // Ligne cliquable : le détail s'ouvre dans une modale.
          <Box
            key={feature.id}
            onClick={() => setOpenFeature(feature)}
            sx={{
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              justifyContent: 'flex-start',
              px: 1,
              // Le haut est dégagé pour laisser voir les hexagones, qui chevauchent
              // la bordure supérieure (coins : marqueurs en haut gauche, goutte de
              // mana en haut droite, suppression et épingle en bas).
              pt: 1.75,
              pb: 0.75,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              cursor: 'pointer',
              bgcolor: color ? alpha(color, 0.06) : 'transparent',
              '&:hover': { bgcolor: color ? alpha(color, 0.14) : 'action.hover' },
              ...(onRemove
                ? {
                    '& .feature-remove': { opacity: 0, transition: 'opacity .15s' },
                    '&:hover .feature-remove, &:focus-within .feature-remove': { opacity: 1 },
                  }
                : {}),
              // Désactivée par exclusion mutuelle : grisée + transparente, mais le
              // clic d'ouverture du détail reste actif.
              ...(disabledSx(feature) ?? {}),
            }}
          >
            {/* Marqueurs hexagonaux centrés sur la ligne du haut du bloc. */}
            <FeatureMarkerHexes
              feature={feature}
              color={color ?? undefined}
              concentration={concentration}
              sx={{ position: 'absolute', top: 0, left: 6, transform: 'translateY(-50%)', zIndex: 1 }}
            />
            <SpellManaBadge
              feature={feature}
              concentration={concentration}
              color={color ?? undefined}
              sx={{ position: 'absolute', top: -8, right: -8, zIndex: 1 }}
            />
            {manualFeatureIds?.has(feature.id) && <ManualPin />}
            <Typography
              variant="body2"
              sx={{ fontWeight: 600, width: '100%', textAlign: 'left', wordBreak: 'break-word' }}
            >
              {feature.name}
            </Typography>
            {/* Interrupteurs des effets conditionnels, compacts (état de jeu, libellé
                en infobulle) ; le détail cliquable héberge la version étiquetée. */}
            {hasEffectToggles(feature) && (
              <Box sx={{ mt: 0.5, width: '100%' }}>{renderEffectToggles(feature, { compact: true })}</Box>
            )}
            {/* Choix porté par la capacité, poussé en bas du bloc : valeur retenue
                (chip compact, lecture seule) + bouton crayon ouvrant la modale
                d'édition (second niveau d'édition — PER-68). */}
            {hasChoices(feature) && (
              <Box
                sx={{
                  mt: 'auto',
                  pt: 0.75,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  // Réserve la place du bouton de suppression (coin bas droite).
                  pr: onRemove ? 2.5 : 0,
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {onChoiceChange && (
                  <Tooltip title="Modifier le choix" arrow>
                    <IconButton
                      size="small"
                      color={hasUnmadeChoice(character!, feature.id) ? 'warning' : 'primary'}
                      sx={{ p: 0.25, flexShrink: 0 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setChoiceEditFeature(feature);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                )}
                {renderChoiceDisplay(feature, { compact: true })}
              </Box>
            )}
            {onRemove && (
              <Tooltip title="Retirer la capacité" arrow>
                <IconButton
                  className="feature-remove"
                  size="small"
                  color="error"
                  sx={{ position: 'absolute', bottom: 1, right: 1, p: 0.25, zIndex: 1 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(feature.id);
                  }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        ))}
        {Array.from({ length: ghostCount }).map((_, i) => (
          <GhostBlock key={`ghost-${i}`} />
        ))}

        <Dialog
          open={openFeature != null}
          onClose={() => setOpenFeature(null)}
          maxWidth="sm"
          fullWidth
        >
          {openFeature && (
            <>
              <DialogTitle sx={{ pr: 6 }}>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                  <Chip
                    label={`Rang ${openFeature.rank}`}
                    size="small"
                    variant="outlined"
                    sx={{ fontWeight: 600 }}
                  />
                  <Box component="span" sx={{ fontWeight: 600 }}>
                    <FeatureLabel feature={openFeature} concentration={concentration} />
                  </Box>
                </Stack>
                <IconButton
                  aria-label="Fermer"
                  onClick={() => setOpenFeature(null)}
                  sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>
                {retainedFeature && openFeature.rank === 1 && (
                  <>
                    <RetainedAncestryCapacity
                      feature={retainedFeature}
                      pathName={retainedPathName}
                      abilities={abilities}
                      level={level}
                    />
                    <Divider sx={{ my: 1.5 }} />
                  </>
                )}
                <FeatureText feature={openFeature} abilities={abilities} level={level} pathRank={pathRank} />
                {openFeature.creatureProfile && abilities && level != null && (
                  <Box sx={{ mt: 1.5 }}>
                    <CreatureStatBlock
                      profile={openFeature.creatureProfile}
                      abilities={abilities}
                      level={level}
                      rank={pathRank}
                      masterDerived={masterDerived}
                      bonusDieAbilities={
                        character ? creatureBonusDiceForPath(openFeature.pathId, character) : undefined
                      }
                    />
                  </Box>
                )}
                {hasChoices(openFeature) && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    {renderChoiceDisplay(openFeature)}
                    {onChoiceChange && (
                      <Button
                        size="small"
                        startIcon={<EditIcon fontSize="small" />}
                        sx={{ mt: 1 }}
                        onClick={() => {
                          setOpenFeature(null);
                          setChoiceEditFeature(openFeature);
                        }}
                      >
                        Modifier le choix
                      </Button>
                    )}
                  </>
                )}
                {hasEffectToggles(openFeature) && (
                  <>
                    <Divider sx={{ my: 1.5 }} />
                    {renderEffectToggles(openFeature)}
                  </>
                )}
              </DialogContent>
            </>
          )}
        </Dialog>

        {/* Modale d'édition du choix (vue colonne) : ouverte par le crayon, le
            bloc étant trop petit pour héberger le sélecteur (PER-68). */}
        <Dialog
          open={choiceEditFeature != null}
          onClose={() => setChoiceEditFeature(null)}
          maxWidth="xs"
          fullWidth
        >
          {choiceEditFeature && (
            <>
              <DialogTitle sx={{ pr: 6 }}>
                <Box component="span" sx={{ fontWeight: 600 }}>
                  <FeatureLabel feature={choiceEditFeature} />
                </Box>
                <IconButton
                  aria-label="Fermer"
                  onClick={() => setChoiceEditFeature(null)}
                  sx={{ position: 'absolute', right: 8, top: 8 }}
                >
                  <CloseIcon />
                </IconButton>
              </DialogTitle>
              <DialogContent dividers>{renderChoiceEditor(choiceEditFeature)}</DialogContent>
              <DialogActions>
                <Button onClick={() => setChoiceEditFeature(null)}>Terminer</Button>
              </DialogActions>
            </>
          )}
        </Dialog>
      </Box>
    );
  }

  // Vue lignes : en-tête + accordéons dépliables (texte complet affiché en place).
  return (
    <Box>
      {header}
      <Stack spacing={0.5}>
        {features.map((feature) => (
          <Accordion
            key={feature.id}
            disableGutters
            elevation={0}
            sx={{
              border: 1,
              borderColor: 'divider',
              bgcolor: color ? alpha(color, 0.06) : 'transparent',
              '&::before': { display: 'none' },
              // Désactivée par exclusion mutuelle : grisée + transparente, mais
              // toujours dépliable (détail conservé).
              ...(disabledSx(feature) ?? {}),
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
                {manualFeatureIds?.has(feature.id) && <ManualPin inline />}
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  <FeatureLabel feature={feature} concentration={concentration} />
                </Typography>
              </Stack>
              <SpellManaBadge
                feature={feature}
                concentration={concentration}
                color={color ?? undefined}
                sx={{ alignSelf: 'center', mr: 1 }}
              />
              {onRemove && (
                <Tooltip title="Retirer la capacité" arrow>
                  <IconButton
                    size="small"
                    color="error"
                    component="span"
                    sx={{ mr: 1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(feature.id);
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </AccordionSummary>
            <AccordionDetails>
              {retainedFeature && feature.rank === 1 && (
                <>
                  <RetainedAncestryCapacity
                    feature={retainedFeature}
                    pathName={retainedPathName}
                    abilities={abilities}
                    level={level}
                  />
                  <Divider sx={{ my: 1.5 }} />
                </>
              )}
              <FeatureText feature={feature} abilities={abilities} level={level} pathRank={pathRank} />
              {feature.creatureProfile && abilities && level != null && (
                <Box sx={{ mt: 1.5 }}>
                  <CreatureStatBlock
                    profile={feature.creatureProfile}
                    abilities={abilities}
                    level={level}
                    rank={pathRank}
                    masterDerived={masterDerived}
                    bonusDieAbilities={
                      character ? creatureBonusDiceForPath(feature.pathId, character) : undefined
                    }
                  />
                </Box>
              )}
              {hasChoices(feature) && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  {onChoiceChange ? renderChoiceEditor(feature) : renderChoiceDisplay(feature)}
                </>
              )}
              {hasEffectToggles(feature) && (
                <>
                  <Divider sx={{ my: 1.5 }} />
                  {renderEffectToggles(feature)}
                </>
              )}
            </AccordionDetails>
          </Accordion>
        ))}
      </Stack>
    </Box>
  );
}

/** Emplacement de capacité non acquise : bloc fantôme en pointillés (vue colonne). */
function GhostBlock() {
  return (
    <Box
      aria-hidden
      sx={{
        minHeight: 56,
        border: 1,
        borderStyle: 'dashed',
        borderColor: (theme) => alpha(theme.palette.text.primary, 0.22),
        borderRadius: 1,
      }}
    />
  );
}

/** Colonne fantôme : voie potentielle non encore choisie (vue colonne). */
function GhostColumn({ gridColumn }: { gridColumn: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        gridColumn,
        gridRow: `1 / span ${PATH_RANK_COUNT + 1}`,
        display: 'grid',
        gridTemplateRows: 'subgrid',
        opacity: 0.6,
      }}
    >
      {/* En-tête vide : occupe la ligne d'en-tête partagée, sans titre. */}
      <Box />
      {Array.from({ length: PATH_RANK_COUNT }).map((_, i) => (
        <GhostBlock key={i} />
      ))}
    </Box>
  );
}

/** Toutes les voies acquises d'un personnage, regroupées et consultables / éditables. */
export function FeaturesByPath({
  featureIds,
  classId,
  layout,
  abilities,
  level,
  masterDerived,
  onChange,
  manualFeatureIds,
  character,
  onChoiceChange,
  onToggleEffect,
  concentration = false,
}: FeaturesByPathProps) {
  const groups = groupFeaturesByPath(featureIds);

  // Voie du mage : elle remplace la voie de peuple mais le personnage conserve
  // la capacité de rang 1 de son peuple (p. 60). On fusionne cette capacité dans
  // le bloc de rang 1 de la voie du mage et on masque la voie de peuple, devenue
  // une simple ligne isolée. On ne fusionne que si la voie de peuple se réduit
  // bien à son seul rang 1 (sinon on préserve l'affichage pour ne rien perdre).
  const mageGroup = groups.find((g) => g.path?.type === 'mage');
  const ancestryGroup = mageGroup ? groups.find((g) => g.path?.type === 'ancestry') : undefined;
  const retainedFeature =
    ancestryGroup && ancestryGroup.features.length === 1
      ? ancestryGroup.features.find((f) => f.rank === 1)
      : undefined;
  const retainedPathName = retainedFeature ? ancestryGroup?.path?.name : undefined;
  const displayGroups = retainedFeature
    ? groups.filter((g) => g !== ancestryGroup)
    : groups;

  // Capacités désactivées par exclusion mutuelle (un interrupteur actif les grise,
  // ex. Aspect du démon → Beauté de la succube ; Armure de pierre ↔ Déphasage).
  const disabled = character ? disabledFeatureIds(character) : undefined;

  const owned = new Set(featureIds);
  const addable = onChange
    ? featureCatalog
        .filter((f) => !owned.has(f.id))
        .sort((a, b) => featureOptionLabel(a).localeCompare(featureOptionLabel(b)))
    : [];

  const remove = (featureId: string) => onChange?.(featureIds.filter((id) => id !== featureId));
  const add = (featureId: string) => {
    if (!owned.has(featureId)) onChange?.([...featureIds, featureId]);
  };

  // La voie de prestige (souvent unique) est épinglée aux dernières colonnes ;
  // les autres voies s'écoulent depuis la gauche (voie du peuple en premier).
  const prestige = displayGroups.filter((g) => g.path?.type === 'prestige');
  const others = displayGroups.filter((g) => g.path?.type !== 'prestige');
  // Colonnes vides entre les voies de gauche et la voie de prestige : remplies
  // par des colonnes fantômes (emplacements de voies non encore choisies).
  const ghostColumns: number[] = [];
  for (let c = others.length + 1; c <= PATH_COLUMN_COUNT - prestige.length; c++) {
    ghostColumns.push(c);
  }

  return (
    <Stack spacing={2.5}>
      {displayGroups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucune capacité acquise.
        </Typography>
      ) : layout === 'columns' ? (
        <Box
          sx={{
            display: 'grid',
            // ≥ md : les 6 colonnes se partagent la largeur dispo (aucun débordement).
            // < md : largeur minimale par colonne, le bloc défile horizontalement.
            gridTemplateColumns: {
              xs: `repeat(${PATH_COLUMN_COUNT}, minmax(160px, 1fr))`,
              md: `repeat(${PATH_COLUMN_COUNT}, minmax(0, 1fr))`,
            },
            // Lignes partagées par toutes les colonnes (subgrid) : en-tête + rangs.
            // L'en-tête prend la hauteur du titre le plus haut, les rangs s'alignent.
            gridTemplateRows: `auto repeat(${PATH_RANK_COUNT}, minmax(56px, auto))`,
            gap: 1,
            overflowX: { xs: 'auto', md: 'visible' },
            pb: { xs: 1, md: 0 },
          }}
        >
          {others.map((group, i) => (
            <PathBlock
              key={group.pathId}
              group={group}
              classId={classId}
              onRemove={onChange ? remove : undefined}
              manualFeatureIds={manualFeatureIds}
              abilities={abilities}
              level={level}
              masterDerived={masterDerived}
              compact
              gridColumn={i + 1}
              retainedFeature={group === mageGroup ? retainedFeature : undefined}
              retainedPathName={group === mageGroup ? retainedPathName : undefined}
              character={character}
              onChoiceChange={onChoiceChange}
              onToggleEffect={onToggleEffect}
              disabledIds={disabled}
              concentration={concentration}
            />
          ))}
          {ghostColumns.map((c) => (
            <GhostColumn key={`ghost-col-${c}`} gridColumn={c} />
          ))}
          {prestige.map((group, i) => (
            <PathBlock
              key={group.pathId}
              group={group}
              classId={classId}
              onRemove={onChange ? remove : undefined}
              manualFeatureIds={manualFeatureIds}
              abilities={abilities}
              level={level}
              masterDerived={masterDerived}
              compact
              gridColumn={PATH_COLUMN_COUNT - prestige.length + 1 + i}
              character={character}
              onChoiceChange={onChoiceChange}
              onToggleEffect={onToggleEffect}
              disabledIds={disabled}
              concentration={concentration}
            />
          ))}
        </Box>
      ) : (
        <Stack spacing={2.5}>
          {displayGroups.map((group) => (
            <PathBlock
              key={group.pathId}
              group={group}
              classId={classId}
              onRemove={onChange ? remove : undefined}
              manualFeatureIds={manualFeatureIds}
              abilities={abilities}
              level={level}
              masterDerived={masterDerived}
              retainedFeature={group === mageGroup ? retainedFeature : undefined}
              retainedPathName={group === mageGroup ? retainedPathName : undefined}
              character={character}
              onChoiceChange={onChoiceChange}
              onToggleEffect={onToggleEffect}
              disabledIds={disabled}
              concentration={concentration}
            />
          ))}
        </Stack>
      )}

      {onChange && (
        <Autocomplete
          options={addable}
          getOptionLabel={featureOptionLabel}
          renderInput={(params) => (
            <TextField {...params} label="Ajouter une capacité" size="small" />
          )}
          onChange={(_, value) => {
            if (value) add(value.id);
          }}
          value={null}
          blurOnSelect
          clearOnBlur
        />
      )}
    </Stack>
  );
}
