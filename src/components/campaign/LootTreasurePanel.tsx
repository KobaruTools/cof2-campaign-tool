'use client';

/**
 * Contenu de l'onglet « Butin » du tiroir d'outils du MJ (PER-200).
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
 * de tirage/épuisement vit dans le module PUR `@/lib/campaign/loot`. Frère de
 * `TavernRumorsPanel` (même ossature d'onglet).
 */
import { useMemo, useState } from 'react';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import CasinoIcon from '@mui/icons-material/Casino';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { MagicItemGeneratorDialog } from '@/components/campaign/MagicItemGeneratorDialog';
import { ItemDialog } from '@/components/sheet/ItemDialog';
import { useToast } from '@/components/toast/ToastProvider';
import type { Campaign, LootItem } from '@/lib/campaign';
import {
  drawLoot,
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

/** Génère un identifiant stable pour un nouvel objet (clé de tirage + `key` React). */
function newLootId(): string {
  return crypto.randomUUID();
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

export function LootTreasurePanel({ campaign }: { campaign: Campaign }) {
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
  // Verrou pendant l'écriture réseau (évite les tirages concurrents).
  const [busy, setBusy] = useState(false);
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
      showToast(
        `Enregistrement impossible : ${e instanceof Error ? e.message : String(e)}`,
        'error',
      );
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

  const handleRemove = async (id: string) => {
    if (drawn?.id === id) setDrawn(null);
    const ok = await persist(loot.filter((l) => l.id !== id));
    if (ok) showToast('Objet supprimé.', 'success');
  };

  /** Valide la modale : ajoute un nouvel objet OU remplace la ligne éditée, puis persiste. */
  const handleDialogConfirm = async (line: EquipmentLine) => {
    const target = dialog;
    setDialog(null);
    if (target === 'new') {
      await persist([...loot, { id: newLootId(), line, served: false }]);
    } else if (typeof target === 'number') {
      await persist(loot.map((l, i) => (i === target ? { ...l, line } : l)));
    }
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

  /** Met un objet GÉNÉRÉ « selon le livre » (PER-308) dans la réserve de butin. */
  const handleReserveGenerated = async (line: EquipmentLine) => {
    const ok = await persist([...loot, { id: newLootId(), line, served: false }]);
    if (ok) showToast(`« ${lineName(line)} » ajouté à la réserve.`, 'success');
  };

  /** Donne un objet GÉNÉRÉ directement à l'inventaire d'un personnage (PER-308). */
  const handleGiveGenerated = (character: Character, line: EquipmentLine) => {
    upsert({ ...character, equipment: [...character.equipment, line] });
    showToast(`« ${lineName(line)} » ajouté à l'inventaire de ${character.name}.`, 'success');
  };

  return (
    <Stack spacing={2}>
      {/* Bloc de tirage : bouton principal + compteur + réinitialisation à épuisement. */}
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap', rowGap: 1 }}>
        <Button
          variant="contained"
          color="warning"
          startIcon={<CasinoIcon />}
          onClick={handleDraw}
          disabled={busy || remaining === 0}
        >
          Piocher un objet
        </Button>
        {exhausted && (
          <Button
            variant="outlined"
            startIcon={<RestartAltIcon />}
            onClick={handleReset}
            disabled={busy}
          >
            Réinitialiser la réserve
          </Button>
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
                campaignCharacters.length === 0 ? 'Aucun personnage rattaché à cette campagne' : ''
              }
            >
              <span>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Inventory2Icon />}
                  onClick={(e) => setAddAnchor(e.currentTarget)}
                  disabled={campaignCharacters.length === 0}
                >
                  Ajouter à l’inventaire de…
                </Button>
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
        <Button
          variant="outlined"
          size="small"
          color="secondary"
          startIcon={<AutoFixHighIcon />}
          onClick={() => setGeneratorOpen(true)}
          disabled={busy}
        >
          Générer selon le livre
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<PlaylistAddIcon />}
          onClick={() => setDialog('new')}
          disabled={busy}
        >
          Ajouter un objet
        </Button>
      </Stack>

      <Stack spacing={1}>
        {loot.map((l, i) => (
          <Box key={l.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LineIcon line={l.line} />
            <Typography
              sx={{
                flexGrow: 1,
                minWidth: 0,
                fontWeight: 500,
                color: l.served ? 'text.disabled' : 'text.primary',
                textDecoration: l.served ? 'line-through' : 'none',
              }}
            >
              {lineName(l.line)}
            </Typography>
            {l.served && (
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                servi
              </Typography>
            )}
            <Tooltip title="Modifier">
              <span>
                <IconButton size="small" onClick={() => setDialog(i)} disabled={busy}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Supprimer">
              <span>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleRemove(l.id)}
                  disabled={busy}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        ))}
      </Stack>

      {/* Modale de création / édition d'objet (PER-214), réutilisée telle quelle. `key`
          remonte la modale à chaque ouverture pour repartir des valeurs initiales. */}
      {dialog !== null && (
        <ItemDialog
          key={dialog}
          open
          onClose={() => setDialog(null)}
          initial={typeof dialog === 'number' ? loot[dialog]?.line : undefined}
          onConfirm={handleDialogConfirm}
        />
      )}

      {/* Générateur d'objets magiques « selon le livre » (PER-308). */}
      <MagicItemGeneratorDialog
        open={generatorOpen}
        onClose={() => setGeneratorOpen(false)}
        campaignCharacters={campaignCharacters}
        onReserve={handleReserveGenerated}
        onGiveToPlayer={handleGiveGenerated}
      />
    </Stack>
  );
}
