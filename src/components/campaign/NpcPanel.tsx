'use client';

/**
 * Contenu de l'onglet « PNJ » du tiroir d'outils du MJ (PER-428 socle + PER-429
 * fiche complète + PER-430 catégories/tri/recherche) : liste de cartes (badge de
 * disposition + sous-titre de rôle), création/édition via `NpcFormDialog`,
 * suppression par ligne, regroupement en catégories renommables/repliables.
 *
 * Cartes/boutons/glisser-déposer repris à l'IDENTIQUE du langage visuel de
 * `GmInventoryPanel.tsx` (PER-437, retour propriétaire de cohérence entre les
 * panneaux du tiroir MJ) : carte bordurée à poignée dédiée, pied d'actions
 * séparé par un filet, zones de catégorie droppables avec emplacement fantôme,
 * `ToolbarActionButton` partagé pour les boutons de la barre d'outils. Le
 * `DndContext` reste LOCAL à ce panneau (contrairement à celui, partagé entre
 * deux composants, de `GmLootDrawerHost`) : les PNJ n'ont qu'une seule réserve,
 * pas deux pools entre lesquels orchestrer un glisser inter-composants.
 *
 * Données PNJ persistées dans la table DÉDIÉE `campaign_npcs` (RLS propriétaire,
 * migrations 0029/0030/0033) — PAS le blob `Campaign` comme les autres onglets
 * (rumeurs, butin) : chaque mutation passe par `repo.ts` (`fetchNpcs`/
 * `insertNpc`/`updateNpc`/`deleteNpc`), jamais par `useCampaignsStore().update`.
 * Les CATÉGORIES, elles, sont sur `Campaign.npcCategories` (jsonb) : leurs
 * mutations passent par `useCampaignsStore().update`, comme `GmInventory`.
 */
import { useEffect, useMemo, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import CreateNewFolderOutlinedIcon from '@mui/icons-material/CreateNewFolderOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Diversity3Icon from '@mui/icons-material/Diversity3';
import DownloadIcon from '@mui/icons-material/Download';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SearchIcon from '@mui/icons-material/Search';
import SortByAlphaIcon from '@mui/icons-material/SortByAlpha';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
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
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import type { Theme } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { ToolbarActionButton } from '@/components/campaign/ToolbarActionButton';
import { useToast } from '@/components/toast/ToastProvider';
import { ancestryById } from '@/data';
import {
  addNpc,
  addNpcCategory,
  filterNpcsByQuery,
  reassignNpcsCategory,
  removeNpc,
  removeNpcCategory,
  renameNpcCategory,
  replaceNpc,
  sortNpcsByChallenge,
  sortNpcsByDisposition,
  sortNpcsByName,
  toggleNpcCategoryCollapsed,
} from '@/lib/campaign/npc';
import { deleteNpc, fetchNpcs, insertNpc, updateNpc, type NpcInput } from '@/lib/campaign/repo';
import {
  NPC_DISPOSITION_ACCENT,
  NPC_DISPOSITION_LABELS,
  NPC_STATUS_LABELS,
  type Campaign,
  type Npc,
} from '@/lib/campaign/types';
import { copyNpcExportToClipboard, downloadNpcExport } from '@/lib/campaign/npcTransferExport';
import { useCampaignsStore } from '@/stores/campaigns';
import { useCharactersStore } from '@/stores/characters';
import { useCroppedImageSrc } from '@/lib/image/useCroppedImageSrc';
import { useNpcPortraitCropRect, useNpcPortraitSrc } from '@/lib/storage/useNpcPortraitSrc';
import { NpcFormDialog } from './NpcFormDialog';

/** Identifiant `@dnd-kit` d'une carte de PNJ draggable — même préfixe de motif que
 * `permanentItemDragId` de `GmInventoryPanel.tsx`. */
function npcDragId(npcId: string): string {
  return `gm-npc:${npcId}`;
}

/** Identifiant `@dnd-kit` d'une zone de dépôt de catégorie (`null` → « Sans catégorie ») —
 * même motif que `categoryDropId` de `GmInventoryPanel.tsx`. */
function npcCategoryDropId(categoryId: string | null): string {
  return `gm-npc-cat:${categoryId ?? 'none'}`;
}

/** Payload `@dnd-kit` posé par `NpcCard` sur le PNJ glissé. */
interface NpcDragData {
  npcId: string;
}

type SortMode = 'name' | 'disposition' | 'challenge';

/** Modes de tri, dans l'ordre d'affichage, avec leur icône et leur libellé (tooltip) — même
 * motif que `SORT_MODES` de `BestiaryBrowser.tsx` (icône seule + `Tooltip`, pas de texte). */
const SORT_MODES: { value: SortMode; label: string; icon: React.ReactElement }[] = [
  { value: 'name', label: 'Nom (alphabétique)', icon: <SortByAlphaIcon fontSize="small" /> },
  { value: 'disposition', label: 'Disposition (allié, neutre, ennemi)', icon: <Diversity3Icon fontSize="small" /> },
  { value: 'challenge', label: 'Niveau de Challenge croissant', icon: <TrendingUpIcon fontSize="small" /> },
];

/** Applique le tri actif (PER-430) — même ordre pour les groupes de catégories et le mode recherche. */
function sortNpcs(npcs: Npc[], sortMode: SortMode): Npc[] {
  if (sortMode === 'disposition') return sortNpcsByDisposition(npcs);
  if (sortMode === 'challenge') return sortNpcsByChallenge(npcs);
  return sortNpcsByName(npcs);
}

/** Message d'erreur lisible — gère aussi les erreurs Supabase (objet `{message}`, pas `Error`). */
function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return String(e);
}

