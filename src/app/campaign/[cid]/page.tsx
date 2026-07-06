'use client';

/**
 * Vue campagne (PER-180) — coquille + liste des personnages de la campagne.
 *
 * Depuis PER-180, la campagne est le contexte d'URL : cette page liste les
 * personnages rattachés à `cid` (FK `Character.campaignId`) et donne accès à leur
 * fiche et au wizard, tous deux imbriqués sous `/campaign/[cid]/...`. Le détail
 * riche de la campagne (personnages actifs/archivés, éditeur de règles de table)
 * est porté par PER-183 ; on relocalise ici la liste de personnages qui vivait
 * auparavant sur l'accueil, pour que la navigation reste cohérente.
 */
import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SettingsIcon from '@mui/icons-material/Settings';
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
import { AccountMenu } from '@/components/AccountMenu';
import { AppHeader } from '@/components/AppHeader';
import { AppTooltip } from '@/components/AppTooltip';
import { PlayersSection } from '@/components/campaign/PlayersSection';
import { ClassIcon } from '@/components/ClassIcon';
import { HomeBackground } from '@/components/HomeBackground';
import { ImportCharacterDialog } from '@/components/home/ImportCharacterDialog';
import { fileSlug, formatDate, summarize } from '@/lib/character/summary';
import { classColor } from '@/lib/ui/classColors';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { useWizardStore } from '@/stores/wizard';

export default function CampaignPage({ params }: { params: Promise<{ cid: string }> }) {
  const { cid } = use(params);
  const router = useRouter();
  const charactersHydrated = useCharactersStore((s) => s.hasHydrated);
  const characters = useCharactersStore((s) => s.characters);
  const duplicate = useCharactersStore((s) => s.duplicate);
  const remove = useCharactersStore((s) => s.remove);
  const campaignsStatus = useCampaignsStore((s) => s.status);
  const loadCampaigns = useCampaignsStore((s) => s.load);
  const campaign = useCampaignsStore((s) => s.campaigns.find((c) => c.id === cid));
  const draft = useWizardStore((s) => s.draft);
  const clearDraft = useWizardStore((s) => s.clear);

  // Charge les campagnes possédées au montage : la campagne courante est résolue
  // depuis ce cache cloud (RLS `owner_id`), le CRUD vivant sur `/campaigns`.
  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const [importOpen, setImportOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setToast({ message, severity });

  const handleCreate = () => {
    // Création rattachée à cette campagne : la campagne est passée en query au
    // wizard (dé-imbriqué). Le personnage naît dans cette campagne.
    router.push(`/create?campaign=${cid}`);
  };

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

  // Personnages de CETTE campagne (FK `campaignId`), triés par date de modification.
  const rows = characters
    .filter((c) => c.campaignId === cid)
    .map(summarize)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // Split actifs / archivés (PER-183) : « Archivés » est un terme d'UI désignant
  // l'union mort ∪ retiré (pas une valeur de statut). Le changement de statut se
  // fait sur la FICHE (owner-only ici, alors que le joueur doit pouvoir l'éditer).
  const activeRows = rows.filter((r) => r.status === 'active');
  const archivedRows = rows.filter((r) => r.status !== 'active');

  // Marqueur discret du statut d'un personnage archivé (mort / retiré).
  const statusMarker = (status: (typeof rows)[number]['status']) =>
    status === 'dead' ? (
      <AppTooltip title="Mort">
        <HeartBrokenIcon fontSize="small" sx={{ color: 'text.secondary' }} />
      </AppTooltip>
    ) : status === 'retired' ? (
      <AppTooltip title="Retiré">
        <Inventory2Icon fontSize="small" sx={{ color: 'text.secondary' }} />
      </AppTooltip>
    ) : null;

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

  // Rend un groupe de personnages (actifs ou archivés) : tableau (desktop) +
  // cartes empilées (mobile). Les lignes archivées portent leur marqueur de statut.
  const renderGroup = (groupRows: typeof rows, archived: boolean) => (
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
              <TableCell>Modifié</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {groupRows.map((r) => (
              <TableRow key={r.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                    {archived && statusMarker(r.status)}
                    <Box component="span">{r.name}</Box>
                  </Stack>
                </TableCell>
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
                <TableCell>{formatDate(r.updatedAt)}</TableCell>
                <TableCell align="right">{rowActions(r)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Mobile : une carte empilée par personnage (PER-51). */}
      <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
        {groupRows.map((r) => (
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
                <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
                  {archived && statusMarker(r.status)}
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {r.name}
                  </Typography>
                </Stack>
                <Stack
                  direction="row"
                  spacing={0.5}
                  sx={{ alignItems: 'center', flexWrap: 'wrap' }}
                >
                  <ClassIcon classId={r.classId} firearmsAllowed={r.firearmsAllowed} size={16} />
                  <Typography variant="body2" color="text.secondary">
                    {r.ancestry} ·{' '}
                    <Box component="span" sx={{ color: classColor(r.classId), fontWeight: 600 }}>
                      {r.characterClass}
                    </Box>{' '}
                    · niveau {r.level}
                  </Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary">
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
  );

  const campaignsLoading = campaignsStatus === 'idle' || campaignsStatus === 'loading';
  if (!charactersHydrated || campaignsLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!campaign) {
    return (
      <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
        <title>Campagne introuvable — Éditeur de personnage CO2</title>
        <Typography variant="h6" gutterBottom>
          Campagne introuvable
        </Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push('/campaigns')}>
          Retour aux campagnes
        </Button>
      </Container>
    );
  }

  return (
    <>
      <title>{`${campaign.name} — Éditeur de personnage CO2`}</title>
      <HomeBackground />
      <AppHeader
        title={campaign.name}
        onBack={() => router.push('/campaigns')}
        action={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <AppTooltip title="Réglages de la campagne">
              <IconButton color="inherit" onClick={() => router.push(`/campaign/${cid}/settings`)}>
                <SettingsIcon />
              </IconButton>
            </AppTooltip>
            <AccountMenu />
          </Stack>
        }
      />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate}>
            Nouveau personnage
          </Button>
          <Button
            variant="outlined"
            startIcon={<UploadIcon />}
            onClick={() => setImportOpen(true)}
          >
            Importer un JSON
          </Button>
        </Stack>

        {draft && draft.campaignId === cid && (
          <AppAlert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <>
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => router.push(`/create?campaign=${cid}`)}
                >
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

        {rows.length === 0 ? (
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
              Aucun personnage dans cette campagne. Créez-en un ou importez un fichier JSON.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={4}>
            {/* Actifs (`status = active`). Un léger message si tous sont archivés. */}
            <Box>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Actifs
              </Typography>
              {activeRows.length === 0 ? (
                <Typography color="text.secondary">Aucun personnage actif.</Typography>
              ) : (
                renderGroup(activeRows, false)
              )}
            </Box>

            {/* Archivés (mort ∪ retiré) — section masquée si vide. */}
            {archivedRows.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                  Archivés
                </Typography>
                {renderGroup(archivedRows, true)}
              </Box>
            )}
          </Stack>
        )}

        <Box sx={{ mt: 4 }}>
          <PlayersSection campaignId={cid} />
        </Box>
      </Container>

      <ImportCharacterDialog
        open={importOpen}
        campaignId={cid}
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
