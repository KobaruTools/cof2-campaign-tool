'use client';

/**
 * Modale d'import d'un personnage depuis un fichier JSON. Quatre temps :
 *  1. `idle`/`error` : zone de dépôt (drag'n'drop) + clic pour parcourir ;
 *  2. `loading` : loader pendant la lecture et la migration du fichier ;
 *  3. `resolve` (PER-182) : le fichier est lu et valide → on affiche une micro-fiche
 *     et un formulaire de résolution des clés étrangères (campagne + joueur cibles).
 *     N'apparaît que s'il existe des campagnes à cibler (sinon import direct) ;
 *  4. `success` : micro-fiche récapitulative, avec accès direct à la fiche complète.
 *
 * Contexte FK (PER-182) : un fichier exporté est auto-porteur (`parseImportFile`) —
 * il transporte la campagne et le joueur d'origine (ids + libellés). À l'import, on
 * pré-remplit la cible : la campagne d'accueil si l'import part d'une page campagne,
 * sinon la campagne du fichier si elle existe ici, sinon « Non attribué ». Le joueur
 * du fichier n'est retenu que s'il figure dans le roster de la campagne cible.
 *
 * L'import lui-même délègue à `importCharacter` du store (migration + validation +
 * nouvel id si collision + application des FK résolues). Le personnage importé reste
 * LOCAL (staging) ; sa promotion vers le cloud passe par le téléversement dédié
 * (PER-193).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { CharacterPreviewCard } from '@/components/CharacterPreviewCard';
import { parseImportFile, type TransferContext } from '@/lib/character/transfer';
import type { Character } from '@/lib/character/types';
import { migrateCharacter } from '@/lib/engine';
import { fetchPlayers } from '@/lib/player/repo';
import type { Player } from '@/lib/player/types';
import { useCampaignsStore } from '@/stores/campaigns';
import { useCharactersStore } from '@/stores/characters';

/** Durée minimale d'affichage du loader : évite un clignotement sur import rapide. */
const MIN_LOADER_MS = 450;

type ImportState =
  | { status: 'idle' }
  | { status: 'loading'; fileName: string }
  | { status: 'resolve'; raw: unknown; preview: Character; context: TransferContext | null }
  | { status: 'success'; character: Character }
  | { status: 'error'; message: string };

