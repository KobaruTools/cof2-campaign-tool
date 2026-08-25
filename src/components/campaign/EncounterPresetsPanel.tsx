'use client';

/**
 * « Bibliothèque de combats préparés » (PER-448) — le MJ compose entre deux séances des
 * rencontres nommées (adversaires, éventuellement alliés/PNJ), réutilisables : les lancer
 * peuple le combat en cours SANS jamais modifier le preset d'origine (`launchEncounterPreset`,
 * `src/lib/session/encounterPreset.ts`).
 *
 * Réutilise TELLE QUELLE la fenêtre d'ajout de créature du combat en cours
 * (`AddCreatureDialog`) pour composer un preset : même sélecteur bestiaire, même saisie
 * manuelle, même champ « nombre d'exemplaires ». Sa visibilité par joueur n'est PAS reprise
 * dans l'entrée du preset — au lancement, le camp seul décide (adversaires masqués par
 * défaut, alliés visibles, cf. `launchEncounterPreset`).
 *
 * Réservé au MJ (RLS 0041) : jamais monté côté joueur/projection.
 */
import { useEffect, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import { useBestiaryStore } from '@/stores/bestiary';
import { useEncounterPresetsStore } from '@/stores/encounterPresets';
import { AppTooltip } from '@/components/AppTooltip';
import { AddCreatureDialog } from './AddCreatureDialog';
import { CUSTOM_CREATURE_FALLBACK_NAME, CUSTOM_CREATURE_SLUG } from '@/lib/session/customCreature';
import {
  ENCOUNTER_PRESET_NOTE_MAX_LENGTH,
  type EncounterPreset,
  type EncounterPresetEntry,
} from '@/lib/session/encounterPreset';
import { SIDE_ACCENT, SIDE_LABELS } from '@/lib/ui/creature';

/** Référence STABLE (pas `?? []` inline) : un littéral neuf à chaque rendu ferait boucler
 * `useSyncExternalStore` (« getSnapshot should be cached ») tant qu'aucun preset n'existe. */
const EMPTY_PRESETS: EncounterPreset[] = [];

export interface EncounterPresetsPanelProps {
  campaignId: string;
  /**
   * Le combat en cours porte-t-il déjà quelque chose (roster non vide ou tour déjà lancé) ?
   * Décide si une confirmation d'écrasement est requise avant de lancer un preset.
   */
  hasCurrentCombat: boolean;
  /** Peuple le combat en cours depuis ce preset (remplace tout, cf. `launchEncounterPreset`). */
  onLaunch: (preset: EncounterPreset) => void;
}

export function EncounterPresetsPanel({ campaignId, hasCurrentCombat, onLaunch }: EncounterPresetsPanelProps) {
  const presets = useEncounterPresetsStore((s) => s.byCampaign[campaignId] ?? EMPTY_PRESETS);
  const status = useEncounterPresetsStore((s) => s.status[campaignId] ?? 'idle');
  const load = useEncounterPresetsStore((s) => s.load);
  const create = useEncounterPresetsStore((s) => s.create);
  const rename = useEncounterPresetsStore((s) => s.rename);
  const setNote = useEncounterPresetsStore((s) => s.setNote);
  const addEntry = useEncounterPresetsStore((s) => s.addEntry);
  const addCustomEntry = useEncounterPresetsStore((s) => s.addCustomEntry);
  const removeEntry = useEncounterPresetsStore((s) => s.removeEntry);
  const duplicate = useEncounterPresetsStore((s) => s.duplicate);
  const remove = useEncounterPresetsStore((s) => s.remove);

  const bestiaryList = useBestiaryStore((s) => s.list);
  const loadBestiaryList = useBestiaryStore((s) => s.loadList);

  useEffect(() => {
    void load(campaignId);
    void loadBestiaryList();
  }, [campaignId, load, loadBestiaryList]);

  const nameOf = (entry: EncounterPresetEntry): string =>
    entry.name ??
    (entry.slug === CUSTOM_CREATURE_SLUG
      ? CUSTOM_CREATURE_FALLBACK_NAME
      : (bestiaryList?.find((c) => c.id === entry.slug)?.name ?? entry.slug));

  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [addEntryFor, setAddEntryFor] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EncounterPreset | null>(null);
  const [launchTarget, setLaunchTarget] = useState<EncounterPreset | null>(null);

  if (status === 'unconfigured') return null;

  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 2.5 },
        bgcolor: 'rgba(30, 30, 34, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        borderColor: 'rgba(255, 255, 255, 0.10)',
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, flexGrow: 1 }}>
          Combats préparés
        </Typography>
        <Button size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
          Nouveau combat
        </Button>
      </Stack>

      {presets.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          Aucun combat préparé pour l&apos;instant. Composez-en un à l&apos;avance : il restera
          disponible d&apos;une séance à l&apos;autre, prêt à lancer.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {presets.map((preset) => (
            <Accordion
              key={preset.id}
              disableGutters
              sx={{ bgcolor: 'rgba(20, 20, 24, 0.5)', '&:before': { display: 'none' } }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ alignItems: 'center', width: '100%', pr: 1, flexWrap: 'wrap', rowGap: 0.5 }}
                >
                  <Typography sx={{ fontWeight: 600 }}>{preset.name}</Typography>
                  <Chip size="small" label={`${preset.entries.length} entrée${preset.entries.length > 1 ? 's' : ''}`} />
                  <Box sx={{ flexGrow: 1 }} />
                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<PlayArrowIcon />}
                    disabled={preset.entries.length === 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasCurrentCombat) setLaunchTarget(preset);
                      else onLaunch(preset);
                    }}
                  >
                    Lancer
                  </Button>
                  <AppTooltip title="Dupliquer">
                    <IconButton
                      size="small"
                      aria-label="Dupliquer ce combat préparé"
                      onClick={(e) => {
                        e.stopPropagation();
                        void duplicate(campaignId, preset.id);
                      }}
                    >
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </AppTooltip>
                  <AppTooltip title="Supprimer">
                    <IconButton
                      size="small"
                      aria-label="Supprimer ce combat préparé"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(preset);
                      }}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </AppTooltip>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={1.5}>
                  <TextField
                    size="small"
                    label="Nom"
                    defaultValue={preset.name}
                    onBlur={(e) => {
                      if (e.target.value.trim() !== preset.name) void rename(campaignId, preset.id, e.target.value);
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
                      if (e.target.value.trim() !== (preset.note ?? '')) void setNote(campaignId, preset.id, e.target.value);
                    }}
                  />

                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                      Composition
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    <Button size="small" startIcon={<AddIcon />} onClick={() => setAddEntryFor(preset.id)}>
                      Ajouter des créatures
                    </Button>
                  </Stack>

                  {preset.entries.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Composition vide.
                    </Typography>
                  ) : (
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', rowGap: 1 }}>
                      {preset.entries.map((entry, index) => (
                        <Chip
                          key={index}
                          label={`${nameOf(entry)}${entry.count > 1 ? ` ×${entry.count}` : ''} — ${SIDE_LABELS[entry.side]}`}
                          onDelete={() => void removeEntry(campaignId, preset.id, index)}
                          sx={{
                            color: SIDE_ACCENT[entry.side],
                            bgcolor: alpha(SIDE_ACCENT[entry.side], 0.16),
                          }}
                        />
                      ))}
                    </Stack>
                  )}
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Stack>
      )}

      {/* Création d'un preset : juste un nom, la composition se remplit ensuite. */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nouveau combat préparé</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            size="small"
            label="Nom"
            placeholder="Ex. Embuscade au pont"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Annuler</Button>
          <Button
            variant="contained"
            disabled={!createName.trim()}
            onClick={() => {
              void create(campaignId, createName);
              setCreateName('');
              setCreateOpen(false);
            }}
          >
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Ajout de créatures à la composition d'un preset : LA MÊME modale que le combat en
          cours — sa visibilité choisie n'est pas reprise (le lancement la recalcule par camp). */}
      <AddCreatureDialog
        open={addEntryFor !== null}
        onClose={() => setAddEntryFor(null)}
        onAdd={(slug, options) => addEntryFor && void addEntry(campaignId, addEntryFor, slug, options)}
        onAddCustom={(custom, options) =>
          addEntryFor && void addCustomEntry(campaignId, addEntryFor, custom, options)
        }
        editing={null}
        onSave={() => {}}
      />

      {/* Suppression d'un preset (irréversible, mais un preset n'affecte pas le combat en cours). */}
      <Dialog open={deleteTarget !== null} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Supprimer « {deleteTarget?.name} » ?</DialogTitle>
        <DialogContent>
          <DialogContentText>Cette action est irréversible.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (deleteTarget) void remove(campaignId, deleteTarget.id);
              setDeleteTarget(null);
            }}
          >
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Lancement par-dessus un combat en cours non vide : confirmation, remplacement total. */}
      <Dialog open={launchTarget !== null} onClose={() => setLaunchTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Remplacer le combat en cours ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Lancer « {launchTarget?.name} » remplace ENTIÈREMENT le combat en cours (roster,
            points de vie, tour et manche). Le combat préparé lui-même n&apos;est jamais modifié —
            il reste disponible pour être relancé plus tard.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLaunchTarget(null)}>Annuler</Button>
          <Button
            color="error"
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => {
              if (launchTarget) onLaunch(launchTarget);
              setLaunchTarget(null);
            }}
          >
            Remplacer et lancer
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
