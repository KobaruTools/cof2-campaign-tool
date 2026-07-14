'use client';

/**
 * Modale d'import de personnages depuis un ou plusieurs fichiers JSON. Quatre temps :
 *  1. `idle`/`error` : zone de dépôt (drag'n'drop, sélection multiple) + clic pour parcourir ;
 *  2. `loading` : loader pendant la lecture et la migration des fichiers ;
 *  3. `resolve` (PER-182) : les fichiers valides sont lus → on affiche, POUR CHAQUE
 *     personnage, sa micro-fiche puis ses sélecteurs de clés étrangères (campagne +
 *     joueur cibles), séparés par un trait horizontal. Chaque perso a donc sa propre
 *     cible (on peut répartir un lot sur plusieurs campagnes/joueurs). N'apparaît que
 *     s'il existe des campagnes à cibler (sinon import direct) ; les fichiers illisibles
 *     sont listés à part sans bloquer les autres ;
 *  4. `success` : micro-fiche(s) récapitulative(s), avec accès direct à la fiche si un seul.
 *
 * Contexte FK (PER-182) : un fichier exporté est auto-porteur (`parseImportFile`) —
 * il transporte la campagne et le joueur d'origine (ids + libellés). À l'import, on
 * pré-remplit la cible : la campagne d'accueil si l'import part d'une page campagne,
 * sinon la campagne du fichier si elle existe ici, sinon « Non attribué ». Le joueur
 * du fichier n'est retenu que s'il figure dans le roster de la campagne cible.
 *
 * L'import lui-même délègue à `importCharacter` du store (migration + validation +
 * nouvel id si collision + application des FK résolues). Quand Supabase est configuré,
 * il crée directement une ligne cloud (comme le wizard) → un perso rattaché à une
 * campagne/un joueur est une vraie ligne DB, pas un « split-brain » local (PER-182) ;
 * sans Supabase, ajout local (staging). L'écriture pouvant être longue (réseau), les
 * boutons se verrouillent et affichent un spinner pendant l'import.
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
import Divider from '@mui/material/Divider';
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

/** Un fichier lu et validé, prêt à l'import. */
type ParsedItem = { raw: unknown; context: TransferContext | null; preview: Character };
/** Un fichier illisible / invalide, écarté du lot mais signalé à l'utilisateur. */
type FailedItem = { fileName: string; message: string };

type ImportState =
  | { status: 'idle' }
  | { status: 'loading'; count: number }
  | { status: 'resolve'; items: ParsedItem[]; failures: FailedItem[] }
  | { status: 'success'; characters: Character[] }
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

/**
 * Message lisible d'une erreur d'import. Une erreur Supabase (PostgREST) est un OBJET
 * portant `.message` sans être une instance d'`Error` : on lit donc aussi ce champ,
 * pour ne pas retomber systématiquement sur le générique « Import impossible. ».
 */
function importErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'object' && e !== null && typeof (e as { message?: unknown }).message === 'string') {
    return (e as { message: string }).message;
  }
  return 'Import impossible.';
}

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
  // Résolution FK PAR PERSONNAGE (PER-182). Tableaux alignés par index sur `items` ;
  // `''` = « Non attribué » / « Aucun joueur ».
  const [chosenCampaignIds, setChosenCampaignIds] = useState<string[]>([]);
  const [chosenPlayerIds, setChosenPlayerIds] = useState<string[]>([]);
  // Rosters mis en cache PAR CAMPAGNE (plusieurs campagnes peuvent être ciblées dans
  // un même lot) : `undefined` = pas encore chargé (⇒ « chargement »), `[]` = chargé et
  // vide/échec. On dérive donc l'état « chargement » de l'absence de clé, sans état à part.
  const [rosters, setRosters] = useState<Record<string, Player[]>>({});
  // Campagnes dont le roster est en cours de chargement — un `ref` (pas un état) pour
  // dédupliquer les requêtes sans setState synchrone dans l'effet (règle React Hooks).
  const fetchingRosters = useRef<Set<string>>(new Set());
  // Écriture en cours (insertion cloud) : verrouille les boutons + spinner (PER-182).
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Campagnes chargées à l'ouverture (idempotent, mis en cache par le store).
  useEffect(() => {
    if (open) void useCampaignsStore.getState().load();
  }, [open]);

  // Rosters des campagnes ciblées (pour les sélecteurs de joueur). On charge chaque
  // campagne distincte encore inconnue ; à l'arrivée, on purge les joueurs choisis qui
  // ne figurent pas dans leur roster. Le `ref` `fetchingRosters` déduplique les requêtes
  // (pas de setState synchrone dans le corps de l'effet). Le résultat est écrit par clé
  // de campagne (idempotent) : pas de garde d'annulation, une réponse tardive pose juste
  // un roster correct. Le garde `missing` borne les re-runs (rosters change → recalcul →
  // plus rien à charger → sortie).
  useEffect(() => {
    if (state.status !== 'resolve') return;
    const distinct = Array.from(new Set(chosenCampaignIds.filter(Boolean)));
    const missing = distinct.filter(
      (id) => rosters[id] === undefined && !fetchingRosters.current.has(id),
    );
    if (missing.length === 0) return;
    for (const id of missing) {
      fetchingRosters.current.add(id);
      fetchPlayers(id)
        .then((players) => {
          setRosters((prev) => ({ ...prev, [id]: players }));
          // Purge les joueurs choisis absents du roster fraîchement chargé.
          setChosenPlayerIds((prev) =>
            prev.map((pid, i) =>
              chosenCampaignIds[i] === id && pid && !players.some((p) => p.id === pid) ? '' : pid,
            ),
          );
        })
        .catch(() => setRosters((prev) => ({ ...prev, [id]: [] })))
        .finally(() => fetchingRosters.current.delete(id));
    }
  }, [state.status, chosenCampaignIds, rosters]);

  const runImport = useCallback(
    async (files: File[]) => {
      setState({ status: 'loading', count: files.length });
      // On lit chaque fichier indépendamment : un JSON illisible n'invalide pas le lot,
      // il est simplement écarté et signalé. On ne laisse jamais remonter de message
      // technique brut (SyntaxError anglaise reformulée ; les erreurs de migration/
      // validation portent déjà un message français clair).
      const [results] = await Promise.all([
        Promise.all(
          files.map(async (file) => {
            try {
              const parsed = JSON.parse(await file.text());
              const { raw, context } = parseImportFile(parsed);
              const preview = migrateCharacter(raw); // lève si invalide
              return { ok: true as const, raw, context, preview };
            } catch (e) {
              const message =
                e instanceof SyntaxError
                  ? "Ce fichier n'est pas un JSON valide."
                  : e instanceof Error
                    ? e.message
                    : 'Fichier illisible.';
              return { ok: false as const, fileName: file.name, message };
            }
          }),
        ),
        delay(MIN_LOADER_MS),
      ]);

      const items: ParsedItem[] = [];
      const failures: FailedItem[] = [];
      for (const r of results) {
        if (r.ok) items.push({ raw: r.raw, context: r.context, preview: r.preview });
        else failures.push({ fileName: r.fileName, message: r.message });
      }

      // Aucun fichier exploitable : on repasse en erreur (message unique si un seul fichier).
      if (items.length === 0) {
        const message =
          failures.length === 1
            ? failures[0].message
            : `Aucun des ${failures.length} fichiers n’est importable.`;
        setState({ status: 'error', message });
        return;
      }

      const known = useCampaignsStore.getState().campaigns;
      // Sans campagne cible possible (mode local / aucune campagne), rien à résoudre :
      // import direct, rattaché à la campagne d'accueil (ou « Non attribué »).
      if (known.length === 0) {
        try {
          const imported: Character[] = [];
          for (const it of items) {
            imported.push(await importCharacter(it.raw, { campaignId, playerId: null }));
          }
          setState({ status: 'success', characters: imported });
          imported.forEach((c) => onImported?.(c));
        } catch (e) {
          setState({
            status: 'error',
            message: importErrorMessage(e),
          });
        }
        return;
      }
      // Cible par défaut, PAR PERSONNAGE : l'hôte s'il est défini (import depuis une page
      // campagne), sinon la campagne du fichier si elle existe ici, sinon « Non attribué ».
      // Le joueur pré-sélectionné vient du fichier ; il sera purgé s'il n'est pas dans le
      // roster de la campagne cible (cf. effet de chargement des rosters).
      setChosenCampaignIds(
        items.map((it) => {
          if (campaignId) return campaignId;
          const fc = it.context?.campaign;
          return fc && known.some((c) => c.id === fc.id) ? fc.id : '';
        }),
      );
      setChosenPlayerIds(items.map((it) => it.context?.player?.id ?? ''));
      setState({ status: 'resolve', items, failures });
    },
    [importCharacter, campaignId, onImported],
  );

  const handleFiles = (files: FileList | null | undefined) => {
    const list = files ? Array.from(files) : [];
    if (list.length) void runImport(list);
  };

  const handleConfirm = async () => {
    if (state.status !== 'resolve') return;
    setImporting(true);
    try {
      // Chaque perso porte SA campagne + SON joueur ; import séquentiel pour sérialiser
      // les écritures cloud (le store débounce/sérialise déjà par id).
      const imported: Character[] = [];
      for (let i = 0; i < state.items.length; i++) {
        const targetCampaignId = chosenCampaignIds[i] || null;
        const targetPlayerId = targetCampaignId ? chosenPlayerIds[i] || null : null;
        imported.push(
          await importCharacter(state.items[i].raw, {
            campaignId: targetCampaignId,
            playerId: targetPlayerId,
          }),
        );
      }
      setState({ status: 'success', characters: imported });
      imported.forEach((c) => onImported?.(c));
    } catch (e) {
      setState({
        status: 'error',
        message: importErrorMessage(e),
      });
    } finally {
      setImporting(false);
    }
  };

  // Réinitialise l'état interne à la fermeture (via animation MUI), pour rouvrir la
  // modale sur la zone de dépôt vierge.
  const handleClose = () => {
    if (state.status === 'loading' || importing) return; // on ne ferme pas en plein import
    onClose();
  };

  const resetToIdle = () => {
    setState({ status: 'idle' });
    setChosenCampaignIds([]);
    setChosenPlayerIds([]);
    setRosters({});
    fetchingRosters.current.clear();
    setImporting(false);
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
      <Typography sx={{ fontWeight: 600 }}>
        Glissez-déposez un ou plusieurs fichiers JSON ici
      </Typography>
      <Typography variant="body2" color="text.secondary">
        ou cliquez pour parcourir vos fichiers
      </Typography>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        multiple
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
      <DialogTitle>Importer des personnages</DialogTitle>
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
              {state.count === 1
                ? 'Lecture du fichier…'
                : `Lecture de ${state.count} fichiers…`}
            </Typography>
          </Stack>
        )}

        {state.status === 'resolve' && (
          <ResolveForm
            items={state.items}
            failures={state.failures}
            campaigns={campaigns}
            rosters={rosters}
            chosenCampaignIds={chosenCampaignIds}
            chosenPlayerIds={chosenPlayerIds}
            onCampaignChange={(index, id) => {
              setChosenCampaignIds((prev) => prev.map((c, i) => (i === index ? id : c)));
              // Campagne différente ⇒ roster différent : on réinitialise le joueur du perso.
              setChosenPlayerIds((prev) => prev.map((p, i) => (i === index ? '' : p)));
            }}
            onPlayerChange={(index, id) =>
              setChosenPlayerIds((prev) => prev.map((p, i) => (i === index ? id : p)))
            }
          />
        )}

        {state.status === 'success' && <ImportedSummary characters={state.characters} />}
      </DialogContent>
      <DialogActions>
        {state.status === 'success' ? (
          <>
            <Button onClick={handleClose}>Fermer</Button>
            {state.characters.length === 1 && (
              <Button
                variant="contained"
                onClick={() => router.push(`/character/${state.characters[0].id}`)}
              >
                Ouvrir la fiche
              </Button>
            )}
          </>
        ) : state.status === 'resolve' ? (
          <>
            <Button onClick={handleClose} disabled={importing}>
              Annuler
            </Button>
            <Button
              variant="contained"
              onClick={handleConfirm}
              disabled={importing}
              startIcon={importing ? <CircularProgress size={16} color="inherit" /> : undefined}
            >
              {importing
                ? 'Import…'
                : state.items.length > 1
                  ? `Importer les ${state.items.length}`
                  : 'Importer'}
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

/**
 * Formulaire de résolution des clés étrangères d'un import (PER-182). Un bloc PAR
 * personnage — micro-fiche puis sélecteurs campagne/joueur — les blocs séparés par un
 * trait horizontal. Chaque perso a sa propre cible (le lot peut être réparti sur
 * plusieurs campagnes/joueurs). Les fichiers illisibles sont signalés en fin de liste.
 */
function ResolveForm({
  items,
  failures,
  campaigns,
  rosters,
  chosenCampaignIds,
  chosenPlayerIds,
  onCampaignChange,
  onPlayerChange,
}: {
  items: ParsedItem[];
  failures: FailedItem[];
  campaigns: { id: string; name: string }[];
  rosters: Record<string, Player[]>;
  chosenCampaignIds: string[];
  chosenPlayerIds: string[];
  onCampaignChange: (index: number, id: string) => void;
  onPlayerChange: (index: number, id: string) => void;
}) {
  const sortedCampaigns = [...campaigns].sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return (
    <Stack spacing={2}>
      {items.map((it, i) => {
        const chosenCampaignId = chosenCampaignIds[i] ?? '';
        const chosenPlayerId = chosenPlayerIds[i] ?? '';
        const roster = chosenCampaignId ? (rosters[chosenCampaignId] ?? []) : [];
        // « Chargement » = campagne choisie dont le roster n'est pas encore en cache.
        const rosterLoading = Boolean(chosenCampaignId) && rosters[chosenCampaignId] === undefined;
        const fileContext = it.context;
        // La campagne du fichier est-elle inconnue de ce poste ? (message d'aide.)
        const fileCampaignUnknown =
          fileContext?.campaign && !campaigns.some((c) => c.id === fileContext.campaign!.id);

        return (
          <Box key={i}>
            {i > 0 && <Divider sx={{ mb: 2 }} />}
            <Stack spacing={1.5}>
              <CharacterPreviewCard character={it.preview} />

              {fileContext?.campaign && (
                <Typography variant="body2" color="text.secondary">
                  Fichier issu de la campagne « {fileContext.campaign.name || 'sans nom'} »
                  {fileContext.player?.name ? ` · joueur « ${fileContext.player.name} »` : ''}.
                  {fileCampaignUnknown
                    ? ' Cette campagne n’existe pas ici : choisissez une cible.'
                    : ''}
                </Typography>
              )}

              <TextField
                select
                label="Campagne"
                size="small"
                value={chosenCampaignId}
                onChange={(e) => onCampaignChange(i, e.target.value)}
                // `displayEmpty` + label flottant : on force le label en position haute
                // pour qu'il ne se superpose pas à l'option vide (« Non attribué »).
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
                <Box>
                  <TextField
                    select
                    label="Joueur"
                    size="small"
                    fullWidth
                    value={chosenPlayerId}
                    onChange={(e) => onPlayerChange(i, e.target.value)}
                    disabled={rosterLoading}
                    slotProps={{ select: { displayEmpty: true }, inputLabel: { shrink: true } }}
                  >
                    <MenuItem value="">Aucun joueur</MenuItem>
                    {roster.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </TextField>
                  {rosterLoading && (
                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: 'center', mt: 0.75, ml: 0.25 }}
                    >
                      <CircularProgress size={14} thickness={5} />
                      <Typography variant="caption" color="text.secondary">
                        Chargement des joueurs…
                      </Typography>
                    </Stack>
                  )}
                </Box>
              )}
            </Stack>
          </Box>
        );
      })}

      {failures.length > 0 && (
        <AppAlert severity="warning" icon={<ErrorOutlineIcon />}>
          {failures.length === 1
            ? `« ${failures[0].fileName} » a été ignoré : ${failures[0].message}`
            : `${failures.length} fichiers ignorés (illisibles ou invalides).`}
        </AppAlert>
      )}
    </Stack>
  );
}

/** Micro-fiche(s) récapitulative(s) des personnages fraîchement importés. */
function ImportedSummary({ characters }: { characters: Character[] }) {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', color: 'success.main' }}>
        <CheckCircleOutlineIcon fontSize="small" />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {characters.length === 1
            ? 'Personnage importé'
            : `${characters.length} personnages importés`}
        </Typography>
      </Stack>
      {characters.map((c) => (
        <CharacterPreviewCard key={c.id} character={c} />
      ))}
    </Stack>
  );
}