/**
 * Une carte de PNJ — même langage visuel/interaction que `InventoryItemRow` de
 * `GmInventoryPanel.tsx` (PER-437, retour propriétaire de cohérence) : boîte
 * bordurée, poignée de glisser dédiée (`DragIndicatorIcon`, jamais la carte
 * entière — même motif, le point de saisie doit rester fixe pour que le
 * fantôme suive le curseur sans décalage), pied d'actions séparé par un filet.
 * L'accent de disposition (allié/neutre/ennemi) reste une bordure gauche
 * colorée — signal propre aux PNJ, sans équivalent côté objets.
 */
function NpcCard({
  npc,
  onEdit,
  onDelete,
  onExport,
  onCopyJson,
  busy,
}: {
  npc: Npc;
  onEdit: () => void;
  onDelete: () => void;
  onExport: () => void;
  onCopyJson: () => void;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: npcDragId(npc.id),
    data: { npcId: npc.id } satisfies NpcDragData,
  });

  const portraitSrc = useNpcPortraitSrc(npc.id);
  const portraitCropRect = useNpcPortraitCropRect(npc.id);
  const croppedPortraitSrc = useCroppedImageSrc(portraitSrc ?? undefined, portraitCropRect);
  const displayedPortraitSrc = croppedPortraitSrc ?? portraitSrc ?? undefined;

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        gap: 1,
        p: 1,
        border: 1,
        borderColor: 'divider',
        borderLeft: `4px solid ${NPC_DISPOSITION_ACCENT[npc.disposition]}`,
        borderRadius: 1,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      {displayedPortraitSrc && (
        <Box
          component="img"
          src={displayedPortraitSrc}
          alt=""
          aria-hidden
          sx={{
            width: 56,
            alignSelf: 'stretch',
            flexShrink: 0,
            borderRadius: 1,
            objectFit: 'cover',
            objectPosition: 'top',
          }}
        />
      )}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexGrow: 1, minWidth: 0 }}>
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.25, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }} noWrap>
              {npc.name}
            </Typography>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
              <Box
                component="span"
                sx={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  px: 0.75,
                  py: 0.125,
                  borderRadius: 0.5,
                  color: NPC_DISPOSITION_ACCENT[npc.disposition],
                  border: `1px solid ${alpha(NPC_DISPOSITION_ACCENT[npc.disposition], 0.5)}`,
                }}
              >
                {NPC_DISPOSITION_LABELS[npc.disposition]}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {NPC_STATUS_LABELS[npc.status]}
              </Typography>
            </Stack>
          </Box>
        </Box>
        {(npc.role || npc.ancestryId) && (
          <Typography variant="body2" color="text.secondary" noWrap sx={{ pl: 3.5 }}>
            {[npc.role, npc.ancestryId ? ancestryById.get(npc.ancestryId)?.name : null]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        )}
      </Box>
      <Stack spacing={0.25} sx={{ flexShrink: 0 }}>
        <AppTooltip title="Modifier">
          <IconButton size="small" onClick={onEdit} disabled={busy}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
        <AppTooltip title="Exporter en JSON">
          <IconButton size="small" onClick={onExport} disabled={busy}>
            <DownloadIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
        <AppTooltip title="Copier le JSON">
          <IconButton size="small" onClick={onCopyJson} disabled={busy}>
            <ContentPasteIcon fontSize="small" />
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
 * DE DÉPÔT du glisser-déposer (PER-437), même motif que `CategoryGroup` de
 * `GmInventoryPanel.tsx` : surlignage en pointillés au survol, emplacement fantôme
 * (hauteur d'une carte) visible dès le début d'un glisser n'importe où dans ce
 * panneau — pas seulement au survol exact de CETTE catégorie.
 */
function NpcCategoryGroup({
  categoryId,
  name,
  collapsed,
  npcs,
  onToggleCollapsed,
  onRename,
  onRemoveCategory,
  onEdit,
  onDelete,
  onExport,
  onCopyJson,
  busy,
  layout,
}: {
  categoryId: string | null;
  name: string;
  collapsed: boolean;
  npcs: Npc[];
  onToggleCollapsed?: () => void;
  onRename?: (name: string) => void;
  onRemoveCategory?: () => void;
  onEdit: (npc: Npc) => void;
  onDelete: (id: string) => void;
  onExport: (npc: Npc) => void;
  onCopyJson: (npc: Npc) => void;
  busy: boolean;
  /** Affichage des CARTES de cette catégorie — la catégorie elle-même reste toujours en ligne. */
  layout: 'list' | 'columns';
}) {
  const { setNodeRef, isOver } = useDroppable({ id: npcCategoryDropId(categoryId) });
  const { active } = useDndContext();
  const dragging = Boolean(active);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(name);
  // Renommage via MODALE (bouton dédié, même motif que `CategoryGroup` de
  // `GmInventoryPanel.tsx`) — cohabite avec le renommage inline (clic sur le nom).
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameModalDraft, setRenameModalDraft] = useState(name);

  const commitRename = () => {
    setRenaming(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename?.(trimmed);
    else setDraft(name);
  };

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
        {renaming ? (
          <TextField
            autoFocus
            size="small"
            variant="standard"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setDraft(name);
                setRenaming(false);
              }
            }}
          />
        ) : (
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 700,
              flexGrow: 1,
              cursor: onRename ? 'text' : 'default',
              textTransform: 'uppercase',
              letterSpacing: 0.5,
              color: 'text.secondary',
            }}
            onClick={onRename ? () => setRenaming(true) : undefined}
          >
            {name} ({npcs.length})
          </Typography>
        )}
        <Box sx={{ flexGrow: renaming ? 1 : 0 }} />
        {onRename && (
          <AppTooltip title="Renommer la catégorie">
            <IconButton size="small" onClick={openRenameModal} disabled={busy}>
              <DriveFileRenameOutlineIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        )}
        {onRemoveCategory && (
          <AppTooltip title="Supprimer la catégorie (les PNJ repassent « Sans catégorie »)">
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
            // Emplacement FANTÔME — même motif que `CategoryGroup` (hauteur d'UNE carte,
            // visible dès le début du glisser, surligné en plus au survol exact).
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
                ...(layout === 'columns' && npcs.length === 0 && { gridColumn: '1 / -1' }),
              })}
            >
              Déposer ici
            </Box>
          ) : (
            npcs.length === 0 && (
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', ...(layout === 'columns' && { gridColumn: '1 / -1' }) }}
              >
                Aucun PNJ dans cette catégorie.
              </Typography>
            )
          )}
          {npcs.map((npc) => (
            <NpcCard
              key={npc.id}
              npc={npc}
              onEdit={() => onEdit(npc)}
              onDelete={() => onDelete(npc.id)}
              onExport={() => onExport(npc)}
              onCopyJson={() => onCopyJson(npc)}
              busy={busy}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

/**
 * Carte fantôme suivant le curseur pendant le glisser d'un PNJ — même motif que
 * `DragGhost` de `GmLootDrawerHost.tsx` (le fantôme EST la carte, pas un aperçu
 * générique), élévation en plus pour se détacher visuellement des cartes posées.
 */
function NpcDragGhost({ npc }: { npc: Npc }) {
  return (
    <Paper elevation={6} sx={{ width: 260, p: 1, borderRadius: 1, cursor: 'grabbing' }}>
      <Typography sx={{ fontWeight: 600 }} noWrap>
        {npc.name}
      </Typography>
    </Paper>
  );
}

export function NpcPanel({ campaign }: { campaign: Campaign }) {
  const { showToast } = useToast();
  const update = useCampaignsStore((s) => s.update);
  const characters = useCharactersStore((s) => s.characters);
  const campaignCharacters = characters.filter((c) => c.campaignId === campaign.id);
  const categories = campaign.npcCategories;

  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [dialogTarget, setDialogTarget] = useState<'create' | Npc | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [search, setSearch] = useState('');
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  // Préférence d'affichage purement visuelle (pas de persistance) — même motif que
  // `GmInventoryPanel` : redémarre en liste à chaque ouverture du tiroir.
  const [layout, setLayout] = useState<'list' | 'columns'>('list');
  // Boutons pleins → icône seule entre `md` et `xl` (même palier que `GmInventoryPanel`,
  // pour que les deux barres d'outils du tiroir MJ se comportent à l'identique).
  const iconOnly = useMediaQuery((theme: Theme) => theme.breakpoints.down('xl'));

  // Glisser-déposer d'une carte de PNJ vers une catégorie (PER-437) — DndContext LOCAL,
  // ce panneau n'a qu'une seule réserve (cf. commentaire d'en-tête).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const [activeDragNpc, setActiveDragNpc] = useState<Npc | null>(null);

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as NpcDragData | undefined;
    if (!data) return;
    setActiveDragNpc(npcs.find((n) => n.id === data.npcId) ?? null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDragNpc(null);
    const data = event.active.data.current as NpcDragData | undefined;
    const overId = event.over?.id;
    if (!data || typeof overId !== 'string' || !overId.startsWith('gm-npc-cat:')) return;
    const categoryId = overId === npcCategoryDropId(null) ? null : overId.slice('gm-npc-cat:'.length);
    const npc = npcs.find((n) => n.id === data.npcId);
    if (npc && npc.categoryId !== categoryId) void handleMoveToCategory(data.npcId, categoryId);
  };

  useEffect(() => {
    let cancelled = false;
    fetchNpcs(campaign.id)
      .then((fetched) => {
        if (!cancelled) setNpcs(fetched);
      })
      .catch((e) => {
        if (!cancelled) {
          showToast(`Chargement des PNJ impossible : ${errorMessage(e)}`, 'error');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id]);

  const handleCreate = async (input: NpcInput) => {
    const created = await insertNpc(campaign.id, input);
    setNpcs((prev) => sortNpcsByName(addNpc(prev, created)));
  };

  const handleUpdate = async (npc: Npc, input: NpcInput) => {
    const updated = await updateNpc(npc.id, input);
    setNpcs((prev) => sortNpcsByName(replaceNpc(prev, updated)));
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await deleteNpc(id);
      setNpcs((prev) => removeNpc(prev, id));
      showToast('PNJ supprimé.', 'success');
    } catch (e) {
      showToast(`Suppression impossible : ${errorMessage(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleExport = (npc: Npc) => {
    downloadNpcExport(npc);
    showToast(`« ${npc.name} » exporté en JSON.`, 'success');
  };

  const handleCopyJson = async (npc: Npc) => {
    try {
      await copyNpcExportToClipboard(npc);
      showToast(`JSON de « ${npc.name} » copié dans le presse-papier.`, 'success');
    } catch {
      showToast('Impossible de copier dans le presse-papier.', 'error');
    }
  };

  const handleMoveToCategory = async (npcId: string, categoryId: string | null) => {
    setBusy(true);
    try {
      const updated = await updateNpc(npcId, { categoryId });
      setNpcs((prev) => replaceNpc(prev, updated));
    } catch (e) {
      showToast(`Déplacement impossible : ${errorMessage(e)}`, 'error');
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
      await update(campaign.id, { npcCategories: addNpcCategory(categories, name) });
    } catch (e) {
      showToast(`Enregistrement impossible : ${errorMessage(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRenameCategory = async (categoryId: string, name: string) => {
    setBusy(true);
    try {
      await update(campaign.id, { npcCategories: renameNpcCategory(categories, categoryId, name) });
    } catch (e) {
      showToast(`Enregistrement impossible : ${errorMessage(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleToggleCollapsed = async (categoryId: string) => {
    try {
      await update(campaign.id, { npcCategories: toggleNpcCategoryCollapsed(categories, categoryId) });
    } catch (e) {
      showToast(`Enregistrement impossible : ${errorMessage(e)}`, 'error');
    }
  };

  /**
   * Supprime une catégorie : persiste la liste de catégories ET recatégorise en `null`
   * CHAQUE PNJ qui la référençait (appels individuels — `categoryId` vit sur la ligne
   * `campaign_npcs`, pas dans le jsonb de catégories).
   */
  const handleRemoveCategory = async (categoryId: string) => {
    const { categories: nextCategories, reassignedNpcIds } = removeNpcCategory(categories, npcs, categoryId);
    setBusy(true);
    try {
      await update(campaign.id, { npcCategories: nextCategories });
      await Promise.all(reassignedNpcIds.map((id) => updateNpc(id, { categoryId: null })));
      setNpcs((prev) => reassignNpcsCategory(prev, reassignedNpcIds, null));
    } catch (e) {
      showToast(`Suppression impossible : ${errorMessage(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const visibleNpcs = useMemo(() => filterNpcsByQuery(npcs, search), [npcs, search]);
  const searching = search.trim().length > 0;
  const uncategorized = visibleNpcs.filter(
    (n) => n.categoryId === null || !categories.some((c) => c.id === n.categoryId),
  );

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      autoScroll={{ enabled: false }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDragNpc(null)}
    >
      <Stack spacing={2} data-glossary-shot="NpcPanel">
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
          <TextField
            size="small"
            placeholder="Rechercher un PNJ (nom, description)…"
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
          <ToggleButtonGroup
            value={sortMode}
            exclusive
            size="small"
            onChange={(_, value) => {
              if (value) setSortMode(value);
            }}
          >
            {SORT_MODES.map((m) => (
              <ToggleButton key={m.value} value={m.value} aria-label={m.label}>
                <Tooltip title={m.label}>{m.icon}</Tooltip>
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          {/* Affichage liste/colonnes des cartes (même motif que `GmInventoryPanel`) — sans
              intérêt en mode recherche (liste plate déjà compacte), masqué dans ce cas. */}
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

        {/* Rangée des boutons d'INTERACTION (catégorie/PNJ), TOUJOURS à part de la rangée
            d'AFFICHAGE ci-dessus — même découpage que `GmInventoryPanel` (« Nouvelle
            catégorie » + « Ajouter un objet » sur la même ligne). */}
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
            icon={<AddIcon />}
            label="Nouveau PNJ"
            onClick={() => setDialogTarget('create')}
            iconOnly={iconOnly}
          />
        </Stack>

        {loading ? (
          <Stack spacing={0.75} aria-hidden>
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="rounded" height={64} />
            <Skeleton variant="rounded" height={64} />
          </Stack>
        ) : npcs.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Aucun PNJ pour l’instant. Créez-en un ci-dessus pour le retrouver ici.
          </Typography>
        ) : searching ? (
          // Recherche active : liste PLATE (catégories masquées), triée selon le tri actif.
          visibleNpcs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aucun PNJ ne correspond à « {search.trim()} ».
            </Typography>
          ) : (
            <Stack spacing={0.75}>
              {sortNpcs(visibleNpcs, sortMode).map((npc) => (
                <NpcCard
                  key={npc.id}
                  npc={npc}
                  onEdit={() => setDialogTarget(npc)}
                  onDelete={() => handleDelete(npc.id)}
                  onExport={() => handleExport(npc)}
                  onCopyJson={() => handleCopyJson(npc)}
                  busy={busy}
                />
              ))}
            </Stack>
          )
        ) : (
          <Stack spacing={1.5}>
            {categories.map((cat) => (
              <NpcCategoryGroup
                key={cat.id}
                categoryId={cat.id}
                name={cat.name}
                collapsed={cat.collapsed}
                npcs={sortNpcs(
                  visibleNpcs.filter((n) => n.categoryId === cat.id),
                  sortMode,
                )}
                onToggleCollapsed={() => handleToggleCollapsed(cat.id)}
                onRename={(name) => handleRenameCategory(cat.id, name)}
                onRemoveCategory={() => handleRemoveCategory(cat.id)}
                onEdit={(npc) => setDialogTarget(npc)}
                onDelete={handleDelete}
                onExport={handleExport}
                onCopyJson={handleCopyJson}
                busy={busy}
                layout={layout}
              />
            ))}
            {(uncategorized.length > 0 || categories.length === 0) && (
              <NpcCategoryGroup
                categoryId={null}
                name="Sans catégorie"
                collapsed={false}
                npcs={sortNpcs(uncategorized, sortMode)}
                onEdit={(npc) => setDialogTarget(npc)}
                onDelete={handleDelete}
                onExport={handleExport}
                onCopyJson={handleCopyJson}
                busy={busy}
                layout={layout}
              />
            )}
          </Stack>
        )}

        {dialogTarget !== null && (
          <NpcFormDialog
            open
            onClose={() => setDialogTarget(null)}
            npc={dialogTarget === 'create' ? undefined : dialogTarget}
            campaignCharacters={campaignCharacters}
            existingNames={[
              ...npcs.filter((n) => n.id !== (dialogTarget === 'create' ? '' : dialogTarget.id)).map((n) => n.name),
              ...campaignCharacters.map((c) => c.name),
            ]}
            onSubmit={async (input) => {
              try {
                if (dialogTarget === 'create') {
                  await handleCreate(input);
                  showToast('PNJ créé.', 'success');
                } else {
                  await handleUpdate(dialogTarget, input);
                  showToast('PNJ enregistré.', 'success');
                }
              } catch (e) {
                showToast(`Enregistrement impossible : ${errorMessage(e)}`, 'error');
                throw e;
              }
            }}
          />
        )}
      </Stack>
      {/* `zIndex` explicite : ce panneau vit dans une `Drawer` MUI (z-index 1200, cf.
          `GmNpcDrawer`) — sans lui, le fantôme (999 par défaut) restait peint dessous,
          donc invisible pendant le glisser. Même valeur que `GmLootDrawerHost`. */}
      <DragOverlay zIndex={1400}>{activeDragNpc ? <NpcDragGhost npc={activeDragNpc} /> : null}</DragOverlay>
    </DndContext>
  );
}
