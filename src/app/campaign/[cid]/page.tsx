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
 *
 * La liste (tableau + cartes, menu « ⋮ », zébrures, tri) est portée par le
 * composant partagé `CharacterList`, mutualisé avec l'accueil. Ici, pas de
 * colonne campagne (contexte implicite) mais un découpage en sections
 * actifs/archivés (PER-183) et un marqueur de statut accolé au nom.
 */
import { use, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/Download';
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
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { AccountMenu } from '@/components/AccountMenu';
import { AppHeader } from '@/components/AppHeader';
import { AppTooltip } from '@/components/AppTooltip';
import {
  CharacterList,
  type CharacterListAction,
} from '@/components/character-list/CharacterList';
import { CharacterStatusMarker } from '@/components/character-list/CharacterStatusMarker';
import { SortControl } from '@/components/character-list/SortControl';
import { pickSortReducer, type SortKey, type SortState } from '@/components/character-list/sort';
import { PlayersSection } from '@/components/campaign/PlayersSection';
import { HomeBackground } from '@/components/HomeBackground';
import { ImportCharacterDialog } from '@/components/home/ImportCharacterDialog';
import type { CharacterSummary } from '@/lib/character/summary';
import { fileSlug, summarize } from '@/lib/character/summary';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { useWizardStore } from '@/stores/wizard';

// Pas de tri par campagne ici : la campagne est le contexte implicite.
const CAMPAIGN_SORT_KEYS: SortKey[] = ['updatedAt', 'name', 'level'];

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
  const [sort, setSort] = useState<SortState>({ key: 'updatedAt', dir: 'desc' });

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setToast({ message, severity });

  const pickSort = (key: SortKey) => setSort(pickSortReducer(key));
  const toggleDir = () => setSort((p) => ({ key: p.key, dir: p.dir === 'asc' ? 'desc' : 'asc' }));

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

  // Personnages de CETTE campagne (FK `campaignId`), puis tri partagé.
  const rows = useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return characters
      .filter((c) => c.campaignId === cid)
      .map(summarize)
      .sort((a, b) => {
        switch (sort.key) {
          case 'name':
            return dir * a.name.localeCompare(b.name, 'fr');
          case 'level':
            return dir * (a.level - b.level) || a.name.localeCompare(b.name, 'fr');
          default:
            return dir * a.updatedAt.localeCompare(b.updatedAt);
        }
      });
  }, [characters, cid, sort]);

  // Split actifs / archivés (PER-183) : « Archivés » est un terme d'UI désignant
  // l'union mort ∪ retiré (pas une valeur de statut). Le changement de statut se
  // fait sur la FICHE (owner-only ici, alors que le joueur doit pouvoir l'éditer).
  const activeRows = rows.filter((r) => r.status === 'active');
  const archivedRows = rows.filter((r) => r.status !== 'active');

  // Marqueur discret du statut d'un personnage archivé (mort / retraité), accolé au
  // nom. `active` ⇒ aucun marqueur (cas des lignes de la section « Vivants »).
  const renderNameMarker = (r: CharacterSummary) => <CharacterStatusMarker status={r.status} />;

  const actions: CharacterListAction[] = [
    {
      key: 'open',
      label: 'Ouvrir',
      icon: <OpenInNewIcon fontSize="small" />,
      onClick: (r) => router.push(`/character/${r.id}`),
    },
    {
      key: 'duplicate',
      label: 'Dupliquer',
      icon: <ContentCopyIcon fontSize="small" />,
      onClick: (r) => handleDuplicate(r.id),
    },
    {
      key: 'export',
      label: 'Exporter en JSON',
      icon: <DownloadIcon fontSize="small" />,
      onClick: (r) => handleExport(r.id),
    },
    {
      key: 'delete',
      label: 'Supprimer',
      icon: <DeleteOutlineIcon fontSize="small" color="error" />,
      danger: true,
      onClick: (r) => setToDelete({ id: r.id, name: r.name }),
    },
  ];

  const list = (groupRows: CharacterSummary[]) => (
    <CharacterList
      rows={groupRows}
      onOpen={(r) => router.push(`/character/${r.id}`)}
      actions={actions}
      sort={sort}
      onPickSort={pickSort}
      renderNameMarker={renderNameMarker}
    />
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
            {/* Tri mobile partagé par les deux sections (le desktop trie via les
                en-têtes de chaque tableau). */}
            <SortControl
              sort={sort}
              keys={CAMPAIGN_SORT_KEYS}
              onPickSort={pickSort}
              onToggleDir={toggleDir}
            />

            {/* Vivants (`status = active`). Un léger message si tous sont archivés. */}
            <Box>
              <Typography variant="h6" sx={{ mb: 1.5 }}>
                Vivants
              </Typography>
              {activeRows.length === 0 ? (
                <Typography color="text.secondary">Aucun personnage vivant.</Typography>
              ) : (
                list(activeRows)
              )}
            </Box>

            {/* Archivés (mort ∪ retiré) — section masquée si vide. */}
            {archivedRows.length > 0 && (
              <Box>
                <Typography variant="h6" sx={{ mb: 1.5 }}>
                  Archivés
                </Typography>
                {list(archivedRows)}
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
