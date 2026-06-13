'use client';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { features as featureCatalog, featureById, pathById } from '@/data';
import type { Feature, Path } from '@/data/schema';
import { classColor } from '@/lib/ui/classColors';
import { FeatureLabel } from '@/components/FeatureLabel';

/** Ordre d'affichage des voies par type (voies de profil d'abord). */
const PATH_TYPE_ORDER: Record<Path['type'], number> = {
  class: 0,
  mage: 1,
  ancestry: 2,
  prestige: 3,
};

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

export interface FeaturesByPathProps {
  featureIds: string[];
  /** Profil du personnage : sert à teinter les voies de profil. */
  classId: string;
  /** Édition en place : si fourni, suppression et ajout de capacités. */
  onChange?: (featureIds: string[]) => void;
}

/** Une voie et ses capacités acquises, chaque capacité dépliable (texte complet). */
function PathBlock({
  group,
  classId,
  onRemove,
}: {
  group: FeatureGroup;
  classId: string;
  onRemove?: (featureId: string) => void;
}) {
  const { path, features } = group;
  const color = path?.type === 'class' ? classColor(classId) : null;

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          mb: 1,
          pl: 1.5,
          borderLeft: 3,
          borderColor: color ?? 'divider',
        }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: color ?? 'text.primary' }}>
          {path?.name ?? group.pathId}
        </Typography>
      </Stack>

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
        ))}
      </Stack>
    </Box>
  );
}

/** Toutes les voies acquises d'un personnage, regroupées et consultables / éditables. */
export function FeaturesByPath({ featureIds, classId, onChange }: FeaturesByPathProps) {
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

  return (
    <Stack spacing={2.5}>
      {groups.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucune capacité acquise.
        </Typography>
      ) : (
        groups.map((group) => (
          <PathBlock
            key={group.pathId}
            group={group}
            classId={classId}
            onRemove={onChange ? remove : undefined}
          />
        ))
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
