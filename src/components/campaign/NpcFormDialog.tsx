'use client';

/**
 * Formulaire de création/édition d'un PNJ (PER-429) — dialogue plein contenu,
 * ouvert depuis `NpcPanel`. Sépare VISUELLEMENT deux blocs qui ne doivent
 * jamais se mélanger (exigence du ticket) :
 * - « Description » — texte potentiellement montrable un jour, avec sa bascule
 *   `descriptionVisibleToPlayers` (même motif que le recap MJ partagé,
 *   `SessionHistoryList`) ;
 * - « Notes du MJ » — encart à part, bordure/icône dédiées, AUCUNE bascule :
 *   ce champ ne doit jamais fuiter à un joueur, quelle que soit une évolution
 *   future du formulaire.
 *
 * Les personnages liés sont sélectionnés (pas de saisie libre) parmi les
 * personnages RATTACHÉS à la campagne (`Character.campaignId`), même source
 * que `campaignCharacters` dans `LootTreasurePanel`.
 */
import { useState } from 'react';
import LockIcon from '@mui/icons-material/Lock';
import PublicIcon from '@mui/icons-material/Public';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { RichTextEditor } from '@/components/sheet/RichTextEditor';
import type { Character } from '@/lib/character/types';
import {
  NPC_DISPOSITION_LABELS,
  NPC_STATUS_LABELS,
  type Npc,
  type NpcDisposition,
  type NpcStatus,
} from '@/lib/campaign/types';
import type { NpcInput } from '@/lib/campaign/repo';

export interface NpcFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** `undefined` = création, sinon édition du PNJ passé. */
  npc?: Npc;
  /** Personnages RATTACHÉS à la campagne — univers de la sélection multi-PJ. */
  campaignCharacters: Character[];
  onSubmit: (input: NpcInput) => Promise<void>;
}

const DISPOSITIONS: NpcDisposition[] = ['ally', 'neutral', 'enemy'];
const STATUSES: NpcStatus[] = ['not-encountered', 'encountered', 'dead'];

export function NpcFormDialog({
  open,
  onClose,
  npc,
  campaignCharacters,
  onSubmit,
}: NpcFormDialogProps) {
  const [name, setName] = useState(npc?.name ?? '');
  const [role, setRole] = useState(npc?.role ?? '');
  const [location, setLocation] = useState(npc?.location ?? '');
  const [disposition, setDisposition] = useState<NpcDisposition>(npc?.disposition ?? 'neutral');
  const [status, setStatus] = useState<NpcStatus>(npc?.status ?? 'not-encountered');
  const [description, setDescription] = useState(npc?.description ?? '');
  const [descriptionVisibleToPlayers, setDescriptionVisibleToPlayers] = useState(
    npc?.descriptionVisibleToPlayers ?? false,
  );
  const [gmNotes, setGmNotes] = useState(npc?.gmNotes ?? '');
  const [linkedCharacterIds, setLinkedCharacterIds] = useState<string[]>(
    npc?.linkedCharacterIds ?? [],
  );
  const [saving, setSaving] = useState(false);

  const linkedCharacters = campaignCharacters.filter((c) => linkedCharacterIds.includes(c.id));

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSaving(true);
    try {
      await onSubmit({
        name: trimmedName,
        role: role.trim() || null,
        location: location.trim() || null,
        disposition,
        status,
        description: description.trim() || null,
        descriptionVisibleToPlayers,
        gmNotes: gmNotes.trim() || null,
        linkedCharacterIds,
      });
      onClose();
    } catch {
      // Déjà signalé par un toast côté appelant (`NpcPanel`) — le dialogue reste
      // ouvert pour permettre une nouvelle tentative.
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{npc ? `Modifier « ${npc.name} »` : 'Nouveau PNJ'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 0.5 }}>
          <TextField
            label="Nom"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
            fullWidth
          />

          <Stack direction="row" spacing={2}>
            <TextField
              label="Rôle"
              placeholder="ex. « Aubergiste »"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              fullWidth
            />
            <TextField
              label="Lieu"
              placeholder="ex. « Taverne du Sanglier »"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              fullWidth
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Disposition"
              value={disposition}
              onChange={(e) => setDisposition(e.target.value as NpcDisposition)}
              fullWidth
            >
              {DISPOSITIONS.map((d) => (
                <MenuItem key={d} value={d}>
                  {NPC_DISPOSITION_LABELS[d]}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Statut"
              value={status}
              onChange={(e) => setStatus(e.target.value as NpcStatus)}
              fullWidth
            >
              {STATUSES.map((s) => (
                <MenuItem key={s} value={s}>
                  {NPC_STATUS_LABELS[s]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          <Autocomplete
            multiple
            options={campaignCharacters}
            getOptionLabel={(c) => c.name}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            value={linkedCharacters}
            onChange={(_, value) => setLinkedCharacterIds(value.map((c) => c.id))}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Personnages joueurs liés"
                placeholder={campaignCharacters.length === 0 ? 'Aucun personnage dans cette campagne' : ''}
              />
            )}
            disabled={campaignCharacters.length === 0}
          />

          {/* Bloc description — potentiellement publique un jour, bascule de publication. */}
          <Box>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Description
              </Typography>
              <FormControlLabel
                sx={{ mr: 0 }}
                control={
                  <Switch
                    size="small"
                    checked={descriptionVisibleToPlayers}
                    onChange={(e) => setDescriptionVisibleToPlayers(e.target.checked)}
                  />
                }
                label={
                  <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                    {descriptionVisibleToPlayers ? (
                      <PublicIcon fontSize="small" />
                    ) : (
                      <LockIcon fontSize="small" />
                    )}
                    <Typography variant="body2" color="text.secondary">
                      {descriptionVisibleToPlayers ? 'Visible aux joueurs' : 'Privé (MJ uniquement)'}
                    </Typography>
                  </Stack>
                }
                labelPlacement="start"
              />
            </Stack>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Description libre du PNJ…"
            />
          </Box>

          {/* Encart « MJ seul » — visuellement distinct, AUCUNE bascule : jamais montrable. */}
          <Box
            sx={(theme) => ({
              p: 1.5,
              borderRadius: 1,
              border: `1px solid ${alpha(theme.palette.warning.main, 0.4)}`,
              bgcolor: alpha(theme.palette.warning.main, 0.08),
            })}
          >
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', mb: 0.5 }}>
              <LockIcon fontSize="small" color="warning" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                Notes du MJ — jamais visibles des joueurs
              </Typography>
            </Stack>
            <RichTextEditor
              value={gmNotes}
              onChange={setGmNotes}
              placeholder="ex. « En réalité un espion. »"
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={saving || !name.trim()}>
          {npc ? 'Enregistrer' : 'Créer'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
