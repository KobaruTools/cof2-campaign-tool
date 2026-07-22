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
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
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
import { alpha } from '@mui/material/styles';
import { AppTooltip } from '@/components/AppTooltip';
import { CampaignBadge } from '@/components/home/CampaignBadge';
import { CharacterPreviewCard } from '@/components/CharacterPreviewCard';
import { ClassIcon } from '@/components/ClassIcon';
import { formatDate } from '@/lib/character/summary';
import type { CharacterSummary } from '@/lib/character/summary';
import { classColor, desaturateColor } from '@/lib/ui/classColors';
import { useCharactersStore } from '@/stores/characters';
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
  /**
   * Destination de navigation (ex. « Ouvrir »). Fourni → l'entrée devient une
   * vraie ancre `<a href>` (Ctrl/⌘+Clic et clic-molette ouvrent un nouvel onglet).
   * Prioritaire sur `onClick` : si `href` est fourni, `onClick` n'est pas appelé.
   */
  href?: (r: CharacterSummary) => string;
  /** Action impérative (ex. Supprimer, Dupliquer). Ignorée si `href` est fourni. */
  onClick?: (r: CharacterSummary) => void;
}

/** Groupe de lignes rendu sous un en-tête intra-tableau (accueil : par campagne). */
export interface CharacterListGroup {
  key: string;
  name: string;
  rows: CharacterSummary[];
}

export interface CharacterListProps {
  rows: CharacterSummary[];
  /**
   * Destination d'une ligne / carte (la fiche du personnage en général). Le nom
   * est rendu en vraie ancre `<a href>` (Ctrl/⌘+Clic et clic-molette ouvrent un
   * nouvel onglet) ; un clic simple ailleurs sur la ligne navigue aussi.
   */
  hrefFor: (r: CharacterSummary) => string;
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
  /** Complément affiché juste après le nom (ex. joueur attribué, en vue campagne). */
  renderNameSuffix?: (r: CharacterSummary) => ReactNode;
  /** Angles supérieurs carrés pour se raccorder à un bloc au-dessus (accueil). */
  attachedTop?: boolean;
}

const UNASSIGNED = 'Non attribué';

/**
 * Léger dégradé teinté à la couleur du profil du personnage, repris de l'en-tête de
 * la fiche (`AppHeader`) : part de la droite (teinte discrète) vers la transparence à
 * gauche. Posé PAR-DESSUS le fond (zébrures/verre dépoli), il reste assez léger pour
 * laisser lire le survol. Chaque ligne/carte prend ainsi la couleur de son profil,
 * un peu DÉSATURÉE (retour propriétaire : « moins flashy ») pour rester feutrée.
 */
function accentGradient(classId: string): string {
  const tint = desaturateColor(classColor(classId), 0.45);
  return `linear-gradient(to left, ${alpha(tint, 0.18)}, transparent)`;
}

// Animation d'ouverture/fermeture des groupes : courte et vive, à la manière des
// accordéons MUI (le défaut MUI est de 300 ms).
const COLLAPSE_MS = 220;

/**
 * Fond « verre dépoli » des conteneurs de liste (tableau desktop + cartes mobile).
 * Exporté pour que le squelette de chargement (`CharacterListSkeleton`) partage
 * exactement le même fond, garantissant une bascule squelette → contenu sans
 * variation visuelle.
 */
export const LIST_PAPER_SX = {
  bgcolor: 'rgba(30, 30, 34, 0.62)',
  backdropFilter: 'blur(6px)',
  WebkitBackdropFilter: 'blur(6px)',
  borderColor: 'rgba(255, 255, 255, 0.10)',
} as const;

/**
 * Largeurs figées des colonnes (`table-layout: fixed`), selon la présence de la
 * colonne « Campagne ». Partagées entre le tableau réel et son squelette pour un
 * alignement des colonnes identique au pixel près.
 */
export function listColWidths(showCampaign: boolean): (string | number)[] {
  return [
    showCampaign ? '26%' : '38%',
    showCampaign ? '30%' : '42%',
    ...(showCampaign ? ['20%'] : []),
    showCampaign ? '16%' : '14%',
    56,
  ];
}

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

