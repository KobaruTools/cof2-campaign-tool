'use client';

import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PushPinIcon from '@mui/icons-material/PushPin';
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
import { classColor } from '@/lib/ui/classColors';
import { FeatureLabel } from '@/components/FeatureLabel';
import { ClassIcon } from '@/components/ClassIcon';

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
  /** Édition en place : si fourni, suppression et ajout de capacités. */
  onChange?: (featureIds: string[]) => void;
  /**
   * Capacités ajoutées manuellement sur la fiche (hors wizard) : affichées avec
   * une épingle pour garder une trace de la saisie manuelle (PER-53).
   */
  manualFeatureIds?: Set<string>;
}

/**
 * Épingle : capacité ajoutée manuellement sur la fiche, hors wizard (PER-53).
 * `inline` la place dans le flux (vue lignes, à côté du rang) plutôt qu'en
 * absolu dans le coin supérieur droit (vue colonnes, sur la carte).
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
            : { position: 'absolute', top: 3, right: 3, zIndex: 1 }),
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
 * Capacité de peuple de rang 1 conservée par un mage, affichée à l'intérieur du
 * bloc de rang 1 de la voie du mage (« Capacité de peuple + occultisme », p. 60).
 */
function RetainedAncestryCapacity({
  feature,
  pathName,
}: {
  feature: Feature;
  pathName?: string;
}) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
        Capacité de peuple conservée{pathName ? ` — ${pathName}` : ''}
      </Typography>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 0.25 }}>
        <FeatureLabel feature={feature} />
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ whiteSpace: 'pre-line', mt: 0.25 }}
      >
        {feature.text}
      </Typography>
    </Box>
  );
}

/** Une voie et ses capacités acquises, chaque capacité dépliable (texte complet). */
function PathBlock({
  group,
  classId,
  onRemove,
  manualFeatureIds,
  compact = false,
  gridColumn,
  retainedFeature,
  retainedPathName,
}: {
  group: FeatureGroup;
  classId: string;
  onRemove?: (featureId: string) => void;
  /** Capacités ajoutées manuellement (épingle). */
  manualFeatureIds?: Set<string>;
  /** Vue colonne : masque le rang de chaque capacité, le résume dans l'en-tête. */
  compact?: boolean;
  /** Vue colonne : index de colonne (1-based) dans la grille subgrid. */
  gridColumn?: number;
  /** Voie du mage : capacité de peuple de rang 1 conservée, fusionnée au rang 1. */
  retainedFeature?: Feature;
  /** Nom de la voie de peuple dont la capacité de rang 1 est conservée. */
  retainedPathName?: string;
}) {
  const { path, features } = group;
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
              alignItems: 'center',
              gap: 0.5,
              px: 1,
              py: 0.5,
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
            {manualFeatureIds?.has(feature.id) && <ManualPin />}
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
                {retainedFeature && openFeature.rank === 1 && (
                  <>
                    <RetainedAncestryCapacity
                      feature={retainedFeature}
                      pathName={retainedPathName}
                    />
                    <Divider sx={{ my: 1.5 }} />
                  </>
                )}
                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
                  {openFeature.text}
                </Typography>
              </DialogContent>
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
              {retainedFeature && feature.rank === 1 && (
                <>
                  <RetainedAncestryCapacity
                    feature={retainedFeature}
                    pathName={retainedPathName}
                  />
                  <Divider sx={{ my: 1.5 }} />
                </>
              )}
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
  onChange,
  manualFeatureIds,
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
              compact
              gridColumn={i + 1}
              retainedFeature={group === mageGroup ? retainedFeature : undefined}
              retainedPathName={group === mageGroup ? retainedPathName : undefined}
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
              compact
              gridColumn={PATH_COLUMN_COUNT - prestige.length + 1 + i}
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
              retainedFeature={group === mageGroup ? retainedFeature : undefined}
              retainedPathName={group === mageGroup ? retainedPathName : undefined}
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
