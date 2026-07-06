'use client';

/**
 * Accueil = liste plate de TOUS les personnages (PER-180, révision). Le
 * personnage est l'entité première : on peut en créer et en consulter sans
 * campagne ni joueur. Chaque ligne affiche un badge de campagne (nom de la
 * campagne de rattachement, ou « Non attribué »). La gestion des campagnes vit
 * sur une page dédiée (`/campaigns`), accessible depuis l'en-tête.
 *
 * Allègement (2026-07-06) : recherche + tri (Modifié par défaut, Nom, Niveau,
 * Campagne), regroupement visuel par campagne quand on trie par campagne,
 * colonne « Identité » condensée (peuple · profil · niveau) et actions repliées
 * dans un menu « ⋮ » — la ligne entière ouvre le personnage.
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AddIcon from '@mui/icons-material/Add';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import GroupsIcon from '@mui/icons-material/Groups';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
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
import InputAdornment from '@mui/material/InputAdornment';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Snackbar from '@mui/material/Snackbar';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { AccountMenu } from '@/components/AccountMenu';
import { AppHeader } from '@/components/AppHeader';
import { AppTooltip } from '@/components/AppTooltip';
import { CampaignBadge } from '@/components/home/CampaignBadge';
import { ClassIcon } from '@/components/ClassIcon';
import { HomeBackground } from '@/components/HomeBackground';
import { ImportCharacterDialog } from '@/components/home/ImportCharacterDialog';
import { UploadCharacterDialog } from '@/components/home/UploadCharacterDialog';
import type { Character } from '@/lib/character/types';
import { fileSlug, formatDate, summarize } from '@/lib/character/summary';
import type { CharacterSummary } from '@/lib/character/summary';
import { classColor } from '@/lib/ui/classColors';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { useWizardStore } from '@/stores/wizard';

/** Clé de tri de la liste. `updatedAt` est le défaut (plus récent d'abord). */
type SortKey = 'updatedAt' | 'name' | 'level' | 'campaign';
type SortDir = 'asc' | 'desc';

const SORT_LABELS: Record<SortKey, string> = {
  updatedAt: 'Modifié',
  name: 'Nom',
  level: 'Niveau',
  campaign: 'Campagne',
};

/** Sens « naturel » d'une clé au moment où on la sélectionne. */
const naturalDir = (key: SortKey): SortDir =>
  key === 'name' || key === 'campaign' ? 'asc' : 'desc';

/** Normalise pour une recherche insensible aux accents et à la casse. */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const UNASSIGNED = 'Non attribué';

