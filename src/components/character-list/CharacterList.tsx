'use client';

/**
 * Liste de personnages partagée par l'accueil (`/`) et la vue campagne
 * (`/campaign/[cid]`) : tableau (desktop) + cartes empilées (mobile), avec un
 * menu d'actions « ⋮ » par ligne, des lignes cliquables (ouverture de la fiche)
 * et des zébrures une ligne sur deux.
 *
 * Le composant est piloté par ses props : le tri (en-têtes cliquables) et la
 * colonne « Campagne » sont optionnels, le marqueur accolé au nom (statut ou
 * « non synchronisé ») et les actions du menu sont injectés par la page. Le
 * regroupement en sections avec en-têtes intra-tableau est optionnel aussi
 * (accueil : regroupement par campagne). La recherche et le découpage
 * actifs/archivés restent à la charge des pages appelantes.
 */
import { Fragment, type ReactNode, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { AppTooltip } from '@/components/AppTooltip';
import { CampaignBadge } from '@/components/home/CampaignBadge';
import { ClassIcon } from '@/components/ClassIcon';
import { formatDate } from '@/lib/character/summary';
import type { CharacterSummary } from '@/lib/character/summary';
import { classColor } from '@/lib/ui/classColors';
import type { SortKey, SortState } from './sort';

/** Une entrée du menu « ⋮ » d'une ligne. */
export interface CharacterListAction {
  key: string;
  label: string;
  icon: ReactNode;
  /** Colore l'entrée en `error` (ex. Supprimer). */
  danger?: boolean;
  /** Filtre l'entrée selon le personnage (ex. Téléverser si non synchronisé). */
  show?: (r: CharacterSummary) => boolean;
  onClick: (r: CharacterSummary) => void;
}

/** Groupe de lignes rendu sous un en-tête intra-tableau (accueil : par campagne). */
export interface CharacterListGroup {
  key: string;
  name: string;
  rows: CharacterSummary[];
}

export interface CharacterListProps {
  rows: CharacterSummary[];
  /** Clic sur une ligne / carte (ouvre la fiche en général). */
  onOpen: (r: CharacterSummary) => void;
  actions: CharacterListAction[];
  /** Affiche la colonne « Campagne » + badge (accueil). */
  showCampaign?: boolean;
  /** Résolution id → nom de campagne, requise si `showCampaign`. */
  campaignNameById?: Map<string, string>;
  /** Tri actif ; fourni ⇒ en-têtes de colonnes cliquables. */
  sort?: SortState;
  onPickSort?: (key: SortKey) => void;
  /** Regroupement en sections intra-tableau ; `null`/absent ⇒ liste plate. */
  groups?: CharacterListGroup[] | null;
  /** Marqueur accolé au nom (statut archivé, « non synchronisé »…). */
  renderNameMarker?: (r: CharacterSummary) => ReactNode;
  /** Angles supérieurs carrés pour se raccorder à un bloc au-dessus (accueil). */
  attachedTop?: boolean;
}

const UNASSIGNED = 'Non attribué';

const paperSx = {
  bgcolor: 'rgba(30, 30, 34, 0.62)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  borderColor: 'rgba(255, 255, 255, 0.10)',
} as const;

// En-tête de groupe (séparateur intra-tableau) : ligne compacte (py réduit),
// texte un peu plus gros que les lignes, cliquable pour replier le groupe. Fond
// noir dégradé (gris foncé → plus foncé), opaque et plus sombre que les lignes
// zébrées, + un liseré bas épais (2px) pour bien démarquer chaque campagne.
const groupHeaderSx = {
  py: 0.5,
  fontWeight: 700,
  fontSize: '1rem',
  color: 'text.primary',
  background: 'linear-gradient(90deg, rgba(26, 26, 30, 0.95) 0%, rgba(8, 8, 10, 0.97) 100%)',
  borderBottom: '2px solid rgba(255, 255, 255, 0.14)',
  cursor: 'pointer',
  userSelect: 'none',
} as const;

// Petit lien « Voir la campagne » aligné à droite de l'en-tête de groupe.
const groupLinkSx = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 0.25,
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'rgba(144, 202, 249, 0.85)',
  cursor: 'pointer',
  transition: 'color 120ms',
  '&:hover': { color: 'rgba(144, 202, 249, 1)' },
  '&:focus-visible': {
    outline: '2px solid',
    outlineColor: 'rgba(144, 202, 249, 0.7)',
    outlineOffset: 2,
    borderRadius: 1,
  },
} as const;

