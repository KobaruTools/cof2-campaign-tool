'use client';

/**
 * Contenu du tiroir « Butin » de l'écran de MJ (PER-200).
 *
 * Le MJ pré-écrit une réserve d'objets de butin PROPRE à la campagne, puis en PIOCHE
 * UN AU HASARD en jeu (trésor de coffre, récompense, butin sur un adversaire). Le
 * tirage évite les objets déjà servis (non-redoublement) et marque le tiré « servi » ;
 * une fois la réserve épuisée, le MJ la réinitialise. L'objet tiré s'ATTRIBUE en un
 * clic à l'inventaire d'un personnage de la campagne.
 *
 * Les objets sont créés/édités par la MÊME modale que les fiches (`ItemDialog`) et
 * stockés dans leur forme d'inventaire (`EquipmentLine`) : attribuer un objet revient
 * donc à pousser la ligne INTACTE dans l'équipement du personnage (aucune conversion).
 *
 * Données PERSISTÉES sur la campagne (`Campaign.loot`, colonne jsonb, RLS
 * propriétaire) : chaque mutation passe par `useCampaignsStore().update`. La logique
 * de tirage/épuisement vit dans le module PUR `@/lib/campaign/loot`.
 *
 * Glisser-déposer (extension PER-200, inventaire permanent) : chaque ligne est
 * draggable et la liste entière est une zone de dépôt (`RANDOM_POOL_DROP_ID`) —
 * elle accepte un objet venant de l'inventaire permanent (`GmInventoryPanel`, extension
 * du tiroir « Butin »). Le `DndContext` qui orchestre ce glisser-déposer vit dans
 * `GmLootDrawerHost`, PAS ici : ce panneau ne fait que poser les hooks `@dnd-kit`.
 */
import { useMemo, useState, type ReactNode } from 'react';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CasinoIcon from '@mui/icons-material/Casino';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import EditIcon from '@mui/icons-material/Edit';
import GroupsIcon from '@mui/icons-material/Groups';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SavingsIcon from '@mui/icons-material/Savings';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useDndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { CoinPouchCreateDialog } from '@/components/campaign/CoinPouchCreateDialog';
import { CombatLootBatchDialog } from '@/components/campaign/CombatLootBatchDialog';
import { MagicItemGeneratorDialog } from '@/components/campaign/MagicItemGeneratorDialog';
import { ItemDialog } from '@/components/sheet/ItemDialog';
import { useToast } from '@/components/toast/ToastProvider';
import type { Campaign, LootItem } from '@/lib/campaign';
import { addItems as addInventoryItems, moveItemFromLootToInventory } from '@/lib/campaign/gmInventory';
import {
  addLootItems,
  drawLoot,
  duplicateLootItem,
  isExhausted,
  isReserveEmpty,
  remainingCount,
  resetLoot,
} from '@/lib/campaign/loot';
import { effectiveItem, itemType } from '@/lib/character/items';
import type { Character, EquipmentLine } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import { useCampaignsStore } from '@/stores/campaigns';
import { useCharactersStore } from '@/stores/characters';

/** Message d'erreur lisible — gère aussi les erreurs Supabase (objet `{message}`, pas `Error`). */
function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return String(e);
}

/** Génère un identifiant stable pour un nouvel objet (clé de tirage + `key` React). */
function newLootId(): string {
  return crypto.randomUUID();
}

/** Identifiant `@dnd-kit` de la zone de dépôt de la réserve aléatoire (glisser-déposer PER-200). */
export const RANDOM_POOL_DROP_ID = 'gm-loot:random';

/** Identifiant `@dnd-kit` d'une ligne draggable de la réserve aléatoire. */
export function randomItemDragId(itemId: string): string {
  return `gm-loot-item:random:${itemId}`;
}

/** Nom affiché d'une ligne (surcharges de variante incluses, comme sur la fiche). */
function lineName(line: EquipmentLine): string {
  return isCustomItem(line) ? line.name : (effectiveItem(line)?.name ?? line.itemId);
}

/** Description libre éventuelle d'un objet libre (les variantes portent la leur ailleurs). */
function lineDetails(line: EquipmentLine): string | undefined {
  return isCustomItem(line) ? line.details : undefined;
}