// Nom du personnage rendu en vraie ancre (`<a href>`) : apparence identique au
// texte (couleur héritée, jamais souligné — le survol de la ligne suffit à
// signaler la cliquabilité). Le `<a>` permet Ctrl/⌘+Clic et clic-molette pour
// ouvrir la fiche dans un nouvel onglet — impossible avec une navigation JS.
const nameLinkSx = {
  minWidth: 0,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  color: 'inherit',
  textDecoration: 'none',
} as const;

export function CharacterList({
  rows,
  hrefFor,
  actions,
  showCampaign = false,
  campaignNameById,
  sort,
  onPickSort,
  groups,
  renderNameMarker,
  renderNameSuffix,
  attachedTop = false,
}: CharacterListProps) {
  const router = useRouter();
  const getById = useCharactersStore((s) => s.getById);
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
    return (
      <Box
        component={Link}
        href={`/campaign/${key}`}
        // Vraie ancre : Ctrl/⌘+Clic et clic-molette ouvrent la campagne dans un
        // nouvel onglet. `stopPropagation` empêche l'en-tête de groupe parent de
        // se replier au clic (simple ou Enter) sur le lien.
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') e.stopPropagation();
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

  // Largeurs de colonnes figées (`table-layout: fixed`) : les colonnes ne se
  // redimensionnent plus au contenu, donc replier/déplier un groupe (ou filtrer)
  // ne fait plus « sauter » la largeur du nom (flicker). Le même colgroup est
  // réappliqué au sous-tableau animé de chaque groupe pour aligner les colonnes.
  const renderColgroup = () => (
    <colgroup>
      {listColWidths(showCampaign).map((w, i) => (
        <col key={i} style={{ width: w }} />
      ))}
    </colgroup>
  );

  // ---- Aperçu au survol (infobulle) ------------------------------------------
  // Micro-fiche du personnage (portrait + caractéristiques), affichée après un
  // survol prolongé de la ligne : sert aussi à révéler un nom tronqué en entier.
  const previewFor = (r: CharacterSummary) => {
    const character = getById(r.id);
    return character ? <CharacterPreviewCard character={character} /> : '';
  };

  // ---- Menu d'actions --------------------------------------------------------
  const visibleActions = (r: CharacterSummary) =>
    actions.filter((a) => (a.show ? a.show(r) : true));

  // ---- Rendu d'une ligne (desktop) -------------------------------------------
  const renderRow = (r: CharacterSummary, i: number) => (
    <AppTooltip
      key={r.id}
      title={previewFor(r)}
      enterDelay={1000}
      placement="bottom-start"
      maxWidth="none"
    >
      <TableRow
        sx={{
          cursor: 'pointer',
          bgcolor: i % 2 ? 'rgba(255, 255, 255, 0.035)' : 'transparent',
          // Léger dégradé teinté à la couleur du profil (repris de l'en-tête de la
          // fiche), posé par-dessus la zébrure. Le survol (background-color) passe
          // derrière ce calque, qui reste discret.
          backgroundImage: accentGradient(r.classId),
          // Fondu doux du fond au survol (inspiré des rangs de voie de la fiche) :
          // le délai (.2s) porté par l'état de BASE ne joue qu'à la SORTIE — le fond
          // met un court instant à revenir. À l'ENTRÉE, la transition de `:hover`
          // (sans délai) prend le relais, donc le fondu démarre immédiatement.
          transition: 'background-color .15s ease .2s',
          '&:hover': {
            bgcolor: 'action.hover',
            transition: 'background-color .15s ease',
          },
        }}
        onClick={() => router.push(hrefFor(r))}
      >
        <TableCell>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
            {renderNameMarker?.(r)}
            <Box
              component={Link}
              href={hrefFor(r)}
              prefetch={false}
              // `stopPropagation` : sur le nom, c'est l'ancre qui navigue (clic
              // simple = navigation SPA ; Ctrl/⌘/molette = nouvel onglet). Sans ça,
              // le `onClick` de la ligne re-naviguerait dans l'onglet courant.
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              sx={nameLinkSx}
            >
              {r.name}
            </Box>
            {renderNameSuffix?.(r)}
          </Stack>
        </TableCell>
        <TableCell>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', minWidth: 0 }}>
            <ClassIcon classId={r.classId} firearmsAllowed={r.firearmsAllowed} size={20} />
            <Box
              component="span"
              sx={{
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <Box component="span" sx={{ color: classColor(r.classId), fontWeight: 600 }}>
                {r.characterClass}
              </Box>
              <Box component="span" sx={{ color: 'text.secondary' }}>
                {' '}
                · {r.ancestry} · {r.level}
              </Box>
            </Box>
          </Stack>
        </TableCell>
        {showCampaign && (
          <TableCell>
            <CampaignBadge name={campaignName(r)} campaignId={r.campaignId} />
          </TableCell>
        )}
        <TableCell>
          <Typography variant="caption" color="text.secondary" noWrap>
            {formatDate(r.updatedAt)}
          </Typography>
        </TableCell>
        <TableCell align="right" sx={{ pr: 2 }}>
          <IconButton size="small" onClick={(e) => openMenu(e, r)}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </TableCell>
      </TableRow>
    </AppTooltip>
  );

  // ---- Rendu d'une carte (mobile) --------------------------------------------
  const renderCard = (r: CharacterSummary) => (
    <AppTooltip key={r.id} title={previewFor(r)} enterDelay={1000} placement="bottom" maxWidth="none">
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        ...LIST_PAPER_SX,
        // Même dégradé teinté au profil que les lignes desktop (repris de l'en-tête).
        backgroundImage: accentGradient(r.classId),
        // Même fondu au survol que les lignes desktop (délai de sortie).
        transition: 'background-color .15s ease .2s',
        '&:hover': {
          bgcolor: 'rgba(44, 44, 50, 0.72)',
          transition: 'background-color .15s ease',
        },
      }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}
      >
        <Box sx={{ minWidth: 0, flex: 1, cursor: 'pointer' }} onClick={() => router.push(hrefFor(r))}>
          <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center' }}>
            {renderNameMarker?.(r)}
            <Typography
              variant="subtitle1"
              component={Link}
              href={hrefFor(r)}
              prefetch={false}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              sx={{ fontWeight: 600, color: 'inherit', textDecoration: 'none', minWidth: 0 }}
              noWrap
            >
              {r.name}
            </Typography>
            {renderNameSuffix?.(r)}
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
    </AppTooltip>
  );

  return (
    <>
      {/* Desktop : tableau classique. Masqué sous md (illisible sur mobile). */}
      <TableContainer
        component={Paper}
        variant="outlined"
        sx={{
          display: { xs: 'none', md: 'block' },
          ...LIST_PAPER_SX,
          ...(attachedTop && { borderTopLeftRadius: 0, borderTopRightRadius: 0 }),
        }}
      >
        <Table sx={{ tableLayout: 'fixed' }}>
          {renderColgroup()}
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
                      {/* Corps du groupe animé (Collapse MUI) : un sous-tableau qui
                          reprend le même colgroup figé pour aligner les colonnes
                          sur l'en-tête. Ouverture/fermeture douce, façon accordéon. */}
                      <TableRow>
                        <TableCell colSpan={colSpan} sx={{ p: 0, border: 0 }}>
                          <Collapse in={!isCollapsed} timeout={COLLAPSE_MS} unmountOnExit>
                            <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
                              {renderColgroup()}
                              <TableBody>{g.rows.map(renderRow)}</TableBody>
                            </Table>
                          </Collapse>
                        </TableCell>
                      </TableRow>
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
                  <Collapse in={!isCollapsed} timeout={COLLAPSE_MS} unmountOnExit>
                    <Stack spacing={1.5}>{g.rows.map(renderCard)}</Stack>
                  </Collapse>
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
          visibleActions(menu.row).map((a) => {
            const content = (
              <>
                <ListItemIcon>{a.icon}</ListItemIcon>
                <ListItemText sx={a.danger ? { color: 'error.main' } : undefined}>
                  {a.label}
                </ListItemText>
              </>
            );
            const row = menu.row;
            // Action de navigation (`href`) → vraie ancre : Ctrl/⌘+Clic et
            // clic-molette ouvrent la destination dans un nouvel onglet. Le clic
            // simple laisse `Link` naviguer (on ne rappelle donc pas `onClick`),
            // et on referme le menu dans tous les cas.
            return a.href ? (
              <MenuItem key={a.key} component={Link} href={a.href(row)} onClick={closeMenu}>
                {content}
              </MenuItem>
            ) : (
              <MenuItem
                key={a.key}
                onClick={() => {
                  closeMenu();
                  a.onClick?.(row);
                }}
              >
                {content}
              </MenuItem>
            );
          })}
      </Menu>
    </>
  );
}

export { UNASSIGNED };
