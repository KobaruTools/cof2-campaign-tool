'use client';

/**
 * Accueil = liste des campagnes (PER-180). La campagne est le point d'entrée de
 * l'application : le contexte campagne doit être explicite dans l'URL (les règles
 * appliquées et l'affichage en dépendent), plutôt qu'une « campagne active »
 * implicite. On peut créer, renommer et supprimer une campagne ; la suppression
 * est en cascade (personnages rattachés) avec confirmation forte.
 *
 * Ce composant est le PREMIER consommateur du store `campaigns` : son import
 * déclenche l'hydratation du store et le bootstrap de la « Campagne par défaut »
 * pour les personnages migrés (cf. store `campaigns`).
 */
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import EditIcon from '@mui/icons-material/Edit';
import GroupIcon from '@mui/icons-material/Group';
import PersonIcon from '@mui/icons-material/Person';
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
import { AppHeader } from '@/components/AppHeader';
import { AppTooltip } from '@/components/AppTooltip';
import { HomeBackground } from '@/components/HomeBackground';
import { createCampaign, type Campaign } from '@/lib/campaign';
import { useCampaignsStore } from '@/stores/campaigns';
import { useCharactersStore } from '@/stores/characters';
import { useWizardStore } from '@/stores/wizard';

export default function HomePage() {
  const router = useRouter();
  const hasHydrated = useCampaignsStore((s) => s.hasHydrated);
  const campaigns = useCampaignsStore((s) => s.campaigns);
  const upsertCampaign = useCampaignsStore((s) => s.upsert);
  const removeCampaign = useCampaignsStore((s) => s.remove);
  const characters = useCharactersStore((s) => s.characters);
  const draft = useWizardStore((s) => s.draft);
  const clearDraft = useWizardStore((s) => s.clear);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [toRename, setToRename] = useState<Campaign | null>(null);
  const [renameName, setRenameName] = useState('');
  const [toDelete, setToDelete] = useState<Campaign | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Décompte des personnages par campagne (FK `campaignId`), pour l'affichage et
  // l'avertissement de cascade à la suppression.
  const characterCount = (campaignId: string) =>
    characters.filter((c) => c.campaignId === campaignId).length;

  const handleCreate = () => {
    const campaign = createCampaign(newName);
    upsertCampaign(campaign);
    setCreateOpen(false);
    setNewName('');
    // On entre directement dans la campagne fraîchement créée.
    router.push(`/campaign/${campaign.id}`);
  };

  const handleRename = () => {
    if (!toRename) return;
    const name = renameName.trim();
    if (name) upsertCampaign({ ...toRename, name });
    setToRename(null);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    const name = toDelete.name;
    removeCampaign(toDelete.id);
    setToast(`Campagne « ${name} » supprimée.`);
    setToDelete(null);
  };

  // Brouillon de wizard en cours (PER-180) : ne le proposer à la reprise que si sa
  // campagne existe encore (elle a pu être supprimée en cascade).
  const draftCampaign = draft
    ? campaigns.find((c) => c.id === draft.campaignId)
    : undefined;

  const sorted = [...campaigns].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <>
      <title>Campagnes — Éditeur de personnage CO2</title>
      <HomeBackground />
      <AppHeader title="Campagnes" onBack={() => router.push('/')} />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => {
              setNewName('');
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

        {!hasHydrated ? (
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
                        spacing={2}
                        sx={{ alignItems: 'center', color: 'text.secondary', mt: 0.75 }}
                      >
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <PersonIcon fontSize="small" />
                          <Typography variant="body2">
                            {count} personnage{count > 1 ? 's' : ''}
                          </Typography>
                        </Stack>
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                          <GroupIcon fontSize="small" />
                          <Typography variant="body2">
                            {campaign.players.length} joueur{campaign.players.length > 1 ? 's' : ''}
                          </Typography>
                        </Stack>
                      </Stack>
                    </Box>
                    <Stack direction="row" sx={{ flexShrink: 0 }}>
                      <AppTooltip title="Renommer">
                        <IconButton
                          onClick={() => {
                            setToRename(campaign);
                            setRenameName(campaign.name);
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </AppTooltip>
                      <AppTooltip title="Supprimer">
                        <IconButton color="error" onClick={() => setToDelete(campaign)}>
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
              if (e.key === 'Enter') handleCreate();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={handleCreate}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Renommage */}
      <Dialog open={toRename !== null} onClose={() => setToRename(null)} fullWidth maxWidth="xs">
        <DialogTitle>Renommer la campagne</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nom de la campagne"
            fullWidth
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleRename();
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToRename(null)}>Annuler</Button>
          <Button variant="contained" onClick={handleRename}>
            Renommer
          </Button>
        </DialogActions>
      </Dialog>

      {/* Suppression en cascade — confirmation forte */}
      <Dialog open={toDelete !== null} onClose={() => setToDelete(null)}>
        <DialogTitle>Supprimer la campagne ?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            « {toDelete?.name} » sera définitivement supprimée, ainsi que{' '}
            <strong>
              {toDelete ? characterCount(toDelete.id) : 0} personnage
              {toDelete && characterCount(toDelete.id) > 1 ? 's' : ''}
            </strong>{' '}
            et{' '}
            <strong>
              {toDelete?.players.length ?? 0} joueur
              {(toDelete?.players.length ?? 0) > 1 ? 's' : ''}
            </strong>{' '}
            (suppression en cascade). Cette action est <strong>irréversible</strong> — pensez à
            exporter les personnages en JSON au préalable si besoin.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={confirmDelete}>
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
          <AppAlert severity="success" variant="filled" onClose={() => setToast(null)} sx={{ width: '100%' }}>
            {toast}
          </AppAlert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
