'use client';

/**
 * Contenu de l'onglet « PNJ » du tiroir d'outils du MJ (PER-428 socle + PER-429
 * fiche complète + PER-430 catégories/tri/recherche) : liste de cartes (badge de
 * disposition + sous-titre de rôle), création/édition via `NpcFormDialog`,
 * suppression par ligne, regroupement en catégories renommables/repliables
 * (SŒUR de `GmInventoryPanel`, mais sans glisser-déposer : la recatégorisation
 * passe par un menu par carte, `campaign_npcs.category_id` n'étant pas un tableau
 * `items` mutable en bloc comme `GmInventory`).
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
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
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
  type NpcCategory,
} from '@/lib/campaign/types';
import { useCampaignsStore } from '@/stores/campaigns';
import { useCharactersStore } from '@/stores/characters';
import { NpcFormDialog } from './NpcFormDialog';

type SortMode = 'name' | 'disposition' | 'challenge';

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

/** Une carte de PNJ — même langage visuel que la version PER-429 (accent de disposition à gauche). */
function NpcCard({
  npc,
  categories,
  onEdit,
  onDelete,
  onMoveToCategory,
  busy,
}: {
  npc: Npc;
  categories: NpcCategory[];
  onEdit: () => void;
  onDelete: () => void;
  onMoveToCategory: (categoryId: string | null) => void;
  busy: boolean;
}) {
  const [moveAnchor, setMoveAnchor] = useState<HTMLElement | null>(null);

  return (
    <Box
      sx={(theme) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        p: 1,
        borderRadius: 1,
        border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        borderLeft: `4px solid ${NPC_DISPOSITION_ACCENT[npc.disposition]}`,
      })}
    >
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <Typography sx={{ fontWeight: 600 }}>{npc.name}</Typography>
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
        {(npc.role || npc.ancestryId) && (
          <Typography variant="body2" color="text.secondary" noWrap>
            {[npc.role, npc.ancestryId ? ancestryById.get(npc.ancestryId)?.name : null]
              .filter(Boolean)
              .join(' · ')}
          </Typography>
        )}
      </Box>
      <AppTooltip title="Déplacer vers une catégorie">
        <IconButton size="small" onClick={(e) => setMoveAnchor(e.currentTarget)} disabled={busy}>
          <FolderOutlinedIcon fontSize="small" />
        </IconButton>
      </AppTooltip>
      <Menu anchorEl={moveAnchor} open={Boolean(moveAnchor)} onClose={() => setMoveAnchor(null)}>
        <MenuItem
          selected={npc.categoryId === null}
          onClick={() => {
            setMoveAnchor(null);
            onMoveToCategory(null);
          }}
        >
          Sans catégorie
        </MenuItem>
        {categories.map((cat) => (
          <MenuItem
            key={cat.id}
            selected={npc.categoryId === cat.id}
            onClick={() => {
              setMoveAnchor(null);
              onMoveToCategory(cat.id);
            }}
          >
            {cat.name}
          </MenuItem>
        ))}
      </Menu>
      <Tooltip title="Modifier">
        <span>
          <IconButton size="small" onClick={onEdit} disabled={busy}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
      <Tooltip title="Supprimer">
        <span>
          <IconButton size="small" color="error" onClick={onDelete} disabled={busy}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Box>
  );
}

/** En-tête + corps d'une catégorie (ou du groupe virtuel « Sans catégorie »). */
function NpcCategoryGroup({
  name,
  collapsed,
  npcs,
  categories,
  onToggleCollapsed,
  onRename,
  onRemoveCategory,
  onEdit,
  onDelete,
  onMoveToCategory,
  busy,
}: {
  name: string;
  collapsed: boolean;
  npcs: Npc[];
  categories: NpcCategory[];
  onToggleCollapsed?: () => void;
  onRename?: (name: string) => void;
  onRemoveCategory?: () => void;
  onEdit: (npc: Npc) => void;
  onDelete: (id: string) => void;
  onMoveToCategory: (npcId: string, categoryId: string | null) => void;
  busy: boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(name);

  const commitRename = () => {
    setRenaming(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== name) onRename?.(trimmed);
    else setDraft(name);
  };

  return (
    <Box>
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
        {onRemoveCategory && (
          <AppTooltip title="Supprimer la catégorie (les PNJ repassent « Sans catégorie »)">
            <IconButton size="small" onClick={onRemoveCategory} disabled={busy}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        )}
      </Stack>
      {!collapsed && (
        <Stack spacing={0.75} sx={{ pl: 4.5, pb: 1 }}>
          {npcs.length === 0 ? (
            <Typography variant="caption" sx={{ color: 'text.disabled' }}>
              Aucun PNJ dans cette catégorie.
            </Typography>
          ) : (
            npcs.map((npc) => (
              <NpcCard
                key={npc.id}
                npc={npc}
                categories={categories}
                onEdit={() => onEdit(npc)}
                onDelete={() => onDelete(npc.id)}
                onMoveToCategory={(catId) => onMoveToCategory(npc.id, catId)}
                busy={busy}
              />
            ))
          )}
        </Stack>
      )}
    </Box>
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
    <Stack spacing={2}>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={() => setDialogTarget('create')}
        sx={{ alignSelf: 'flex-start' }}
      >
        Nouveau PNJ
      </Button>

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
          <ToggleButton value="name">Nom</ToggleButton>
          <ToggleButton value="disposition">Disposition</ToggleButton>
          <ToggleButton value="challenge">NC</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

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
          <Button
            variant="text"
            size="small"
            startIcon={<AddIcon fontSize="small" />}
            onClick={() => setNewCategoryOpen(true)}
            sx={{ alignSelf: 'flex-start' }}
            disabled={busy}
          >
            Nouvelle catégorie
          </Button>
        ))}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
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
                categories={categories}
                onEdit={() => setDialogTarget(npc)}
                onDelete={() => handleDelete(npc.id)}
                onMoveToCategory={(catId) => handleMoveToCategory(npc.id, catId)}
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
              name={cat.name}
              collapsed={cat.collapsed}
              npcs={sortNpcs(
                visibleNpcs.filter((n) => n.categoryId === cat.id),
                sortMode,
              )}
              categories={categories}
              onToggleCollapsed={() => handleToggleCollapsed(cat.id)}
              onRename={(name) => handleRenameCategory(cat.id, name)}
              onRemoveCategory={() => handleRemoveCategory(cat.id)}
              onEdit={(npc) => setDialogTarget(npc)}
              onDelete={handleDelete}
              onMoveToCategory={handleMoveToCategory}
              busy={busy}
            />
          ))}
          {(uncategorized.length > 0 || categories.length === 0) && (
            <NpcCategoryGroup
              name="Sans catégorie"
              collapsed={false}
              npcs={sortNpcs(uncategorized, sortMode)}
              categories={categories}
              onEdit={(npc) => setDialogTarget(npc)}
              onDelete={handleDelete}
              onMoveToCategory={handleMoveToCategory}
              busy={busy}
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
  );
}
