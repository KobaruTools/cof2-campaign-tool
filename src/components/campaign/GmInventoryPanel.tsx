'use client';

/**
 * Panneau « Inventaire du MJ » — réserve PERMANENTE d'objets (extension PER-200), à
 * PART de la réserve piochée au hasard de l'onglet Butin (`LootTreasurePanel`). Le MJ
 * y prépare des objets uniques distribués À LA MAIN (pas de tirage), classés en
 * catégories renommables/repliables.
 *
 * NE POSE PAS son propre `Drawer` : c'est une EXTENSION du tiroir « Outils du MJ »,
 * pas un second tiroir indépendant — quand l'onglet Butin est actif, `GmToolsDrawer`
 * s'élargit et révèle ce panneau accolé à sa gauche (même `Paper`, même voile, même
 * fermeture). Le glisser-déposer entre les deux réserves (ce panneau ↔
 * `LootTreasurePanel`) est orchestré par le `DndContext` LOCAL de `GmToolsDrawerHost`
 * (relocalisation pure, jamais de duplication, cf. `gmInventory.ts`).
 *
 * Données PERSISTÉES sur la campagne (`Campaign.gmInventory`, colonne jsonb) : même
 * motif `persist`/`busy`/toast d'erreur que `LootTreasurePanel`.
 */
import { useState, type MouseEvent, type ReactElement } from 'react';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import DriveFileRenameOutlineIcon from '@mui/icons-material/DriveFileRenameOutline';
import EditIcon from '@mui/icons-material/Edit';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import SavingsIcon from '@mui/icons-material/Savings';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import ViewListIcon from '@mui/icons-material/ViewList';
import { useDndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { alpha, type Theme } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { ItemDialog } from '@/components/sheet/ItemDialog';
import { useToast } from '@/components/toast/ToastProvider';
import { CoinPouchCreateDialog } from '@/components/campaign/CoinPouchCreateDialog';
import { MagicItemGeneratorDialog } from '@/components/campaign/MagicItemGeneratorDialog';
import type { Campaign, GmInventory, GmInventoryItem } from '@/lib/campaign';
import {
  addCategory,
  addItem,
  addItems,
  duplicateItem,
  ensureCategory,
  removeCategory,
  removeItem,
  renameCategory,
  toggleCategoryCollapsed,
  updateItemLine,
} from '@/lib/campaign/gmInventory';
import { effectiveItem, itemType } from '@/lib/character/items';
import type { Character, EquipmentLine } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import { useCampaignsStore } from '@/stores/campaigns';
import { useCharactersStore } from '@/stores/characters';

/** Nom de la catégorie où atterrissent les bourses créées depuis ce panneau (extension PER-200). */
const COIN_POUCH_CATEGORY_NAME = 'Divers';

function newId(): string {
  return crypto.randomUUID();
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
 * Largeur (px, ≥ `sm`) du panneau. Partagée avec `GmToolsDrawer`, qui élargit son
 * `Paper` de cette même valeur quand l'onglet Butin est actif — le panneau occupe
 * exactement l'espace révélé, sans le déborder ni le sous-remplir.
 */
export const GM_INVENTORY_PANEL_WIDTH = 920;

function lineName(line: EquipmentLine): string {
  return isCustomItem(line) ? line.name : (effectiveItem(line)?.name ?? line.itemId);
}

function lineDetails(line: EquipmentLine): string | undefined {
  return isCustomItem(line) ? line.details : undefined;
}

function LineIcon({ line }: { line: EquipmentLine }) {
  return <ItemTypeIcon type={itemType(line)} size={18} sx={{ color: 'text.secondary' }} />;
}

/** Identifiant `@dnd-kit` d'une zone de dépôt de catégorie (`null` → « Sans catégorie »). */
export function categoryDropId(categoryId: string | null): string {
  return `gm-inv-cat:${categoryId ?? 'none'}`;
}

/** Identifiant `@dnd-kit` d'une ligne draggable de l'inventaire permanent. */
export function permanentItemDragId(itemId: string): string {
  return `gm-loot-item:permanent:${itemId}`;
}

/**
 * Une CARTE d'objet (PER-200, retour propriétaire) — même langage visuel que les
 * cartes d'inventaire de fiche (`EquipmentList`, mode colonnes PER-223) : boîte
 * bordurée, en-tête (icône + nom), pied d'actions séparé par un filet. Draggable
 * SEULEMENT depuis sa POIGNÉE (`DragIndicatorIcon`, même motif que `SortableEquipmentCard`
 * de la fiche) — jamais la carte entière : sans poignée, le point de saisie variait
 * selon l'endroit cliqué sur la carte, d'où un décalage curseur/fantôme grandissant
 * (retour propriétaire, carte plus haute que l'ancienne simple ligne).
 */
function InventoryItemRow({
  item,
  campaignCharacters,
  onEdit,
  onRemove,
  onAssign,
  onDuplicate,
  busy,
}: {
  item: GmInventoryItem;
  campaignCharacters: Character[];
  onEdit: () => void;
  onRemove: () => void;
  onAssign: (character: Character) => void;
  onDuplicate: () => void;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: permanentItemDragId(item.id),
    data: { pool: 'permanent', itemId: item.id, categoryId: item.categoryId },
  });
  const [assignAnchor, setAssignAnchor] = useState<HTMLElement | null>(null);
  const details = lineDetails(item.line);

  return (
    <Box
      ref={setNodeRef}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 0.5,
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
        <LineIcon line={item.line} />
        <Typography sx={{ fontWeight: 500, flexGrow: 1, minWidth: 0 }} noWrap>
          {lineName(item.line)}
        </Typography>
      </Box>
      {details && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap>
          {details}
        </Typography>
      )}
      <Divider sx={{ mt: 0.25 }} />
      <Stack direction="row" spacing={0.25} sx={{ justifyContent: 'flex-end' }}>
        <Tooltip title={campaignCharacters.length === 0 ? 'Aucun personnage rattaché à cette campagne' : 'Attribuer à…'}>
          <span>
            <IconButton
              size="small"
              onClick={(e) => setAssignAnchor(e.currentTarget)}
              disabled={campaignCharacters.length === 0}
            >
              <Inventory2Icon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Menu anchorEl={assignAnchor} open={Boolean(assignAnchor)} onClose={() => setAssignAnchor(null)}>
          {campaignCharacters.map((c) => (
            <MenuItem
              key={c.id}
              onClick={() => {
                setAssignAnchor(null);
                onAssign(c);
              }}
            >
              {c.name}
            </MenuItem>
          ))}
        </Menu>
        <AppTooltip title="Dupliquer">
          <IconButton size="small" onClick={onDuplicate} disabled={busy}>
            <ContentCopyIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
        <AppTooltip title="Modifier">
          <IconButton size="small" onClick={onEdit} disabled={busy}>
            <EditIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
        <AppTooltip title="Supprimer">
          <IconButton size="small" color="error" onClick={onRemove} disabled={busy}>
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
      </Stack>
    </Box>
  );
}

