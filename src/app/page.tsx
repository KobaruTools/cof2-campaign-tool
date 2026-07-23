'use client';

/**
 * Accueil = liste plate de TOUS les personnages (PER-180, révision). Le
 * personnage est l'entité première : on peut en créer et en consulter sans
 * campagne ni joueur. Chaque ligne affiche un badge de campagne (nom de la
 * campagne de rattachement, ou « Non attribué »). La gestion des campagnes vit
 * sur une page dédiée (`/campaigns`), accessible depuis l'en-tête.
 *
 * La liste elle-même (tableau + cartes, menu « ⋮ », zébrures, tri) est portée
 * par le composant partagé `CharacterList`, réutilisé par la vue campagne. Ici
 * on ajoute la recherche, le tri par campagne et le regroupement par campagne.
 */
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AddIcon from '@mui/icons-material/Add';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import DownloadIcon from '@mui/icons-material/Download';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import SearchIcon from '@mui/icons-material/Search';
import UploadIcon from '@mui/icons-material/Upload';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Collapse from '@mui/material/Collapse';
import Container from '@mui/material/Container';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AppAlert } from '@/components/AppAlert';
import { useToast } from '@/components/toast/ToastProvider';
import { AppHeader } from '@/components/AppHeader';
import { AppTooltip } from '@/components/AppTooltip';
import {
  CharacterList,
  UNASSIGNED,
  type CharacterListAction,
  type CharacterListGroup,
} from '@/components/character-list/CharacterList';
import { CharacterListSkeleton } from '@/components/character-list/CharacterListSkeleton';
import { CharacterStatusMarker } from '@/components/character-list/CharacterStatusMarker';
import { SortControl } from '@/components/character-list/SortControl';
import { pickSortReducer, type SortKey } from '@/components/character-list/sort';
import { usePersistedSort } from '@/components/character-list/usePersistedSort';
import { HomeBackground } from '@/components/HomeBackground';
import { usePersistedBoolean } from '@/lib/ui/usePersistedBoolean';
import { ImportCharacterDialog } from '@/components/home/ImportCharacterDialog';
import { UploadCharacterDialog } from '@/components/home/UploadCharacterDialog';
import type { Character } from '@/lib/character/types';
import type { CharacterSummary } from '@/lib/character/summary';
import { summarizeInCampaign } from '@/lib/character/summary';
import { downloadCharacterExport } from '@/lib/character/transferExport';
import { useCharactersStore } from '@/stores/characters';
import { useCampaignsStore } from '@/stores/campaigns';
import { useWizardStore } from '@/stores/wizard';

const HOME_SORT_KEYS: SortKey[] = ['updatedAt', 'name', 'level', 'campaign'];

/** Normalise pour une recherche insensible aux accents et à la casse. */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

