'use client';

/**
 * Câblage URL du tiroir « Butin ». Séparé du tiroir lui-même pour cantonner la lecture
 * de `?loot=` — qui exige une frontière `Suspense`, comme les autres tiroirs de l'écran
 * de MJ.
 *
 * L'ouverture passe par l'URL, en VRAIE ancre (`navigation-real-anchors`) : le bouton
 * Retour du navigateur ferme le tiroir, un lien direct l'ouvre, et Ctrl/⌘+Clic sur le
 * bouton d'ouverture ouvre l'écran de MJ déjà déplié dans un nouvel onglet.
 *
 * Héberge aussi le `DndContext` LOCAL qui orchestre le glisser-déposer ENTRE les deux
 * réserves d'objets (réserve aléatoire de `LootTreasurePanel` ↔ inventaire permanent de
 * `GmInventoryPanel`, extension visuelle du MÊME tiroir — cf. `GmLootDrawer`). Ce
 * `DndContext` est distinct de celui de `gm-screen/page.tsx` (états de combat) : ce
 * tiroir est monté hors de sa portée. Motif repris tel quel (capteurs, collision,
 * `DragOverlay`) de `CombatStatusPalette`/`InitiativeTracker`.
 */
import { useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { categoryDropId } from './GmInventoryPanel';
import { GmLootDrawer, type PendingDropTarget } from './GmLootDrawer';
import { LOOT_PARAM } from './gmToolsMenu';
import { RANDOM_POOL_DROP_ID } from './LootTreasurePanel';
import type { Campaign } from '@/lib/campaign/types';
import {
  moveItemFromInventoryToLoot,
  moveItemFromLootToInventory,
  moveItemToCategory,
} from '@/lib/campaign/gmInventory';
import { effectiveItem, itemType } from '@/lib/character/items';
import type { EquipmentLine } from '@/lib/character/types';
import { isCustomItem } from '@/lib/character/types';
import { useCampaignsStore } from '@/stores/campaigns';

/** Nom du paramètre d'URL qui ouvre le tiroir de butin (booléen : `?loot=1`) — défini
 * dans `gmToolsMenu.tsx` (source unique, cf. son en-tête), réexporté ici pour ne rien
 * changer à l'API externe de ce fichier. */
export { LOOT_PARAM };

/** Payload `@dnd-kit` posé par `LootRow`/`InventoryItemRow` sur l'objet glissé. */
interface LootDragData {
  pool: 'random' | 'permanent';
  itemId: string;
  categoryId?: string | null;
}

function lineName(line: EquipmentLine): string {
  return isCustomItem(line) ? line.name : (effectiveItem(line)?.name ?? line.itemId);
}

function lineDetails(line: EquipmentLine): string | undefined {
  return isCustomItem(line) ? line.details : undefined;
}

/**
 * Carte fantôme suivant le curseur pendant le glisser-déposer d'un objet — même style de
 * carte bordurée que `InventoryItemRow`/`LootRow` (le fantôme EST la carte, pas un aperçu
 * générique) : élévation en plus (`Paper`) pour se détacher visuellement des cartes posées.
 */
function DragGhost({ line }: { line: EquipmentLine }) {
  const details = lineDetails(line);
  return (
    <Paper elevation={6} sx={{ width: 260, p: 1, borderRadius: 1, cursor: 'grabbing' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ItemTypeIcon type={itemType(line)} size={18} />
        <Typography sx={{ fontWeight: 500, flexGrow: 1, minWidth: 0 }} noWrap>
          {lineName(line)}
        </Typography>
      </Box>
      {details && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }} noWrap component="div">
          {details}
        </Typography>
      )}
    </Paper>
  );
}

export function GmLootDrawerHost({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const update = useCampaignsStore((s) => s.update);

  const open = searchParams.get(LOOT_PARAM) === '1';

  const close = () => {
    // `scroll: false` : fermer le tiroir ne doit pas ramener le MJ en haut de l'écran (le
    // combat en cours peut être bien plus bas). On REMPLACE l'entrée plutôt que de revenir en
    // arrière : un lien direct ne doit pas faire sortir du site.
    router.replace(pathname, { scroll: false });
  };

  // Glisser-déposer entre les deux réserves d'objets.
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );
  const [activeDrag, setActiveDrag] = useState<{ line: EquipmentLine } | null>(null);
  // Dépôt en attente de confirmation serveur (retour propriétaire) : `update()` n'est PAS
  // optimiste (cf. `campaigns.ts`) — entre le lâcher et la réponse réseau, l'objet reste dans son
  // ANCIENNE réserve ; cette cible pilote le squelette affiché à l'emplacement VISÉ pendant l'attente.
  const [pendingTarget, setPendingTarget] = useState<PendingDropTarget | null>(null);

  const onDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current as LootDragData | undefined;
    if (!data) return;
    const line =
      data.pool === 'random'
        ? campaign.loot.find((l) => l.id === data.itemId)?.line
        : campaign.gmInventory.items.find((it) => it.id === data.itemId)?.line;
    setActiveDrag(line ? { line } : null);
  };

  const onDragEnd = (event: DragEndEvent) => {
    setActiveDrag(null);
    const data = event.active.data.current as LootDragData | undefined;
    const overId = event.over?.id;
    if (!data || typeof overId !== 'string') return;

    if (data.pool === 'random') {
      // La réserve aléatoire n'a pas de catégories : seul un dépôt dans l'inventaire permanent compte.
      if (!overId.startsWith('gm-inv-cat:')) return;
      const categoryId = overId === categoryDropId(null) ? null : overId.slice('gm-inv-cat:'.length);
      const result = moveItemFromLootToInventory(campaign.loot, campaign.gmInventory, data.itemId, categoryId);
      if (result) {
        setPendingTarget({ pool: 'permanent', categoryId });
        update(campaign.id, { loot: result.loot, gmInventory: result.inventory })
          .catch(() => {})
          .finally(() => setPendingTarget(null));
      }
      return;
    }

    // data.pool === 'permanent'
    if (overId === RANDOM_POOL_DROP_ID) {
      const result = moveItemFromInventoryToLoot(campaign.gmInventory, campaign.loot, data.itemId);
      if (result) {
        setPendingTarget({ pool: 'random' });
        update(campaign.id, { gmInventory: result.inventory, loot: result.loot })
          .catch(() => {})
          .finally(() => setPendingTarget(null));
      }
    } else if (overId.startsWith('gm-inv-cat:')) {
      const categoryId = overId === categoryDropId(null) ? null : overId.slice('gm-inv-cat:'.length);
      if (categoryId !== (data.categoryId ?? null)) {
        setPendingTarget({ pool: 'permanent', categoryId });
        update(campaign.id, { gmInventory: moveItemToCategory(campaign.gmInventory, data.itemId, categoryId) })
          .catch(() => {})
          .finally(() => setPendingTarget(null));
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      autoScroll={{ enabled: false }}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveDrag(null)}
    >
      <GmLootDrawer campaign={campaign} open={open} onClose={close} pendingTarget={pendingTarget} />
      {/* `zIndex` explicite : le tiroir « Butin » est une MUI `Drawer` (portalée, z-index
          `theme.zIndex.drawer` = 1200) ; sans lui, le fantôme (z-index 999 par défaut de
          `DragOverlay`) restait peint EN DESSOUS, donc invisible pendant le glisser. */}
      <DragOverlay zIndex={1400}>{activeDrag ? <DragGhost line={activeDrag.line} /> : null}</DragOverlay>
    </DndContext>
  );
}
