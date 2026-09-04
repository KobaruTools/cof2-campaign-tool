'use client';

/**
 * Dialogue de retour utilisateur (PER-465) : stepper en 4 étapes (Type → Zone →
 * Détails → Récapitulatif), branché sur `/api/feedback` (PER-463/464).
 *
 * Découpage coque/corps (comme `AddCreatureDialog`) : la COQUE (`FeedbackDialog`,
 * exportée) est montée en PERMANENCE par `FeedbackButton` — c'est ELLE qui porte
 * `open`, donc React ne la démonte jamais. Le CORPS (`FeedbackDialogBody`) est
 * l'enfant du `Dialog` MUI, qui ne le monte QUE pendant `open` (`keepMounted`
 * par défaut à `false`) : chaque ouverture instancie un corps neuf, d'où
 * l'initialisation directe de ses `useState` (pas de `setState` dans un effet).
 * Mettre les hooks (présélection du personnage, etc.) dans la coque au lieu du
 * corps les figerait à l'état lu au CHARGEMENT DE LA PAGE (store pas encore
 * hydraté/chargé) plutôt qu'à l'ouverture réelle du dialogue.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { ZONE_LABEL } from '@/lib/feedback/buildFeedbackIssue';
import {
  FEEDBACK_KINDS,
  FEEDBACK_ZONES,
  FEEDBACK_ZONES_WITH_CHARACTER,
  type FeedbackKind,
  type FeedbackZone,
} from '@/lib/feedback/types';
import { buildCharacterExportBlob } from '@/lib/character/transferExport';
import { useCharacterSlugIndex } from '@/lib/routing/slug';
import { useIsPlayerSession } from '@/lib/supabase/useIsPlayerSession';
import { useCharactersStore } from '@/stores/characters';

const STEP_LABELS = ['Type', 'Zone', 'Détails', 'Récapitulatif'] as const;

const KIND_UI_LABEL: Record<FeedbackKind, string> = {
  bug: 'Bug technique',
  'rule-error': 'Erreur de règle ou de contenu',
  idea: 'Idée de fonctionnalité',
};

export function FeedbackDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <FeedbackDialogBody onClose={onClose} />
    </Dialog>
  );
}

function FeedbackDialogBody({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { playerId } = useIsPlayerSession();
  const characters = useCharactersStore((s) => s.characters);
  const loadCharacters = useCharactersStore((s) => s.load);
  const slugIndex = useCharacterSlugIndex();

  // Chargement best-effort : idempotent côté store (aucun refetch si déjà prêt), utile
  // si le dialogue s'ouvre sur une page qui n'a pas déjà monté le store (Bestiaire…).
  useEffect(() => {
    void loadCharacters();
  }, [loadCharacters]);

  const candidateCharacters = useMemo(
    () => (playerId ? characters.filter((c) => c.playerId === playerId) : characters),
    [characters, playerId],
  );

  const [step, setStep] = useState(0);
  const [kind, setKind] = useState<FeedbackKind | null>(null);
  const [zone, setZone] = useState<FeedbackZone | null>(null);
  const [description, setDescription] = useState('');
  const [screenshots, setScreenshots] = useState<File[]>([]);
  // Présélection au MONTAGE : si on est déjà sur la fiche d'un personnage
  // (`/character/<slug-ou-id>`). `Dialog` remonte ce composant à chaque ouverture
  // (cf. en-tête du fichier), donc l'initialiseur paresseux suffit — pas besoin de
  // re-suivre la navigation pendant que le dialogue reste ouvert.
  const [attachCharacterId, setAttachCharacterId] = useState(() => {
    const match = /^\/character\/([^/]+)/.exec(pathname ?? '');
    const segment = match?.[1];
    if (!segment) return '';
    const found = candidateCharacters.find(
      (c) => c.id === segment || slugIndex.get(c.id) === segment,
    );
    return found?.id ?? '';
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const wantsCharacter = zone != null && FEEDBACK_ZONES_WITH_CHARACTER.includes(zone);

  const canNext =
    step === 0 ? kind != null : step === 1 ? zone != null : step === 2 ? description.trim() !== '' : true;

  const handleClose = () => {
    if (submitting) return; // pas de fermeture pendant un envoi en cours
    onClose();
  };

  const handleSubmit = async () => {
    if (!kind || !zone) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const form = new FormData();
      form.set('kind', kind);
      form.set('zone', zone);
      form.set('description', description);
      form.set('path', pathname ?? '/');
      for (const file of screenshots) form.append('files', file);
      if (attachCharacterId) {
        const character = characters.find((c) => c.id === attachCharacterId);
        if (character) {
          const { blob, filename } = await buildCharacterExportBlob(character);
          form.append('files', new File([blob], filename, { type: 'application/json' }));
        }
      }
      const response = await fetch('/api/feedback', { method: 'POST', body: form });
      const json = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !json?.url) {
        throw new Error(json?.error ?? "Échec de l'envoi du retour.");
      }
      setResultUrl(json.url);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <DialogTitle>Donner un retour</DialogTitle>
      <DialogContent>
        {resultUrl ? (
          <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 3 }}>
            <CheckCircleOutlineIcon color="success" sx={{ fontSize: 48 }} />
            <Typography variant="h6">Merci pour ton retour !</Typography>
          </Stack>
        ) : (
          <Stack spacing={3} sx={{ pt: 1 }}>
            <Stepper activeStep={step} alternativeLabel>
              {STEP_LABELS.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {step === 0 && (
              <RadioGroup value={kind ?? ''} onChange={(e) => setKind(e.target.value as FeedbackKind)}>
                {FEEDBACK_KINDS.map((k) => (
                  <FormControlLabel key={k} value={k} control={<Radio />} label={KIND_UI_LABEL[k]} />
                ))}
              </RadioGroup>
            )}

            {step === 1 && (
              <RadioGroup value={zone ?? ''} onChange={(e) => setZone(e.target.value as FeedbackZone)}>
                {FEEDBACK_ZONES.map((z) => (
                  <FormControlLabel key={z} value={z} control={<Radio />} label={ZONE_LABEL[z]} />
                ))}
              </RadioGroup>
            )}

            {step === 2 && (
              <Stack spacing={2}>
                <TextField
                  autoFocus
                  label="Décris le problème ou ton idée"
                  multiline
                  minRows={4}
                  fullWidth
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />

                <Box>
                  <Button
                    variant="outlined"
                    startIcon={<AttachFileIcon />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Ajouter des captures d’écran
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    hidden
                    onChange={(e) => {
                      const files = Array.from(e.target.files ?? []);
                      e.target.value = '';
                      if (files.length === 0) return;
                      setScreenshots((prev) => [...prev, ...files]);
                    }}
                  />
                  {screenshots.length > 0 && (
                    <Stack spacing={1} sx={{ mt: 1.5 }}>
                      {screenshots.map((file, i) => (
                        <Stack
                          key={`${file.name}-${i}`}
                          direction="row"
                          spacing={1}
                          sx={{
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1,
                            pl: 1.5,
                            borderRadius: 1.5,
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            bgcolor: 'rgba(0, 0, 0, 0.20)',
                          }}
                        >
                          <Typography variant="body2" sx={{ minWidth: 0 }} noWrap>
                            {file.name}
                          </Typography>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() =>
                              setScreenshots((prev) => prev.filter((_, j) => j !== i))
                            }
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      ))}
                    </Stack>
                  )}
                </Box>

                {wantsCharacter && (
                  <TextField
                    select
                    label="Joindre un personnage (optionnel)"
                    value={attachCharacterId}
                    onChange={(e) => setAttachCharacterId(e.target.value)}
                    helperText="Le MJ pourra importer directement cette fiche pour reproduire le problème."
                  >
                    <MenuItem value="">Aucun</MenuItem>
                    {candidateCharacters.map((c) => (
                      <MenuItem key={c.id} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              </Stack>
            )}

            {step === 3 && (
              <Stack spacing={1.5}>
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body1">{kind ? KIND_UI_LABEL[kind] : '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Zone
                  </Typography>
                  <Typography variant="body1">{zone ? ZONE_LABEL[zone] : '—'}</Typography>
                </Box>
                <Box>
                  <Typography variant="overline" color="text.secondary">
                    Détails
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                    {description}
                  </Typography>
                </Box>
                {screenshots.length > 0 && (
                  <Typography variant="body2" color="text.secondary">
                    {screenshots.length} capture(s) d’écran jointe(s).
                  </Typography>
                )}
                {attachCharacterId && (
                  <Typography variant="body2" color="text.secondary">
                    Personnage joint :{' '}
                    {characters.find((c) => c.id === attachCharacterId)?.name ?? attachCharacterId}
                  </Typography>
                )}
                {submitError && <AppAlert severity="error">{submitError}</AppAlert>}
              </Stack>
            )}
          </Stack>
        )}
      </DialogContent>
      {!resultUrl && (
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClose} disabled={submitting}>
            Annuler
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          {step > 0 && (
            <Button onClick={() => setStep((s) => s - 1)} disabled={submitting}>
              Précédent
            </Button>
          )}
          {step < STEP_LABELS.length - 1 ? (
            <Button variant="contained" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
              Suivant
            </Button>
          ) : (
            <Button
              variant="contained"
              disabled={submitting}
              onClick={() => void handleSubmit()}
              startIcon={submitting ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {submitting ? 'Envoi…' : submitError ? 'Réessayer' : 'Envoyer'}
            </Button>
          )}
        </DialogActions>
      )}
    </>
  );
}
