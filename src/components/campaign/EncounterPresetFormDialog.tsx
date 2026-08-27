'use client';

/**
 * Modale d'édition d'un combat préparé (PER-448, retour propriétaire) : nom, note
 * libre et composition, dans UNE SEULE modale — le pendant de `NpcFormDialog` pour
 * les combats préparés, mais en écriture IMMÉDIATE champ par champ (comme le reste
 * du panneau) plutôt qu'un brouillon soumis d'un coup.
 *
 * L'ajout de créatures (`AddCreatureDialog`) N'EST PAS imbriqué dans cette modale
 * (retour propriétaire — « on ne peut plus ajouter de créatures ») : deux `Dialog`
 * MUI parent/enfant se disputent le piège de focus (`enforceFocus`), ce qui rend
 * l'imbriquée inutilisable une fois ouverte au-dessus de la première. `onAddCreatures`
 * délègue donc l'ouverture au PANNEAU (`EncounterPresetsPanel`), qui rend les deux
 * modales en SŒURS — cas nested/stacked que MUI supporte correctement.
 *
 * Ouverte depuis le crayon d'une carte de `EncounterPresetsPanel` (jamais en mode
 * création — un preset est créé vide, nommé, puis ouvert ici pour être composé).
 */
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useBestiaryStore } from '@/stores/bestiary';
import { useEncounterPresetsStore } from '@/stores/encounterPresets';
import { useToast } from '@/components/toast/ToastProvider';
import { CUSTOM_CREATURE_FALLBACK_NAME, CUSTOM_CREATURE_SLUG, customCreatureBlob } from '@/lib/session/customCreature';
import {
  ENCOUNTER_PRESET_NOTE_MAX_LENGTH,
  type EncounterPreset,
  type EncounterPresetEntry,
} from '@/lib/session/encounterPreset';
import { EncounterPresetEntryCard } from './EncounterPresetEntryCard';

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (e && typeof e === 'object' && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return String(e);
}

/** Même grille que le roster de l'écran de MJ (`GRID_SX`, `gm-screen/page.tsx`), en 2
 * colonnes max — cette modale est moins large que la page complète. */
const ENTRY_GRID_SX = {
  display: 'grid',
  gridTemplateColumns: { xs: 'minmax(0, 1fr)', sm: 'repeat(2, minmax(0, 1fr))' },
  gap: 2,
} as const;

export interface EncounterPresetFormDialogProps {
  open: boolean;
  onClose: () => void;
  campaignId: string;
  preset: EncounterPreset;
  /** Ouvre la modale d'ajout de créatures (SŒUR, rendue par le panneau appelant). */
  onAddCreatures: () => void;
  /** Ouvre la modale d'édition de l'entrée `index` (SŒUR, rendue par le panneau appelant —
   * même raison que `onAddCreatures`, MÊME modale `AddCreatureDialog` en mode édition). */
  onEditEntry: (index: number) => void;
}

export function EncounterPresetFormDialog({
  open,
  onClose,
  campaignId,
  preset,
  onAddCreatures,
  onEditEntry,
}: EncounterPresetFormDialogProps) {
  const { showToast } = useToast();
  const rename = useEncounterPresetsStore((s) => s.rename);
  const setNote = useEncounterPresetsStore((s) => s.setNote);
  const removeEntry = useEncounterPresetsStore((s) => s.removeEntry);
  const duplicateEntry = useEncounterPresetsStore((s) => s.duplicateEntry);
  const bestiaryList = useBestiaryStore((s) => s.list);

  const nameOf = (entry: EncounterPresetEntry): string =>
    entry.name ??
    (entry.slug === CUSTOM_CREATURE_SLUG
      ? CUSTOM_CREATURE_FALLBACK_NAME
      : (bestiaryList?.find((c) => c.id === entry.slug)?.name ?? entry.slug));

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Modifier le combat préparé</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          <TextField
            size="small"
            label="Nom"
            defaultValue={preset.name}
            onBlur={(e) => {
              if (e.target.value.trim() !== preset.name) {
                rename(campaignId, preset.id, e.target.value).catch((err) =>
                  showToast(`Enregistrement impossible : ${errorMessage(err)}`, 'error'),
                );
              }
            }}
          />
          <TextField
            size="small"
            label="Note (facultative)"
            multiline
            minRows={2}
            defaultValue={preset.note ?? ''}
            slotProps={{ htmlInput: { maxLength: ENCOUNTER_PRESET_NOTE_MAX_LENGTH } }}
            onBlur={(e) => {
              if (e.target.value.trim() !== (preset.note ?? '')) {
                setNote(campaignId, preset.id, e.target.value).catch((err) =>
                  showToast(`Enregistrement impossible : ${errorMessage(err)}`, 'error'),
                );
              }
            }}
          />

          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
              Composition
            </Typography>
            <Box sx={{ flexGrow: 1 }} />
            <Button size="small" onClick={onAddCreatures}>
              Ajouter des créatures
            </Button>
          </Stack>

          {preset.entries.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Composition vide.
            </Typography>
          ) : (
            <Box sx={ENTRY_GRID_SX}>
              {preset.entries.map((entry, index) => (
                <EncounterPresetEntryCard
                  key={index}
                  slug={entry.slug}
                  blob={entry.custom ? customCreatureBlob(entry.custom, nameOf(entry)) : undefined}
                  label={`${nameOf(entry)}${entry.count > 1 ? ` ×${entry.count}` : ''}`}
                  side={entry.side}
                  onEdit={() => onEditEntry(index)}
                  onDuplicate={() =>
                    duplicateEntry(campaignId, preset.id, index).catch((err) =>
                      showToast(`Duplication impossible : ${errorMessage(err)}`, 'error'),
                    )
                  }
                  onRemove={() =>
                    removeEntry(campaignId, preset.id, index).catch((err) =>
                      showToast(`Retrait impossible : ${errorMessage(err)}`, 'error'),
                    )
                  }
                />
              ))}
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Fermer</Button>
      </DialogActions>
    </Dialog>
  );
}
