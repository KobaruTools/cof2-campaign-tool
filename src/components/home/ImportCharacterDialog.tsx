'use client';

/**
 * Modale d'import d'un personnage depuis un fichier JSON (PER-* — import
 * enrichi). Trois temps :
 *  1. `idle`/`error` : zone de dépôt (drag'n'drop) + clic pour parcourir ;
 *  2. `loading` : loader pendant la lecture du fichier et la migration ;
 *  3. `success` : micro-fiche résumé du personnage importé, avec accès direct à
 *     sa fiche complète.
 *
 * L'import lui-même délègue à `importCharacter` du store (migration + validation
 * + ajout avec un nouvel id si collision). Le personnage est donc DÉJÀ ajouté au
 * store quand la micro-fiche s'affiche : la modale confirme, elle ne pré-valide
 * pas avant enregistrement.
 */
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { ClassIcon } from '@/components/ClassIcon';
import { ABILITY_IDS } from '@/data/schema';
import type { Character } from '@/lib/character/types';
import { summarize } from '@/lib/character/summary';
import { ABILITY_NAMES } from '@/lib/ui/ability';
import { classColor } from '@/lib/ui/classColors';
import { useCharactersStore } from '@/stores/characters';

/** Durée minimale d'affichage du loader : évite un clignotement sur import rapide. */
const MIN_LOADER_MS = 450;

type ImportState =
  | { status: 'idle' }
  | { status: 'loading'; fileName: string }
  | { status: 'success'; character: Character }
  | { status: 'error'; message: string };

export interface ImportCharacterDialogProps {
  open: boolean;
  onClose: () => void;
  /** Notifié après un import réussi (pour le toast de la page). */
  onImported?: (character: Character) => void;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function ImportCharacterDialog({ open, onClose, onImported }: ImportCharacterDialogProps) {
  const router = useRouter();
  const importCharacter = useCharactersStore((s) => s.importCharacter);

  const [state, setState] = useState<ImportState>({ status: 'idle' });
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const runImport = useCallback(
    async (file: File) => {
      setState({ status: 'loading', fileName: file.name });
      const [result] = await Promise.allSettled([
        (async () => {
          const raw = JSON.parse(await file.text());
          return importCharacter(raw); // lève si invalide
        })(),
        delay(MIN_LOADER_MS),
      ]);

      if (result.status === 'fulfilled') {
        setState({ status: 'success', character: result.value });
        onImported?.(result.value);
        return;
      }
      // On ne laisse jamais remonter de message technique brut : l'erreur de
      // parsing JSON (SyntaxError, libellé en anglais) est reformulée ; les
      // erreurs de migration/validation portent déjà un message français clair.
      const e = result.reason;
      const message =
        e instanceof SyntaxError
          ? "Ce fichier n'est pas un JSON valide."
          : e instanceof Error
            ? e.message
            : 'Fichier illisible.';
      setState({ status: 'error', message });
    },
    [importCharacter, onImported],
  );

  const handleFiles = (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (file) void runImport(file);
  };

  // Réinitialise l'état interne à la fermeture (via animation MUI), pour rouvrir
  // la modale sur la zone de dépôt vierge.
  const handleClose = () => {
    if (state.status === 'loading') return; // on ne ferme pas en plein import
    onClose();
  };

  const resetToIdle = () => setState({ status: 'idle' });

  const dropZone = (
    <Box
      onClick={() => fileInput.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!dragging) setDragging(true);
      }}
      onDragLeave={(e) => {
        // Ne désactive que si on quitte réellement la zone (pas un enfant).
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      sx={{
        cursor: 'pointer',
        borderRadius: 2,
        border: '2px dashed',
        borderColor: dragging ? 'primary.main' : 'rgba(255, 255, 255, 0.20)',
        bgcolor: dragging ? 'rgba(144, 202, 249, 0.08)' : 'rgba(255, 255, 255, 0.03)',
        transition: 'border-color 120ms, background-color 120ms',
        px: 3,
        py: 5,
        textAlign: 'center',
      }}
    >
      <UploadFileIcon
        sx={{ fontSize: 48, color: dragging ? 'primary.main' : 'text.secondary', mb: 1 }}
      />
      <Typography sx={{ fontWeight: 600 }}>
        Glissez-déposez un fichier JSON ici
      </Typography>
      <Typography variant="body2" color="text.secondary">
        ou cliquez pour parcourir vos fichiers
      </Typography>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = '';
        }}
      />
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
      // Réinitialise sur la zone de dépôt une fois l'animation de fermeture finie.
      slotProps={{ transition: { onExited: resetToIdle } }}
    >
      <DialogTitle>Importer un personnage</DialogTitle>
      <DialogContent>
        {(state.status === 'idle' || state.status === 'error') && (
          <Stack spacing={2}>
            {state.status === 'error' && (
              <Alert severity="error" icon={<ErrorOutlineIcon />}>
                Import impossible : {state.message}
              </Alert>
            )}
            {dropZone}
          </Stack>
        )}

        {state.status === 'loading' && (
          <Stack spacing={2} sx={{ alignItems: 'center', py: 4 }}>
            <CircularProgress />
            <Typography color="text.secondary" sx={{ textAlign: 'center' }}>
              Lecture de « {state.fileName} »…
            </Typography>
          </Stack>
        )}

        {state.status === 'success' && <ImportedSummary character={state.character} />}
      </DialogContent>
      <DialogActions>
        {state.status === 'success' ? (
          <>
            <Button onClick={handleClose}>Fermer</Button>
            <Button variant="contained" onClick={() => router.push(`/character/${state.character.id}`)}>
              Ouvrir la fiche
            </Button>
          </>
        ) : (
          <Button onClick={handleClose} disabled={state.status === 'loading'}>
            {state.status === 'error' ? 'Annuler' : 'Fermer'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

/** Micro-fiche récapitulative d'un personnage fraîchement importé. */
function ImportedSummary({ character }: { character: Character }) {
  const summary = summarize(character);
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'success.main' }}>
        <CheckCircleOutlineIcon fontSize="small" />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Personnage importé
        </Typography>
      </Stack>

      <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
        <Box
          component="img"
          src={`/classes/${summary.classId}${character.portraitVariant === 'alt' ? '-2' : ''}.webp`}
          alt=""
          aria-hidden
          sx={{
            width: 72,
            height: 72,
            borderRadius: 2,
            objectFit: 'cover',
            objectPosition: 'top',
            flexShrink: 0,
            border: '1px solid rgba(255, 255, 255, 0.12)',
            bgcolor: 'rgba(255, 255, 255, 0.04)',
          }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }} noWrap>
            {summary.name}
          </Typography>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', mt: 0.25 }}>
            <ClassIcon classId={summary.classId} size={18} />
            <Typography variant="body2" color="text.secondary">
              <Box component="span" sx={{ color: classColor(summary.classId), fontWeight: 600 }}>
                {summary.characterClass}
              </Box>{' '}
              · niveau {summary.level}
            </Typography>
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {summary.ancestry}
          </Typography>
        </Box>
      </Stack>

      {/* Les 7 caractéristiques, en badges compacts (pas de Chip MUI). */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 0.75,
        }}
      >
        {ABILITY_IDS.map((id) => {
          const value = character.abilities[id] ?? 0;
          return (
            <Box
              key={id}
              title={ABILITY_NAMES[id]}
              sx={{
                borderRadius: 1,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                bgcolor: 'rgba(255, 255, 255, 0.04)',
                py: 0.5,
                textAlign: 'center',
              }}
            >
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', lineHeight: 1.2 }}>
                {id}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {value >= 0 ? `+${value}` : value}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Stack>
  );
}
