'use client';

/**
 * Générateur d'objets magiques « selon le livre » (PER-308) — modale ouverte depuis l'onglet
 * Butin (à côté d'« Ajouter un objet »). Le MJ choisit une CATÉGORIE, saisit le NIVEAU du PJ
 * et le CADRE de jeu, puis « Générer » déroule les tables du livre de base (p. 244-255, module
 * pur `magicItemGenerator.ts`) et affiche l'objet obtenu. Sortie TRIPLE (décision proprio) :
 *  - RELANCER pour un autre tirage ;
 *  - « Mettre en réserve » → ajoute l'objet à la réserve de butin ;
 *  - « Donner à un joueur » → pousse l'objet dans l'inventaire d'un personnage de la campagne.
 *
 * L'objet généré est une VRAIE `EquipmentLine` enchantée (réutilise `magicBonus`/`magicDef`/
 * `magicProperties`, câblés en PER-306/307), pas une description libre. Badges CUSTOM (≠ Chip),
 * verbatim de règle en info-bulle (conventions projet).
 */
import { useState } from 'react';
import CasinoIcon from '@mui/icons-material/Casino';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PersonAddAlt1Icon from '@mui/icons-material/PersonAddAlt1';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import ReplayIcon from '@mui/icons-material/Replay';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Menu from '@mui/material/Menu';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { PageRefText } from '@/components/SourceRef';
import { MAGIC_PROPERTY_RULES, magicPropertyLabel } from '@/lib/character/magicItem';
import {
  GAME_FRAME_LABEL,
  generateMagicItem,
  MAGIC_ITEM_CATEGORY_LABEL,
  randomRoll,
  recommendedMagicLevel,
  type GameFrame,
  type GeneratedMagicItem,
  type MagicItemCategory,
} from '@/lib/character/magicItemGenerator';
import type { Character, EquipmentLine, MagicProperty } from '@/lib/character/types';

const CATEGORIES: MagicItemCategory[] = ['potion', 'scroll', 'wand', 'weapon', 'defense', 'power'];
const FRAMES: GameFrame[] = ['classic', 'high', 'low'];

