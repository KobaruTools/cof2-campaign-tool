'use client';

/**
 * BUTIN DE COMBAT (extension PER-200/308) — génère en un clic un lot de récompenses (une par
 * joueur) après un combat, en répartissant les tirages entre bourse de pièces, potion/parchemin
 * et objet rare (arme/défense/baguette/objet de pouvoir), selon deux curseurs réglables par le
 * MJ. Réutilise `combatLootBatch.ts` (module pur) et `generateMagicItem`/`randomRoll` du
 * générateur d'objets magiques existant — même esprit que `MagicItemGeneratorDialog`, mais en
 * lot plutôt qu'objet par objet.
 *
 * Destination fixe : la réserve aléatoire de butin (décision proprio 2026-08-08) — pas de choix
 * de catégorie d'inventaire du MJ ici, contrairement au générateur d'objets magiques unitaire.
 */
import { useState } from 'react';
import CasinoIcon from '@mui/icons-material/Casino';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { AppTooltip } from '@/components/AppTooltip';
import { ItemTypeIcon } from '@/components/ItemTypeIcon';
import { PageRefText } from '@/components/SourceRef';
import {
  generateCombatLootBatch,
  type CombatLootReward,
} from '@/lib/campaign/combatLootBatch';
import { effectiveItem, itemType } from '@/lib/character/items';
import {
  GAME_FRAME_LABEL,
  randomRoll,
  type GameFrame,
} from '@/lib/character/magicItemGenerator';
import { isCustomItem, type Character, type EquipmentLine } from '@/lib/character/types';

const FRAMES: GameFrame[] = ['classic', 'high', 'low'];

function lineName(line: EquipmentLine): string {
  return isCustomItem(line) ? line.name : (effectiveItem(line)?.name ?? line.itemId);
}

/** Libellé compact d'une récompense pour l'aperçu du lot. */
function rewardKindLabel(reward: CombatLootReward): string {
  if (reward.kind === 'coin') return 'Bourse de pièces';
  switch (reward.magic?.category) {
    case 'potion':
      return 'Potion';
    case 'scroll':
      return 'Parchemin';
    case 'wand':
      return 'Baguette';
    case 'weapon':
      return 'Arme rare';
    case 'defense':
      return 'Objet défensif rare';
    case 'power':
      return 'Objet de pouvoir rare';
    default:
      return 'Objet';
  }
}

/** Une ligne de l'aperçu du lot — icône, nom, libellé de type. */
function RewardRow({ reward }: { reward: CombatLootReward }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
      <ItemTypeIcon type={itemType(reward.line)} size={18} />
      <Typography sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
        {lineName(reward.line)}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
        {rewardKindLabel(reward)}
      </Typography>
    </Box>
  );
}

export function CombatLootBatchDialog({
  open,
  onClose,
  campaignCharacters,
  onAddToRandomReserve,
}: {
  open: boolean;
  onClose: () => void;
  campaignCharacters: Character[];
  /** Ajoute tout le lot à la réserve aléatoire de butin (une carte par récompense). */
  onAddToRandomReserve: (lines: EquipmentLine[]) => void;
}) {
  const [count, setCount] = useState(() => Math.max(1, campaignCharacters.length));
  const [level, setLevel] = useState(() =>
    campaignCharacters.length > 0
      ? Math.round(
          campaignCharacters.reduce((sum, c) => sum + c.level, 0) / campaignCharacters.length,
        )
      : 3,
  );
  const [frame, setFrame] = useState<GameFrame>('classic');
  const [commonPercent, setCommonPercent] = useState(80);
  const [coinPercent, setCoinPercent] = useState(50);
  const [minorRare, setMinorRare] = useState(true);
  const [rewards, setRewards] = useState<CombatLootReward[] | null>(null);

  const close = () => {
    setRewards(null);
    onClose();
  };

  const generate = () => {
    setRewards(
      generateCombatLootBatch(
        {
          count,
          characterLevel: level,
          frame,
          commonRatio: commonPercent / 100,
          coinRatio: coinPercent / 100,
          minorRare,
        },
        randomRoll,
      ),
    );
  };

  const confirm = () => {
    if (!rewards) return;
    onAddToRandomReserve(rewards.map((r) => r.line));
    close();
  };

  return (
    <Dialog open={open} onClose={close} maxWidth="sm" fullWidth data-glossary-shot="CombatLootBatchDialog">
      <DialogTitle>Butin de combat</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            <PageRefText>
              Génère un lot de récompenses (une par joueur), réparties entre bourse de pièces,
              potion/parchemin et objet rare. Le barème des bourses par niveau et la répartition
              par tirage sont des choix de table (le livre n’a pas de table unique de trésor,
              p. 245) — ajustables ci-dessous.
            </PageRefText>
          </Typography>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Nombre de récompenses"
              type="number"
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
              size="small"
              slotProps={{
                htmlInput: { min: 1, max: 20 },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <AppTooltip title="Pré-rempli au nombre de PJ de la campagne.">
                        <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </AppTooltip>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: 200 }}
            />
            <TextField
              label="Niveau des PJ"
              type="number"
              value={level}
              onChange={(e) => setLevel(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              size="small"
              slotProps={{
                htmlInput: { min: 1, max: 20 },
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <AppTooltip title="Pré-rempli à la moyenne des PJ de la campagne. Manuel — sans lien avec les adversaires du combat.">
                        <InfoOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                      </AppTooltip>
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: 140 }}
            />
            <TextField
              select
              label="Cadre de jeu"
              value={frame}
              onChange={(e) => setFrame(e.target.value as GameFrame)}
              size="small"
              fullWidth
            >
              {FRAMES.map((f) => (
                <MenuItem key={f} value={f}>
                  {GAME_FRAME_LABEL[f]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Récompenses courantes (bourse/potion/parchemin) vs rares (arme/défense/baguette/objet
              de pouvoir) : {commonPercent}% / {100 - commonPercent}%
            </Typography>
            <Slider
              value={commonPercent}
              onChange={(_, v) => setCommonPercent(v as number)}
              step={5}
              min={0}
              max={100}
              size="small"
            />
          </Box>

          <Box>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Dans la part courante, bourse de pièces vs potion/parchemin : {coinPercent}% /{' '}
              {100 - coinPercent}%
            </Typography>
            <Slider
              value={coinPercent}
              onChange={(_, v) => setCoinPercent(v as number)}
              step={5}
              min={0}
              max={100}
              size="small"
            />
          </Box>

          <FormControlLabel
            control={<Switch checked={minorRare} onChange={(e) => setMinorRare(e.target.checked)} />}
            label={<PageRefText>Objets rares mineurs (colonne du niveau ÷ 2, p. 244)</PageRefText>}
          />

          <Button variant="contained" color="secondary" startIcon={<CasinoIcon />} onClick={generate}>
            {rewards ? 'Régénérer' : 'Générer le lot'}
          </Button>

          {rewards && (
            <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
              <Typography variant="overline" sx={{ color: 'text.secondary', display: 'block', mb: 0.5 }}>
                Lot généré ({rewards.length})
              </Typography>
              {rewards.map((r, i) => (
                <RewardRow key={i} reward={r} />
              ))}
            </Paper>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Fermer</Button>
        <Box sx={{ flexGrow: 1 }} />
        <Button
          variant="outlined"
          startIcon={<PlaylistAddIcon />}
          disabled={!rewards}
          onClick={confirm}
        >
          Ajouter le lot à la réserve aléatoire
        </Button>
      </DialogActions>
    </Dialog>
  );
}