/** Icône du type d'objet (mêmes règles que l'inventaire de la fiche). */
function LineIcon({ line }: { line: EquipmentLine }) {
  return <ItemTypeIcon type={itemType(line)} size={18} sx={{ color: 'text.secondary' }} />;
}

/**
 * Une CARTE de la réserve aléatoire : icône, nom, attribution directe (extension
 * PER-200 — auparavant réservée au seul objet TIRÉ), édition, suppression. Draggable
 * EN ENTIER (via sa POIGNÉE — cf. `InventoryItemRow`, même motif : le point de saisie
 * doit rester fixe pour que le fantôme suive le curseur sans décalage) vers
 * l'inventaire permanent — même style de carte bordurée que celui-ci et le fantôme
 * `DragGhost`, pour que les deux réserves se lisent comme un seul système.
 */
function LootRow({
  item,
  campaignCharacters,
  onEdit,
  onRemove,
  onAssign,
  onDuplicate,
  onTransferToInventory,
  busy,
}: {
  item: LootItem;
  campaignCharacters: Character[];
  onEdit: () => void;
  onRemove: () => void;
  onAssign: (character: Character) => void;
  onDuplicate: () => void;
  /** Relocalise vers l'inventaire permanent (mobile — pas de glisser-déposer possible, les
   * deux réserves n'étant jamais visibles en même temps sous `md`, cf. `GmLootDrawer`). */
  onTransferToInventory: () => void;
  busy: boolean;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: randomItemDragId(item.id),
    data: { pool: 'random', itemId: item.id },
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
        <Typography
          sx={{
            flexGrow: 1,
            minWidth: 0,
            fontWeight: 500,
            color: item.served ? 'text.disabled' : 'text.primary',
            textDecoration: item.served ? 'line-through' : 'none',
          }}
          noWrap
        >
          {lineName(item.line)}
        </Typography>
        {item.served && (
          <Typography variant="caption" sx={{ color: 'text.disabled', flexShrink: 0 }}>
            servi
          </Typography>
        )}
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
        {/* Mobile seulement : sous `md`, un seul des deux panneaux est visible à la fois
            (`GmLootDrawer.mobileView`), donc le glisser-déposer entre réserves y est
            impossible — ce bouton en est l'équivalent au clic. */}
        <AppTooltip title="Envoyer vers l'inventaire du MJ">
          <IconButton
            size="small"
            onClick={onTransferToInventory}
            disabled={busy}
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
          >
            <SwapHorizIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
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

/**
 * Zone de dépôt de la réserve aléatoire entière (glisser-déposer PER-200). Pendant un glisser
 * (n'importe où dans les 2 réserves, `useDndContext().active`), un cadre fantôme PREND TOUTE LA
 * HAUTEUR disponible de l'onglet — retour propriétaire : cette réserve occupe une colonne entière
 * du tiroir, contrairement aux catégories compactes de l'inventaire permanent (`CategoryGroup`),
 * donc rien ne justifie de limiter sa taille à une simple ligne.
 */
function RandomPoolDropZone({
  pending,
  children,
}: {
  /** Un objet vient d'être déposé ICI et attend la confirmation serveur (cf. `pendingTarget`). */
  pending: boolean;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: RANDOM_POOL_DROP_ID });
  const { active } = useDndContext();
  const dragging = Boolean(active);
  return (
    <Box
      ref={setNodeRef}
      sx={(theme) => ({
        borderRadius: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        transition: 'border-color 0.15s, background-color 0.15s',
        ...(dragging
          ? {
              minHeight: 'calc(100vh - 320px)',
              p: 1,
              border: '2px dashed',
              borderColor: isOver ? 'warning.main' : alpha(theme.palette.text.secondary, 0.3),
              bgcolor: isOver ? alpha(theme.palette.warning.main, 0.1) : 'transparent',
            }
          : { outline: isOver ? '2px dashed' : 'none', outlineColor: 'warning.main', outlineOffset: 2 }),
      })}
    >
      {/* Objet tout juste déposé ICI, en attente de la confirmation serveur (`update` n'est PAS
          optimiste — cf. `campaigns.ts`). */}
      {pending && !dragging && <Skeleton variant="rounded" height={64} sx={{ borderRadius: 1 }} />}
      {children}
    </Box>
  );
}

export function LootTreasurePanel({
  campaign,
  pending = false,
}: {
  campaign: Campaign;
  /** Un dépôt vise CETTE réserve et attend la confirmation serveur — cf. `pendingTarget`. */
  pending?: boolean;
}) {
  const update = useCampaignsStore((s) => s.update);
  const upsert = useCharactersStore((s) => s.upsert);
  const characters = useCharactersStore((s) => s.characters);
  const { showToast } = useToast();
  const loot = campaign.loot;

  // Personnages RATTACHÉS à cette campagne — cibles de l'attribution du butin.
  const campaignCharacters = useMemo(
    () => characters.filter((c) => c.campaignId === campaign.id),
    [characters, campaign.id],
  );

  // Objet tiré à l'instant — état ÉPHÉMÈRE (non persisté) : mis en avant pour lecture/attribution.
  const [drawn, setDrawn] = useState<LootItem | null>(null);
  // Modale d'objet (`ItemDialog`) : `null` = fermée, `'new'` = création, un index = édition.
  const [dialog, setDialog] = useState<'new' | number | null>(null);
  // Modale du générateur d'objets magiques « selon le livre » (PER-308).
  const [generatorOpen, setGeneratorOpen] = useState(false);
  // Modale du butin de combat en lot (extension PER-200/308).
  const [combatLootOpen, setCombatLootOpen] = useState(false);
  // Création de bourse(s) de pièces (PER-200) — la réserve aléatoire n'a pas de catégories,
  // la bourse rejoint simplement la liste comme n'importe quel autre objet.
  const [coinPouchOpen, setCoinPouchOpen] = useState(false);
  // Verrou pendant l'écriture réseau (évite les tirages concurrents).
  const [busy, setBusy] = useState(false);
  // Confirmation avant de vider TOUTE la réserve (action irréversible).
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  // Ancre du menu « Ajouter à l'inventaire » (liste des persos de la campagne).
  const [addAnchor, setAddAnchor] = useState<HTMLElement | null>(null);

  const total = loot.length;
  const remaining = remainingCount(loot);
  const empty = isReserveEmpty(loot);
  const exhausted = isExhausted(loot);

  /** Persiste une nouvelle réserve ; remonte l'erreur éventuelle en toast. */
  const persist = async (next: LootItem[]): Promise<boolean> => {
    setBusy(true);
    try {
      await update(campaign.id, { loot: next });
      return true;
    } catch (e) {
      showToast(`Enregistrement impossible : ${errorMessage(e)}`, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleDraw = async () => {
    const result = drawLoot(loot, (n) => Math.floor(Math.random() * n));
    if (!result) return; // garde-fou : le bouton est désactivé quand rien n'est piochable
    setDrawn(result.item);
    await persist(result.loot);
  };

  const handleReset = async () => {
    setDrawn(null);
    const ok = await persist(resetLoot(loot));
    if (ok) showToast('Réserve de butin réinitialisée.', 'success');
  };

  /** Vide la réserve entière (action irréversible, confirmée en amont). */
  const handleClearAll = async () => {
    setClearConfirmOpen(false);
    setDrawn(null);
    const ok = await persist([]);
    if (ok) showToast('Réserve de butin vidée.', 'success');
  };

  const handleRemove = async (id: string) => {
    if (drawn?.id === id) setDrawn(null);
    const ok = await persist(loot.filter((l) => l.id !== id));
    if (ok) showToast('Objet supprimé.', 'success');
  };

  /** Valide la modale : ajoute un (ou plusieurs, `bulkCreate`) nouvel objet OU remplace la ligne éditée. */
  const handleDialogConfirm = async (line: EquipmentLine, count?: number) => {
    const target = dialog;
    setDialog(null);
    if (target === 'new') {
      // `count` (bulkCreate) : N CARTES distinctes portant la même ligne, jamais une seule
      // ligne à quantité N (cf. `ItemDialog`).
      const n = Math.max(1, count ?? 1);
      await persist(
        addLootItems(
          loot,
          Array.from({ length: n }, () => ({ id: newLootId(), line })),
        ),
      );
    } else if (typeof target === 'number') {
      await persist(loot.map((l, i) => (i === target ? { ...l, line } : l)));
    }
  };

  const handleDuplicateItem = (itemId: string) => {
    persist(duplicateLootItem(loot, itemId, newLootId()));
  };

  /**
   * Relocalise un objet vers l'inventaire permanent (bouton mobile — équivalent au clic du
   * glisser-déposer, cf. `LootRow.onTransferToInventory`). Atterrit en « Sans catégorie » :
   * le MJ peut ensuite le glisser vers une catégorie, ce glisser LOCAL (au sein du même
   * panneau, une fois affiché) restant possible même sous `md`.
   */
  const handleTransferToInventory = async (itemId: string) => {
    const result = moveItemFromLootToInventory(loot, campaign.gmInventory, itemId, null);
    if (!result) return;
    setBusy(true);
    try {
      await update(campaign.id, { loot: result.loot, gmInventory: result.inventory });
      showToast('Objet envoyé vers l’inventaire du MJ.', 'success');
    } catch (e) {
      showToast(`Enregistrement impossible : ${errorMessage(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  /** Crée `count` bourses IDENTIQUES nommées `name`, ajoutées à la réserve non-servies. */
  const handleCreateCoinPouches = async (name: string, count: number) => {
    const ok = await persist(
      addLootItems(
        loot,
        Array.from({ length: count }, () => ({
          id: newLootId(),
          line: { custom: true as const, name, quantity: 1 },
        })),
      ),
    );
    if (ok) showToast(count > 1 ? `${count} bourses créées.` : 'Bourse créée.', 'success');
  };

  /**
   * Attribue l'objet TIRÉ à l'inventaire d'un personnage de la campagne : pousse sa
   * ligne INTACTE dans l'équipement et persiste via le store `characters` (`upsert` →
   * flush cloud débouncé). N'altère PAS la réserve de butin.
   */
  const handleAddToInventory = (character: Character) => {
    setAddAnchor(null);
    if (!drawn) return;
    upsert({ ...character, equipment: [...character.equipment, drawn.line] });
    showToast(`« ${lineName(drawn.line)} » ajouté à l'inventaire de ${character.name}.`, 'success');
  };

  /**
   * Attribue N'IMPORTE QUEL objet de la réserve (extension PER-200 — pas seulement le
   * TIRÉ) à l'inventaire d'un personnage. N'affecte pas `served` : purement une action
   * d'attribution manuelle en plus du tirage.
   */
  const handleAssignItem = (item: LootItem, character: Character) => {
    upsert({ ...character, equipment: [...character.equipment, item.line] });
    showToast(`« ${lineName(item.line)} » ajouté à l'inventaire de ${character.name}.`, 'success');
  };

  /** Ajoute tout un lot de butin de combat (extension PER-200/308) à la réserve aléatoire. */
  const handleAddCombatLootBatch = async (lines: EquipmentLine[]) => {
    const ok = await persist(
      addLootItems(
        loot,
        lines.map((line) => ({ id: newLootId(), line })),
      ),
    );
    if (ok) showToast(`${lines.length} récompense${lines.length > 1 ? 's' : ''} ajoutée${lines.length > 1 ? 's' : ''} à la réserve.`, 'success');
  };

  /** Met `count` exemplaires d'un objet GÉNÉRÉ « selon le livre » (PER-308) dans la réserve de butin. */
  const handleReserveGeneratedToRandom = async (line: EquipmentLine, count: number) => {
    const ok = await persist(
      addLootItems(
        loot,
        Array.from({ length: count }, () => ({ id: newLootId(), line })),
      ),
    );
    if (ok) showToast(count > 1 ? `${count} exemplaires ajoutés à la réserve.` : `« ${lineName(line)} » ajouté à la réserve.`, 'success');
  };

  /** Met `count` exemplaires d'un objet GÉNÉRÉ dans une catégorie de l'inventaire du MJ. */
  const handleReserveGeneratedToCategory = async (line: EquipmentLine, categoryId: string | null, count: number) => {
    setBusy(true);
    try {
      const next = addInventoryItems(
        campaign.gmInventory,
        Array.from({ length: count }, () => ({ id: newLootId(), line, categoryId })),
      );
      await update(campaign.id, { gmInventory: next });
      showToast(
        count > 1 ? `${count} exemplaires ajoutés à l'inventaire du MJ.` : `« ${lineName(line)} » ajouté à l'inventaire du MJ.`,
        'success',
      );
    } catch (e) {
      showToast(`Enregistrement impossible : ${errorMessage(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  /** Donne `count` exemplaires d'un objet GÉNÉRÉ directement à l'inventaire d'un personnage (PER-308). */
  const handleGiveGenerated = (character: Character, line: EquipmentLine, count: number) => {
    upsert({ ...character, equipment: [...character.equipment, ...Array.from({ length: count }, () => line)] });
    showToast(
      count > 1
        ? `${count} exemplaires ajoutés à l'inventaire de ${character.name}.`
        : `« ${lineName(line)} » ajouté à l'inventaire de ${character.name}.`,
      'success',
    );
  };

  return (
    <Stack spacing={2}>
      {/* Bloc de tirage : bouton principal + compteur + réinitialisation à épuisement. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <AppTooltip title="Piocher un objet">
          <IconButton
            color="warning"
            onClick={handleDraw}
            disabled={busy || remaining === 0}
            sx={{ border: 1, borderColor: 'warning.main' }}
          >
            <CasinoIcon />
          </IconButton>
        </AppTooltip>
        {exhausted && (
          <AppTooltip title="Réinitialiser la réserve">
            <IconButton onClick={handleReset} disabled={busy} sx={{ border: 1, borderColor: 'divider' }}>
              <RestartAltIcon />
            </IconButton>
          </AppTooltip>
        )}
        <Box sx={{ flexGrow: 1 }} />
        {total > 0 && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            <Box
              component="span"
              sx={{ fontWeight: 700, color: remaining === 0 ? 'text.disabled' : 'warning.light' }}
            >
              {remaining}
            </Box>{' '}
            / {total} piochable{total > 1 ? 's' : ''}
          </Typography>
        )}
        <AppTooltip title="Retirer tous les objets de la réserve">
          <span>
            <IconButton
              color="error"
              onClick={() => setClearConfirmOpen(true)}
              disabled={busy || total === 0}
              sx={{ border: 1, borderColor: 'error.main' }}
            >
              <DeleteSweepIcon />
            </IconButton>
          </span>
        </AppTooltip>
      </Stack>

      {/* Objet tiré, mis en avant, avec attribution à un personnage. */}
      {drawn && (
        <Paper
          variant="outlined"
          sx={{ p: 2, bgcolor: 'rgba(255, 193, 7, 0.08)', borderColor: 'warning.dark', borderRadius: 2 }}
        >
          <Typography
            variant="overline"
            sx={{ color: 'warning.light', letterSpacing: 1, display: 'block', mb: 0.5 }}
          >
            Objet tiré
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <LineIcon line={drawn.line} />
            <Typography sx={{ fontWeight: 700 }}>{lineName(drawn.line)}</Typography>
          </Stack>
          {lineDetails(drawn.line) && (
            <Typography variant="body2" sx={{ mt: 0.5, color: 'text.secondary' }}>
              {lineDetails(drawn.line)}
            </Typography>
          )}
          <Box sx={{ mt: 1.5 }}>
            <Tooltip
              title={
                campaignCharacters.length === 0
                  ? 'Aucun personnage rattaché à cette campagne'
                  : 'Ajouter à l’inventaire de…'
              }
            >
              <span>
                <IconButton
                  size="small"
                  onClick={(e) => setAddAnchor(e.currentTarget)}
                  disabled={campaignCharacters.length === 0}
                  sx={{ border: 1, borderColor: 'divider' }}
                >
                  <Inventory2Icon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Menu anchorEl={addAnchor} open={Boolean(addAnchor)} onClose={() => setAddAnchor(null)}>
              {campaignCharacters.map((c) => (
                <MenuItem key={c.id} onClick={() => handleAddToInventory(c)}>
                  {c.name}
                </MenuItem>
              ))}
            </Menu>
          </Box>
        </Paper>
      )}

      {/* États de la réserve. */}
      {empty && (
        <Typography variant="body2" color="text.secondary">
          Aucun objet pour l’instant. Ajoutez des récompenses ci-dessous pour pouvoir en piocher une
          au hasard en jeu.
        </Typography>
      )}
      {exhausted && (
        <Typography variant="body2" color="text.secondary">
          Tous les objets ont été servis. Réinitialisez la réserve pour les rendre à nouveau
          piochables, ou ajoutez-en de nouveaux.
        </Typography>
      )}

      <Divider />

      {/* Réserve : liste + ajout via la modale d'objet des fiches. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: 'text.secondary',
            flexGrow: 1,
          }}
        >
          Réserve
        </Typography>
        <AppTooltip title="Générer selon le livre">
          <IconButton
            size="small"
            color="secondary"
            onClick={() => setGeneratorOpen(true)}
            disabled={busy}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <AutoFixHighIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
        <AppTooltip title="Butin de combat (un lot pour toute l’équipe)">
          <IconButton
            size="small"
            color="secondary"
            onClick={() => setCombatLootOpen(true)}
            disabled={busy}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <GroupsIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
        <AppTooltip title="Ajouter un objet">
          <IconButton
            size="small"
            onClick={() => setDialog('new')}
            disabled={busy}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <PlaylistAddIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
        <AppTooltip title="Bourse de pièces">
          <IconButton
            size="small"
            onClick={() => setCoinPouchOpen(true)}
            disabled={busy}
            sx={{ border: 1, borderColor: 'divider' }}
          >
            <SavingsIcon fontSize="small" />
          </IconButton>
        </AppTooltip>
      </Stack>

      <RandomPoolDropZone pending={pending}>
        <Stack spacing={1}>
          {loot.map((l, i) => (
            <LootRow
              key={l.id}
              item={l}
              campaignCharacters={campaignCharacters}
              onEdit={() => setDialog(i)}
              onRemove={() => handleRemove(l.id)}
              onAssign={(c) => handleAssignItem(l, c)}
              onDuplicate={() => handleDuplicateItem(l.id)}
              onTransferToInventory={() => handleTransferToInventory(l.id)}
              busy={busy}
            />
          ))}
        </Stack>
      </RandomPoolDropZone>

      {/* Modale de création / édition d'objet (PER-214), réutilisée telle quelle. `key`
          remonte la modale à chaque ouverture pour repartir des valeurs initiales. */}
      {dialog !== null && (
        <ItemDialog
          key={dialog}
          open
          onClose={() => setDialog(null)}
          initial={typeof dialog === 'number' ? loot[dialog]?.line : undefined}
          onConfirm={handleDialogConfirm}
          bulkCreate
        />
      )}

      {/* Générateur d'objets magiques « selon le livre » (PER-308). */}
      <MagicItemGeneratorDialog
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        campaignCharacters={campaignCharacters}
        gmInventoryCategories={campaign.gmInventory.categories}
        onReserveToRandom={handleReserveGeneratedToRandom}
        onReserveToCategory={handleReserveGeneratedToCategory}
        onGiveToPlayer={handleGiveGenerated}
      />

      {/* Création de bourse(s) de pièces (PER-200). */}
      <CoinPouchCreateDialog
        open={coinPouchOpen}
        onClose={() => setCoinPouchOpen(false)}
        onConfirm={handleCreateCoinPouches}
      />

      {/* Butin de combat en lot (extension PER-200/308). */}
      <CombatLootBatchDialog
        open={combatLootOpen}
        onClose={() => setCombatLootOpen(false)}
        campaignCharacters={campaignCharacters}
        onAddToRandomReserve={handleAddCombatLootBatch}
      />

      {/* Confirmation avant de vider toute la réserve — action irréversible. */}
      <Dialog open={clearConfirmOpen} onClose={() => setClearConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Retirer tous les objets de la réserve ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Cette action est irréversible. Les {total} objet{total > 1 ? 's' : ''} de la réserve
            (piochables et déjà servis) seront définitivement retirés.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setClearConfirmOpen(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={handleClearAll}>
            Retirer tout
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