export function CharacterList({
  rows,
  onOpen,
  actions,
  showCampaign = false,
  campaignNameById,
  sort,
  onPickSort,
  groups,
  renderNameMarker,
  attachedTop = false,
}: CharacterListProps) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ anchor: HTMLElement; row: CharacterSummary } | null>(null);

  // Groupes repliés (par clé). Repli purement visuel, non persisté : les
  // groupes sont dépliés par défaut au montage.
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() => new Set());
  const toggleGroup = (key: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const openMenu = (e: React.MouseEvent<HTMLElement>, row: CharacterSummary) => {
    e.stopPropagation();
    setMenu({ anchor: e.currentTarget, row });
  };
  const closeMenu = () => setMenu(null);

  const campaignName = (r: CharacterSummary) =>
    r.campaignId ? campaignNameById?.get(r.campaignId) ?? null : null;

  // Lien « Voir la campagne » à droite de l'en-tête de groupe. La clé du groupe
  // est l'id de campagne (ou `__none__` pour « Non attribué ») : on ne montre le
  // lien que pour une vraie campagne, reconnue via `campaignNameById`.
  const renderGroupLink = (key: string) => {
    if (!campaignNameById?.has(key)) return null;
    const goToCampaign = () => router.push(`/campaign/${key}`);
    return (
      <Box
        component="span"
        role="link"
        tabIndex={0}
        onClick={(e) => {
          e.stopPropagation();
          goToCampaign();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            goToCampaign();
          }
        }}
        sx={groupLinkSx}
      >
        Voir la campagne
        <OpenInNewIcon sx={{ fontSize: '0.95rem' }} />
      </Box>
    );
  };

  // ---- Tri (en-têtes de colonnes) --------------------------------------------
  const sortable = sort != null && onPickSort != null;

  const sortIcon = (key: SortKey) =>
    sort?.key === key ? (
      sort.dir === 'asc' ? (
        <ArrowUpwardIcon fontSize="small" />
      ) : (
        <ArrowDownwardIcon fontSize="small" />
      )
    ) : (
      <UnfoldMoreIcon fontSize="small" sx={{ opacity: 0.4 }} />
    );

  const renderHeader = (
    label: string,
    key: SortKey,
    align: 'left' | 'center' | 'right' = 'left',
    hint?: string,
  ) => {
    if (!sortable) {
      return <TableCell align={align}>{label}</TableCell>;
    }
    const content = (
      <Box
        component="span"
        onClick={() => onPickSort!(key)}
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
      <TableCell align={align} sortDirection={sort?.key === key ? sort.dir : false}>
        {hint ? <AppTooltip title={hint}>{content}</AppTooltip> : content}
      </TableCell>
    );
  };

  const colSpan = showCampaign ? 5 : 4;

  // ---- Menu d'actions --------------------------------------------------------
  const visibleActions = (r: CharacterSummary) =>
    actions.filter((a) => (a.show ? a.show(r) : true));

  // ---- Rendu d'une ligne (desktop) -------------------------------------------
  const renderRow = (r: CharacterSummary, i: number) => (
    <TableRow
      key={r.id}
      hover
      sx={{ cursor: 'pointer', bgcolor: i % 2 ? 'rgba(255, 255, 255, 0.035)' : 'transparent' }}
      onClick={() => onOpen(r)}
    >
      <TableCell>
        <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
          {renderNameMarker?.(r)}
          <Box component="span">{r.name}</Box>
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
      {showCampaign && (
        <TableCell>
          <CampaignBadge name={campaignName(r)} campaignId={r.campaignId} />
        </TableCell>
      )}
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
    <Paper key={r.id} variant="outlined" sx={{ p: 2, ...paperSx }}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => onOpen(r)}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            {renderNameMarker?.(r)}
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }} noWrap>
              {r.name}
            </Typography>
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
          {showCampaign && (
            <Box sx={{ mt: 0.5 }}>
              <CampaignBadge name={campaignName(r)} campaignId={r.campaignId} />
            </Box>
          )}
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

  return (
    <>
      {/* Desktop : tableau classique. Masqué sous md (illisible sur mobile). */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          display: { xs: 'none', md: 'block' },
          ...paperSx,
          ...(attachedTop && { borderTopLeftRadius: 0, borderTopRightRadius: 0 }),
        }}
      >
        <Table>
          <TableHead>
            <TableRow>
              {renderHeader('Nom', 'name')}
              {renderHeader('Identité', 'level', 'left', sortable ? 'Trier par niveau' : undefined)}
              {showCampaign && renderHeader('Campagne', 'campaign')}
              {renderHeader('Modifié', 'updatedAt')}
              <TableCell align="right" sx={{ pr: 2 }} />
            </TableRow>
          </TableHead>
          <TableBody>
            {groups
              ? groups.map((g) => {
                  const isCollapsed = collapsed.has(g.key);
                  return (
                    <Fragment key={g.key}>
                      <TableRow hover onClick={() => toggleGroup(g.key)}>
                        <TableCell colSpan={colSpan} sx={groupHeaderSx}>
                          <Box
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              pr: 1,
                            }}
                          >
                            <ExpandMoreIcon
                              fontSize="small"
                              sx={{
                                transition: 'transform 0.2s',
                                transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                              }}
                            />
                            {g.name} ({g.rows.length})
                            <Box sx={{ flexGrow: 1 }} />
                            {renderGroupLink(g.key)}
                          </Box>
                        </TableCell>
                      </TableRow>
                      {!isCollapsed && g.rows.map(renderRow)}
                    </Fragment>
                  );
                })
              : rows.map(renderRow)}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Mobile : une carte empilée par personnage (PER-51). */}
      <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' } }}>
        {groups
          ? groups.map((g) => {
              const isCollapsed = collapsed.has(g.key);
              return (
                <Fragment key={g.key}>
                  <Box
                    role="button"
                    tabIndex={0}
                    onClick={() => toggleGroup(g.key)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleGroup(g.key);
                      }
                    }}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      mt: 1,
                      px: 1.5,
                      py: 0.75,
                      borderRadius: 1,
                      cursor: 'pointer',
                      userSelect: 'none',
                      background:
                        'linear-gradient(90deg, rgba(26, 26, 30, 0.95) 0%, rgba(8, 8, 10, 0.97) 100%)',
                      borderBottom: '2px solid rgba(255, 255, 255, 0.14)',
                    }}
                  >
                    <ExpandMoreIcon
                      fontSize="small"
                      sx={{
                        transition: 'transform 0.2s',
                        transform: isCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
                      }}
                    />
                    <Typography sx={{ fontWeight: 700 }}>
                      {g.name} ({g.rows.length})
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
                    {renderGroupLink(g.key)}
                  </Box>
                  {!isCollapsed && g.rows.map(renderCard)}
                </Fragment>
              );
            })
          : rows.map(renderCard)}
      </Stack>

      {/* Menu d'actions par ligne (disableScrollLock : ne pas masquer la scrollbar). */}
      <Menu
        anchorEl={menu?.anchor ?? null}
        open={menu !== null}
        onClose={closeMenu}
        disableScrollLock
      >
        {menu &&
          visibleActions(menu.row).map((a) => (
            <MenuItem
              key={a.key}
              onClick={() => {
                const row = menu.row;
                closeMenu();
                a.onClick(row);
              }}
            >
              <ListItemIcon>{a.icon}</ListItemIcon>
              <ListItemText sx={a.danger ? { color: 'error.main' } : undefined}>
                {a.label}
              </ListItemText>
            </MenuItem>
          ))}
      </Menu>
    </>
  );
}

export { UNASSIGNED };