/** En-tête + corps d'une catégorie (ou du groupe virtuel « Sans catégorie »). Zone de dépôt. */
function CategoryGroup({
  categoryId,
  name,
  collapsed,
  items,
  campaignCharacters,
  onToggleCollapsed,
  onRename,
  onRemoveCategory,
  onEditItem,
  onRemoveItem,
  onAssignItem,
  onDuplicateItem,
  busy,
  layout,
  pending,
}: {
  categoryId: string | null;
  name: string;
  collapsed: boolean;
  items: GmInventoryItem[];
  campaignCharacters: Character[];
  onToggleCollapsed?: () => void;
  onRename?: (name: string) => void;
  onRemoveCategory?: () => void;
  onEditItem: (itemId: string) => void;
  onRemoveItem: (itemId: string) => void;
  onAssignItem: (itemId: string, character: Character) => void;
  onDuplicateItem: (itemId: string) => void;
  busy: boolean;
  /** Affichage des CARTES de cette catégorie — la catégorie elle-même reste toujours en ligne. */
  layout: 'list' | 'columns';
  /** Un objet vient d'être déposé ICI et attend la confirmation serveur (cf. `pendingCategoryId`). */
  pending: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: categoryDropId(categoryId) });
  // Un glisser est-il EN COURS (n'importe où dans les 2 réserves), et pas seulement sur CETTE
  // catégorie (`isOver`) ? Sert à révéler un emplacement fantôme dans TOUTES les catégories dès
  // le début du glisser (retour propriétaire : « voir où je peux les déposer »).
  const { active } = useDndContext();
  const dragging = Boolean(active);
  const [renaming, setRenaming] = useState(false);
  const [draft, setDraft] = useState(name);
  // Renommage via MODALE (bouton dédié, PER-200) — cohabite avec le renommage inline existant
  // (clic sur le nom) : deux chemins vers la même action, pour la découvrabilité.
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
            {name}
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
          <AppTooltip title="Supprimer la catégorie (les objets repassent « Sans catégorie »)">
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
            // Emplacement FANTÔME — hauteur d'UNE carte, pas plus (retour propriétaire : « que ce
            // ne soit pas gigantesque ») — visible dès le début du glisser, surligné en plus au
            // survol exact (`isOver`, hérité de la catégorie entière).
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
                ...(layout === 'columns' && items.length === 0 && { gridColumn: '1 / -1' }),
              })}
            >
              Déposer ici
            </Box>
          ) : pending ? (
            // Objet tout juste déposé ICI, en attente de la confirmation serveur (`update`
            // n'est PAS optimiste — cf. `campaigns.ts` — sans ce squelette l'objet semblait
            // rester bloqué dans son ancienne réserve le temps de l'aller-retour réseau).
            <Skeleton
              variant="rounded"
              height={40}
              sx={{ borderRadius: 1, ...(layout === 'columns' && items.length === 0 && { gridColumn: '1 / -1' }) }}
            />
          ) : (
            items.length === 0 && (
              <Typography
                variant="caption"
                sx={{ color: 'text.disabled', ...(layout === 'columns' && { gridColumn: '1 / -1' }) }}
              >
                Déposez un objet ici.
              </Typography>
            )
          )}
          {items.map((item) => (
            <InventoryItemRow
              key={item.id}
              item={item}
              campaignCharacters={campaignCharacters}
              onEdit={() => onEditItem(item.id)}
              onRemove={() => onRemoveItem(item.id)}
              onAssign={(c) => onAssignItem(item.id, c)}
              onDuplicate={() => onDuplicateItem(item.id)}
              busy={busy}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

/**
 * Bouton de la barre d'outils du panneau — plein (icône + texte) à partir de `xl`
 * (~1536px, le palier MUI le plus proche de 1400px demandé par le propriétaire),
 * icône seule en dessous : entre `md` et `xl`, ce panneau est plus étroit que sa
 * largeur préférée (`GM_INVENTORY_PANEL_WIDTH`) et les boutons pleins débordaient/
 * se faisaient recouvrir (retour propriétaire, capture d'écran à ~906px).
 */
function ToolbarActionButton({
  icon,
  label,
  onClick,
  disabled,
  color,
  iconOnly,
}: {
  icon: ReactElement;
  label: string;
  onClick: (e: MouseEvent<HTMLElement>) => void;
  disabled?: boolean;
  color?: 'secondary';
  iconOnly: boolean;
}) {
  if (iconOnly) {
    return (
      <AppTooltip title={label}>
        <IconButton
          size="small"
          color={color}
          onClick={onClick}
          disabled={disabled}
          sx={{ border: 1, borderColor: 'divider' }}
        >
          {icon}
        </IconButton>
      </AppTooltip>
    );
  }
  return (
    <Button variant="outlined" size="small" color={color} startIcon={icon} onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  );
}

export interface GmInventoryPanelProps {
  campaign: Campaign;
  /**
   * Catégorie visée par un dépôt EN COURS d'écriture serveur (`undefined` = aucun,
   * `null` = « Sans catégorie ») — cf. `GmToolsDrawerHost.pendingTarget`. Affiche un
   * squelette à l'emplacement, le temps que la mutation `gmInventory`/`loot` revienne.
   */
  pendingCategoryId?: string | null;
  /**
   * Retour au Butin demandé (flèche arrière, visible seulement sous `md` — cf.
   * `GmToolsDrawer.mobileView`) : sous ce seuil, ce panneau occupe TOUT l'écran et masque
   * la colonne normale (donc sa croix de fermeture), sans ce bouton l'utilisateur resterait
   * bloqué ici. `undefined` sur `md` et plus, où les deux colonnes cohabitent déjà.
   */
  onBackToTools?: () => void;
}

export function GmInventoryPanel({ campaign, pendingCategoryId, onBackToTools }: GmInventoryPanelProps) {
  const update = useCampaignsStore((s) => s.update);
  const upsert = useCharactersStore((s) => s.upsert);
  const characters = useCharactersStore((s) => s.characters);
  const { showToast } = useToast();
  const inv = campaign.gmInventory;

  const campaignCharacters = characters.filter((c) => c.campaignId === campaign.id);

  const [busy, setBusy] = useState(false);
  const [dialog, setDialog] = useState<'new' | string | null>(null);
  const [dialogCategoryId, setDialogCategoryId] = useState<string | null>(null);
  const [newCategoryOpen, setNewCategoryOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addMenuAnchor, setAddMenuAnchor] = useState<HTMLElement | null>(null);
  // Préférence d'affichage purement visuelle (pas de persistance : redémarre en liste à chaque ouverture).
  const [layout, setLayout] = useState<'list' | 'columns'>('list');
  // Générateur d'objets magiques « selon le livre » (PER-308, étendu à ce panneau — PER-200).
  const [generatorOpen, setGeneratorOpen] = useState(false);
  // Création de bourse(s) de pièces (PER-200) — atterrissent toujours dans « Divers ».
  const [coinPouchOpen, setCoinPouchOpen] = useState(false);
  // Boutons pleins → icône seule entre `md` et `xl` (retour propriétaire) — cf. `ToolbarActionButton`.
  const iconOnly = useMediaQuery((theme: Theme) => theme.breakpoints.down('xl'));

  const persist = async (next: GmInventory): Promise<boolean> => {
    setBusy(true);
    try {
      await update(campaign.id, { gmInventory: next });
      return true;
    } catch (e) {
      showToast(`Enregistrement impossible : ${errorMessage(e)}`, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    setNewCategoryOpen(false);
    setNewCategoryName('');
    if (!name) return;
    await persist(addCategory(inv, name));
  };

  const handleDialogConfirm = async (line: EquipmentLine, count?: number) => {
    const target = dialog;
    const categoryId = dialogCategoryId;
    setDialog(null);
    if (target === 'new') {
      // `count` (bulkCreate) : N CARTES distinctes portant la même ligne, jamais une seule
      // ligne à quantité N (cf. `ItemDialog`).
      const n = Math.max(1, count ?? 1);
      await persist(
        addItems(
          inv,
          Array.from({ length: n }, () => ({ id: newId(), line, categoryId })),
        ),
      );
    } else if (typeof target === 'string') {
      await persist(updateItemLine(inv, target, line));
    }
  };

  const handleAssign = (item: GmInventoryItem, character: Character) => {
    upsert({ ...character, equipment: [...character.equipment, item.line] });
    showToast(`« ${lineName(item.line)} » ajouté à l'inventaire de ${character.name}.`, 'success');
  };

  const handleDuplicateItem = (itemId: string) => {
    persist(duplicateItem(inv, itemId, newId()));
  };

  /** Objet généré « selon le livre » (PER-308) : atterrit en « Sans catégorie », faute de
   * catégorie évidente pour un tirage aléatoire. */
  const handleReserveGenerated = async (line: EquipmentLine) => {
    const ok = await persist(addItem(inv, { id: newId(), line, categoryId: null }));
    if (ok) showToast(`« ${lineName(line)} » ajouté à l'inventaire.`, 'success');
  };
  const handleGiveGenerated = (character: Character, line: EquipmentLine) => {
    upsert({ ...character, equipment: [...character.equipment, line] });
    showToast(`« ${lineName(line)} » ajouté à l'inventaire de ${character.name}.`, 'success');
  };

  /** Crée `count` bourses IDENTIQUES nommées `name`, dans la catégorie « Divers » (créée si absente). */
  const handleCreateCoinPouches = async (name: string, count: number) => {
    const { inventory: withCategory, categoryId } = ensureCategory(inv, COIN_POUCH_CATEGORY_NAME);
    const withItems = addItems(
      withCategory,
      Array.from({ length: count }, () => ({
        id: newId(),
        line: { custom: true as const, name, quantity: 1 },
        categoryId,
      })),
    );
    const ok = await persist(withItems);
    if (ok) showToast(count > 1 ? `${count} bourses créées.` : 'Bourse créée.', 'success');
  };

  const uncategorized = inv.items.filter(
    (it) => it.categoryId === null || !inv.categories.some((c) => c.id === it.categoryId),
  );

  return (
    <Box
      sx={{
        // Remplit TOUJOURS la largeur reçue de `GmToolsDrawer` (jamais figée à `GM_INVENTORY_
        // PANEL_WIDTH`, qui n'est que le maximum souhaité) — entre `md` et ~1480px de viewport, ce
        // parent est plus étroit (`calc(100% - TOOLS_WIDTH)`) et ce panneau doit s'y adapter, pas
        // débordir.
        width: '100%',
        flexShrink: 0,
        height: '100%',
        overflowY: 'auto',
      }}
    >
      {/* En-tête collé : PAS de croix — ce panneau fait partie du tiroir « Outils du MJ » et se
          ferme avec lui (une seule fermeture pour l'ensemble). Sous `md`, il occupe cependant tout
          l'écran et masque la colonne normale : la flèche arrière (`onBackToTools`) y ramène. */}
      <Box
        sx={(theme) => ({
          position: 'sticky',
          top: 0,
          zIndex: 2,
          px: { xs: 2, sm: 3 },
          py: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          bgcolor: alpha(theme.palette.background.paper, 0.94),
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
        })}
      >
        {onBackToTools && (
          <AppTooltip title="Revenir au butin">
            <IconButton
              size="small"
              onClick={onBackToTools}
              aria-label="Revenir aux outils du MJ"
              sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </AppTooltip>
        )}
        <Typography variant="h6" component="h2" sx={{ fontWeight: 'bold' }}>
          Inventaire du MJ
        </Typography>
      </Box>

      <Box sx={{ px: { xs: 2, sm: 3 }, py: 3 }}>
        {/* Rangée dédiée au texte + au commutateur d'AFFICHAGE (liste/colonnes) — JAMAIS de
            `flexWrap` ici : deux enfants seulement (texte qui rétrécit via `minWidth:0`, commutateur
            figé via `flexShrink:0`), donc TOUJOURS sur la même ligne, quelle que soit la largeur
            (retour propriétaire : plus fiable qu'un simple `flexWrap`, qui les séparait parfois selon
            la largeur exacte du panneau). Rangée SÉPARÉE des boutons d'INTERACTION ci-dessous, pour
            ne jamais brouiller affichage et actions. */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1, minWidth: 0 }}>
            Objets préparés à distribuer à la main — glissez un objet vers ou depuis la réserve
            aléatoire de l’onglet Butin.
          </Typography>
          <ToggleButtonGroup
            value={layout}
            exclusive
            size="small"
            sx={{ flexShrink: 0 }}
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
        </Stack>

        {/* Rangée des boutons d'INTERACTION (catégorie/objet/générateur/bourse), TOUJOURS à part de
            celle ci-dessus — elle seule bascule en icône (`iconOnly`) et peut passer à la ligne. */}
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1, mb: 2 }}>
          {newCategoryOpen ? (
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
              icon={<AddIcon />}
              label="Nouvelle catégorie"
              onClick={() => setNewCategoryOpen(true)}
              disabled={busy}
              iconOnly={iconOnly}
            />
          )}
          <ToolbarActionButton
            icon={<PlaylistAddIcon />}
            label="Ajouter un objet"
            onClick={(e) => {
              // Aucune catégorie créée : pas d'ambiguïté, on ouvre direct « Sans catégorie ».
              if (inv.categories.length === 0) {
                setDialogCategoryId(null);
                setDialog('new');
              } else {
                setAddMenuAnchor(e.currentTarget);
              }
            }}
            disabled={busy}
            iconOnly={iconOnly}
          />
          <Menu anchorEl={addMenuAnchor} open={Boolean(addMenuAnchor)} onClose={() => setAddMenuAnchor(null)}>
            <MenuItem
              onClick={() => {
                setAddMenuAnchor(null);
                setDialogCategoryId(null);
                setDialog('new');
              }}
            >
              Sans catégorie
            </MenuItem>
            {inv.categories.map((cat) => (
              <MenuItem
                key={cat.id}
                onClick={() => {
                  setAddMenuAnchor(null);
                  setDialogCategoryId(cat.id);
                  setDialog('new');
                }}
              >
                {cat.name}
              </MenuItem>
            ))}
          </Menu>
          <ToolbarActionButton
            icon={<AutoFixHighIcon />}
            label="Générer selon le livre"
            color="secondary"
            onClick={() => setGeneratorOpen(true)}
            disabled={busy}
            iconOnly={iconOnly}
          />
          <ToolbarActionButton
            icon={<SavingsIcon />}
            label="Bourse de pièces"
            onClick={() => setCoinPouchOpen(true)}
            disabled={busy}
            iconOnly={iconOnly}
          />
        </Stack>

        {inv.categories.length === 0 && uncategorized.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Aucun objet pour l’instant. Créez une catégorie ou ajoutez directement un objet.
          </Typography>
        )}

        {/* Les CATÉGORIES restent toujours empilées en ligne (jamais en grille) — seules les
            CARTES d'objet à l'intérieur d'une catégorie basculent en colonnes (`layout`,
            propagé à `CategoryGroup`). */}
        <Stack spacing={1.5}>
          {inv.categories.map((cat) => (
            <CategoryGroup
              key={cat.id}
              categoryId={cat.id}
              name={cat.name}
              collapsed={cat.collapsed}
              items={inv.items.filter((it) => it.categoryId === cat.id)}
              campaignCharacters={campaignCharacters}
              onToggleCollapsed={() => persist(toggleCategoryCollapsed(inv, cat.id))}
              onRename={(name) => persist(renameCategory(inv, cat.id, name))}
              onRemoveCategory={() => persist(removeCategory(inv, cat.id))}
              onEditItem={(itemId) => setDialog(itemId)}
              onRemoveItem={(itemId) => persist(removeItem(inv, itemId))}
              onAssignItem={(itemId, character) => {
                const item = inv.items.find((it) => it.id === itemId);
                if (item) handleAssign(item, character);
              }}
              onDuplicateItem={handleDuplicateItem}
              busy={busy}
              layout={layout}
              pending={pendingCategoryId === cat.id}
            />
          ))}
          {/* Rendu aussi si VIDE mais VISÉE par un dépôt en cours (`pendingCategoryId === null`) :
              sans ce garde-fou, le squelette de la carte en attente n'aurait nulle part où
              s'afficher tant qu'aucun objet « Sans catégorie » n'existe déjà. */}
          {(uncategorized.length > 0 || pendingCategoryId === null) && (
            <CategoryGroup
              categoryId={null}
              name="Sans catégorie"
              collapsed={false}
              items={uncategorized}
              campaignCharacters={campaignCharacters}
              onEditItem={(itemId) => setDialog(itemId)}
              onRemoveItem={(itemId) => persist(removeItem(inv, itemId))}
              onAssignItem={(itemId, character) => {
                const item = inv.items.find((it) => it.id === itemId);
                if (item) handleAssign(item, character);
              }}
              onDuplicateItem={handleDuplicateItem}
              busy={busy}
              layout={layout}
              pending={pendingCategoryId === null}
            />
          )}
        </Stack>
      </Box>

      {dialog !== null && (
        <ItemDialog
          key={dialog}
          open
          onClose={() => setDialog(null)}
          initial={typeof dialog === 'string' && dialog !== 'new' ? inv.items.find((it) => it.id === dialog)?.line : undefined}
          onConfirm={handleDialogConfirm}
          bulkCreate
        />
      )}

      {/* Générateur d'objets magiques « selon le livre » (PER-308, étendu à ce panneau). */}
      <MagicItemGeneratorDialog
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        campaignCharacters={campaignCharacters}
        onReserve={handleReserveGenerated}
        onGiveToPlayer={handleGiveGenerated}
      />

      {/* Création de bourse(s) de pièces (PER-200) — atterrit toujours dans « Divers ». */}
      <CoinPouchCreateDialog
        open={coinPouchOpen}
        onClose={() => setCoinPouchOpen(false)}
        onConfirm={handleCreateCoinPouches}
      />
    </Box>
  );
}
