'use client';

/**
 * Gestion des campagnes (PER-190) — CRUD cloud (MJ = propriétaire, RLS
 * `owner_id`). Accessible depuis l'en-tête de l'accueil (`/`, liste plate des
 * personnages, pivot PER-180). On peut créer, ouvrir les **réglages** (roue crantée
 * → nom + notes + règles de table) et supprimer une campagne. Une campagne
 * fraîchement créée mène directement à ses réglages. La suppression est **en
 * cascade côté joueurs** et **détache** les
 * personnages (ils repassent « Non attribué », pivot PER-180) — jamais de
 * destruction de personnage —, sous **confirmation forte** (retaper le nom).
 *
 * Les campagnes vivent dans Supabase : ce composant s'appuie sur le store
 * `campaigns` (cache d'une source cloud) et affiche les états de chargement,
 * d'erreur et « cloud non configuré ».
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import PersonIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { AccountMenu } from '@/components/AccountMenu';
import { AppHeader } from '@/components/AppHeader';
import { AppTooltip } from '@/components/AppTooltip';
import { HomeBackground } from '@/components/HomeBackground';
import type { Campaign } from '@/lib/campaign';
import { useCampaignsStore } from '@/stores/campaigns';
import { useCharactersStore } from '@/stores/characters';
import { useWizardStore } from '@/stores/wizard';

export default function CampaignsPage() {
  const router = useRouter();
  const status = useCampaignsStore((s) => s.status);
  const error = useCampaignsStore((s) => s.error);
  const campaigns = useCampaignsStore((s) => s.campaigns);
  const load = useCampaignsStore((s) => s.load);
  const create = useCampaignsStore((s) => s.create);
  const remove = useCampaignsStore((s) => s.remove);
  const characters = useCharactersStore((s) => s.characters);
  const draft = useWizardStore((s) => s.draft);
  const clearDraft = useWizardStore((s) => s.clear);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [toDelete, setToDelete] = useState<Campaign | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setToast({ message, severity });

  // Charge les campagnes possédées au montage (idempotent).
  useEffect(() => {
    void load();
  }, [load]);

  // Décompte des personnages LOCAUX par campagne (FK `campaignId`), pour l'affichage
  // et l'avertissement de détachement à la suppression.
  const characterCount = (campaignId: string) =>
    characters.filter((c) => c.campaignId === campaignId).length;

  const handleCreate = async () => {
    setBusy(true);
    try {
      const campaign = await create(newName, newDescription);
      setCreateOpen(false);
      setNewName('');
      setNewDescription('');
      // On atterrit directement sur les réglages de la campagne fraîchement créée
      // pour définir tout de suite ses règles de table (armes à feu, etc.).
      router.push(`/campaign/${campaign.id}/settings`);
    } catch (e) {
      notify(`Création impossible : ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    const name = toDelete.name;
    setBusy(true);
    try {
      await remove(toDelete.id);
      notify(`Campagne « ${name} » supprimée.`);
      setToDelete(null);
      setDeleteConfirm('');
    } catch (e) {
      notify(`Suppression impossible : ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setBusy(false);
    }
  };

  // Brouillon de wizard en cours (PER-180) : ne le proposer à la reprise que si sa
  // campagne existe encore (elle a pu être supprimée).
  const draftCampaign = draft ? campaigns.find((c) => c.id === draft.campaignId) : undefined;

  const sorted = [...campaigns].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <title>Campagnes — Éditeur de personnage CO2</title>
      <HomeBackground />
      <AppHeader title="Campagnes" onBack={() => router.push('/')} action={<AccountMenu />} />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            disabled={status === 'unconfigured'}
            onClick={() => {
              setNewName('');
              setNewDescription('');
              setCreateOpen(true);
            }}
          >
            Nouvelle campagne
          </Button>
        </Stack>

        {draft && draftCampaign && (
          <AppAlert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => router.push(`/create?campaign=${draftCampaign.id}`)}
                >
                  Reprendre
                </Button>
                <Button color="inherit" size="small" onClick={() => clearDraft()}>
                  Abandonner
                </Button>
              </>
            }
          >
            Un brouillon de création est en cours dans « {draftCampaign.name} ».
          </AppAlert>
        )}

        {status === 'error' && (
          <AppAlert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button color="inherit" size="small" onClick={() => void load()}>
                Réessayer
              </Button>
            }
          >
            Impossible de charger les campagnes{error ? ` : ${error}` : '.'}
          </AppAlert>
        )}

        {status === 'unconfigured' ? (
          <Paper
            variant="outlined"
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: 'rgba(30, 30, 34, 0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              borderColor: 'rgba(255, 255, 255, 0.10)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Campagnes indisponibles
            </Typography>
            <Typography color="text.secondary">
              Les campagnes sont hébergées en ligne. Le service n’est pas configuré sur cette
              installation ; l’édition de personnages reste disponible en local.
            </Typography>
          </Paper>
        ) : status === 'loading' || status === 'idle' ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : sorted.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: 6,
              textAlign: 'center',
              bgcolor: 'rgba(30, 30, 34, 0.55)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              borderColor: 'rgba(255, 255, 255, 0.10)',
            }}
          >
            <Typography variant="h6" sx={{ mb: 1 }}>
              Ouvrez votre première campagne
            </Typography>
            <Typography color="text.secondary">
              Une campagne regroupe vos joueurs, leurs personnages et vos règles de table.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.5}>
            {sorted.map((campaign) => {
              const count = characterCount(campaign.id);
              return (
                <Paper
                  key={campaign.id}
                  variant="outlined"
                  sx={{
                    p: 2,
                    bgcolor: 'rgba(30, 30, 34, 0.62)',
                    backdropFilter: 'blur(6px)',
                    WebkitBackdropFilter: 'blur(6px)',
                    borderColor: 'rgba(255, 255, 255, 0.10)',
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
                  >
                    <Box
                      sx={{ minWidth: 0, cursor: 'pointer', flexGrow: 1 }}
                      onClick={() => router.push(`/campaign/${campaign.id}`)}
                    >
                      <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                        {campaign.name}
                      </Typography>
                      {campaign.description && (
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                          {campaign.description}
                        </Typography>
                      )}
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ alignItems: 'center', color: 'text.secondary', mt: 0.75 }}
                      >
                        <PersonIcon fontSize="small" />
                        <Typography variant="body2">
                          {count} personnage{count > 1 ? 's' : ''}
                        </Typography>
                      </Stack>
                    </Box>
                    <Stack direction="row" sx={{ flexShrink: 0 }}>
                      <AppTooltip title="Réglages">
                        <IconButton
                          onClick={() => router.push(`/campaign/${campaign.id}/settings`)}
                        >
                          <SettingsIcon fontSize="small" />
                        </IconButton>
                      </AppTooltip>
                      <AppTooltip title="Supprimer">
                        <IconButton
                          color="error"
                          onClick={() => {
                            setToDelete(campaign);
                            setDeleteConfirm('');
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </AppTooltip>
                    </Stack>
                  </Stack>
                </Paper>
              );
            })}
          </Stack>
        )}
      </Container>

      {/* Création */}
      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Nouvelle campagne</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom de la campagne"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) void handleCreate();
            }}
          />
          <TextField
            margin="dense"
            label="Notes du MJ (optionnel)"
            fullWidth
            multiline
            minRows={2}
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={() => void handleCreate()} disabled={busy}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Suppression — confirmation forte (retaper le nom) */}
      <Dialog
        open={toDelete !== null}
        onClose={() => {
          setToDelete(null);
          setDeleteConfirm('');
        }}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Supprimer la campagne ?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div" sx={{ mb: 2 }}>
            « {toDelete?.name} » sera définitivement supprimée, ainsi que ses joueurs et leurs
            liens magiques (cascade). Ses{' '}
            <strong>
              {toDelete ? characterCount(toDelete.id) : 0} personnage
              {toDelete && characterCount(toDelete.id) > 1 ? 's' : ''}
            </strong>{' '}
            ne sont <strong>pas supprimés</strong> : ils sont détachés et repassent « Non
            attribué ». Cette action est <strong>irréversible</strong>.
          </DialogContentText>
          <DialogContentText sx={{ mb: 1 }}>
            Pour confirmer, retapez le nom de la campagne :
          </DialogContentText>
          <TextField
            autoFocus
            fullWidth
            size="small"
            placeholder={toDelete?.name}
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setToDelete(null);
              setDeleteConfirm('');
            }}
          >
            Annuler
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={busy || deleteConfirm.trim() !== toDelete?.name}
            onClick={() => void confirmDelete()}
          >
            Supprimer définitivement
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast !== null}
        autoHideDuration={5000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        {toast ? (
          <AppAlert
            severity={toast.severity}
            variant="filled"
            onClose={() => setToast(null)}
            sx={{ width: '100%' }}
          >
            {toast.message}
          </AppAlert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