export interface ImportCharacterDialogProps {
  open: boolean;
  /**
   * Campagne d'accueil de l'import (PER-180) : si l'import part d'une page campagne,
   * elle est la cible par défaut ; `null` pour un import depuis l'accueil (la cible
   * par défaut est alors la campagne du fichier si elle existe, sinon « Non attribué »).
   */
  campaignId: string | null;
  onClose: () => void;
  /** Notifié après un import réussi (pour le toast de la page). */
  onImported?: (character: Character) => void;
}

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function ImportCharacterDialog({
  open,
  campaignId,
  onClose,
  onImported,
}: ImportCharacterDialogProps) {
  const router = useRouter();
  const importCharacter = useCharactersStore((s) => s.importCharacter);
  const campaigns = useCampaignsStore((s) => s.campaigns);

  const [state, setState] = useState<ImportState>({ status: 'idle' });
  const [dragging, setDragging] = useState(false);
  // Sélection de résolution FK (PER-182). `''` = « Non attribué » / « Aucun joueur ».
  const [chosenCampaignId, setChosenCampaignId] = useState('');
  const [chosenPlayerId, setChosenPlayerId] = useState('');
  const [roster, setRoster] = useState<Player[]>([]);
  // Campagne à laquelle correspond le roster chargé (null = pas encore chargé). Sert
  // à dériver l'état « chargement » sans setState synchrone dans l'effet.
  const [rosterFor, setRosterFor] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Campagnes chargées à l'ouverture (idempotent, mis en cache par le store).
  useEffect(() => {
    if (open) void useCampaignsStore.getState().load();
  }, [open]);

  // Roster de la campagne cible (pour le sélecteur de joueur). On ne garde le joueur
  // pré-sélectionné (issu du fichier) que s'il figure dans ce roster. Tout setState
  // vit dans les callbacks async (pas dans le corps de l'effet).
  useEffect(() => {
    if (state.status !== 'resolve' || !chosenCampaignId) return;
    if (rosterFor === chosenCampaignId) return; // roster déjà chargé pour cette campagne
    let cancelled = false;
    fetchPlayers(chosenCampaignId)
      .then((players) => {
        if (cancelled) return;
        setRoster(players);
        setRosterFor(chosenCampaignId);
        setChosenPlayerId((prev) => (prev && players.some((p) => p.id === prev) ? prev : ''));
      })
      .catch(() => {
        if (cancelled) return;
        setRoster([]);
        setRosterFor(chosenCampaignId);
      });
    return () => {
      cancelled = true;
    };
  }, [state.status, chosenCampaignId, rosterFor]);

  // Chargement en cours : une campagne est choisie mais son roster n'est pas encore là.
  const rosterLoading = Boolean(chosenCampaignId) && rosterFor !== chosenCampaignId;

  const runImport = useCallback(
    async (file: File) => {
      setState({ status: 'loading', fileName: file.name });
      const [result] = await Promise.allSettled([
        (async () => {
          const parsed = JSON.parse(await file.text());
          const { raw, context } = parseImportFile(parsed);
          const preview = migrateCharacter(raw); // lève si invalide
          return { raw, context, preview };
        })(),
        delay(MIN_LOADER_MS),
      ]);

      if (result.status === 'fulfilled') {
        const { raw, context, preview } = result.value;
        const known = useCampaignsStore.getState().campaigns;
        // Sans campagne cible possible (mode local / aucune campagne), rien à résoudre :
        // import direct, rattaché à la campagne d'accueil (ou « Non attribué »).
        if (known.length === 0) {
          const imported = importCharacter(raw, { campaignId, playerId: null });
          setState({ status: 'success', character: imported });
          onImported?.(imported);
          return;
        }
        // Cible par défaut : l'hôte s'il est défini (import depuis une page campagne),
        // sinon la campagne du fichier si elle existe ici, sinon « Non attribué ».
        const fromFile =
          context?.campaign && known.some((c) => c.id === context.campaign!.id)
            ? context.campaign.id
            : '';
        setChosenCampaignId(campaignId ?? fromFile);
        setChosenPlayerId(context?.player?.id ?? '');
        setState({ status: 'resolve', raw, context, preview });
        return;
      }
      // On ne laisse jamais remonter de message technique brut : l'erreur de parsing
      // JSON (SyntaxError, libellé en anglais) est reformulée ; les erreurs de
      // migration/validation portent déjà un message français clair.
      const e = result.reason;
      const message =
        e instanceof SyntaxError
          ? "Ce fichier n'est pas un JSON valide."
          : e instanceof Error
            ? e.message
            : 'Fichier illisible.';
      setState({ status: 'error', message });
    },
    [importCharacter, campaignId, onImported],
  );

  const handleFiles = (files: FileList | null | undefined) => {
    const file = files?.[0];
    if (file) void runImport(file);
  };

  const handleConfirm = () => {
    if (state.status !== 'resolve') return;
    const targetCampaignId = chosenCampaignId || null;
    const targetPlayerId = targetCampaignId ? chosenPlayerId || null : null;
    const imported = importCharacter(state.raw, {
      campaignId: targetCampaignId,
      playerId: targetPlayerId,
    });
    setState({ status: 'success', character: imported });
    onImported?.(imported);
  };

  // Réinitialise l'état interne à la fermeture (via animation MUI), pour rouvrir la
  // modale sur la zone de dépôt vierge.
  const handleClose = () => {
    if (state.status === 'loading') return; // on ne ferme pas en plein import
    onClose();
  };

  const resetToIdle = () => {
    setState({ status: 'idle' });
    setChosenCampaignId('');
    setChosenPlayerId('');
    setRoster([]);
    setRosterFor(null);
  };

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
      <Typography sx={{ fontWeight: 600 }}>Glissez-déposez un fichier JSON ici</Typography>
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
              <AppAlert severity="error" icon={<ErrorOutlineIcon />}>
                Import impossible : {state.message}
              </AppAlert>
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

        {state.status === 'resolve' && (
          <ResolveForm
            preview={state.preview}
            context={state.context}
            campaigns={campaigns}
            roster={roster}
            rosterLoading={rosterLoading}
            chosenCampaignId={chosenCampaignId}
            chosenPlayerId={chosenPlayerId}
            onCampaignChange={(id) => {
              setChosenCampaignId(id);
              setChosenPlayerId(''); // campagne différente ⇒ roster différent
            }}
            onPlayerChange={setChosenPlayerId}
          />
        )}

        {state.status === 'success' && <ImportedSummary character={state.character} />}
      </DialogContent>
      <DialogActions>
        {state.status === 'success' ? (
          <>
            <Button onClick={handleClose}>Fermer</Button>
            <Button
              variant="contained"
              onClick={() => router.push(`/character/${state.character.id}`)}
            >
              Ouvrir la fiche
            </Button>
          </>
        ) : state.status === 'resolve' ? (
          <>
            <Button onClick={handleClose}>Annuler</Button>
            <Button variant="contained" onClick={handleConfirm}>
              Importer
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

/** Formulaire de résolution des clés étrangères d'un import (PER-182). */
function ResolveForm({
  preview,
  context,
  campaigns,
  roster,
  rosterLoading,
  chosenCampaignId,
  chosenPlayerId,
  onCampaignChange,
  onPlayerChange,
}: {
  preview: Character;
  context: TransferContext | null;
  campaigns: { id: string; name: string }[];
  roster: Player[];
  rosterLoading: boolean;
  chosenCampaignId: string;
  chosenPlayerId: string;
  onCampaignChange: (id: string) => void;
  onPlayerChange: (id: string) => void;
}) {
  const sortedCampaigns = [...campaigns].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  // La campagne du fichier est-elle inconnue de ce poste ? (message d'aide.)
  const fileCampaignUnknown =
    context?.campaign && !campaigns.some((c) => c.id === context.campaign!.id);

  return (
    <Stack spacing={2}>
      <CharacterPreviewCard character={preview} />

      {context?.campaign && (
        <Typography variant="body2" color="text.secondary">
          Fichier issu de la campagne « {context.campaign.name || 'sans nom'} »
          {context.player?.name ? ` · joueur « ${context.player.name} »` : ''}.
          {fileCampaignUnknown ? ' Cette campagne n’existe pas ici : choisissez une cible.' : ''}
        </Typography>
      )}

      <TextField
        select
        label="Campagne"
        size="small"
        value={chosenCampaignId}
        onChange={(e) => onCampaignChange(e.target.value)}
        // `displayEmpty` + label flottant : on force le label en position haute pour
        // qu'il ne se superpose pas à l'option vide (« Non attribué »).
        slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
      >
        <MenuItem value="">Non attribué</MenuItem>
        {sortedCampaigns.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.name}
          </MenuItem>
        ))}
      </TextField>

      {chosenCampaignId && (
        <TextField
          select
          label="Joueur"
          size="small"
          value={chosenPlayerId}
          onChange={(e) => onPlayerChange(e.target.value)}
          disabled={rosterLoading}
          helperText={rosterLoading ? 'Chargement des joueurs…' : undefined}
          slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
        >
          <MenuItem value="">Aucun joueur</MenuItem>
          {roster.map((p) => (
            <MenuItem key={p.id} value={p.id}>
              {p.name}
            </MenuItem>
          ))}
        </TextField>
      )}
    </Stack>
  );
}

/** Micro-fiche récapitulative d'un personnage fraîchement importé. */
function ImportedSummary({ character }: { character: Character }) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'success.main' }}>
        <CheckCircleOutlineIcon fontSize="small" />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          Personnage importé
        </Typography>
      </Stack>
      <CharacterPreviewCard character={character} />
    </Stack>
  );
}