export default function HomePage() {
  const router = useRouter();
  const hasHydrated = useCharactersStore((s) => s.hasHydrated);
  const status = useCharactersStore((s) => s.status);
  const characters = useCharactersStore((s) => s.characters);
  const cloudVersions = useCharactersStore((s) => s.cloudVersions);
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
  const [toUpload, setToUpload] = useState<Character | null>(null);
  const [toDelete, setToDelete] = useState<{ id: string; name: string } | null>(null);
  const [toast, setToast] = useState<{ message: string; severity: 'success' | 'error' } | null>(
    null,
  );
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'updatedAt',
    dir: 'desc',
  });
  const [menu, setMenu] = useState<{ anchor: HTMLElement; row: CharacterSummary } | null>(null);

  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    setToast({ message, severity });

  // Nom de la campagne par id, pour le badge de chaque ligne (null = non attribué).
  const campaignNameById = useMemo(
    () => new Map(campaigns.map((c) => [c.id, c.name])),
    [campaigns],
  );

  // Libellé de campagne d'un perso, pour la recherche, le tri et le regroupement.
  const campaignLabel = (r: CharacterSummary) =>
    r.campaignId ? campaignNameById.get(r.campaignId) ?? UNASSIGNED : UNASSIGNED;

  // Un personnage est « local » (staging non téléversé, PER-193) s'il est absent
  // des versions cloud APRÈS un chargement réussi. Tant que le cloud n'est pas
  // chargé (ou non configuré / en erreur), on ne présume pas : pas de marqueur ni
  // d'action de téléversement.
  const isLocalOnly = (id: string) => status === 'ready' && !(id in cloudVersions);

  const openUpload = (id: string) => {
    const character = useCharactersStore.getState().getById(id);
    if (character) setToUpload(character);
  };

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

  // Sélectionne une clé de tri ; recliquer la clé active inverse le sens.
  const pickSort = (key: SortKey) =>
    setSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: naturalDir(key) },
    );

  const toggleDir = () =>
    setSort((prev) => ({ key: prev.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }));

  // Icône d'un en-tête triable : flèche simple si actif, double flèche sinon.
  const sortIcon = (key: SortKey) =>
    sort.key === key ? (
      sort.dir === 'asc' ? (
        <ArrowUpwardIcon fontSize="small" />
      ) : (
        <ArrowDownwardIcon fontSize="small" />
      )
    ) : (
      <UnfoldMoreIcon fontSize="small" sx={{ opacity: 0.4 }} />
    );

  // En-tête de colonne cliquable qui pilote le tri de la liste.
  const renderSortHeader = (
    label: string,
    key: SortKey,
    align: 'left' | 'center' | 'right' = 'left',
    hint?: string,
  ) => {
    const content = (
      <Box
        component="span"
        onClick={() => pickSort(key)}
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        {label}
        {sortIcon(key)}
      </Box>
    );
    return (
      <TableCell align={align} sortDirection={sort.key === key ? sort.dir : false}>
        {hint ? <AppTooltip title={hint}>{content}</AppTooltip> : content}
      </TableCell>
    );
  };

  const allRows = useMemo(() => characters.map(summarize), [characters]);

  // Filtre (recherche) puis tri. Le regroupement par campagne se fait au rendu.
  const rows = useMemo(() => {
    const q = norm(query.trim());
    const filtered = q
      ? allRows.filter((r) => {
          const campaign = r.campaignId ? campaignNameById.get(r.campaignId) ?? '' : UNASSIGNED;
          return norm(`${r.name} ${r.ancestry} ${r.characterClass} ${campaign}`).includes(q);
        })
      : allRows;

    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case 'name':
          return dir * a.name.localeCompare(b.name, 'fr');
        case 'level':
          return dir * (a.level - b.level) || a.name.localeCompare(b.name, 'fr');
        case 'campaign': {
          // Non attribué toujours regroupé en fin de liste (sens ascendant).
          const ca = a.campaignId ? campaignNameById.get(a.campaignId) ?? '' : '￿';
          const cb = b.campaignId ? campaignNameById.get(b.campaignId) ?? '' : '￿';
          return dir * ca.localeCompare(cb, 'fr') || a.name.localeCompare(b.name, 'fr');
        }
        default:
          return dir * a.updatedAt.localeCompare(b.updatedAt);
      }
    });
  }, [allRows, query, sort, campaignNameById]);

  // Regroupement visuel : seulement quand on trie par campagne. On préserve
  // l'ordre déjà trié (les groupes sortent dans l'ordre des lignes).
  const groups = useMemo(() => {
    if (sort.key !== 'campaign') return null;
    const map = new Map<string, { name: string; rows: CharacterSummary[] }>();
    for (const r of rows) {
      const key = r.campaignId ?? '__none__';
      if (!map.has(key)) map.set(key, { name: campaignLabel(r), rows: [] });
      map.get(key)!.rows.push(r);
    }
    return [...map.entries()].map(([key, g]) => ({ key, ...g }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, sort.key, campaignNameById]);

  const openMenu = (e: React.MouseEvent<HTMLElement>, row: CharacterSummary) => {
    e.stopPropagation();
    setMenu({ anchor: e.currentTarget, row });
  };
  const closeMenu = () => setMenu(null);
  // Exécute une action du menu puis ferme (garde l'id capturé avant fermeture).
  const runFromMenu = (fn: (id: string) => void) => {
    const id = menu?.row.id;
    closeMenu();
    if (id) fn(id);
  };

  // ---- Rendu d'une ligne de tableau (desktop) --------------------------------
  const renderRow = (r: CharacterSummary, i: number) => (
    <TableRow
      key={r.id}
      hover
      sx={{
        cursor: 'pointer',
        bgcolor: i % 2 ? 'rgba(255, 255, 255, 0.035)' : 'transparent',
      }}
      onClick={() => router.push(`/character/${r.id}`)}
    >
      <TableCell>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          <Box component="span">{r.name}</Box>
          {isLocalOnly(r.id) && (
            <AppTooltip title="Non synchronisé — stocké uniquement sur cet appareil">
              <CloudOffIcon fontSize="small" sx={{ color: 'warning.main' }} />
            </AppTooltip>
          )}
        </Stack>
      </TableCell>
      <TableCell>
        <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
          <ClassIcon classId={r.classId} firearmsAllowed={r.firearmsAllowed} size={20} />
          <Box component="span" sx={{ color: classColor(r.classId), fontWeight: 600 }}>
            {r.characterClass}
          </Box>
          <Box component="span" sx={{ color: 'text.secondary' }}>
            · {r.ancestry} · {r.level}
          </Box>
        </Stack>
      </TableCell>
      <TableCell>
        <CampaignBadge
          name={r.campaignId ? campaignNameById.get(r.campaignId) ?? null : null}
          campaignId={r.campaignId}
        />
      </TableCell>
      <TableCell>
        <Typography variant="caption" color="text.secondary">
          {formatDate(r.updatedAt)}
        </Typography>
      </TableCell>
      <TableCell align="right" sx={{ pr: 2 }}>
        <IconButton size="small" onClick={(e) => openMenu(e, r)}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </TableCell>
    </TableRow>
  );

  // ---- Rendu d'une carte (mobile) --------------------------------------------
  const renderCard = (r: CharacterSummary) => (
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
          sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }}
          onClick={() => router.push(`/character/${r.id}`)}
        >
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
              {r.name}
            </Typography>
            {isLocalOnly(r.id) && (
              <AppTooltip title="Non synchronisé — stocké uniquement sur cet appareil">
                <CloudOffIcon fontSize="small" sx={{ color: 'warning.main', flexShrink: 0 }} />
              </AppTooltip>
            )}
          </Stack>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <ClassIcon classId={r.classId} firearmsAllowed={r.firearmsAllowed} size={16} />
            <Typography variant="body2">
              <Box component="span" sx={{ color: classColor(r.classId), fontWeight: 600 }}>
                {r.characterClass}
              </Box>
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {' '}
                · {r.ancestry} · {r.level}
              </Box>
            </Typography>
          </Stack>
          <Box sx={{ mt: 0.5 }}>
            <CampaignBadge
              name={r.campaignId ? campaignNameById.get(r.campaignId) ?? null : null}
              campaignId={r.campaignId}
            />
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            Modifié {formatDate(r.updatedAt)}
          </Typography>
        </Box>
        <IconButton size="small" onClick={(e) => openMenu(e, r)}>
          <MoreVertIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Paper>
  );

  const groupHeaderSx = {
    fontWeight: 700,
    color: 'text.secondary',
    bgcolor: 'rgba(255, 255, 255, 0.04)',
  } as const;

  return (
    <>
      <title>Personnages — Éditeur de personnage CO2</title>
      <HomeBackground />
      <AppHeader
        title="Personnages — Chroniques Oubliées Fantasy 2"
        action={
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            <Button color="inherit" startIcon={<GroupsIcon />} onClick={() => router.push('/campaigns')}>
              Campagnes
            </Button>
            <AccountMenu />
          </Stack>
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
        ) : allRows.length === 0 ? (
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
            {/* Bloc de recherche, collé en haut du tableau : fond noir translucide
                + flou, arrondi seulement en haut (le tableau prolonge le bas). */}
            <Box
              sx={{
                p: 1.5,
                bgcolor: 'rgba(0, 0, 0, 0.45)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                border: '1px solid rgba(255, 255, 255, 0.10)',
                borderRadius: 2,
                borderBottomLeftRadius: { md: 0 },
                borderBottomRightRadius: { md: 0 },
                borderBottom: { md: 'none' },
                mb: { xs: 2, md: 0 },
              }}
            >
              <TextField
                fullWidth
                size="small"
                placeholder="Rechercher (nom, peuple, profil, campagne)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              {/* Tri mobile : les cartes n'ont pas d'en-tête cliquable. */}
              <Stack
                direction="row"
                spacing={1}
                sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', mt: 1 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Trier :
                </Typography>
                <Select
                  size="small"
                  value={sort.key}
                  onChange={(e) => pickSort(e.target.value as SortKey)}
                  sx={{ flex: 1 }}
                >
                  {(Object.keys(SORT_LABELS) as SortKey[]).map((key) => (
                    <MenuItem key={key} value={key}>
                      {SORT_LABELS[key]}
                    </MenuItem>
                  ))}
                </Select>
                <AppTooltip title={sort.dir === 'asc' ? 'Croissant' : 'Décroissant'}>
                  <IconButton size="small" onClick={toggleDir}>
                    {sort.dir === 'asc' ? (
                      <ArrowUpwardIcon fontSize="small" />
                    ) : (
                      <ArrowDownwardIcon fontSize="small" />
                    )}
                  </IconButton>
                </AppTooltip>
              </Stack>
            </Box>

            {rows.length === 0 ? (
              <Paper
                variant="outlined"
                sx={{
                  p: 4,
                  textAlign: 'center',
                  bgcolor: 'rgba(30, 30, 34, 0.55)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                  borderColor: 'rgba(255, 255, 255, 0.10)',
                  borderTopLeftRadius: { md: 0 },
                  borderTopRightRadius: { md: 0 },
                }}
              >
                <Typography color="text.secondary">
                  Aucun personnage ne correspond à « {query} ».
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
                    borderTopLeftRadius: 0,
                    borderTopRightRadius: 0,
                  }}
                >
                  <Table>
                    <TableHead>
                      <TableRow>
                        {renderSortHeader('Nom', 'name')}
                        {renderSortHeader('Identité', 'level', 'left', 'Trier par niveau')}
                        {renderSortHeader('Campagne', 'campaign')}
                        {renderSortHeader('Modifié', 'updatedAt')}
                        <TableCell align="right" sx={{ pr: 2 }} />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {groups
                        ? groups.map((g) => (
                            <Fragment key={g.key}>
                              <TableRow>
                                <TableCell colSpan={5} sx={groupHeaderSx}>
                                  {g.name} ({g.rows.length})
                                </TableCell>
                              </TableRow>
                              {g.rows.map(renderRow)}
                            </Fragment>
                          ))
                        : rows.map(renderRow)}
                    </TableBody>
                  </Table>
                </TableContainer>

                {/* Mobile : une carte empilée par personnage (PER-51). */}
                <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
                  {groups
                    ? groups.map((g) => (
                        <Fragment key={g.key}>
                          <Typography
                            variant="overline"
                            color="text.secondary"
                            sx={{ mt: 1, fontWeight: 700 }}
                          >
                            {g.name} ({g.rows.length})
                          </Typography>
                          {g.rows.map(renderCard)}
                        </Fragment>
                      ))
                    : rows.map(renderCard)}
                </Stack>
              </>
            )}
          </>
        )}
      </Container>

      {/* Menu d'actions par ligne (replie dupliquer / exporter / téléverser / supprimer). */}
      <Menu
        anchorEl={menu?.anchor ?? null}
        open={menu !== null}
        onClose={closeMenu}
        disableScrollLock
      >
        <MenuItem onClick={() => runFromMenu((id) => router.push(`/character/${id}`))}>
          <ListItemIcon>
            <OpenInNewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Ouvrir</ListItemText>
        </MenuItem>
        {menu && isLocalOnly(menu.row.id) && (
          <MenuItem onClick={() => runFromMenu(openUpload)}>
            <ListItemIcon>
              <CloudUploadIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>Téléverser vers le cloud</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => runFromMenu(handleDuplicate)}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Dupliquer</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => runFromMenu(handleExport)}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Exporter en JSON</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={() => {
            const row = menu?.row;
            closeMenu();
            if (row) setToDelete({ id: row.id, name: row.name });
          }}
        >
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText sx={{ color: 'error.main' }}>Supprimer</ListItemText>
        </MenuItem>
      </Menu>

      {/* Import depuis l'accueil : personnage « Non attribué » (campaignId null). */}
      <ImportCharacterDialog
        open={importOpen}
        campaignId={null}
        onClose={() => setImportOpen(false)}
        onImported={(c) => notify(`« ${c.name || 'Sans nom'} » importé.`)}
      />

      {/* Téléversement d'un perso local vers le cloud (PER-193), choix par personnage. */}
      <UploadCharacterDialog
        character={toUpload}
        onClose={() => setToUpload(null)}
        onUploaded={(c) => notify(`« ${c.name || 'Sans nom'} » téléversé vers le cloud.`)}
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
