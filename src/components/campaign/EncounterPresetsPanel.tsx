'use client';

/**
 * Contenu du tiroir « Combats préparés » de l'écran de MJ (PER-448, retour
 * propriétaire) : cartes de combats préparés à l'avance, création/édition via
 * `EncounterPresetFormDialog`, suppression par ligne, regroupement en catégories
 * renommables/repliables — MÊME langage visuel/interaction que `NpcPanel.tsx`
 * (carte bordurée à poignée dédiée, zones de catégorie droppables avec emplacement
 * fantôme, `ToolbarActionButton` partagé). `DndContext` LOCAL à ce panneau (une
 * seule réserve, pas deux pools comme le tiroir Butin).
 *
 * Les COMBATS PRÉPARÉS eux-mêmes vivent dans la table dédiée `campaign_encounter_preset`
 * (`useEncounterPresetsStore`) ; leurs CATÉGORIES vivent sur `Campaign.encounterPresetCategories`
 * (jsonb) via `useCampaignsStore().update` — même partage que PNJ/`campaign_npcs`.
 */
import { useEffect, useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewListIcon from '@mui/icons-material/ViewList';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useDndContext,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { ToolbarActionButton } from '@/components/campaign/ToolbarActionButton';
import { useToast } from '@/components/toast/ToastProvider';
import {
  addEncounterPresetCategory,
  removeEncounterPresetCategory,
  renameEncounterPresetCategory,
  toggleEncounterPresetCategoryCollapsed,
} from '@/lib/campaign/encounterPresetCategory';
import { normalizeSearchText } from '@/lib/ui/searchText';
import type { Campaign } from '@/lib/campaign/types';
import { useCampaignsStore } from '@/stores/campaigns';
import { useEncounterPresetsStore } from '@/stores/encounterPresets';
import { AddCreatureDialog } from './AddCreatureDialog';
import { EncounterPresetFormDialog } from './EncounterPresetFormDialog';
import { type EncounterPreset } from '@/lib/session/encounterPreset';

/** Identifiant `@dnd-kit` d'une carte de combat préparé draggable — même préfixe de
 * motif que `npcDragId` de `NpcPanel.tsx`. */
function presetDragId(presetId: string): string {
  return `gm-encounter-preset:${presetId}`;
}

/** Identifiant `@dnd-kit` d'une zone de dépôt de catégorie (`null` → « Sans catégorie »). */
function presetCategoryDropId(categoryId: string | null): string {
  return `gm-encounter-preset-cat:${categoryId ?? 'none'}`;
}

/** Payload `@dnd-kit` posé par `EncounterPresetCard` sur le preset glissé. */
interface PresetDragData {
  presetId: string;
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return String(e);
}

/** Filtre les presets dont le nom OU la note matche `query` (insensible aux accents/ligatures). */
function filterPresetsByQuery(presets: EncounterPreset[], query: string): EncounterPreset[] {
  const needle = normalizeSearchText(query.trim());
  if (!needle) return presets;
  return presets.filter((p) => normalizeSearchText(`${p.name} ${p.note ?? ''}`).includes(needle));
}

/**
 * Une carte de combat préparé — même langage visuel/interaction que `NpcCard` :
 * boîte bordurée, poignée de glisser dédiée, pied d'actions séparé. Le « Lancer »,
 * lui, n'a pas d'équivalent PNJ : c'est le geste PRINCIPAL de cette carte.
 */
function EncounterPresetCard({
  preset,
  onLaunch,
  onEdit,
  onDuplicate,
  onDelete,
  busy,
}: {
  preset: EncounterPreset;
  onLaunch: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: presetDragId(preset.id),
    data: { presetId: preset.id } satisfies PresetDragData,
  });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.75,
        p: 1,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <IconButton
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          size="small"
          aria-label="Glisser pour déplacer"
          sx={{
            flexShrink: 0,
            p: 0.25,
            color: 'text.secondary',
            cursor: 'grab',
            touchAction: 'none',
            '&:active': { cursor: 'grabbing' },
          }}
        >
          <DragIndicatorIcon fontSize="small" />
        </IconButton>
        <Typography sx={{ fontWeight: 600, flexGrow: 1, minWidth: 0 }} noWrap>
          {preset.name}
        </Typography>
        <Chip size="small" label={`${preset.entries.length} entrée${preset.entries.length > 1 ? 's' : ''}`} />
      </Box>
      {preset.note && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            pl: 3.5,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {preset.note}
        </Typography>
      )}
      <Stack direction="row" spacing={0.5} sx={{ pl: 3.5, alignItems: 'center' }}>
        <Button
          size="small"
          variant="contained"
          startIcon={<PlayArrowIcon />}
          disabled={preset.entries.length === 0 || busy}
          onClick={onLaunch}
        >
          Lancer
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        <AppTooltip title="Modifier">
          <IconButton size="small" onClick={onEdit} disabled={busy}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
        <AppTooltip title="Dupliquer">
          <IconButton size="small" onClick={onDuplicate} disabled={busy}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
        <AppTooltip title="Supprimer">
          <IconButton size="small" color="error" onClick={onDelete} disabled={busy}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
      </Stack>
    </Box>
  );
}