/** Pastille custom d'un enchantement chiffré (+N magique / +N DEF magique). */
function BonusBadge({ label, tooltip }: { label: string; tooltip: React.ReactNode }) {
  return (
    <AppTooltip title={tooltip}>
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-block',
          px: 0.6,
          borderRadius: 0.75,
          fontWeight: 700,
          fontSize: '0.72rem',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          cursor: 'help',
          color: theme.palette.secondary.main,
          bgcolor: alpha(theme.palette.secondary.main, 0.12),
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.45)}`,
        })}
      >
        {label}
      </Box>
    </AppTooltip>
  );
}

/** Pastille custom d'une propriété magique (verbatim + page en info-bulle). */
function PropertyBadge({ property }: { property: MagicProperty }) {
  const rule = MAGIC_PROPERTY_RULES[property.kind];
  return (
    <AppTooltip title={<PageRefText>{`${rule.verbatim} (p. ${rule.sourcePage})`}</PageRefText>} maxWidth={360}>
      <Box
        component="span"
        sx={(theme) => ({
          display: 'inline-block',
          px: 0.6,
          borderRadius: 0.75,
          fontWeight: 700,
          fontSize: '0.72rem',
          lineHeight: 1.4,
          whiteSpace: 'nowrap',
          cursor: 'help',
          color: theme.palette.secondary.main,
          bgcolor: alpha(theme.palette.secondary.main, 0.12),
          border: `1px solid ${alpha(theme.palette.secondary.main, 0.45)}`,
        })}
      >
        {magicPropertyLabel(property)}
      </Box>
    </AppTooltip>
  );
}

/** Aperçu de l'objet généré : nom, niveau de magie/valeur, badges d'enchantement, provenance. */
function GeneratedPreview({ item }: { item: GeneratedMagicItem }) {
  const line = item.line;
  const magicBonus = 'magicBonus' in line ? line.magicBonus : undefined;
  const magicDef = 'magicDef' in line ? line.magicDef : undefined;
  const magicProperties = 'magicProperties' in line ? line.magicProperties : undefined;
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2, bgcolor: 'rgba(156, 39, 176, 0.08)', borderColor: 'secondary.dark', borderRadius: 2 }}
    >
      <Typography variant="overline" sx={{ color: 'secondary.light', letterSpacing: 1, display: 'block', mb: 0.5 }}>
        Objet généré
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
        <Typography sx={{ fontWeight: 700 }}>{item.summary}</Typography>
        {magicBonus ? (
          <BonusBadge
            label={`+${magicBonus} magique`}
            tooltip={<PageRefText>{`Bonus magique de l’arme : +${magicBonus} en attaque et aux dommages (p. 251).`}</PageRefText>}
          />
        ) : null}
        {magicDef ? (
          <BonusBadge
            label={`+${magicDef} DEF magique`}
            tooltip={<PageRefText>{`Bonus de DEF magique : +${magicDef} en défense (p. 253).`}</PageRefText>}
          />
        ) : null}
        {magicProperties?.map((p, i) => <PropertyBadge key={`${p.kind}-${i}`} property={p} />)}
      </Box>

      <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
        {item.magicLevel > 0
          ? `Niveau de magie ${item.magicLevel} · valeur ${item.value.toLocaleString('fr-FR')} po`
          : 'Consommable — niveau de magie 0'}{' '}
        (p. {item.sourcePage})
      </Typography>

      {/* Provenance : la suite des jets de dés, « selon le livre ». */}
      <Box sx={{ mt: 1 }}>
        {item.rolls.map((r, i) => (
          <Typography key={i} variant="caption" sx={{ display: 'block', color: 'text.disabled' }}>
            {r.label} ({r.die} = {r.result}) → {r.outcome}
          </Typography>
        ))}
      </Box>
    </Paper>
  );
}

export function MagicItemGeneratorDialog({
  open,
  onClose,
  campaignCharacters,
  onReserve,
  onGiveToPlayer,
}: {
  open: boolean;
  onClose: () => void;
  campaignCharacters: Character[];
  onReserve: (line: EquipmentLine) => void;
  onGiveToPlayer: (character: Character, line: EquipmentLine) => void;
}) {
  const [category, setCategory] = useState<MagicItemCategory>('weapon');
  const [level, setLevel] = useState(3);
  const [frame, setFrame] = useState<GameFrame>('classic');
  const [minor, setMinor] = useState(false);
  const [item, setItem] = useState<GeneratedMagicItem | null>(null);
  const [giveAnchor, setGiveAnchor] = useState<HTMLElement | null>(null);

  const recommended = recommendedMagicLevel(level, frame, minor);

  const roll = () => {
    setItem(generateMagicItem({ characterLevel: level, frame, category, minor }, randomRoll));
  };

  const handleReserve = () => {
    if (!item) return;
    onReserve(item.line);
    setItem(null);
  };

  const handleGive = (character: Character) => {
    setGiveAnchor(null);
    if (!item) return;
    onGiveToPlayer(character, item.line);
    setItem(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Générer un objet magique</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Le livre ne propose pas de table unique de trésor (p. 245) : il déroule une table par
            catégorie. Choisissez la catégorie, le niveau du personnage et le cadre de jeu.
          </Typography>

          <TextField
            select
            label="Catégorie"
            value={category}
            onChange={(e) => setCategory(e.target.value as MagicItemCategory)}
            size="small"
            fullWidth
          >
            {CATEGORIES.map((c) => (
              <MenuItem key={c} value={c}>
                {MAGIC_ITEM_CATEGORY_LABEL[c]}
              </MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={2}>
            <TextField
              label="Niveau du personnage"
              type="number"
              value={level}
              onChange={(e) => setLevel(Math.min(20, Math.max(1, Number(e.target.value) || 1)))}
              size="small"
              slotProps={{ htmlInput: { min: 1, max: 20 } }}
              sx={{ width: 180 }}
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

          <FormControlLabel
            control={<Switch checked={minor} onChange={(e) => setMinor(e.target.checked)} />}
            label="Objet mineur (colonne du niveau ÷ 2, p. 244)"
          />

          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            Niveau de magie recommandé au niveau {level} ({GAME_FRAME_LABEL[frame].toLowerCase()}
            {minor ? ', mineur' : ''}) :{' '}
            {recommended > 0 ? recommended : 'consommable / aucun (p. 244)'}
          </Typography>

          <Button variant="contained" color="secondary" startIcon={<CasinoIcon />} onClick={roll}>
            {item ? 'Relancer' : 'Générer'}
          </Button>

          {item && <GeneratedPreview item={item} />}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ flexWrap: 'wrap', gap: 1 }}>
        <Button onClick={onClose}>Fermer</Button>
        <Box sx={{ flexGrow: 1 }} />
        {item && (
          <>
            <Button startIcon={<ReplayIcon />} onClick={roll}>
              Relancer
            </Button>
            <Button variant="outlined" startIcon={<PlaylistAddIcon />} onClick={handleReserve}>
              Mettre en réserve
            </Button>
            <AppTooltip
              title={campaignCharacters.length === 0 ? 'Aucun personnage rattaché à cette campagne' : ''}
            >
              <span>
                <Button
                  variant="outlined"
                  startIcon={<PersonAddAlt1Icon />}
                  onClick={(e) => setGiveAnchor(e.currentTarget)}
                  disabled={campaignCharacters.length === 0}
                >
                  Donner à un joueur
                </Button>
              </span>
            </AppTooltip>
            <Menu anchorEl={giveAnchor} open={Boolean(giveAnchor)} onClose={() => setGiveAnchor(null)}>
              {campaignCharacters.map((c) => (
                <MenuItem key={c.id} onClick={() => handleGive(c)}>
                  <Inventory2Icon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                  {c.name}
                </MenuItem>
              ))}
            </Menu>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
