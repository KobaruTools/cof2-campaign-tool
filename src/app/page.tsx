'use client';

/**
 * Accueil = liste plate de TOUS les personnages (PER-180, révision). Le
 * personnage est l'entité première : on peut en créer et en consulter sans
 * campagne ni joueur. Chaque ligne affiche un badge de campagne (nom de la
 * campagne de rattachement, ou « Non attribué »). La gestion des campagnes vit
 * sur une page dédiée (`/campaigns`), accessible depuis l'en-tête.
 */
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import GroupsIcon from '@mui/icons-material/Groups';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UploadIcon from '@mui/icons-material/Upload';
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
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { AppHeader } from '@/components/AppHeader';
import { AppTooltip } from '@/components/AppTooltip';
import { CampaignBadge } from '@/components/home/CampaignBadge';
import { ClassIcon } from '@/components/ClassIcon';
import { HomeBackground } from '@/components/HomeBackground';
import { ImportCharacterDialog } from '@/components/home/ImportCharacterDialog';
import { fileSlug, formatDate, summarize } from '@/lib/character/summary';
import { classColor } from '@/lib/ui/classColors';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { useWizardStore } from '@/stores/wizard';

export default function HomePage() {
  const router = useRouter();
  const hasHydrated = useCharactersStore((s) => s.hasHydrated);
  const status = useCharactersStore((s) => s.status);
  const characters = useCharactersStore((s) => s.characters);
  const loadCharacters = useCharactersStore((s) => s.load);
  const duplicate = useCharactersStore((s) => s.duplicate);
  const remove = useCharactersStore((s) => s.remove);
  const campaigns = useCampaignsStore((s) => s.campaigns);
  const loadCampaigns = useCampaignsStore((s) => s.load);
  const draft = useWizardStore((s) => s.draft);
  const clearDraft = useWizardStore((s) => s.clear);

  // Charge les personnages cloud (RLS `owner_id`) puis fusionne au staging local
  // (PER-192), et les campagnes cloud pour résoudre le nom du badge de chaque perso.
  useEffect(() => {
    void loadCharacters();
    void loadCampaigns();
  }, [loadCharacters, loadCampaigns]);

  const [importOpen, setImportOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setToast({ message, severity });

  // Nom de la campagne par id, pour le badge de chaque ligne (null = non attribué).
  const campaignNameById = new Map(campaigns.map((c) => [c.id, c.name]));

  const handleCreate = () => router.push('/create');

  const handleExport = (id: string) => {
    const character = useCharactersStore.getState().getById(id);
    if (!character) return;
    const blob = new Blob([JSON.stringify(character, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileSlug(character.name)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify(`« ${character.name || 'Sans nom'} » exporté en JSON.`);
  };

  const handleDuplicate = (id: string) => {
    const copy = duplicate(id);
    if (copy) notify(`« ${copy.name || 'Sans nom'} » dupliqué.`);
  };

  const confirmDelete = () => {
    if (toDelete) {
      remove(toDelete.id);
      notify(`« ${toDelete.name || 'Sans nom'} » supprimé.`);
    }
    setToDelete(null);
  };

  const rows = characters.map(summarize).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // Actions d'une ligne, partagées par le tableau (desktop) et les cartes (mobile).
  const rowActions = (r: (typeof rows)[number]) => (
    <>
      <AppTooltip title="Ouvrir">
        <IconButton onClick={() => router.push(`/character/${r.id}`)}>
          <OpenInNewIcon fontSize="small" />
        </IconButton>
      </AppTooltip>
      <AppTooltip title="Dupliquer">
        <IconButton onClick={() => handleDuplicate(r.id)}>
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </AppTooltip>
      <AppTooltip title="Exporter en JSON">
        <IconButton onClick={() => handleExport(r.id)}>
          <DownloadIcon fontSize="small" />
        </IconButton>
      </AppTooltip>
      <AppTooltip title="Supprimer">
        <IconButton color="error" onClick={() => setToDelete({ id: r.id, name: r.name })}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </AppTooltip>
    </>
  );

  return (
    <>
      <title>Personnages — Éditeur de personnage CO2</title>
      <HomeBackground />
      <AppHeader
        title="Personnages — Chroniques Oubliées Fantasy 2"
        action={
          <Button color="inherit" startIcon={<GroupsIcon />} onClick={() => router.push('/campaigns')}>
            Campagnes
          </Button>
        }
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Nouveau personnage
          </Button>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setImportOpen(true)}>
            Importer un JSON
          </Button>
        </Stack>

        {draft && (
          <AppAlert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <>
                <Button color="inherit" size="small" onClick={() => router.push('/create')}>
                  Reprendre
                </Button>
                <Button color="inherit" size="small" onClick={() => clearDraft()}>
                  Abandonner
                </Button>
              </>
            }
          >
            Un brouillon de création est en cours.
          </AppAlert>
        )}

        {!hasHydrated || ((status === 'idle' || status === 'loading') && characters.length === 0) ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : rows.length === 0 ? (
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
              Rassemblez votre compagnie
            </Typography>
            <Typography color="text.secondary">
              Aucun personnage pour l’instant. Créez-en un ou importez un fichier JSON.
            </Typography>
          </Paper>
        ) : (
          <>
            {/* Desktop : tableau classique. Masqué sous md (illisible sur mobile). */}
            <TableContainer
              component={Paper}
              variant="outlined"
              sx={{
                display: { xs: 'none', md: 'block' },
                bgcolor: 'rgba(30, 30, 34, 0.62)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                borderColor: 'rgba(255, 255, 255, 0.10)',
              }}
            >
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Peuple</TableCell>
                    <TableCell>Profil</TableCell>
                    <TableCell align="center">Niveau</TableCell>
                    <TableCell>Campagne</TableCell>
                    <TableCell>Modifié</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.name}</TableCell>
                      <TableCell>{r.ancestry}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                          <ClassIcon classId={r.classId} firearmsAllowed={r.firearmsAllowed} size={20} />
                          <Box component="span" sx={{ color: classColor(r.classId), fontWeight: 600 }}>
                            {r.characterClass}
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell align="center">{r.level}</TableCell>
                      <TableCell>
                        <CampaignBadge
                          name={r.campaignId ? campaignNameById.get(r.campaignId) ?? null : null}
                        />
                      </TableCell>
                      <TableCell>{formatDate(r.updatedAt)}</TableCell>
                      <TableCell align="right">{rowActions(r)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Mobile : une carte empilée par personnage (PER-51). */}
            <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
              {rows.map((r) => (
                <Paper
                  key={r.id}
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
                      sx={{ minWidth: 0, cursor: 'pointer' }}
                      onClick={() => router.push(`/character/${r.id}`)}
                    >
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {r.name}
                      </Typography>
                      <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <ClassIcon classId={r.classId} firearmsAllowed={r.firearmsAllowed} size={16} />
                        <Typography variant="body2" color="text.secondary">
                          {r.ancestry} ·{' '}
                          <Box component="span" sx={{ color: classColor(r.classId), fontWeight: 600 }}>
                            {r.characterClass}
                          </Box>{' '}
                          · niveau {r.level}
                        </Typography>
                      </Stack>
                      <Box sx={{ mt: 0.5 }}>
                        <CampaignBadge
                          name={r.campaignId ? campaignNameById.get(r.campaignId) ?? null : null}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        Modifié {formatDate(r.updatedAt)}
                      </Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 0.5 }}>
                    {rowActions(r)}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </>
        )}
      </Container>

      {/* Import depuis l'accueil : personnage « Non attribué » (campaignId null). */}
      <ImportCharacterDialog
        open={importOpen}
        campaignId={null}
        onClose={() => setImportOpen(false)}
        onImported={(c) => notify(`« ${c.name || 'Sans nom'} » importé.`)}
      />

      <Dialog open={toDelete !== null} onClose={() => setToDelete(null)}>
        <DialogTitle>Supprimer le personnage ?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            « {toDelete?.name} » sera définitivement supprimé. Cette action est irréversible
            (pensez à exporter en JSON si besoin).
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setToDelete(null)}>Annuler</Button>
          <Button color="error" onClick={confirmDelete}>
            Supprimer
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