export default function HomePage() {
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
  const [query, setQuery] = useState('');
  // Tri persisté en local (survit au rechargement, PER-183).
  const [sort, setSort] = usePersistedSort(
    'home-sort',
    { key: 'updatedAt', dir: 'desc' },
    HOME_SORT_KEYS,
  );
  // Section « Archivés » (morts + retraités) repliable, repliée par défaut, choix
  // persisté en local (survit au rechargement).
  const [archivedOpen, setArchivedOpen] = usePersistedBoolean('home-archived-open', false);

  const { showToast } = useToast();
  const notify = (message: string, severity: 'success' | 'error' = 'success') =>
    showToast(message, severity);

  // Nom de la campagne par id, pour le badge de chaque ligne (null = non attribué).
  const campaignNameById = useMemo(
    () => new Map(campaigns.map((c) => [c.id, c.name])),
    [campaigns],
  );

  // Campagne complète par id : sert à dériver l'autorisation EFFECTIVE des armes à
  // feu de chaque personnage (nom Arquebusier ↔ Arbalétrier, PER-185).
  const campaignById = useMemo(() => new Map(campaigns.map((c) => [c.id, c])), [campaigns]);

  // Un personnage est « local » (staging non téléversé, PER-193) s'il est absent
  // des versions cloud APRÈS un chargement réussi. Tant que le cloud n'est pas
  // chargé (ou non configuré / en erreur), on ne présume pas : pas de marqueur ni
  // d'action de téléversement.
  const isLocalOnly = (id: string) => status === 'ready' && !(id in cloudVersions);

  const pickSort = (key: SortKey) => setSort(pickSortReducer(key));
  const toggleDir = () => setSort((p) => ({ key: p.key, dir: p.dir === 'asc' ? 'desc' : 'asc' }));

  const openUpload = (id: string) => {
    const character = useCharactersStore.getState().getById(id);
    if (character) setToUpload(character);
  };

  const handleExport = async (id: string) => {
    const character = useCharactersStore.getState().getById(id);
    if (!character) return;
    // Fichier auto-porteur (PER-182) : blob + contexte des FK (campagne/joueur).
    await downloadCharacterExport(character);
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

  const allRows = useMemo(
    () =>
      characters.map((c) =>
        summarizeInCampaign(c, c.campaignId ? campaignById.get(c.campaignId) : null),
      ),
    [characters, campaignById],
  );

  // Filtre (recherche) puis tri. Le regroupement par campagne se fait ensuite.
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

  // Split actifs / archivés (PER-183, comme la vue campagne) : « Archivés » est un
  // terme d'UI désignant l'union mort ∪ retraité (pas une valeur de statut).
  const activeRows = useMemo(() => rows.filter((r) => r.status === 'active'), [rows]);
  const archivedRows = useMemo(() => rows.filter((r) => r.status !== 'active'), [rows]);

  // Regroupement visuel des VIVANTS : seulement quand on trie par campagne. On
  // préserve l'ordre déjà trié (les groupes sortent dans l'ordre des lignes). Les
  // archivés restent une liste plate dans leur propre section repliable.
  const groups = useMemo<CharacterListGroup[] | null>(() => {
    if (sort.key !== 'campaign') return null;
    const map = new Map<string, CharacterListGroup>();
    for (const r of activeRows) {
      const key = r.campaignId ?? '__none__';
      if (!map.has(key)) {
        const name = r.campaignId ? campaignNameById.get(r.campaignId) ?? UNASSIGNED : UNASSIGNED;
        map.set(key, { key, name, rows: [] });
      }
      map.get(key)!.rows.push(r);
    }
    return [...map.values()];
  }, [activeRows, sort.key, campaignNameById]);

  // Marqueur accolé au nom : statut archivé (mort / retraité, PER-183) puis
  // « non synchronisé » (PER-193) — les deux peuvent coexister.
  const renderNameMarker = (r: CharacterSummary) => (
    <>
      <CharacterStatusMarker status={r.status} />
      {isLocalOnly(r.id) && (
        <AppTooltip title="Non synchronisé — stocké uniquement sur cet appareil">
          <CloudOffIcon fontSize="small" sx={{ color: 'warning.main', flexShrink: 0 }} />
        </AppTooltip>
      )}
    </>
  );

  const actions: CharacterListAction[] = [
    {
      key: 'open',
      label: 'Ouvrir',
      icon: <OpenInNewIcon fontSize="small" />,
      href: (r) => `/character/${r.id}`,
    },
    {
      key: 'upload',
      label: 'Téléverser vers le cloud',
      icon: <CloudUploadIcon fontSize="small" color="primary" />,
      show: (r) => isLocalOnly(r.id),
      onClick: (r) => openUpload(r.id),
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

  return (
    <>
      <title>Personnages — Éditeur de personnage CO2</title>
      <HomeBackground />
      {/* Accueil : pas de fil d'Ariane (le logo de marque couvre déjà l'accueil).
          Les liens globaux Bestiaire/Campagnes + menu compte sont injectés en dur
          par l'en-tête (PER-239). */}
      <AppHeader />

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <Button variant="contained" startIcon={<AddIcon />} component={Link} href="/create">
            Nouveau personnage
          </Button>
          <Button variant="outlined" startIcon={<UploadIcon />} onClick={() => setImportOpen(true)}>
            Importer
          </Button>
        </Stack>

        {draft && (
          <AppAlert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <>
                <Button color="inherit" size="small" component={Link} href="/create">
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
          <CharacterListSkeleton rows={6} showCampaign sortable />
        ) : allRows.length === 0 ? (
          <Paper
            variant="outlined"
            sx={{
              p: { xs: 3, sm: 6 },
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
              <SortControl
                sort={sort}
                keys={HOME_SORT_KEYS}
                onPickSort={pickSort}
                onToggleDir={toggleDir}
                sx={{ mt: 1 }}
              />
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
                {/* Vivants (`status = active`) : liste principale, raccordée au bloc
                    de recherche au-dessus. */}
                {activeRows.length > 0 ? (
                  <CharacterList
                    rows={activeRows}
                    groups={groups}
                    hrefFor={(r) => `/character/${r.id}`}
                    actions={actions}
                    showCampaign
                    campaignNameById={campaignNameById}
                    sort={sort}
                    onPickSort={pickSort}
                    renderNameMarker={renderNameMarker}
                    attachedTop
                  />
                ) : (
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
                      {query
                        ? 'Aucun personnage vivant ne correspond à cette recherche.'
                        : 'Aucun personnage vivant.'}
                    </Typography>
                  </Paper>
                )}

                {/* Archivés (morts + retraités) : section repliable, repliée par
                    défaut, état persisté en local. Masquée si aucun archivé. */}
                {archivedRows.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Box
                      role="button"
                      tabIndex={0}
                      onClick={() => setArchivedOpen(!archivedOpen)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setArchivedOpen(!archivedOpen);
                        }
                      }}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        cursor: 'pointer',
                        userSelect: 'none',
                        p: 1.5,
                        borderRadius: 2,
                        bgcolor: 'rgba(0, 0, 0, 0.35)',
                        border: '1px solid rgba(255, 255, 255, 0.10)',
                        '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.45)' },
                        // Ouvert : le bouton se raccorde à la liste en dessous (angles
                        // bas carrés, plus de liseré bas pour éviter le double trait).
                        ...(archivedOpen && {
                          borderBottomLeftRadius: 0,
                          borderBottomRightRadius: 0,
                          borderBottom: 'none',
                        }),
                      }}
                    >
                      <ExpandMoreIcon
                        sx={{
                          transition: 'transform 0.2s',
                          transform: archivedOpen ? 'rotate(0deg)' : 'rotate(-90deg)',
                        }}
                      />
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Archivés ({archivedRows.length})
                      </Typography>
                    </Box>
                    <Collapse in={archivedOpen} unmountOnExit>
                      <CharacterList
                        rows={archivedRows}
                        hrefFor={(r) => `/character/${r.id}`}
                        actions={actions}
                        showCampaign
                        campaignNameById={campaignNameById}
                        sort={sort}
                        onPickSort={pickSort}
                        renderNameMarker={renderNameMarker}
                        attachedTop
                      />
                    </Collapse>
                  </Box>
                )}
              </>
            )}
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
    </>
  );
}
