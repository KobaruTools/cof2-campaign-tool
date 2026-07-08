'use client';

/**
 * Section « Joueurs » de la vue campagne (PER-191, côté MJ). Le MJ crée/renomme/
 * supprime les joueurs de la campagne et gère leur **lien magique**
 * (`/join/<joinSecret>`) : copie et régénération. Régénérer invalide l'ancien
 * lien et coupe les sessions vivantes (Server Action + révocation forte).
 *
 * Données (roster + mutations) portées par le store `players` (cache cloud) ;
 * l'état d'UI transitoire (dialogues, saisie, toasts) reste local au composant.
 */
import { useEffect, useState } from 'react';
import AddIcon from '@mui/icons-material/Add';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { useToast } from '@/components/toast/ToastProvider';
import { AppTooltip } from '@/components/AppTooltip';
import { joinLinkUrl, type Player } from '@/lib/player/types';
import { PlayerPresence } from '@/components/campaign/PlayerPresence';
import { usePlayersStore } from '@/stores/players';

export function PlayersSection({
  campaignId,
  bare = false,
}: {
  campaignId: string;
  /**
   * Rendu « nu » : sans le `Paper` englobant ni le titre « Joueurs ». Utilisé quand
   * un conteneur extérieur fournit déjà l'en-tête (ex. section repliable des
   * réglages de campagne). Défaut `false` = section autonome complète.
   */
  bare?: boolean;
}) {
  const players = usePlayersStore((s) => s.players);
  const status = usePlayersStore((s) => s.status);
  const load = usePlayersStore((s) => s.load);
  const createPlayer = usePlayersStore((s) => s.create);
  const renamePlayerAction = usePlayersStore((s) => s.rename);
  const regenerate = usePlayersStore((s) => s.regenerate);
  const removePlayer = usePlayersStore((s) => s.remove);

  // Origine lue à l'init (client) sans effet : au premier rendu (SSR + hydratation)
  // la liste est en chargement → les liens ne sont pas encore rendus, donc pas de
  // divergence d'hydratation malgré l'`''` côté serveur.
  const [origin] = useState(() =>
    typeof window !== 'undefined' ? window.location.origin : '',
  );

  const [newName, setNewName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [renameTarget, setRenameTarget] = useState<Player | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [toDelete, setToDelete] = useState<Player | null>(null);
  const [toRegenerate, setToRegenerate] = useState<Player | null>(null);

  const { showToast } = useToast();
  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    showToast(message, severity);

  useEffect(() => {
    void load(campaignId);
  }, [load, campaignId]);

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      await createPlayer(name);
      setNewName('');
      notify(`Joueur « ${name} » ajouté.`);
    } catch {
      notify("Échec de l'ajout du joueur.", 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const name = renameValue.trim();
    if (!name) return;
    setBusyId(renameTarget.id);
    try {
      await renamePlayerAction(renameTarget.id, name);
      notify('Joueur renommé.');
    } catch {
      notify('Échec du renommage.', 'error');
    } finally {
      setBusyId(null);
      setRenameTarget(null);
    }
  };

  const handleCopy = async (player: Player) => {
    try {
      await navigator.clipboard.writeText(joinLinkUrl(origin, player.joinSecret));
      notify('Lien copié.');
    } catch {
      notify('Impossible de copier le lien.', 'error');
    }
  };

  const handleRegenerate = async () => {
    if (!toRegenerate) return;
    const target = toRegenerate;
    setToRegenerate(null);
    setBusyId(target.id);
    try {
      await regenerate(target.id);
      notify("Lien régénéré. L'ancien lien ne fonctionne plus.");
    } catch {
      notify('Échec de la régénération du lien.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!toDelete) return;
    const target = toDelete;
    setToDelete(null);
    setBusyId(target.id);
    try {
      await removePlayer(target.id);
      notify(`Joueur « ${target.name} » supprimé.`);
    } catch {
      notify('Échec de la suppression.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  const loading = status === 'idle' || status === 'loading';

  const content = (
    <>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Ajoute un joueur, puis partage-lui son lien magique : il rejoint la campagne sans
        compte et éditera sa fiche.
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        <TextField
          size="small"
          fullWidth
          label="Nom du joueur"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleCreate();
          }}
          disabled={creating}
        />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => void handleCreate()}
          disabled={creating || newName.trim() === ''}
        >
          Ajouter
        </Button>
      </Stack>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
          <CircularProgress size={28} />
        </Box>
      ) : status === 'error' ? (
        <AppAlert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void load(campaignId, { force: true })}>
              Réessayer
            </Button>
          }
        >
          Impossible de charger les joueurs.
        </AppAlert>
      ) : players.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
          Aucun joueur pour l&apos;instant.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {players.map((player) => (
            <Box
              key={player.id}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: '1px solid rgba(255, 255, 255, 0.08)',
                bgcolor: 'rgba(0, 0, 0, 0.20)',
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 1 }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
                    {player.name}
                  </Typography>
                  <PlayerPresence player={player} />
                </Box>
                <Stack direction="row" sx={{ alignItems: 'center', flexShrink: 0 }}>
                  {busyId === player.id ? <CircularProgress size={18} sx={{ mr: 1 }} /> : null}
                  <AppTooltip title="Renommer">
                    <IconButton
                      size="small"
                      disabled={busyId === player.id}
                      onClick={() => {
                        setRenameTarget(player);
                        setRenameValue(player.name);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </AppTooltip>
                  <AppTooltip title="Supprimer">
                    <IconButton
                      size="small"
                      color="error"
                      disabled={busyId === player.id}
                      onClick={() => setToDelete(player)}
                    >
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </AppTooltip>
                </Stack>
              </Stack>

              <TextField
                size="small"
                fullWidth
                label="Lien magique"
                value={joinLinkUrl(origin, player.joinSecret)}
                slotProps={{
                  input: {
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <AppTooltip title="Copier le lien">
                          <IconButton size="small" edge="end" onClick={() => void handleCopy(player)}>
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </AppTooltip>
                        <AppTooltip title="Régénérer (coupe l'ancien lien et les sessions)">
                          <IconButton
                            size="small"
                            edge="end"
                            disabled={busyId === player.id}
                            onClick={() => setToRegenerate(player)}
                          >
                            <AutorenewIcon fontSize="small" />
                          </IconButton>
                        </AppTooltip>
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
          ))}
        </Stack>
      )}
    </>
  );

  const overlays = (
    <>
      {/* Renommer */}
      <Dialog open={renameTarget !== null} onClose={() => setRenameTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle>Renommer le joueur</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Nom du joueur"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleRename();
            }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameTarget(null)}>Annuler</Button>
          <Button onClick={() => void handleRename()} disabled={renameValue.trim() === ''}>
            Renommer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Régénérer */}
      <Dialog open={toRegenerate !== null} onClose={() => setToRegenerate(null)}>
        <DialogTitle>Régénérer le lien ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Un nouveau lien sera généré pour « {toRegenerate?.name} ». L&apos;ancien lien
            cessera de fonctionner et les sessions déjà ouvertes seront coupées. Utile si le
            lien a fuité ou si l&apos;appareil du joueur est perdu.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToRegenerate(null)}>Annuler</Button>
          <Button onClick={() => void handleRegenerate()}>Régénérer</Button>
        </DialogActions>
      </Dialog>

      {/* Supprimer */}
      <Dialog open={toDelete !== null} onClose={() => setToDelete(null)}>
        <DialogTitle>Supprimer le joueur ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            « {toDelete?.name} » sera supprimé et son lien magique révoqué. Ses personnages ne
            sont pas détruits : ils sont détachés (« Non attribué ») et te restent.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Annuler</Button>
          <Button color="error" onClick={() => void handleDelete()}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );

  // Mode « bare » : le conteneur extérieur fournit l'en-tête (section repliable).
  if (bare) {
    return (
      <>
        {content}
        {overlays}
      </>
    );
  }

  // Section autonome : verre dépoli + titre, comme les autres cartes de l'app.
  return (
    <Paper
      variant="outlined"
      sx={{
        p: { xs: 2, sm: 3 },
        bgcolor: 'rgba(30, 30, 34, 0.62)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        borderColor: 'rgba(255, 255, 255, 0.10)',
      }}
    >
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        Joueurs
      </Typography>
      {content}
      {overlays}
    </Paper>
  );
}