/**
 * En-tête + corps d'une catégorie (ou du groupe virtuel « Sans catégorie ») — ZONE
 * DE DÉPÔT du glisser-déposer, même motif que `NpcCategoryGroup` de `NpcPanel.tsx`.
 */
function EncounterPresetCategoryGroup({
  categoryId,
  name,
  collapsed,
  presets,
  onToggleCollapsed,
  onRename,
  onRemoveCategory,
  onLaunch,
  onEdit,
  onDuplicate,
  onDelete,
  busy,
  layout,
}: {
  categoryId: string | null;
  name: string;
  collapsed: boolean;
  presets: EncounterPreset[];
  onToggleCollapsed?: () => void;
  onRename?: (name: string) => void;
  onRemoveCategory?: () => void;
  onLaunch: (preset: EncounterPreset) => void;
  onEdit: (preset: EncounterPreset) => void;
  onDuplicate: (preset: EncounterPreset) => void;
  onDelete: (preset: EncounterPreset) => void;
  busy: boolean;
  layout: 'list' | 'columns';
}) {
  const { setNodeRef, isOver } = useDroppable({ id: presetCategoryDropId(categoryId) });
  const { active } = useDndContext();
  const dragging = Boolean(active);
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameModalDraft, setRenameModalDraft] = useState(name);

  const openRenameModal = () => {
    setRenameModalDraft(name);
    setRenameModalOpen(true);
  };
  const confirmRenameModal = () => {
    const trimmed = renameModalDraft.trim();
    if (trimmed && trimmed !== name) onRename?.(trimmed);
    setRenameModalOpen(false);
  };

  return (
    <Box
      ref={setNodeRef}
      sx={{
        borderRadius: 1,
        outline: isOver ? '2px dashed' : 'none',
        outlineColor: 'secondary.main',
        outlineOffset: 2,
      }}
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minHeight: 36 }}>
        {onToggleCollapsed ? (
          <IconButton size="small" onClick={onToggleCollapsed}>
            {collapsed ? <ExpandMoreIcon fontSize="small" /> : <ExpandLessIcon fontSize="small" />}
          </IconButton>
        ) : (
          <Box sx={{ width: 34 }} />
        )}
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            flexGrow: 1,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: 'text.secondary',
          }}
        >
          {name} ({presets.length})
        </Typography>
        {onRename && (
          <AppTooltip title="Renommer la catégorie">
            <IconButton size="small" onClick={openRenameModal} disabled={busy}>
              <DriveFileRenameOutlineIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        )}
        {onRemoveCategory && (
          <AppTooltip title="Supprimer la catégorie (les combats repassent « Sans catégorie »)">
            <IconButton size="small" onClick={onRemoveCategory} disabled={busy}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        )}
      </Stack>
      {onRename && (
        <Dialog open={renameModalOpen} onClose={() => setRenameModalOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Renommer la catégorie</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              size="small"
              label="Nom de la catégorie"
              value={renameModalDraft}
              onChange={(e) => setRenameModalDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRenameModal();
              }}
              fullWidth
              sx={{ mt: 0.5 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRenameModalOpen(false)}>Annuler</Button>
            <Button variant="contained" disabled={!renameModalDraft.trim()} onClick={confirmRenameModal}>
              Renommer
            </Button>
          </DialogActions>
        </Dialog>
      )}
      {!collapsed && (
        <Box
          sx={
            layout === 'columns'
              ? { pl: 4.5, pb: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }
              : { pl: 4.5, pb: 1, display: 'flex', flexDirection: 'column', gap: 0.75 }
          }
        >
          {dragging ? (
            <Box
              sx={(theme) => ({
                height: 40,
                borderRadius: 1,
                border: '2px dashed',
                borderColor: isOver ? 'secondary.main' : alpha(theme.palette.text.secondary, 0.3),
                bgcolor: isOver ? alpha(theme.palette.secondary.main, 0.12) : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isOver ? 'secondary.main' : 'text.disabled',
                fontSize: '0.75rem',
                fontWeight: 600,
                transition: 'border-color 0.15s, background-color 0.15s, color 0.15s',
                ...(layout === 'columns' && presets.length === 0 && { gridColumn: '1 / -1' }),
              })}
            >
              Déposer ici
            </Box>
          ) : (
            presets.length === 0 && (
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', ...(layout === 'columns' && { gridColumn: '1 / -1' }) }}
              >
                Aucun combat dans cette catégorie.
              </Typography>
            )
          )}
          {presets.map((preset) => (
            <EncounterPresetCard
              key={preset.id}
              preset={preset}
              onLaunch={() => onLaunch(preset)}
              onEdit={() => onEdit(preset)}
              onDuplicate={() => onDuplicate(preset)}
              onDelete={() => onDelete(preset)}
              busy={busy}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

/** Carte fantôme suivant le curseur pendant le glisser — même motif que `NpcDragGhost`. */
function EncounterPresetDragGhost({ preset }: { preset: EncounterPreset }) {
  return (
    <Paper elevation={6} sx={{ width: 260, p: 1, borderRadius: 1, cursor: 'grabbing' }}>
      <Typography sx={{ fontWeight: 600 }} noWrap>
        {preset.name}
      </Typography>
    </Paper>
  );
}

export interface EncounterPresetsPanelProps {
  campaign: Campaign;
  /**
   * Le combat en cours porte-t-il déjà quelque chose (roster non vide ou tour déjà lancé) ?
   * Décide si une confirmation d'écrasement est requise avant de lancer un preset.
   */
  hasCurrentCombat: boolean;
  /** Peuple le combat en cours depuis ce preset (remplace tout, cf. `launchEncounterPreset`). */
  onLaunch: (preset: EncounterPreset) => void;
}

/** Référence STABLE : un littéral neuf à chaque rendu ferait boucler `useSyncExternalStore`
 * (« getSnapshot should be cached ») tant qu'aucun preset n'existe. */
const EMPTY_PRESETS: EncounterPreset[] = [];

export function EncounterPresetsPanel({ campaign, hasCurrentCombat, onLaunch }: EncounterPresetsPanelProps) {
  const { showToast } = useToast();
  const campaignId = campaign.id;
  const categories = campaign.encounterPresetCategories;
  const updateCampaign = useCampaignsStore((s) => s.update);

  const presets = useEncounterPresetsStore((s) => s.byCampaign[campaignId] ?? EMPTY_PRESETS);
  const status = useEncounterPresetsStore((s) => s.status[campaignId] ?? 'idle');
  const load = useEncounterPresetsStore((s) => s.load);
  const create = useEncounterPresetsStore((s) => s.create);
  const duplicate = useEncounterPresetsStore((s) => s.duplicate);
  const remove = useEncounterPresetsStore((s) => s.remove);
  const addEntry = useEncounterPresetsStore((s) => s.addEntry);
  const addCustomEntry = useEncounterPresetsStore((s) => s.addCustomEntry);
  const updateEntry = useEncounterPresetsStore((s) => s.updateEntry);
  const moveToCategory = useEncounterPresetsStore((s) => s.moveToCategory);
  const reassignLocalCategory = useEncounterPresetsStore((s) => s.reassignLocalCategory);

  useEffect(() => {
    void load(campaignId);
  }, [campaignId, load]);

  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState('');
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [layout, setLayout] = useState<'list' | 'columns'>('list');
  const iconOnly = useMediaQuery((theme: Theme) => theme.breakpoints.down('xl'));

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [editTarget, setEditTarget] = useState<EncounterPreset | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EncounterPreset | null>(null);
  const [launchTarget, setLaunchTarget] = useState<EncounterPreset | null>(null);
  // Modale d'ajout/édition de créature : rendue ICI (SŒUR de `EncounterPresetFormDialog`,
  // jamais imbriquée dedans) — deux `Dialog` MUI parent/enfant se disputent le piège de
  // focus, ce qui rendait l'imbriquée inutilisable (retour propriétaire, PER-448). Une
  // SEULE `AddCreatureDialog` sert les deux modes (ajout ET édition d'entrée), comme sur
  // le combat en cours (`gm-screen/page.tsx`, `creatureDialogOpen`/`editingId`) : `open`
  // ferme immédiatement (fondu), `entryTarget` n'est lâché qu'au fondu FINI (`onExited`)
  // pour ne pas faire flipper la modale d'édition vers ajout sous les yeux du MJ pendant
  // la fermeture.
  const [creatureDialogOpen, setCreatureDialogOpen] = useState(false);
  const [entryTarget, setEntryTarget] = useState<
    { presetId: string; index: number | null } | null
  >(null);

  const openAddEntry = (presetId: string) => {
    setEntryTarget({ presetId, index: null });
    setCreatureDialogOpen(true);
  };
  const openEditEntry = (presetId: string, index: number) => {
    setEntryTarget({ presetId, index });
    setCreatureDialogOpen(true);
  };

  // Glisser-déposer d'une carte vers une catégorie — DndContext LOCAL (une seule réserve).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const [activeDragPreset, setActiveDragPreset] = useState<EncounterPreset | null>(null);

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as PresetDragData | undefined;
    if (!data) return;
    setActiveDragPreset(presets.find((p) => p.id === data.presetId) ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragPreset(null);
    const data = event.active.data.current as PresetDragData | undefined;
    const overId = event.over?.id;
    if (!data || typeof overId !== 'string' || !overId.startsWith('gm-encounter-preset-cat:')) return;
    const categoryId = overId === presetCategoryDropId(null) ? null : overId.slice('gm-encounter-preset-cat:'.length);
    const preset = presets.find((p) => p.id === data.presetId);
    if (preset && preset.categoryId !== categoryId) {
      moveToCategory(campaignId, preset.id, categoryId).catch((e) =>
        showToast(`Déplacement impossible : ${errorMessage(e)}`, 'error'),
      );
    }
  };

  const handleLaunch = (preset: EncounterPreset) => {
    if (hasCurrentCombat) setLaunchTarget(preset);
    else onLaunch(preset);
  };

  const handleCreate = async () => {
    const name = createName;
    setCreateName('');
    setCreateOpen(false);
    try {
      await create(campaignId, name);
    } catch (e) {
      showToast(`Création impossible : ${errorMessage(e)}`, 'error');
    }
  };

  const handleDuplicate = async (preset: EncounterPreset) => {
    setBusy(true);
    try {
      await duplicate(campaignId, preset.id);
    } catch (e) {
      showToast(`Duplication impossible : ${errorMessage(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (preset: EncounterPreset) => {
    setBusy(true);
    try {
      await remove(campaignId, preset.id);
    } catch (e) {
      showToast(`Suppression impossible : ${errorMessage(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    setNewCategoryOpen(false);
    setNewCategoryName('');
    if (!name) return;
    setBusy(true);
    try {
      await updateCampaign(campaignId, { encounterPresetCategories: addEncounterPresetCategory(categories, name) });
    } catch (e) {
      showToast(`Enregistrement impossible : ${errorMessage(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRenameCategory = async (categoryId: string, name: string) => {
    setBusy(true);
    try {
      await updateCampaign(campaignId, {
        encounterPresetCategories: renameEncounterPresetCategory(categories, categoryId, name),
      });
    } catch (e) {
      showToast(`Enregistrement impossible : ${errorMessage(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleCollapsed = async (categoryId: string) => {
    try {
      await updateCampaign(campaignId, {
        encounterPresetCategories: toggleEncounterPresetCategoryCollapsed(categories, categoryId),
      });
    } catch (e) {
      showToast(`Enregistrement impossible : ${errorMessage(e)}`, 'error');
    }
  };

  /**
   * Supprime une catégorie : persiste la liste de catégories ET recatégorise en `null`
   * CHAQUE combat préparé qui la référençait (appels individuels — `categoryId` vit sur
   * la ligne `campaign_encounter_preset`, pas dans le jsonb de catégories).
   */
  const handleRemoveCategory = async (categoryId: string) => {
    const { categories: nextCategories, reassignedPresetIds } = removeEncounterPresetCategory(
      categories,
      presets,
      categoryId,
    );
    setBusy(true);
    try {
      await updateCampaign(campaignId, { encounterPresetCategories: nextCategories });
      await Promise.all(reassignedPresetIds.map((id) => moveToCategory(campaignId, id, null)));
      reassignLocalCategory(campaignId, reassignedPresetIds, null);
    } catch (e) {
      showToast(`Suppression impossible : ${errorMessage(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const visiblePresets = useMemo(() => filterPresetsByQuery(presets, search), [presets, search]);
  const searching = search.trim().length > 0;
  const uncategorized = visiblePresets.filter(
    (p) => p.categoryId === null || !categories.some((c) => c.id === p.categoryId),
  );

  if (status === 'unconfigured') return null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      autoScroll={{ enabled: false }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDragPreset(null)}
    >
      <Stack spacing={2}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
          <TextField
            size="small"
            placeholder="Rechercher un combat (nom, note)…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              },
            }}
          />
          {!searching && (
            <ToggleButtonGroup
              value={layout}
              exclusive
              size="small"
              onChange={(_, value) => {
                if (value) setLayout(value);
              }}
            >
              <ToggleButton value="list" aria-label="Affichage en liste">
                <AppTooltip title="Liste">
                  <ViewListIcon fontSize="small" />
                </AppTooltip>
              </ToggleButton>
              <ToggleButton value="columns" aria-label="Affichage en colonnes">
                <AppTooltip title="2 colonnes">
                  <ViewColumnIcon fontSize="small" />
                </AppTooltip>
              </ToggleButton>
            </ToggleButtonGroup>
          )}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
          {!searching &&
            (newCategoryOpen ? (
              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                <TextField
                  autoFocus
                  size="small"
                  placeholder="Nom de la catégorie"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateCategory();
                    if (e.key === 'Escape') {
                      setNewCategoryOpen(false);
                      setNewCategoryName('');
                    }
                  }}
                />
                <IconButton size="small" onClick={handleCreateCategory} disabled={busy}>
                  <AddIcon fontSize="small" />
                </IconButton>
              </Stack>
            ) : (
              <ToolbarActionButton
                icon={<CreateNewFolderOutlinedIcon fontSize="small" />}
                label="Nouvelle catégorie"
                onClick={() => setNewCategoryOpen(true)}
                disabled={busy}
                iconOnly={iconOnly}
              />
            ))}
          <ToolbarActionButton
            icon={<AddIcon fontSize="small" />}
            label="Nouveau combat"
            onClick={() => setCreateOpen(true)}
            iconOnly={iconOnly}
          />
        </Stack>

        {status === 'loading' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={24} />
          </Box>
        ) : presets.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun combat préparé pour l&apos;instant. Composez-en un à l&apos;avance : il restera
            disponible d&apos;une séance à l&apos;autre, prêt à lancer.
          </Typography>
        ) : searching ? (
          visiblePresets.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aucun combat ne correspond à « {search.trim()} ».
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {visiblePresets.map((preset) => (
                <EncounterPresetCard
                  key={preset.id}
                  preset={preset}
                  onLaunch={() => handleLaunch(preset)}
                  onEdit={() => setEditTarget(preset)}
                  onDuplicate={() => void handleDuplicate(preset)}
                  onDelete={() => setDeleteTarget(preset)}
                  busy={busy}
                />
              ))}
            </Stack>
          )
        ) : (
          <Stack spacing={1.5}>
            {categories.map((cat) => (
              <EncounterPresetCategoryGroup
                key={cat.id}
                categoryId={cat.id}
                name={cat.name}
                collapsed={cat.collapsed}
                presets={visiblePresets.filter((p) => p.categoryId === cat.id)}
                onToggleCollapsed={() => handleToggleCollapsed(cat.id)}
                onRename={(name) => handleRenameCategory(cat.id, name)}
                onRemoveCategory={() => handleRemoveCategory(cat.id)}
                onLaunch={handleLaunch}
                onEdit={(preset) => setEditTarget(preset)}
                onDuplicate={(preset) => void handleDuplicate(preset)}
                onDelete={(preset) => setDeleteTarget(preset)}
                busy={busy}
                layout={layout}
              />
            ))}
            {(uncategorized.length > 0 || categories.length === 0) && (
              <EncounterPresetCategoryGroup
                categoryId={null}
                name="Sans catégorie"
                collapsed={false}
                presets={uncategorized}
                onLaunch={handleLaunch}
                onEdit={(preset) => setEditTarget(preset)}
                onDuplicate={(preset) => void handleDuplicate(preset)}
                onDelete={(preset) => setDeleteTarget(preset)}
                busy={busy}
                layout={layout}
              />
            )}
          </Stack>
        )}
      </Stack>

      {/* Création d'un preset : juste un nom, la composition se remplit ensuite via le crayon. */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nouveau combat préparé</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Nom"
            placeholder="Ex. Embuscade au pont"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Annuler</Button>
          <Button variant="contained" disabled={!createName.trim()} onClick={() => void handleCreate()}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {editTarget && (
        <EncounterPresetFormDialog
          open
          onClose={() => setEditTarget(null)}
          campaignId={campaignId}
          preset={presets.find((p) => p.id === editTarget.id) ?? editTarget}
          onAddCreatures={() => openAddEntry(editTarget.id)}
          onEditEntry={(index) => openEditEntry(editTarget.id, index)}
        />
      )}

      {/* Ajout / édition d'une entrée de composition : LA MÊME modale que le combat en cours
          (mêmes deux modes) — sa visibilité choisie n'est pas reprise en ajout, et ignorée en
          édition (le lancement recalcule toujours la visibilité par camp). SŒUR de
          `EncounterPresetFormDialog` (jamais imbriquée dedans, cf. commentaire d'en-tête). */}
      <AddCreatureDialog
        open={creatureDialogOpen}
        onClose={() => setCreatureDialogOpen(false)}
        // L'entrée éditée n'est lâchée qu'une fois le fondu de fermeture terminé : la lâcher
        // dès `onClose` rebasculerait la modale en mode « ajout » sous les yeux du MJ.
        onExited={() => setEntryTarget(null)}
        onAdd={(slug, options) =>
          entryTarget &&
          addEntry(campaignId, entryTarget.presetId, slug, options).catch((e) =>
            showToast(`Ajout impossible : ${errorMessage(e)}`, 'error'),
          )
        }
        onAddCustom={(custom, options) =>
          entryTarget &&
          addCustomEntry(campaignId, entryTarget.presetId, custom, options).catch((e) =>
            showToast(`Ajout impossible : ${errorMessage(e)}`, 'error'),
          )
        }
        editing={
          entryTarget && entryTarget.index !== null
            ? (() => {
                const entry = presets.find((p) => p.id === entryTarget.presetId)?.entries[entryTarget.index!];
                return entry
                  ? {
                      id: String(entryTarget.index),
                      slug: entry.slug,
                      custom: entry.custom,
                      name: entry.name,
                      side: entry.side,
                      // Une entrée de preset ne porte pas de visibilité (cf. commentaire
                      // d'en-tête) : valeur factice, ignorée par `onSave` ci-dessous.
                      visible: true,
                    }
                  : null;
              })()
            : null
        }
        onSave={(_instanceId, patch) => {
          if (!entryTarget || entryTarget.index === null) return;
          updateEntry(campaignId, entryTarget.presetId, entryTarget.index, {
            name: patch.name,
            side: patch.side,
            custom: patch.custom,
          }).catch((e) => showToast(`Enregistrement impossible : ${errorMessage(e)}`, 'error'));
        }}
      />

      {/* Suppression d'un preset (irréversible, mais un preset n'affecte pas le combat en cours). */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Supprimer « {deleteTarget?.name} » ?</DialogTitle>
        <DialogContent>
          <DialogContentText>Cette action est irréversible.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (deleteTarget) void handleDelete(deleteTarget);
              setDeleteTarget(null);
            }}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lancement par-dessus un combat en cours non vide : confirmation, remplacement total. */}
      <Dialog open={launchTarget !== null} onClose={() => setLaunchTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Remplacer le combat en cours ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Lancer « {launchTarget?.name} » remplace ENTIÈREMENT le combat en cours (roster,
            points de vie, tour et manche). Le combat préparé lui-même n&apos;est jamais modifié —
            il reste disponible pour être relancé plus tard.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLaunchTarget(null)}>Annuler</Button>
          <Button
            color="error"
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => {
              if (launchTarget) onLaunch(launchTarget);
              setLaunchTarget(null);
            }}
          >
            Remplacer et lancer
          </Button>
        </DialogActions>
      </Dialog>

      {/* `zIndex` explicite : ce panneau vit dans une `Drawer` MUI — même valeur que `NpcPanel`. */}
      <DragOverlay zIndex={1400}>
        {activeDragPreset ? <EncounterPresetDragGhost preset={activeDragPreset} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
