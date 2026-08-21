'use client';

/**
 * Don d'un objet à un AUTRE joueur de la campagne, sans validation du MJ (PER-388 — cas
 * déclencheur : un objet magique fabriqué par l'enchanteur, p. 157, qu'il n'avait jusqu'ici
 * aucun moyen de transmettre). Bouton AUTONOME (même esprit que `CrystalAssignmentSelect`,
 * PER-360) : il lit lui-même le roster de la campagne plutôt que de faire descendre la liste des
 * personnages à travers `EquipmentList`. Rendu à côté du bouton « Supprimer » d'une ligne
 * d'inventaire ; masqué hors campagne (rien à quoi donner) ou en lecture seule (câblage côté
 * appelant, `EquipmentList`).
 */
import { useState } from 'react';
import RedeemOutlinedIcon from '@mui/icons-material/RedeemOutlined';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useCharactersStore } from '@/stores/characters';
import {
  canGiveEquipmentLine,
  isSplittableEquipmentLine,
  maxGivableQuantity,
} from '@/lib/character/itemTransfer';
import type { EquipmentLine } from '@/lib/character/types';
import { equipmentLabel } from '@/components/wizard/helpers';
import { AppAlert } from '@/components/AppAlert';
import { AppTooltip } from '@/components/AppTooltip';

export interface GiveItemButtonProps {
  campaignId: string;
  /** Personnage DONNEUR (pour l'exclure du choix de destinataire). */
  ownCharacterId: string;
  line: EquipmentLine;
  index: number;
  onGive: (index: number, quantity: number, receiverId: string) => Promise<void>;
}

export function GiveItemButton({
  campaignId,
  ownCharacterId,
  line,
  index,
  onGive,
}: GiveItemButtonProps) {
  const characters = useCharactersStore((s) => s.characters);
  const [open, setOpen] = useState(false);
  const [receiverId, setReceiverId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Camarades de table : les personnages de la MÊME campagne réclamés par un joueur, le
  // donneur exclu (même filtre que `CrystalAssignmentSelect`, PER-360).
  const candidates = characters
    .filter((c) => c.campaignId === campaignId && c.playerId !== null && c.id !== ownCharacterId)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  const givable = canGiveEquipmentLine(line);
  const max = maxGivableQuantity(line);
  const splittable = isSplittableEquipmentLine(line);
  const disabled = !givable || candidates.length === 0;

  const handleOpen = () => {
    setReceiverId(candidates[0]?.id ?? '');
    setQuantity(max);
    setError(null);
    setOpen(true);
  };

  const handleConfirm = async () => {
    if (!receiverId) return;
    setBusy(true);
    setError(null);
    try {
      await onGive(index, quantity, receiverId);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppTooltip
        title={
          !givable
            ? 'Déséquiper l’objet avant de le donner'
            : candidates.length === 0
              ? 'Aucun autre joueur dans cette campagne'
              : 'Donner à un autre joueur'
        }
      >
        {/* `span` intercalé : un bouton DÉSACTIVÉ ne reçoit aucun événement de survol, l'infobulle
            ne s'afficherait pas — or c'est justement là qu'elle explique le grisage. */}
        <span style={{ display: 'inline-flex' }} data-glossary-shot="GiveItemButton">
          <IconButton
            size="small"
            onClick={handleOpen}
            disabled={disabled}
            aria-label="Donner à un autre joueur"
          >
            <RedeemOutlinedIcon fontSize="small" />
          </IconButton>
        </span>
      </AppTooltip>
      <Dialog open={open} onClose={() => !busy && setOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Donner « {equipmentLabel(line)} »</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              select
              label="À qui"
              value={receiverId}
              onChange={(e) => setReceiverId(e.target.value)}
              fullWidth
            >
              {candidates.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
            </TextField>
            {splittable && max > 1 ? (
              <TextField
                type="number"
                label="Quantité"
                value={quantity}
                onChange={(e) => setQuantity(Math.min(max, Math.max(1, Number(e.target.value) || 1)))}
                slotProps={{ htmlInput: { min: 1, max } }}
                fullWidth
              />
            ) : max > 1 ? (
              <Typography variant="body2" color="text.secondary">
                Objet entier (×{max}) — ne peut pas se donner en partie.
              </Typography>
            ) : null}
            {error && <AppAlert severity="error">{error}</AppAlert>}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={handleConfirm} disabled={busy || !receiverId} variant="contained">
            Donner
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
