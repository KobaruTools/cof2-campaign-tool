'use client';

import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import { classColor } from '@/lib/ui/classColors';
import { FeatureLabel } from '@/components/FeatureLabel';

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

/**
 * Hauteur réservée à l'en-tête de voie en vue colonne. Fixe pour que les blocs
 * s'alignent horizontalement même quand un nom tient sur deux lignes ou qu'une
 * colonne fantôme n'a pas de titre.
 */
const PATH_HEADER_HEIGHT = 36;

export interface FeatureGroup {
  path: Path | undefined;
  pathId: string;
  features: Feature[];
}

/**
 * Regroupe les capacités d'un personnage par voie, triées par rang croissant,
 * les groupes ordonnés par type de voie puis par nom. Les ids inconnus sont
 * ignorés ici (signalés par les avertissements de conformité, PER-47).
 */
export function groupFeaturesByPath(featureIds: string[]): FeatureGroup[] {
  const byPath = new Map<string, Feature[]>();
  for (const id of featureIds) {
    const feature = featureById.get(id);
    if (!feature) continue;
    const list = byPath.get(feature.pathId) ?? [];
    list.push(feature);
    byPath.set(feature.pathId, list);
  }
  const groups: FeatureGroup[] = [...byPath.entries()].map(([pathId, features]) => ({
    pathId,
    path: pathById.get(pathId),
    features: features.slice().sort((a, b) => a.rank - b.rank),
  }));
  groups.sort((a, b) => {
    const ta = a.path ? PATH_TYPE_ORDER[a.path.type] : 99;
    const tb = b.path ? PATH_TYPE_ORDER[b.path.type] : 99;
    if (ta !== tb) return ta - tb;
    return (a.path?.name ?? a.pathId).localeCompare(b.path?.name ?? b.pathId);
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
  /** Édition en place : si fourni, suppression et ajout de capacités. */
  onChange?: (featureIds: string[]) => void;
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

/** Une voie et ses capacités acquises, chaque capacité dépliable (texte complet). */
function PathBlock({
  group,
  classId,
  onRemove,
  compact = false,
}: {
  group: FeatureGroup;
  classId: string;
  onRemove?: (featureId: string) => void;
  /** Vue colonne : masque le rang de chaque capacité, le résume dans l'en-tête. */
  compact?: boolean;
}) {
  const { path, features } = group;
  const color = path?.type === 'class' ? classColor(classId) : null;
  // Progression dans la voie : capacités acquises sur le total de la voie.
  const total = path?.featureIds.length;
  // Vue colonne : la capacité ouverte dans la modale de détail (null = fermée).
  const [openFeature, setOpenFeature] = useState<Feature | null>(null);

  return (
    <Box>
      <Stack
        direction="row"
        spacing={0.5}
        sx={{
          alignItems: compact ? 'flex-start' : 'center',
          minHeight: compact ? PATH_HEADER_HEIGHT : undefined,
          mb: compact ? 0.5 : 1,
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
        {compact && total != null && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ ml: 'auto', flexShrink: 0, fontWeight: 600 }}
          >
            {features.length}/{total}
          </Typography>
        )}
      </Stack>

      <Stack spacing={0.5}>
        {features.map((feature) =>
          compact ? (
            // Vue colonne : ligne cliquable, le détail s'ouvre dans une modale.
            <Box
              key={feature.id}
              onClick={() => setOpenFeature(feature)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.5,
                px: 1,
                py: 0.5,
                minHeight: 56,
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
              }}
            >
              <Typography
                variant="body2"
                sx={{ fontWeight: 600, minWidth: 0, flexGrow: 1, wordBreak: 'break-word' }}
              >
                <FeatureLabel feature={feature} />
              </Typography>
              {onRemove && (
                <Tooltip title="Retirer la capacité" arrow>
                  <IconButton
                    className="feature-remove"
                    size="small"
                    color="error"
                    sx={{ p: 0.25, flexShrink: 0 }}
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
          ) : (
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
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    <FeatureLabel feature={feature} />
                  </Typography>
                </Stack>
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
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                  {feature.text}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ),
        )}
        {compact &&
          total != null &&
          Array.from({ length: Math.max(0, total - features.length) }).map((_, i) => (
            <GhostBlock key={`ghost-${i}`} />
          ))}
      </Stack>

      {compact && (
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
                    <FeatureLabel feature={openFeature} />
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
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                  {openFeature.text}
                </Typography>
              </DialogContent>
            </>
          )}
        </Dialog>
      )}
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
function GhostColumn() {
  return (
    <Box aria-hidden sx={{ opacity: 0.6 }}>
      {/* Espace vide réservé à la hauteur d'un en-tête de voie, pour aligner les blocs. */}
      <Box sx={{ mb: 0.5, height: PATH_HEADER_HEIGHT }} />
      <Stack spacing={0.5}>
        {Array.from({ length: 5 }).map((_, i) => (
          <GhostBlock key={i} />
        ))}
      </Stack>
    </Box>
  );
}

/** Toutes les voies acquises d'un personnage, regroupées et consultables / éditables. */
export function FeaturesByPath({ featureIds, classId, layout, onChange }: FeaturesByPathProps) {
  const groups = groupFeaturesByPath(featureIds);
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
  const prestige = groups.filter((g) => g.path?.type === 'prestige');
  const others = groups.filter((g) => g.path?.type !== 'prestige');
  // Colonnes vides entre les voies de gauche et la voie de prestige : remplies
  // par des colonnes fantômes (emplacements de voies non encore choisies).
  const ghostColumns: number[] = [];
  for (let c = others.length + 1; c <= PATH_COLUMN_COUNT - prestige.length; c++) {
    ghostColumns.push(c);
  }

  return (
    <Stack spacing={2.5}>
      {groups.length === 0 ? (
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
            gap: 1,
            alignItems: 'start',
            overflowX: { xs: 'auto', md: 'visible' },
            pb: { xs: 1, md: 0 },
          }}
        >
          {others.map((group, i) => (
            <Box key={group.pathId} sx={{ gridColumn: i + 1 }}>
              <PathBlock
                group={group}
                classId={classId}
                onRemove={onChange ? remove : undefined}
                compact
              />
            </Box>
          ))}
          {ghostColumns.map((c) => (
            <Box key={`ghost-col-${c}`} sx={{ gridColumn: c }}>
              <GhostColumn />
            </Box>
          ))}
          {prestige.map((group, i) => (
            <Box
              key={group.pathId}
              sx={{ gridColumn: PATH_COLUMN_COUNT - prestige.length + 1 + i }}
            >
              <PathBlock
                group={group}
                classId={classId}
                onRemove={onChange ? remove : undefined}
                compact
              />
            </Box>
          ))}
        </Box>
      ) : (
        <Stack spacing={2.5}>
          {groups.map((group) => (
            <PathBlock
              key={group.pathId}
              group={group}
              classId={classId}
              onRemove={onChange ? remove : undefined}
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
